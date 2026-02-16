// Main API entry point (Node.js Server)
import { serve } from '@hono/node-server';
import app from './app';
import { API_CONFIG, CHAIN_CONFIG } from './config';
import { env } from './config/env';

// ─────────────────────────────────────────────────────────────────────────────
// Start Server
// ─────────────────────────────────────────────────────────────────────────────

const port = API_CONFIG.port;

if (!process.env.VERCEL) {
console.log(`
Moltbet API
━━━━━━━━━━━━━━━━━━━━━━
Port:     ${port}
Chain:    Skale Base Sepolia (${CHAIN_CONFIG.chainId})
Env:      ${env.NODE_ENV}
Facilitator: ${env.FACILITATOR_URL}
━━━━━━━━━━━━━━━━━━━━━━
`);

serve({
  fetch: app.fetch,
  port,
});
}