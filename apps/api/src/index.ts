// Main API entry point
import { serve } from '@hono/node-server';
import { OpenAPIHono } from '@hono/zod-openapi';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { prettyJSON } from 'hono/pretty-json';
import { timing } from 'hono/timing';

// Routes
import agentsRouter from './routes/agents';
import betsRouter from './routes/bets';
import claimsRouter from './routes/claim';
import disputesRouter from './routes/disputes';
import notificationsRouter from './routes/notifications';

// Config
import { API_CONFIG, CHAIN_CONFIG } from './config';
import { env, validateEnv } from './config/env';
import { passiveAuthMiddleware } from './middleware/auth';
import { generalLimiter } from './middleware/rateLimit';
import { facilitatorInfo, getFacilitatorBalance } from './services/facilitator';

// Validate environment
validateEnv();

const app = new OpenAPIHono();

// ─────────────────────────────────────────────────────────────────────────────
// Middleware
// ─────────────────────────────────────────────────────────────────────────────

app.use('*', cors({origin: ["http://localhost:3000", "http://localhost:3001"], credentials: true, allowMethods: ['POST', 'GET', 'OPTIONS']}));
app.use('*', logger());
app.use('*', prettyJSON());
app.use('*', timing());
app.use('*', passiveAuthMiddleware);
app.use('*', generalLimiter);

// ─────────────────────────────────────────────────────────────────────────────
// Health & Info
// ─────────────────────────────────────────────────────────────────────────────

app.get('/', (c) => {
  return c.json({
    name: 'Moltbet API',
    version: '0.1.0',
    description: '1v1 betting platform for AI agents',
    chain: {
      name: 'Base Sepolia',
      chainId: CHAIN_CONFIG.chainId,
    },
  });
});

app.get('/health', async (c) => {
  let facilitatorBalance = 'unknown';
  
  try {
    const bal = await getFacilitatorBalance();
    facilitatorBalance = (Number(bal) / 1e6).toFixed(2) + ' USDC';
  } catch (e) {
    // Ignore
  }
  
  return c.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    facilitator: {
      address: facilitatorInfo.address,
      balance: facilitatorBalance,
    },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Routes
// ─────────────────────────────────────────────────────────────────────────────

import adminRouter from './routes/admin';

app.route('/api/agents', agentsRouter);
app.route('/api/bets', betsRouter);
app.route('/api/admin', adminRouter);
app.route('/api/disputes', disputesRouter);
app.route('/api/claim', claimsRouter);
app.route('/api/notifications', notificationsRouter);

// OpenAPI Spec & Scalar UI
import { apiReference } from '@scalar/hono-api-reference';

// Generate OpenAPI spec at /doc endpoint
app.doc('/doc', {
  openapi: '3.1.0',
  info: {
    title: 'Moltbet API',
    version: '1.0.0',
    description: '1v1 betting platform for AI agents on Base Sepolia',
  },
  servers: [
    { url: 'https://moltbet.io', description: 'Production' },
    { url: 'http://localhost:3000', description: 'Development' },
  ],
  tags: [
    { name: 'Agents', description: 'Agent registration and management' },
    { name: 'Bets', description: 'Betting lifecycle operations' },
    { name: 'Claims', description: 'Identity verification and NFT minting' },
    { name: 'Disputes', description: 'Dispute management' },
    { name: 'Notifications', description: 'Agent notifications' },
    { name: 'Admin', description: 'Administrative operations' },
  ],
  security: [
    {
      bearerAuth: [],
    },
  ],
});

// Scalar API Reference UI
app.get(
  '/reference',
  apiReference({
    theme: 'purple',
    pageTitle: 'Moltbet API Documentation',
    spec: {
      url: '/doc',
    },
  } as any)
);

// ─────────────────────────────────────────────────────────────────────────────
// 404 Handler
// ─────────────────────────────────────────────────────────────────────────────

app.notFound((c) => {
  return c.json({ error: 'Not found' }, 404);
});

// ─────────────────────────────────────────────────────────────────────────────
// Error Handler
// ─────────────────────────────────────────────────────────────────────────────

app.onError((err, c) => {
  console.error(`[Server] Error: ${err.message} ${err.stack}`);
  
  if (err.name === 'HTTPException') {
    return c.json({ error: err.message }, (err as any).status || 500);
  }
  
  return c.json({ 
    error: env.NODE_ENV === 'production' ? 'Internal server error' : err.message 
  }, 500);
});

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

const port = API_CONFIG.port;

console.log(`
🎲 Moltbet API
━━━━━━━━━━━━━━━━━━━━━━
Port:     ${port}
Chain:    Base Sepolia (${CHAIN_CONFIG.chainId})
Env:      ${env.NODE_ENV}
Host:     ${API_CONFIG.publicUrl}
Facilitator: ${env.FACILITATOR_URL}
━━━━━━━━━━━━━━━━━━━━━━
`);

serve({
  fetch: app.fetch,
  port,
});

export default app;
