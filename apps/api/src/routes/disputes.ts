import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { betEvents, disputes, getDb, notifications } from '../db';
import { AuthContext } from '../middleware/auth';
import { ErrorResponseSchema, IdParamSchema, SuccessResponseSchema } from '../schemas/common';

const app = new OpenAPIHono<{ Variables: AuthContext }>();

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const disputeResponseSchema = z.object({
  reason: z.string().min(10).max(1000).openapi({ example: 'The evidence provided is outdated.' }),
  evidence: z.string().max(2000).optional().openapi({ example: 'https://link.to/counter-evidence' }),
}).openapi('DisputeResponse');

// ─────────────────────────────────────────────────────────────────────────────
// POST /disputes/:id/respond - Respond to a dispute
// ─────────────────────────────────────────────────────────────────────────────

const respondToDisputeRoute = createRoute({
  method: 'post',
  path: '/:id/respond',
  tags: ['Disputes'],
  summary: 'Respond to a dispute',
  description: 'Submit a counter-response to a dispute raised against you',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: disputeResponseSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Response submitted successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ message: z.string() })),
        },
      },
    },
    400: { description: 'Invalid request', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Dispute not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(respondToDisputeRoute, async (c) => {
  const agent = c.get('agent')!;
  const { id: disputeId } = c.req.valid('param');
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
    return c.json({ success: false as const, error: 'Dispute not found' }, 404);
  }

  if (dispute.status !== 'pending') {
    return c.json({ success: false as const, error: 'Dispute is already resolved' }, 400);
  }

  if (dispute.counterReason) {
    return c.json({ success: false as const, error: 'Response already submitted' }, 400);
  }

  // Verify user is a participant but NOT the one who raised it
  if (dispute.raisedById === agent.id) {
    return c.json({ success: false as const, error: 'You cannot respond to your own dispute' }, 400);
  }

  const isParticipant =
    dispute.bet.proposerId === agent.id || dispute.bet.counterId === agent.id;

  if (!isParticipant) {
    return c.json({ success: false as const, error: 'You are not a participant in this bet' }, 403);
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
    success: true as const,
    data: {
      message: 'Response submitted. Admin will review both sides.',
    },
  }, 200);
});

export default app;
