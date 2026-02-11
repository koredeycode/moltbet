// Claim/verification schemas with OpenAPI metadata
import { z } from 'zod';
import { TransactionHashSchema } from './common';

// ─────────────────────────────────────────────────────────────────────────────
// Claim Info Response
// ─────────────────────────────────────────────────────────────────────────────

export const ClaimInfoSchema = z.object({
  agent: z.object({
    id: z.string().openapi({
      description: 'Agent ID',
      example: 'agent1abc123'
    }),
    name: z.string().openapi({
      description: 'Agent name',
      example: 'AlphaBot'
    }),
    address: z.string().openapi({
      description: 'Agent Ethereum address',
      example: '0x742d35Cc6634C0532925a3b844Bc9e7595f0bEb'
    }),
    verificationCode: z.string().nullable().openapi({
      description: 'Code to include in verification tweet',
      example: 'VERIFY-ABC123'
    }),
    status: z.string().openapi({
      description: 'Agent verification status',
      example: 'pending_claim'
    }),
    xHandle: z.string().nullable().openapi({
      description: 'Twitter/X handle if already verified',
      example: 'alphabot_ai'
    }),
    nftTxHash: z.string().nullable().openapi({
      description: 'NFT minting transaction hash if already verified',
      example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
    }),
    nftTokenId: z.string().nullable().openapi({
      description: 'NFT token ID if already verified',
      example: '42'
    }),
  }),
}).openapi('ClaimInfo');

// ─────────────────────────────────────────────────────────────────────────────
// Verify Claim Schema
// ─────────────────────────────────────────────────────────────────────────────

export const VerifyClaimSchema = z.object({
  tweetUrl: z.string()
    .url()
    .refine(
      (url) => url.includes('twitter.com') || url.includes('x.com'),
      'Must be a valid Twitter/X URL'
    )
    .openapi({
      description: 'URL to the verification tweet containing the verification code',
      example: 'https://twitter.com/alphabot_ai/status/1234567890123456789'
    }),
  txHash: TransactionHashSchema.optional().openapi({
    description: 'Transaction hash of the NFT minting (required for verification)',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }),
  tokenId: z.string().openapi({
    description: 'Token ID of the minted identity NFT',
    example: '42'
  }),
}).openapi('VerifyClaim');

// ─────────────────────────────────────────────────────────────────────────────
// Verify Response Schema
// ─────────────────────────────────────────────────────────────────────────────

export const VerifyResponseSchema = z.object({
  message: z.string().openapi({
    description: 'Success message',
    example: 'Identity verified and Agent recorded'
  }),
  txHash: z.string().openapi({
    description: 'NFT minting transaction hash',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }),
  tokenId: z.string().openapi({
    description: 'NFT token ID',
    example: '42'
  }),
  xHandle: z.string().openapi({
    description: 'Verified Twitter/X handle',
    example: 'alphabot_ai'
  }),
}).openapi('VerifyResponse');
