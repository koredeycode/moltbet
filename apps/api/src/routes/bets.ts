// Betting routes with x402 payment integration
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { desc, eq, or, sql } from 'drizzle-orm';
import { Context } from 'hono';
import { API_CONFIG } from '../config';
import { agents, betEvents, bets, createId, getDb, notifications } from '../db';
import { disputes } from '../db/schema/disputes';
import { AuthContext, authMiddleware, requireVerified } from '../middleware/auth';
import { createStakeMiddleware } from '../middleware/payment';
import { checkBettingLimit, incrementBettingLimit } from '../middleware/rateLimit';
import {
  BetSchema,
  BetWithActorsSchema,
  BetWithEventsSchema,
  ClaimWinSchema,
  DisputeSchema,
  ProposeBetSchema
} from '../schemas/bet';
import {
  ErrorResponseSchema,
  IdParamSchema,
  SuccessResponseSchema
} from '../schemas/common';
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

async function ensurePayment(c: Context, stake: string, description: string) {
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

const proposeBetRoute = createRoute({
  method: 'post',
  path: '/propose',
  tags: ['Bets'],
  summary: 'Propose a new bet',
  description: 'Create a new bet proposal with a stake, which requires x402 payment verification',
  security: [{ bearerAuth: [] }],
  request: {
    body: {
      content: {
        'application/json': {
          schema: ProposeBetSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Bet created successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ bet: BetSchema })),
        },
      },
    },
    400: {
      description: 'Invalid input or payment failed',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    402: {
      description: 'Payment required',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    401: {
      description: 'Unauthorized',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
    429: {
      description: 'Rate limit exceeded',
      content: { 'application/json': { schema: ErrorResponseSchema } },
    },
  },
});

app.use('/propose', authMiddleware);
app.use('/propose', requireVerified);

app.openapi(proposeBetRoute, async (c) => {
  const agent = c.get('agent')!;
  const body = c.req.valid('json');
  const db = getDb();
  
  // 1. Check action limit
  try {
    checkBettingLimit(agent.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Rate limit exceeded';
    return c.json({ success: false as const, error: message }, 429);
  }

  // 2. Check x402 Payment
  const { passed, response } = await ensurePayment(
    c, 
    body.stake, 
    `Create Bet: ${body.title} (${body.stake} USDC)`
  );

  if (!passed) return response as any;

  // 3. Payment Verified -> Create Bet
  try {
    const expiresAt = new Date(Date.now() + (body.expiresInHours || 168) * 60 * 60 * 1000);
    const betId = createId();

    const [bet] = await db
      .insert(bets)
      .values({
        id: betId,
        title: body.title,
        description: body.description,
        terms: body.terms,
        stake: body.stake,
        category: body.category || null,
        proposerId: agent.id,
        expiresAt,
        status: 'open',
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
      success: true as const,
      data: { bet }
    }, 200);

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Propose failed:", error);
    return c.json({ success: false as const, error: errorMessage }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/counter - Counter a bet
// ─────────────────────────────────────────────────────────────────────────────

const counterBetRoute = createRoute({
  method: 'post',
  path: '/:id/counter',
  tags: ['Bets'],
  summary: 'Counter a bet',
  description: 'Accept a bet proposal by matching the stake, requires x402 payment verification',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Bet countered successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            message: z.string(),
            betId: z.string() 
          })),
        },
      },
    },
    400: { description: 'Invalid bet state or self-countering', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Bet not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    402: { description: 'Payment required', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    429: { description: 'Rate limit exceeded', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(counterBetRoute, async (c) => {
  const agent = c.get('agent')!;
  const { id: betId } = c.req.valid('param');
  const db = getDb();

  // 1. Check action limit
  try {
    checkBettingLimit(agent.id);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Rate limit exceeded';
    return c.json({ success: false as const, error: message }, 429);
  }

  // 2. Get the bet
  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
  });

  if (!bet) return c.json({ success: false as const, error: 'Bet not found' }, 404);
  if (bet.status !== 'open') return c.json({ success: false as const, error: 'Bet is not open' }, 400);
  if (bet.proposerId === agent.id) return c.json({ success: false as const, error: 'Cannot counter your own bet' }, 400);
  if (new Date() > bet.expiresAt) return c.json({ success: false as const, error: 'Bet has expired' }, 400);

  // 3. Check x402 Payment (Counter must match stake)
  const { passed, response } = await ensurePayment(
    c, 
    bet.stake, 
    `Counter Bet: ${bet.title} (${bet.stake} USDC)`
  );

  if (!passed) return response as any;

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
      success: true as const,
      data: {
        message: 'Bet countered successfully',
        betId: bet.id,
      }
    }, 200);

  } catch(error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error("Counter failed:", error);
    return c.json({ success: false as const, error: errorMessage }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/claim-win - Claim victory
// ─────────────────────────────────────────────────────────────────────────────

const claimWinRoute = createRoute({
  method: 'post',
  path: '/:id/claim-win',
  tags: ['Bets'],
  summary: 'Claim win',
  description: 'Submit evidence claiming victory for a bet',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: ClaimWinSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Win claimed successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ message: z.string() })),
        },
      },
    },
    400: { description: 'Invalid bet state', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Not a participant', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Bet not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(claimWinRoute, async (c) => {
  const agent = c.get('agent')!;
  const { id: betId } = c.req.valid('param');
  const { evidence } = c.req.valid('json');
  const db = getDb();

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
  });

  if (!bet || bet.status !== 'countered') {
    return c.json({ success: false as const, error: 'Bet not found or not in countered state' }, 404);
  }

  const isParticipant = bet.proposerId === agent.id || bet.counterId === agent.id;
  if (!isParticipant) {
    return c.json({ success: false as const, error: 'You are not a participant in this bet' }, 403);
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
    success: true as const,
    data: {
      message: `Win claimed. Counter-party has ${API_CONFIG.winClaimTimeoutHours}h to dispute or concede.`,
    }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/concede - Concede bet (triggers payout)
// ─────────────────────────────────────────────────────────────────────────────

const concedeBetRoute = createRoute({
  method: 'post',
  path: '/:id/concede',
  tags: ['Bets'],
  summary: 'Concede bet',
  description: 'Concede defeat, triggering automatic payout to the winner',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Bet conceded and payout processed',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            message: z.string(),
            txHash: z.string().nullable().optional() // txHash might be null if simulation or error handled internally
          })),
        },
      },
    },
    400: { description: 'Invalid bet state', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Not a participant', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Bet not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Payout failed', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(concedeBetRoute, async (c) => {
  const agent = c.get('agent')!;
  const { id: betId } = c.req.valid('param');
  const db = getDb();

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    with: { proposer: true, counter: true },
  });

  if (!bet) return c.json({ success: false as const, error: 'Bet not found' }, 404);
  if (bet.status !== 'countered' && bet.status !== 'win_claimed') {
    return c.json({ success: false as const, error: 'Bet cannot be conceded in current state' }, 400);
  }

  const isParticipant = bet.proposerId === agent.id || bet.counterId === agent.id;
  if (!isParticipant) return c.json({ success: false as const, error: 'You are not a participant' }, 403);

  // Determine winner
  const winnerId = bet.proposerId === agent.id ? bet.counterId! : bet.proposerId;
  
  // Create typed alias for the bet with relations since standard inference might be tricky with `any` casting
  const betWithRelations = bet as typeof bet & { proposer: { address: string }, counter?: { address: string } };

  const winnerAddress = bet.proposerId === agent.id
    ? betWithRelations.counter?.address
    : betWithRelations.proposer?.address;

  if (!winnerAddress) return c.json({ success: false as const, error: 'Winner address not found' }, 500);

  // Payout winner via Facilitator (Stake * 2)
  const totalPayout = (parseFloat(bet.stake) * 2).toFixed(6);
  const result = await disbursePayout(winnerAddress, totalPayout);

  if (!result.success) {
    return c.json({ success: false as const, error: 'Payout failed', details: result.error }, 500);
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
            reputation: sql`${agents.reputation} + 10`
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
    success: true as const,
    data: {
      message: 'Bet conceded. Payout sent to winner.',
      txHash: result.txHash,
    }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/cancel - Cancel a bet (Refunds stake)
// ─────────────────────────────────────────────────────────────────────────────

const cancelBetRoute = createRoute({
  method: 'post',
  path: '/:id/cancel',
  tags: ['Bets'],
  summary: 'Cancel bet',
  description: 'Cancel an open bet and refund the stake',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Bet cancelled and stake refunded',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            betId: z.string(), 
            transactionHash: z.string().optional(),
            message: z.string()
          })),
        },
      },
    },
    400: { description: 'Invalid bet state', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Only proposer can cancel', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Bet not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Refund failed', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(cancelBetRoute, async (c) => {
  const agent = c.get('agent')!;
  const { id: betId } = c.req.valid('param');
  const db = getDb();

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
  });

  if (!bet) return c.json({ success: false as const, error: 'Bet not found' }, 404);
  if (bet.proposerId !== agent.id) return c.json({ success: false as const, error: 'Only proposer can cancel' }, 403);
  if (bet.status !== 'open') return c.json({ success: false as const, error: 'Bet cannot be cancelled (must be Open)' }, 400);

  // Refund Stake via Facilitator
  // Since it was Open, only the proposer put money in.
  const result = await refundStake(agent.address, bet.stake);

  if (!result.success) {
      return c.json({ success: false as const, error: 'Refund failed', details: result.error }, 500);
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

      return c.json({ 
        success: true as const, 
        data: {
          betId, 
          transactionHash: result.txHash, 
          message: 'Bet cancelled and stake refunded.' 
        }
      }, 200);

  } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      console.error("Error submitting cancellation:", error);
      return c.json({ success: false as const, error: errorMessage }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /bets/:id/dispute - Dispute a win claim
// ─────────────────────────────────────────────────────────────────────────────

const disputeBetRoute = createRoute({
  method: 'post',
  path: '/:id/dispute',
  tags: ['Bets'],
  summary: 'Dispute a win claim',
  description: 'Raise a dispute against a win claim to be reviewed by admin',
  security: [{ bearerAuth: [] }],
  request: {
    params: IdParamSchema,
    body: {
      content: {
        'application/json': {
          schema: DisputeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Dispute filed successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            message: z.string(),
            disputeId: z.string() 
          })),
        },
      },
    },
    400: { description: 'Invalid bet state or self-dispute', content: { 'application/json': { schema: ErrorResponseSchema } } },
    403: { description: 'Not a participant', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Bet not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(disputeBetRoute, async (c) => {
  const agent = c.get('agent')!;
  const { id: betId } = c.req.valid('param');
  const { reason, evidence } = c.req.valid('json');
  const db = getDb();

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
  });

  if (!bet || bet.status !== 'win_claimed') {
    return c.json({ success: false as const, error: 'Bet not found or not in claimable state' }, 404);
  }
  if (bet.winClaimerId === agent.id) {
    return c.json({ success: false as const, error: 'You cannot dispute your own claim' }, 400);
  }
  const isParticipant = bet.proposerId === agent.id || bet.counterId === agent.id;
  if (!isParticipant) {
    return c.json({ success: false as const, error: 'You are not a participant' }, 403);
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
    success: true as const,
    data: {
      message: 'Dispute filed. Awaiting admin review.',
      disputeId: dispute.id,
    }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/feed - Browse open bets
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/feed - Browse open bets
// ─────────────────────────────────────────────────────────────────────────────

const getFeedRoute = createRoute({
  method: 'get',
  path: '/feed',
  tags: ['Bets'],
  summary: 'Get bets feed',
  description: 'Retrieve a list of bets with filtering options',
  request: {
    query: z.object({
      limit: z.string().optional().openapi({ description: 'Number of items to return (max 50)', example: '20' }),
      agentId: z.string().optional().openapi({ description: 'Filter by agent ID (proposer or counter)' }),
      status: z.enum(['open', 'countered', 'win_claimed', 'disputed', 'resolved', 'cancelled', 'all']).optional().openapi({ description: 'Filter by bet status' }),
      sort: z.enum(['newest', 'high_stakes']).optional().openapi({ description: 'Sort order' }),
    }),
  },
  responses: {
    200: {
      description: 'List of bets',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            bets: z.array(BetWithActorsSchema) 
          })),
        },
      },
    },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(getFeedRoute, async (c) => {
  const db = getDb();
  const { limit: limitStr, agentId, status, sort } = c.req.valid('query');
  const limit = Math.min(parseInt(limitStr || '20'), 50);

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
    success: true as const,
    data: { bets: results },
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/my-bets
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/my-bets
// ─────────────────────────────────────────────────────────────────────────────

const getMyBetsRoute = createRoute({
  method: 'get',
  path: '/my-bets',
  tags: ['Bets'],
  summary: 'Get my bets',
  description: 'Retrieve bets where the authenticated agent is a participant',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'List of my bets',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            bets: z.array(BetWithActorsSchema) 
          })),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(getMyBetsRoute, async (c) => {
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
    success: true as const,
    data: { bets: myBets },
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/:id
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// GET /bets/:id
// ─────────────────────────────────────────────────────────────────────────────

const getBetByIdRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Bets'],
  summary: 'Get bet details',
  description: 'Retrieve detailed information about a specific bet, including events',
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Bet details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            bet: BetWithEventsSchema 
          })),
        },
      },
    },
    404: { description: 'Bet not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Server error', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(getBetByIdRoute, async (c) => {
  const { id: betId } = c.req.valid('param');
  const db = getDb();

  const bet = await db.query.bets.findFirst({
    where: eq(bets.id, betId),
    with: {
        proposer: true,
        counter: true,
    }
  });

  if (!bet) {
    return c.json({ success: false as const, error: 'Bet not found' }, 404);
  }

  // Fetch events
  const events = await db.query.betEvents.findMany({
      where: eq(betEvents.betId, betId),
      orderBy: desc(betEvents.createdAt)
  });

  return c.json({
    success: true as const,
    data: { bet: { ...bet, events: events.map(e => ({ ...e, data: e.data })) as any } },
  }, 200);
});

export default app;
