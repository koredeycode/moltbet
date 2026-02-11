// Betting routes with x402 payment integration
import { OpenAPIHono } from '@hono/zod-openapi';
import { zValidator } from '@hono/zod-validator';
import { desc, eq, or, sql } from 'drizzle-orm';
import { z } from 'zod';
import { API_CONFIG } from '../config';
import { agents, betEvents, bets, createId, getDb, notifications } from '../db';
import { disputes } from '../db/schema/disputes';
import { AuthContext, authMiddleware, requireVerified } from '../middleware/auth';
import { createStakeMiddleware } from '../middleware/payment';
import { checkBettingLimit, incrementBettingLimit } from '../middleware/rateLimit';
import {
    disbursePayout,
    refundStake
} from '../services/facilitator';

const app = new OpenAPIHono<{ Variables: AuthContext }>();

// ─────────────────────────────────────────────────────────────────────────────
// Schemas
// ─────────────────────────────────────────────────────────────────────────────

const proposeBetSchema = z.object({
  title: z.string().min(5).max(200),
  description: z.string().min(10).max(2000),
  terms: z.string().min(10).max(1000),
  stake: z.string().regex(/^\d+(\.\d{1,6})?$/, 'Invalid stake format'),
  expiresInHours: z.number().min(1).max(720).default(168),
  category: z.enum(['crypto', 'sports', 'politics', 'entertainment', 'tech', 'finance', 'weather', 'custom']).optional(),
});

const claimWinSchema = z.object({
  evidence: z.string().min(10).max(2000),
});

const disputeSchema = z.object({
  reason: z.string().min(10).max(1000),
  evidence: z.string().max(2000).optional(),
});

// ─────────────────────────────────────────────────────────────────────────────
// Helper: Payment Check Wrapper
// ─────────────────────────────────────────────────────────────────────────────

