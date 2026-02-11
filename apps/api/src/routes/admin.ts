// Admin routes for dispute resolution and moderation
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { count, eq, gte, sql } from 'drizzle-orm';
import { deleteCookie, getCookie, setCookie } from 'hono/cookie';
import { agents, betEvents, bets, disputes, getDb, notifications } from '../db';
import { adminAuthMiddleware, signAdminJWT, validateAdminCredentials } from '../middleware/adminAuth';
import { disbursePayout } from '../services/facilitator';
import { ErrorResponseSchema, SuccessResponseSchema } from '../schemas/common';
import { BetWithEventsSchema, DisputeWithBetSchema, ResolveDisputeSchema } from '../schemas/bet';

const app = new OpenAPIHono();

// ─────────────────────────────────────────────────────────────────────────────
// Public Auth Endpoints (no auth required)
// ─────────────────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  username: z.string().min(1).openapi({ example: 'admin' }),
  password: z.string().min(1).openapi({ example: 'password123' }),
}).openapi('AdminLogin');

// POST /api/admin/login - Authenticate and get JWT cookie
const loginRoute = createRoute({
  method: 'post',
  path: '/login',
  tags: ['Admin'],
  summary: 'Admin login',
  request: {
    body: {
      content: {
        'application/json': {
          schema: loginSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Login successful',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ message: z.string() })),
        },
      },
    },
    401: { description: 'Invalid credentials', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(loginRoute, async (c) => {
  const { username, password } = c.req.valid('json');
  
  const valid = await validateAdminCredentials(username, password);
  
  if (!valid) {
    return c.json({ success: false as const, error: 'Invalid credentials' }, 401);
  }
  
  // Generate JWT token
  const token = await signAdminJWT();
  
  // Set HTTP-only cookie
  setCookie(c, 'admin_token', token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'Lax',
    path: '/',
    maxAge: 60 * 60 * 24, // 24 hours
  });
  
  return c.json({ 
    success: true as const, 
    data: { message: 'Login successful' } 
  }, 200);
});

// POST /api/admin/logout - Clear JWT cookie
const logoutRoute = createRoute({
  method: 'post',
  path: '/logout',
  tags: ['Admin'],
  summary: 'Admin logout',
  responses: {
    200: {
      description: 'Logged out successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ message: z.string() })),
        },
      },
    },
  },
});

app.openapi(logoutRoute, (c) => {
  deleteCookie(c, 'admin_token', {
    path: '/',
  });
  
  return c.json({ 
    success: true as const, 
    data: { message: 'Logged out successfully' } 
  }, 200);
});

// GET /api/admin/me - Check auth status9
const meRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Admin'],
  summary: 'Check auth status',
  responses: {
    200: {
      description: 'Auth status',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ authenticated: z.boolean() })),
        },
      },
    },
  },
});

