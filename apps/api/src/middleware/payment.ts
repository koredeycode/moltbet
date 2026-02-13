// x402 Payment Middleware for betting endpoints (Standard x402 Flow)
import { HTTPFacilitatorClient } from '@x402/core/server';
import type { Network } from '@x402/core/types';
import { ExactEvmScheme } from '@x402/evm/exact/server';
import { paymentMiddleware, x402ResourceServer } from '@x402/hono';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// Configuration (Aligned with Skale Docs structure)
// ─────────────────────────────────────────────────────────────────────────────

const facilitatorUrl = env.FACILITATOR_URL;
const receivingAddress = env.RECEIVING_ADDRESS as `0x${string}`;
const paymentTokenAddress = env.USDC_ADDRESS as `0x${string}`;
const paymentTokenName = "Bridged USDC (SKALE Bridge)";
const networkChainId = env.NETWORK_CHAIN_ID || "324705682";
const network: Network = `eip155:${networkChainId}`;

// Setup facilitator client and resource server
console.log(`Connecting to Facilitator at: ${facilitatorUrl} for network: ${network}`);
const facilitatorClient = new HTTPFacilitatorClient({ url: facilitatorUrl });
const resourceServer = new x402ResourceServer(facilitatorClient);

// Register the exact scheme for EVM networks
// resourceServer.register("eip155:*", new ExactEvmScheme());

resourceServer.register(network, new ExactEvmScheme());

// ─────────────────────────────────────────────────────────────────────────────
// Payment Configuration Helpers
// ─────────────────────────────────────────────────────────────────────────────

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
        network: network,
        payTo: receivingAddress,
        price: {
          amount: amountInUnits,
          asset: paymentTokenAddress,
          extra: {
            name: paymentTokenName,
            version: "2",
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
 */
export function createStakeMiddleware(stakeUsdc: string, description: string) {
  const config = createPaymentRequirements(stakeUsdc, description);
  // Wrap in wildcard route config so it applies to the route it's attached to
  return paymentMiddleware({ '*': config }, resourceServer);
}

export { facilitatorClient, resourceServer };
