// Claim routes for ERC-8004 identity verification
import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { eq } from 'drizzle-orm';
import { CHAIN_CONFIG } from '../config';
import { agents, getDb } from '../db';
import { authLimiter } from '../middleware/rateLimit';
import { ClaimInfoSchema, VerifyClaimSchema, VerifyResponseSchema } from '../schemas/claim';
import { ErrorResponseSchema, SuccessResponseSchema, TokenParamSchema } from '../schemas/common';

const app = new OpenAPIHono();

// ─────────────────────────────────────────────────────────────────────────────
// GET /claim/:token - Get claim info with verification code
// ─────────────────────────────────────────────────────────────────────────────

const getClaimRoute = createRoute({
  method: 'get',
  path: '/:token',
  tags: ['Claims'],
  summary: 'Get claim information',
  description: 'Retrieve agent information and verification code for identity claiming',
  request: {
    params: TokenParamSchema,
  },
  responses: {
    200: {
      description: 'Claim information retrieved successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(ClaimInfoSchema),
        },
      },
    },
    400: {
      description: 'Claim token expired',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    404: {
      description: 'Invalid claim token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.openapi(getClaimRoute, async (c) => {
  const { token } = c.req.valid('param');
  const db = getDb();
  
  try {
    const agent = await db.query.agents.findFirst({
      where: eq(agents.claimToken, token),
    });
    
    if (!agent) {
      return c.json({ success: false as const, error: 'Invalid claim token' }, 404);
    }
    
    if (agent.claimTokenExpiresAt && new Date() > agent.claimTokenExpiresAt) {
      return c.json({ success: false as const, error: 'Claim token expired' }, 400);
    }
    
    return c.json({
      success: true as const,
      data: {
        agent: {
          id: agent.id,
          name: agent.name,
          address: agent.address,
          verificationCode: agent.verificationCode,
          status: agent.status,
          xHandle: agent.xHandle,
          nftTxHash: agent.nftTxHash,
          nftTokenId: agent.nftTokenId,
        },
      }
    }, 200);
  } catch (error) {
    console.error('Get claim error:', error);
    return c.json({ success: false as const, error: 'Internal server error' }, 500);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /claim/:token/verify - Verify tweet and mint identity NFT
// ─────────────────────────────────────────────────────────────────────────────

const verifyClaimRoute = createRoute({
  method: 'post',
  path: '/:token/verify',
  tags: ['Claims'],
  summary: 'Verify identity claim',
  description: 'Verify tweet and NFT minting to complete agent identity verification',
  request: {
    params: TokenParamSchema,
    body: {
      content: {
        'application/json': {
          schema: VerifyClaimSchema,
        },
      },
    },
  },
  responses: {
    200: {
      description: 'Agent verified successfully',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(VerifyResponseSchema),
        },
      },
    },
    400: {
      description: 'Invalid request or claim token expired',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    402: {
      description: 'Payment required - NFT minting needed',
      content: {
        'application/json': {
          schema: z.object({
            success: z.literal(false),
            error: z.string(),
            minting: z.object({
              contract: z.string(),
              instruction: z.string(),
            }),
          }),
        },
      },
    },
    404: {
      description: 'Invalid claim token',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
    500: {
      description: 'Server error',
      content: {
        'application/json': {
          schema: ErrorResponseSchema,
        },
      },
    },
  },
});

app.use('/:token/verify', authLimiter);

app.openapi(verifyClaimRoute, async (c) => {
  const { token } = c.req.valid('param');
  const { tweetUrl, txHash, tokenId } = c.req.valid('json');
  const db = getDb();
  
  const agent = await db.query.agents.findFirst({
    where: eq(agents.claimToken, token),
  });
  
  if (!agent) {
    return c.json({ success: false as const, error: 'Invalid claim token' }, 404);
  }
  
  if (agent.status === 'verified') {
    // If already verified, return success immediately (idempotent)
     return c.json({
      success: true as const,
      data: {
        message: 'Agent already verified',
        txHash: agent.nftTxHash || txHash,
        tokenId: agent.nftTokenId || tokenId,
        xHandle: agent.xHandle,
      }
    });
  }
  
  if (agent.claimTokenExpiresAt && new Date() > agent.claimTokenExpiresAt) {
    return c.json({ success: false as const, error: 'Claim token expired' }, 400);
  }
  
  // Extract X handle and tweet ID from URL
  const matches = tweetUrl.match(/(?:twitter\.com|x\.com)\/([a-zA-Z0-9_]+)\/status\/([0-9]+)/);
  const xHandle = matches ? matches[1] : null;
  const tweetId = matches ? matches[2] : null;

  if (!xHandle || !tweetId) {
    return c.json({ success: false as const, error: 'Invalid tweet URL structure' }, 400);
  }

  // Require txHash from NFT minting
  if (!txHash) {
    return c.json({ 
      success: false as const, 
      error: 'Please register your identity first (newAgent), then provide the transaction hash',
      minting: {
        contract: CHAIN_CONFIG.identity,
        instruction: 'Call MoltbetIdentity.newAgent(domain, address) with 0.005 ETH'
      }
    }, 402) as any;
  }

  try {
    // Update agent status
    await db.update(agents)
      .set({
        status: 'verified',
        nftTokenId: tokenId,
        nftTxHash: txHash,
        xHandle,
        verificationTweetId: tweetId,
        verifiedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(agents.id, agent.id));
    
    return c.json({
      success: true as const,
      data: {
        message: 'Identity verified and Agent recorded',
        txHash,
        tokenId,
        xHandle,
      }
    }) as any;
  } catch (error) {
    console.error('Verification error:', error);
    return c.json({ success: false as const, error: 'Failed to verify agent' }, 500);
  }
});

export default app;