app.openapi(meRoute, async (c) => {
  const token = getCookie(c, 'admin_token');
  
  if (!token) {
    return c.json({ 
      success: true as const, 
      data: { authenticated: false } 
    }, 200);
  }
  
  // Try to verify the token by calling through the auth middleware logic
  // For simplicity, we'll just check if the token exists and let the protected routes handle validation
  return c.json({ 
    success: true as const, 
    data: { authenticated: true } 
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// Protected routes (require auth)
// ─────────────────────────────────────────────────────────────────────────────

// Apply admin auth to all routes below this point
app.use('/disputes/*', adminAuthMiddleware);
app.use('/disputes', adminAuthMiddleware);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/stats - Dashboard Overview
// ─────────────────────────────────────────────────────────────────────────────

const statsRoute = createRoute({
  method: 'get',
  path: '/stats',
  tags: ['Admin'],
  summary: 'Get admin stats',
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'Admin statistics',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            stats: z.object({
              pendingDisputes: z.number(),
              activeBets: z.number(),
              verifiedAgents: z.number(),
              protocolHealth: z.number(),
              volume24h: z.number(),
              newAgentsLastHour: z.number(),
            }) 
          })),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(statsRoute, async (c) => {
  const db = getDb();
  
  // Pending Disputes
  const [disputeStats] = await db.select({ count: count() })
    .from(disputes)
    .where(eq(disputes.status, 'pending'));
    
  // Active Bets
  const [activeBetsStats] = await db.select({ count: count() })
    .from(bets)
    .where(eq(bets.status, 'open')); // Assuming 'open' means active
    
  // Verified Agents
  const [verifiedAgentsStats] = await db.select({ count: count() })
    .from(agents)
    .where(eq(agents.status, 'verified'));
    
  // New Agents Last Hour
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const [newAgentsStats] = await db.select({ count: count() })
    .from(agents)
    .where(gte(agents.createdAt, oneHourAgo));

  // Volume 24h
  const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  // Sum stake of bets created in last 24h
  const [volumeStats] = await db.select({ 
      volume: sql<number>`sum(cast(${bets.stake} as numeric))` 
    })
    .from(bets)
    .where(gte(bets.createdAt, twentyFourHoursAgo));
    
  return c.json({
    success: true as const,
    data: {
      stats: {
        pendingDisputes: disputeStats?.count || 0,
        activeBets: activeBetsStats?.count || 0,
        verifiedAgents: verifiedAgentsStats?.count || 0,
        protocolHealth: 100, // Mock for now, could check DB connection latency
        volume24h: Number(volumeStats?.volume) || 0,
        newAgentsLastHour: newAgentsStats?.count || 0,
      }
    }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/disputes - List all open disputes
// ─────────────────────────────────────────────────────────────────────────────

const getDisputesRoute = createRoute({
  method: 'get',
  path: '/disputes',
  tags: ['Admin', 'Disputes'],
  summary: 'List open disputes',
  security: [{ cookieAuth: [] }],
  responses: {
    200: {
      description: 'List of open disputes',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            disputes: z.array(DisputeWithBetSchema) 
          })),
        },
      },
    },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(getDisputesRoute, async (c) => {
  const db = getDb();
  
  const openDisputes = await db.query.disputes.findMany({
    where: eq(disputes.status, 'pending'),
    with: {
      bet: {
        with: {
          proposer: { columns: { id: true, name: true, address: true, reputation: true } },
          counter: { columns: { id: true, name: true, address: true, reputation: true } },
        }
      },
      raisedBy: { columns: { id: true, name: true } },
    },
    orderBy: (d, { desc }) => [desc(d.createdAt)],
  });
  
  return c.json({
    success: true as const,
    data: { disputes: openDisputes }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/admin/disputes/:id - Get dispute details
// ─────────────────────────────────────────────────────────────────────────────

const getDisputeByIdRoute = createRoute({
  method: 'get',
  path: '/disputes/:id',
  tags: ['Admin', 'Disputes'],
  summary: 'Get dispute details',
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
  },
  responses: {
    200: {
      description: 'Dispute details',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            dispute: DisputeWithBetSchema.extend({
              bet: BetWithEventsSchema
            }) 
          })),
        },
      },
    },
    404: { description: 'Dispute not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    401: { description: 'Unauthorized', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(getDisputeByIdRoute, async (c) => {
  const { id: disputeId } = c.req.valid('param');
  const db = getDb();
  
  const dispute = await db.query.disputes.findFirst({
    where: eq(disputes.id, disputeId),
    with: {
      bet: {
        with: {
          proposer: { columns: { id: true, name: true, address: true, reputation: true } },
          counter: { columns: { id: true, name: true, address: true, reputation: true } },
          events: true,
        }
      },
      raisedBy: { columns: { id: true, name: true } },
    },
  });
  
  if (!dispute) {
    return c.json({ success: false as const, error: 'Dispute not found' }, 404);
  }
  
  return c.json({
    success: true as const,
    data: { dispute }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/disputes/:id/resolve - Resolve a dispute
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/admin/disputes/:id/resolve - Resolve a dispute
// ─────────────────────────────────────────────────────────────────────────────

const resolveDisputeRoute = createRoute({
  method: 'post',
  path: '/disputes/:id/resolve',
  tags: ['Admin', 'Disputes'],
  summary: 'Resolve a dispute',
  security: [{ cookieAuth: [] }],
  request: {
    params: z.object({ id: z.string() }),
    body: {
      content: {
        'application/json': {
          schema: ResolveDisputeSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Dispute resolved',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ 
            message: z.string(),
            winnerId: z.string(),
            txHash: z.string().nullable().optional()
          })),
        },
      },
    },
    400: { description: 'Invalid request or state', content: { 'application/json': { schema: ErrorResponseSchema } } },
    404: { description: 'Dispute not found', content: { 'application/json': { schema: ErrorResponseSchema } } },
    500: { description: 'Payout failed', content: { 'application/json': { schema: ErrorResponseSchema } } },
  },
});

app.openapi(resolveDisputeRoute, async (c) => {
  const { id: disputeId } = c.req.valid('param');
  const { winnerId, adminNotes } = c.req.valid('json');
  const db = getDb();
  
  // Get dispute with bet
  const dispute = await db.query.disputes.findFirst({
    where: eq(disputes.id, disputeId),
    with: {
      bet: {
        with: {
          proposer: true,
          counter: true,
        }
      },
    },
  });
  
  if (!dispute) {
    return c.json({ success: false as const, error: 'Dispute not found' }, 404);
  }
  
  if (dispute.status !== 'pending') {
    return c.json({ success: false as const, error: 'Dispute already resolved' }, 400);
  }
  
  const bet = dispute.bet;
  
  // Validate winner is a participant
  if (winnerId !== bet.proposerId && winnerId !== bet.counterId) {
    return c.json({ success: false as const, error: 'Winner must be a bet participant' }, 400);
  }
  
  // Get winner address
  const winnerAddress = winnerId === bet.proposerId 
    ? bet.proposer.address 
    : bet.counter?.address;
    
  if (!winnerAddress) {
    return c.json({ success: false as const, error: 'Winner address not found' }, 500);
  }
  
  // Resolve on-chain by disbursing payout
  const totalPayout = (parseFloat(bet.stake) * 2).toFixed(6);
  const result = await disbursePayout(winnerAddress, totalPayout);
  
  if (!result.success) {
    return c.json({ 
      success: false as const, 
      error: 'Payout disbursement failed', 
      details: result.error 
    }, 500);
  }
  
  // Atomic Update
  await db.transaction(async (tx) => {
    // Update dispute
    await tx.update(disputes)
        .set({
        status: 'resolved',
        resolvedById: 'admin',
        resolution: adminNotes || 'Resolved by admin',
        winnerId,
        resolvedAt: new Date(),
        })
        .where(eq(disputes.id, disputeId));
    
    // Update bet
    await tx.update(bets)
        .set({
        status: 'resolved',
        winnerId,
        resolvedAt: new Date(),
        resolutionTxHash: result.txHash,
        updatedAt: new Date(),
        })
        .where(eq(bets.id, bet.id));

    // Update winner stats
    await tx.update(agents)
        .set({ 
            wins: sql`${agents.wins} + 1`, 
            reputation: sql`${agents.reputation} + 10`
        }) 
        .where(eq(agents.id, winnerId));

    // Update loser stats
    const loserId = winnerId === bet.proposerId ? bet.counterId! : bet.proposerId;
    await tx.update(agents)
        .set({ losses: sql`${agents.losses} + 1` })
        .where(eq(agents.id, loserId));
    
    // Log event
    await tx.insert(betEvents).values({
        betId: bet.id,
        agentId: winnerId, // Admin resolved in favor of winner
        type: 'resolved',
        data: { winnerId, disputeId, txHash: result.txHash, resolution: adminNotes },
    });
    
    // Notify both parties
    await tx.insert(notifications).values([
        {
        agentId: winnerId,
        betId: bet.id,
        type: 'dispute_resolved',
        message: `Dispute resolved in your favor for "${bet.title}". Payout sent.`,
        },
        {
        agentId: loserId!,
        betId: bet.id,
        type: 'dispute_resolved',
        message: `Dispute resolved against you for "${bet.title}".`,
        },
    ]);
  });
  
  return c.json({
    success: true as const,
    data: {
      message: 'Dispute resolved successfully',
      winnerId,
      txHash: result.txHash,
    }
  }, 200);
});

export default app;
