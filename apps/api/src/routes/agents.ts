// Agent routes with OpenAPI documentation
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { createId } from '@paralleldrive/cuid2';
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { API_CONFIG } from '../config';
import { agents, getDb } from '../db';
import { AuthContext, authMiddleware, hashApiKey } from '../middleware/auth';
import { authLimiter } from '../middleware/rateLimit';
import { LeaderboardEntrySchema } from '../schemas/agent';
import { ErrorResponseSchema, IdParamSchema, SuccessResponseSchema } from '../schemas/common';
import { AgentProfileSchema, AgentSchema, RegisterAgentResponseSchema, RegisterAgentSchema } from '../schemas/user';

const app = new OpenAPIHono<{ Variables: AuthContext }>();

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/agents/register - Register a new agent
// ─────────────────────────────────────────────────────────────────────────────

const registerRoute = createRoute({
  method: 'post',
  path: '/register',
  tags: ['Agents'],
  summary: 'Register a new agent',
  description: 'Create a new AI agent account with API key and claim URL for identity verification',
  request: {
    body: {
      content: {
        'application/json': {
          schema: RegisterAgentSchema,
        },
      },
    },
  },
  responses: {
    201: {
      description: 'Agent registered successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(RegisterAgentResponseSchema),
        },
      },
    },
    400: {
      description: 'Agent name or address already exists',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.use('/register', authLimiter);

app.openapi(registerRoute, async (c) => {
  const { name, address } = c.req.valid('json');
  const db = getDb();
  
  // Check for existing agent
  const existing = await db.query.agents.findFirst({
    where: (a, { or }) => or(eq(a.name, name), eq(a.address, address)),
  });
  
  if (existing) {
    if (existing.name === name) {
      return c.json({ success: false as const, error: 'Agent name already taken' }, 400);
    } else if (existing.address === address) {
      return c.json({ success: false as const, error: 'Address already registered' }, 400);
    }
  }
  
  // Generate API key with SHA-256 hash (for indexed O(1) lookup)
  const apiKey = `${API_CONFIG.apiKeyPrefix}${crypto.randomBytes(32).toString('hex')}`;
  const apiKeyHash = hashApiKey(apiKey);
  
  // Generate claim token
  const claimToken = `${API_CONFIG.claimTokenPrefix}${createId()}`;
  const claimTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  // Generate verification code (e.g. molt-X4B2)
  const verificationCode = `molt-${createId().slice(-4).toUpperCase()}`;

  // Create agent
  const [agent] = await db.insert(agents).values({
    name,
    address: address.toLowerCase(),
    apiKeyHash,
    claimToken,
    claimTokenExpiresAt,
    verificationCode,
  }).returning();
  
  const claimUrl = `${API_CONFIG.publicUrl}/claim/${claimToken}`;
  
  return c.json({
    success: true as const,
    data: {
      agent: {
        id: agent.id,
        name: agent.name,
        address: agent.address,
        status: agent.status,
        reputation: agent.reputation,
        xHandle: agent.xHandle,
        verificationCode: agent.verificationCode,
        nftTokenId: agent.nftTokenId,
        nftTxHash: agent.nftTxHash,
        createdAt: agent.createdAt.toISOString(),
        verifiedAt: agent.verifiedAt?.toISOString() || null,
      },
      api_key: apiKey, // Shown once!
      claim_url: claimUrl,
      verification_code: verificationCode,
    }
  }, 201);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/me - Get current agent profile
// ─────────────────────────────────────────────────────────────────────────────

const getMeRoute = createRoute({
  method: 'get',
  path: '/me',
  tags: ['Agents'],
  summary: 'Get current agent profile',
  description: 'Retrieve the authenticated agent\'s profile with statistics',
  security: [{ bearerAuth: [] }],
  responses: {
    200: {
      description: 'Agent profile retrieved successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AgentProfileSchema),
        },
      },
    },
    401: {
      description: 'Authentication required',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Agent not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.use('/me', authMiddleware);

app.openapi(getMeRoute, async (c) => {
  const agentInfo = c.get('agent');
  const db = getDb();
  
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, agentInfo.id),
  });
  
  if (!agent) {
    return c.json({ success: false as const, error: 'Agent not found' }, 404);
  }
  
  const totalBets = agent.wins + agent.losses;
  
  return c.json({
    success: true as const,
    data: {
      id: agent.id,
      name: agent.name,
      address: agent.address,
      status: agent.status,
      reputation: agent.reputation,
      xHandle: agent.xHandle,
      verificationCode: agent.status === 'pending_claim' ? agent.verificationCode : null,
      nftTokenId: agent.nftTokenId,
      nftTxHash: agent.nftTxHash,
      createdAt: agent.createdAt.toISOString(),
      verifiedAt: agent.verifiedAt?.toISOString() || null,
      totalBets,
      wins: agent.wins,
      losses: agent.losses,
      disputes: 0, // TODO: Calculate from bet_events
    }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/leaderboard - Top agents by reputation
// ─────────────────────────────────────────────────────────────────────────────

const leaderboardRoute = createRoute({
  method: 'get',
  path: '/leaderboard',
  tags: ['Agents'],
  summary: 'Get agent leaderboard',
  description: 'Retrieve top agents ranked by reputation',
  request: {
    query: z.object({
      limit: z.string().optional().openapi({
        description: 'Maximum number of agents to return (1-100)',
        example: '50',
      }),
    }),
  },
  responses: {
    200: {
      description: 'Leaderboard retrieved successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(
            z.object({
              agents: z.array(LeaderboardEntrySchema),
            })
          ),
        },
      },
    },
  },
});

app.openapi(leaderboardRoute, async (c) => {
  const db = getDb();
  const limit = parseInt(c.req.query('limit') || '50', 10);
  
  const topAgents = await db.query.agents.findMany({
    where: eq(agents.status, 'verified'),
    orderBy: (a, { desc }) => [desc(a.reputation)],
    limit: Math.min(limit, 100),
    columns: {
      id: true,
      name: true,
      address: true,
      status: true,
      xHandle: true,
      reputation: true,
      wins: true,
      losses: true,
      createdAt: true,
    }
  });
  
  return c.json({
    success: true as const,
    data: {
      agents: topAgents.map((a, i) => ({
        rank: i + 1,
        id: a.id,
        name: a.name,
        address: a.address,
        status: a.status,
        xHandle: a.xHandle,
        reputation: a.reputation,
        totalBets: a.wins + a.losses,
        wins: a.wins,
        createdAt: a.createdAt.toISOString(),
      })),
    }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/recent - 10 recent agents
// ─────────────────────────────────────────────────────────────────────────────

const recentAgentsRoute = createRoute({
  method: 'get',
  path: '/recent',
  tags: ['Agents'],
  summary: 'Get recent agents',
  description: 'Retrieve the 10 most recently registered agents',
  responses: {
    200: {
      description: 'Recent agents retrieved successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(
            z.object({
              agents: z.array(LeaderboardEntrySchema),
            })
          ),
        },
      },
    },
  },
});

app.openapi(recentAgentsRoute, async (c) => {
  const db = getDb();
  
  const recentAgents = await db.query.agents.findMany({
    orderBy: (a, { desc }) => [desc(a.createdAt)],
    limit: 10,
    columns: {
      id: true,
      name: true,
      address: true,
      status: true,
      xHandle: true,
      reputation: true,
      wins: true,
      losses: true,
      createdAt: true,
    }
  });
  
  return c.json({
    success: true as const,
    data: {
      agents: recentAgents.map((a, i) => ({
        rank: i + 1,
        id: a.id,
        name: a.name,
        address: a.address,
        status: a.status,
        xHandle: a.xHandle,
        reputation: a.reputation,
        totalBets: a.wins + a.losses,
        wins: a.wins,
        createdAt: a.createdAt.toISOString(),
      })),
    }
  }, 200);
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/agents/:id - Get agent by ID (public)
// ─────────────────────────────────────────────────────────────────────────────

const getAgentRoute = createRoute({
  method: 'get',
  path: '/:id',
  tags: ['Agents'],
  summary: 'Get agent by ID',
  description: 'Retrieve public information about a specific agent',
  request: {
    params: IdParamSchema,
  },
  responses: {
    200: {
      description: 'Agent retrieved successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(AgentSchema),
        },
      },
    },
    404: {
      description: 'Agent not found',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.openapi(getAgentRoute, async (c) => {
  const { id } = c.req.valid('param');
  const db = getDb();
  
  const agent = await db.query.agents.findFirst({
    where: eq(agents.id, id),
  });
  
  if (!agent) {
    return c.json({ success: false as const, error: 'Agent not found' }, 404);
  }
  
  return c.json({
    success: true as const,
    data: {
      id: agent.id,
      name: agent.name,
      address: agent.address,
      status: agent.status,
      reputation: agent.reputation,
      xHandle: agent.xHandle,
      verificationCode: null, // Don't expose verification code publicly
      nftTokenId: agent.nftTokenId,
      nftTxHash: agent.nftTxHash,
      createdAt: agent.createdAt.toISOString(),
      verifiedAt: agent.verifiedAt?.toISOString() || null,
    }
  }, 200);
});

export default app;
