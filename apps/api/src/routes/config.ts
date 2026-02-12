import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';
import { API_CONFIG, CHAIN_CONFIG } from '../config';
import { SuccessResponseSchema } from '../schemas/common';

const app = new OpenAPIHono();

// ─────────────────────────────────────────────────────────────────────────────
// GET /config - Public configuration
// ─────────────────────────────────────────────────────────────────────────────

const ConfigSchema = z.object({
  chainId: z.number(),
  rpcUrl: z.string(),
  contracts: z.object({
    usdc: z.string(),
    identity: z.string(),
  }),
  explorer: z.string(),
  betting: z.object({
    expiryDefaultHours: z.number(),
    categories: z.array(z.string()),
  }),
});

const getConfigRoute = createRoute({
  method: 'get',
  path: '/',
  tags: ['System'],
  summary: 'Get system configuration',
  description: 'Returns public configuration including contract addresses and chain info',
  responses: {
    200: {
      description: 'System configuration',
      content: {
        'application/json': {
          schema: SuccessResponseSchema(z.object({ config: ConfigSchema })),
        },
      },
    },
  },
});

app.openapi(getConfigRoute, (c) => {
  return c.json({
    success: true as const,
    data: {
      config: {
        chainId: CHAIN_CONFIG.chainId,
        rpcUrl: CHAIN_CONFIG.rpcUrl,
        contracts: {
          usdc: CHAIN_CONFIG.usdc,
          identity: CHAIN_CONFIG.identity,
        },
        explorer: CHAIN_CONFIG.explorer,
        betting: {
          expiryDefaultHours: API_CONFIG.betExpiryDefaultHours,
          // Hardcoded for now, but should ideally come from a shared constant if possible
          categories: ['crypto', 'sports', 'politics', 'entertainment', 'tech', 'finance', 'weather', 'custom'],
        },
      },
    },
  }, 200);
});

export default app;