async function ensurePayment(c: any, stake: string, description: string) {
  const mw = createStakeMiddleware(stake, description);
  let passed = false;
  
  // Run the middleware
  // If payment is missing/invalid, it returns a Response (402 or error)
  // If payment is valid, it calls next()
  const response = await mw(c, async () => {
    passed = true;
  });

  return { passed, response };
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/propose - Create a new bet
// ─────────────────────────────────────────────────────────────────────────────

app.post(
  '/propose',
  authMiddleware,
  requireVerified,
  zValidator('json', proposeBetSchema),
  async (c) => {
    const agent = c.get('agent')!;
    const body = c.req.valid('json');
    const db = getDb();
    
    // 1. Check action limit
    try {
      checkBettingLimit(agent.id);
    } catch (err: any) {
      return c.json({ success: false, error: err.message }, 429);
    }

    // 2. Check x402 Payment
    const { passed, response } = await ensurePayment(
      c, 
      body.stake, 
      `Create Bet: ${body.title} (${body.stake} USDC)`
    );

    if (!passed) return response;

    // 3. Payment Verified -> Create Bet
    try {
      const expiresAt = new Date(Date.now() + body.expiresInHours * 60 * 60 * 1000);
      const betId = createId();

      const [bet] = await db
        .insert(bets)
        .values({
          id: betId,
          title: body.title,
          description: body.description,
          terms: body.terms,
          stake: body.stake,
          category: body.category,
          proposerId: agent.id,
          expiresAt,
          status: 'open',
          // escrowTxHash would ideally come from the payment verification result
          // For now, we trust the x402 middleware verified it. 
          // If we need the txHash, we need to extract it from headers or context.
          // x402-evm might not expose it easily in middleware mode without custom extraction.
        })
        .returning();

      // Log Event
      await db.insert(betEvents).values({
        betId: bet.id,
        agentId: agent.id,
        type: 'created',
        data: { stake: body.stake, title: body.title },
      });
      
      await incrementBettingLimit(agent.id);

      return c.json({
        success: true,
        data: { bet }
      });

    } catch (error: any) {
      console.error("Propose failed:", error);
      return c.json({ success: false, error: error.message }, 500);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/counter - Counter a bet
// ─────────────────────────────────────────────────────────────────────────────

app.post('/:id/counter', authMiddleware, requireVerified, async (c) => {
  const agent = c.get('agent')!;
  const betId = c.req.param('id');
  const db = getDb();

  // 1. Check action limit
  try {
    checkBettingLimit(agent.id);
  } catch (err: any) {
    return c.json({ success: false, error: err.message }, 429);
  }

  // 2. Get the bet
  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
  });

  if (!bet) return c.json({ success: false, error: 'Bet not found' }, 404);
  if (bet.status !== 'open') return c.json({ success: false, error: 'Bet is not open' }, 400);
  if (bet.proposerId === agent.id) return c.json({ success: false, error: 'Cannot counter your own bet' }, 400);
  if (new Date() > bet.expiresAt) return c.json({ success: false, error: 'Bet has expired' }, 400);

  // 3. Check x402 Payment (Counter must match stake)
  const { passed, response } = await ensurePayment(
    c, 
    bet.stake, 
    `Counter Bet: ${bet.title} (${bet.stake} USDC)`
  );

  if (!passed) return response;

  // 4. Payment Verified -> Update Bet
  try {
    await db.transaction(async (tx) => {
      await tx
        .update(bets)
        .set({
          counterId: agent.id,
          status: 'countered', 
          counteredAt: new Date(),
          updatedAt: new Date(),
        })
        .where(eq(bets.id, betId));

      await tx.insert(betEvents).values({
        betId: bet.id,
        agentId: agent.id,
        type: 'matched',
        data: { stake: bet.stake },
      });

      await tx.insert(notifications).values({
        agentId: bet.proposerId,
        betId: bet.id,
        type: 'bet_countered',
        message: `Your bet "${bet.title}" has been countered!`,
      });
    });
    
    await incrementBettingLimit(agent.id);

    return c.json({
      success: true,
      data: {
        message: 'Bet countered successfully',
        betId: bet.id,
      }
    });

  } catch(error: any) {
    console.error("Counter failed:", error);
    return c.json({ success: false, error: error.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/claim-win - Claim victory
// ─────────────────────────────────────────────────────────────────────────────

app.post(
  '/:id/claim-win',
  authMiddleware,
  requireVerified,
  zValidator('json', claimWinSchema),
  async (c) => {
    const agent = c.get('agent')!;
    const betId = c.req.param('id');
    const { evidence } = c.req.valid('json');
    const db = getDb();

    const bet = await db.query.bets.findFirst({
      where: eq(bets.id, betId),
    });

    if (!bet || bet.status !== 'countered') {
      return c.json({ success: false, error: 'Bet not found or not in countered state' }, 404);
    }

    const isParticipant = bet.proposerId === agent.id || bet.counterId === agent.id;
    if (!isParticipant) {
      return c.json({ success: false, error: 'You are not a participant in this bet' }, 403);
    }

    await db.transaction(async (tx) => {
        await tx
        .update(bets)
        .set({
            status: 'win_claimed',
            winClaimerId: agent.id,
            winClaimEvidence: evidence,
            winClaimedAt: new Date(),
            updatedAt: new Date(),
        })
        .where(eq(bets.id, betId));

        await tx.insert(betEvents).values({
        betId: bet.id,
        agentId: agent.id,
        type: 'win_claimed',
        data: { evidence },
        });

        const otherPartyId = bet.proposerId === agent.id ? bet.counterId! : bet.proposerId;
        await tx.insert(notifications).values({
        agentId: otherPartyId,
        betId: bet.id,
        type: 'win_claimed',
        message: `Win claimed on "${bet.title}". You have ${API_CONFIG.winClaimTimeoutHours}h to dispute.`,
        });
    });

    return c.json({
      success: true,
      data: {
        message: `Win claimed. Counter-party has ${API_CONFIG.winClaimTimeoutHours}h to dispute or concede.`,
      }
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/concede - Concede bet (triggers payout)
// ─────────────────────────────────────────────────────────────────────────────

app.post('/:id/concede', authMiddleware, requireVerified, async (c) => {
  const agent = c.get('agent')!;
  const betId = c.req.param('id');
  const db = getDb();

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    with: { proposer: true, counter: true },
  });

  if (!bet) return c.json({ success: false, error: 'Bet not found' }, 404);
  if (bet.status !== 'countered' && bet.status !== 'win_claimed') {
    return c.json({ success: false, error: 'Bet cannot be conceded in current state' }, 400);
  }

  const isParticipant = bet.proposerId === agent.id || bet.counterId === agent.id;
  if (!isParticipant) return c.json({ success: false, error: 'You are not a participant' }, 403);

  // Determine winner
  const winnerId = bet.proposerId === agent.id ? bet.counterId! : bet.proposerId;
  const winnerAddress = bet.proposerId === agent.id
    ? (bet as any).counter?.address
    : (bet as any).proposer?.address;

  if (!winnerAddress) return c.json({ success: false, error: 'Winner address not found' }, 500);

  // Payout winner via Facilitator (Stake * 2)
  const totalPayout = (parseFloat(bet.stake) * 2).toFixed(6);
  const result = await disbursePayout(winnerAddress, totalPayout);

  if (!result.success) {
    return c.json({ success: false, error: 'Payout failed', details: result.error }, 500);
  }

  await db.transaction(async (tx) => {
    await tx
        .update(bets)
        .set({
        status: 'resolved',
        winnerId,
        resolvedAt: new Date(),
        resolutionTxHash: result.txHash,
        updatedAt: new Date(),
        })
        .where(eq(bets.id, betId));

    await tx.update(agents)
        .set({ 
            wins: sql`${agents.wins} + 1`, 
            shedScore: sql`${agents.shedScore} + 10`
        }) 
        .where(eq(agents.id, winnerId));

    const loserId = winnerId === bet.proposerId ? bet.counterId! : bet.proposerId;
    await tx.update(agents)
        .set({ losses: sql`${agents.losses} + 1` })
        .where(eq(agents.id, loserId));

    await tx.insert(betEvents).values([
        {
            betId: bet.id,
            agentId: agent.id, 
            type: 'conceded',
            data: { txHash: result.txHash, winnerId },
        },
        {
            betId: bet.id,
            agentId: agent.id,
            type: 'resolved',
            data: { txHash: result.txHash, winnerId },
        }
    ]);

    await tx.insert(notifications).values({
        agentId: winnerId,
        betId: bet.id,
        type: 'payout_ready',
        message: `You won "${bet.title}"! Payout sent.`,
    });
  });

  return c.json({
    success: true,
    data: {
      message: 'Bet conceded. Payout sent to winner.',
      txHash: result.txHash,
    }
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/cancel - Cancel a bet (Refunds stake)
// ─────────────────────────────────────────────────────────────────────────────

app.post('/:id/cancel', authMiddleware, requireVerified, async (c) => {
  const agent = c.get('agent')!;
  const betId = c.req.param('id');
  const db = getDb();

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
  });

  if (!bet) return c.json({ success: false, error: 'Bet not found' }, 404);
  if (bet.proposerId !== agent.id) return c.json({ success: false, error: 'Only proposer can cancel' }, 403);
  if (bet.status !== 'open') return c.json({ success: false, error: 'Bet cannot be cancelled (must be Open)' }, 400);

  // Refund Stake via Facilitator
  // Since it was Open, only the proposer put money in.
  const result = await refundStake(agent.address, bet.stake);

  if (!result.success) {
      return c.json({ success: false, error: 'Refund failed', details: result.error }, 500);
  }

  try {
      await db.update(bets).set({
        status: 'cancelled',
        updatedAt: new Date(),
      }).where(eq(bets.id, betId));

      await db.insert(betEvents).values({
          betId: bet.id,
          agentId: agent.id,
          type: 'cancelled',
          data: { txHash: result.txHash },
      });

      return c.json({ success: true, betId, transactionHash: result.txHash, message: 'Bet cancelled and stake refunded.' });

  } catch (error: any) {
      console.error("Error submitting cancellation:", error);
      return c.json({ success: false, error: error.message }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/dispute - Dispute a win claim
// ─────────────────────────────────────────────────────────────────────────────

app.post(
  '/:id/dispute',
  authMiddleware,
  requireVerified,
  zValidator('json', disputeSchema),
  async (c) => {
    const agent = c.get('agent')!;
    const betId = c.req.param('id');
    const { reason, evidence } = c.req.valid('json');
    const db = getDb();

    const bet = await db.query.bets.findFirst({
      where: eq(bets.id, betId),
    });

    if (!bet || bet.status !== 'win_claimed') {
      return c.json({ success: false, error: 'Bet not found or not in claimable state' }, 404);
    }
    if (bet.winClaimerId === agent.id) {
      return c.json({ success: false, error: 'You cannot dispute your own claim' }, 400);
    }
    const isParticipant = bet.proposerId === agent.id || bet.counterId === agent.id;
    if (!isParticipant) {
      return c.json({ success: false, error: 'You are not a participant' }, 403);
    }

    const [dispute] = await db
      .insert(disputes)
      .values({
        betId: bet.id,
        raisedById: agent.id,
        reason,
        evidence,
      })
      .returning();

    await db
      .update(bets)
      .set({
        status: 'disputed',
        updatedAt: new Date(),
      })
      .where(eq(bets.id, betId));

    await db.insert(betEvents).values({
      betId: bet.id,
      agentId: agent.id,
      type: 'disputed',
      data: { reason, evidence, disputeId: dispute.id },
    });

    await db.insert(notifications).values({
      agentId: bet.winClaimerId!,
      betId: bet.id,
      type: 'dispute_raised',
      message: `Your win claim on "${bet.title}" has been disputed.`,
    });

    return c.json({
      success: true,
      data: {
        message: 'Dispute filed. Awaiting admin review.',
        disputeId: dispute.id,
      }
    });
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/feed - Browse open bets
// ─────────────────────────────────────────────────────────────────────────────

app.get('/feed', async (c) => {
  const db = getDb();
  const limit = Math.min(parseInt(c.req.query('limit') || '20'), 50);
  const agentId = c.req.query('agentId');
  const status = c.req.query('status') as any; 
  const sort = c.req.query('sort'); 

  const conditions = [];
  
  if (agentId) {
      conditions.push(or(eq(bets.proposerId, agentId), eq(bets.counterId, agentId)));
  }
  if (status && status !== 'all') {
      conditions.push(eq(bets.status, status));
  } else if (!status || status === 'all') {
      // Default to open if no specific status requested (for feed)
      if (!agentId) conditions.push(eq(bets.status, 'open'));
  }

  let orderBy = desc(bets.createdAt);
  if (sort === 'high_stakes') {
      orderBy = desc(sql`CAST(${bets.stake} AS FLOAT)`); 
  }

  const results = await db.query.bets.findMany({
    where: conditions.length ? sql`${sql.join(conditions, sql` AND `)}` : undefined,
    limit,
    orderBy,
    with: {
      proposer: true,
      counter: true,
    },
  });

  return c.json({
    success: true,
    data: { bets: results },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/my-bets
// ─────────────────────────────────────────────────────────────────────────────

app.get('/my-bets', authMiddleware, async (c) => {
  const agent = c.get('agent')!;
  const db = getDb();

  const myBets = await db.query.bets.findMany({
    where: or(eq(bets.proposerId, agent.id), eq(bets.counterId, agent.id)),
    orderBy: desc(bets.createdAt),
    limit: 50,
    with: {
      proposer: true,
      counter: true,
    },
  });

  return c.json({
    success: true,
    data: { bets: myBets },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/:id
// ─────────────────────────────────────────────────────────────────────────────

app.get('/:id', async (c) => {
  const betId = c.req.param('id');
  const db = getDb();

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    with: {
        proposer: true,
        counter: true,
    }
  });

  if (!bet) {
    return c.json({ success: false, error: 'Bet not found' }, 404);
  }

  // Fetch events
  const events = await db.query.betEvents.findMany({
      where: eq(betEvents.betId, betId),
      orderBy: desc(betEvents.createdAt)
  });

  return c.json({
    success: true,
    data: { bet: { ...bet, events } },
  });
});

export default app;
