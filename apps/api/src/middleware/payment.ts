// x402 Payment Middleware for betting endpoints (Standard x402 Flow)
import { HTTPFacilitatorClient } from '@x402/core/server';
import type { Network } from '@x402/core/types';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { paymentMiddleware, x402ResourceServer } from '@x402/hono';
import { baseSepolia } from 'viem/chains';
import { env } from '../config/env';
import { FACILITATOR_ADDRESS } from '../services/facilitator';

// ─────────────────────────────────────────────────────────────────────────────
// x402 Resource Server Setup
// ─────────────────────────────────────────────────────────────────────────────

const facilitatorClient = new HTTPFacilitatorClient({
  url: env.FACILITATOR_URL,
});

const resourceServer = new x402ResourceServer(facilitatorClient);

// Register the exact EVM scheme for all EIP-155 networks
resourceServer.register('eip155:*', new ExactEvmScheme());

// ─────────────────────────────────────────────────────────────────────────────
// Payment Configuration Helpers
// ─────────────────────────────────────────────────────────────────────────────

const NETWORK: Network = `eip155:${baseSepolia.id}`;
const USDC_ADDRESS = env.USDC_ADDRESS as `0x${string}`;

/**
 * Create standard x402 payment requirements for a given USDC amount
 */
export function createPaymentRequirements(
  amountUsdc: string,
  description: string
): { accepts: any[], description: string, mimeType: string } {
  // Convert human-readable USDC to 6-decimal units
  const amountInUnits = (parseFloat(amountUsdc) * 1_000_000).toString();

  return {
    accepts: [
      {
        scheme: 'exact' as const,
        network: NETWORK,
        payTo: FACILITATOR_ADDRESS as `0x${string}`,
        price: {
          amount: amountInUnits,
          asset: USDC_ADDRESS,
          extra: {
            name: 'USD Coin',
            version: '2',
          },
        },
      },
    ],
    description,
    mimeType: 'application/json',
  }
}

/**
 * Create x402 payment middleware for a specific route with a given stake
 * 
 * Usage:
 *   app.use('/route', createStakeMiddleware('10.00', 'Bet stake payment'))
 */
export function createStakeMiddleware(stakeUsdc: string, description: string) {
  const config = createPaymentRequirements(stakeUsdc, description);
  // Wrap in wildcard route config so it applies to the route it's attached to
  return paymentMiddleware({ '*': config }, resourceServer);
}

export { facilitatorClient, resourceServer };

