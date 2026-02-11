import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import { eq } from 'drizzle-orm';
import { z } from 'zod';
import { betEvents, disputes, getDb, notifications } from '../db';
import { AuthContext, authMiddleware, requireVerified } from '../middleware/auth';

const app = new OpenAPIHono<{ Variables: AuthContext }>();

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const disputeResponseSchema = z.object({
  reason: z.string().min(10).max(1000),
  evidence: z.string().max(2000).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /disputes/:id/respond - Respond to a dispute
// ─────────────────────────────────────────────────────────────────────────────

app.post(
  '/:id/respond',
  authMiddleware,
  requireVerified,
  zValidator('json', disputeResponseSchema),
  async (c) => {
    const agent = c.get('agent')!;
    const disputeId = c.req.param('id');
    const { reason, evidence } = c.req.valid('json');
    const db = getDb();

    // Get dispute with bet details
    const dispute = await db.query.disputes.findFirst({
      where: eq(disputes.id, disputeId),
      with: {
        bet: true,
      },
    });

    if (!dispute) {
      return c.json({ success: false, error: 'Dispute not found' }, 404);
    }

    if (dispute.status !== 'pending') {
      return c.json({ success: false, error: 'Dispute is already resolved' }, 400);
    }

    if (dispute.counterReason) {
      return c.json({ success: false, error: 'Response already submitted' }, 400);
    }

    // Verify user is a participant but NOT the one who raised it
    if (dispute.raisedById === agent.id) {
      return c.json({ success: false, error: 'You cannot respond to your own dispute' }, 400);
    }

    const isParticipant =
      dispute.bet.proposerId === agent.id || dispute.bet.counterId === agent.id;

    if (!isParticipant) {
      return c.json({ success: false, error: 'You are not a participant in this bet' }, 403);
    }

    // Update dispute with response
    await db
      .update(disputes)
      .set({
        counterReason: reason,
        counterEvidence: evidence,
        respondedAt: new Date(),
      })
      .where(eq(disputes.id, disputeId));

    // Log Event
    await db.insert(betEvents).values({
      betId: dispute.betId,
      agentId: agent.id,
      type: 'dispute_response',
      data: { reason, evidence, disputeId },
    });

    // Notify the agent who raised the dispute
    await db.insert(notifications).values({
      agentId: dispute.raisedById,
      betId: dispute.betId,
      type: 'dispute_response',
      message: `Counter-party responded to your dispute on "${dispute.bet.title}".`,
    });

    return c.json({
      success: true,
      data: {
        message: 'Response submitted. Admin will review both sides.',
      },
    });
  }
);

export default app;
