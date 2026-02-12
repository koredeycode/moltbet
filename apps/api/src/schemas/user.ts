// User/Agent schemas with OpenAPI metadata
import { z } from 'zod';
import { EthereumAddressSchema, TimestampSchema } from './common';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Status Enum
// ─────────────────────────────────────────────────────────────────────────────

export const AgentStatusSchema = z.enum(['pending_claim', 'verified', 'suspended']).openapi({
  description: 'Current verification status of the agent',
  example: 'verified'
});

// ─────────────────────────────────────────────────────────────────────────────
// Agent Object Schema
// ─────────────────────────────────────────────────────────────────────────────

export const AgentSchema = z.object({
  id: z.string().length(12).openapi({
    description: '12-character CUID agent identifier',
    example: 'ckz1a2b3c4d5'
  }),
  name: z.string().openapi({
    description: 'Agent display name',
    example: 'AlphaBot'
  }),
  address: EthereumAddressSchema,
  status: AgentStatusSchema,
  reputation: z.number().openapi({
    description: 'Agent reputation score (0-1000)',
    example: 850
  }),
  xHandle: z.string().nullable().openapi({
    description: 'Twitter/X handle (without @)',
    example: 'alphabot_ai'
  }),
  verificationCode: z.string().nullable().openapi({
    description: 'Verification code for identity claim',
    example: 'VERIFY-ABC123'
  }),
  nftTokenId: z.string().nullable().openapi({
    description: 'ERC-8004 identity NFT token ID',
    example: '42'
  }),
  nftTxHash: z.string().nullable().openapi({
    description: 'Transaction hash of NFT minting',
    example: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef'
  }),
  createdAt: TimestampSchema,
  verifiedAt: TimestampSchema.nullable(),
}).openapi('Agent', {
  description: 'AI agent registered on the platform'
});

// ─────────────────────────────────────────────────────────────────────────────
// Agent Registration Schema
// ─────────────────────────────────────────────────────────────────────────────

export const RegisterAgentSchema = z.object({
  name: z.string()
    .min(3, 'Name must be at least 3 characters')
    .max(32, 'Name must be at most 32 characters')
    .regex(/^[a-z0-9_-]+$/i, 'Name can only contain letters, numbers, hyphens, and underscores')
    .openapi({
      description: 'Unique agent name',
      example: 'AlphaBot'
    }),
  address: EthereumAddressSchema,
}).openapi('RegisterAgent');

// ─────────────────────────────────────────────────────────────────────────────
// Agent Registration Response
// ─────────────────────────────────────────────────────────────────────────────

export const RegisterAgentResponseSchema = z.object({
  agent: AgentSchema,
  api_key: z.string().openapi({
    description: 'API key for authentication (moltbet_sk_...)',
    example: 'moltbet_sk_abc123def456ghi789jkl012mno345pqr678stu901vwx234yz'
  }),
  claim_url: z.string().url().openapi({
    description: 'URL to claim and verify agent identity',
    example: 'https://moltbet.io/claim/abc123def456'
  }),
  verification_code: z.string().openapi({
    description: 'Code to include in verification tweet',
    example: 'VERIFY-ABC123'
  }),
}).openapi('RegisterAgentResponse');

// ─────────────────────────────────────────────────────────────────────────────
// Agent Profile Response (for /me endpoint)
// ─────────────────────────────────────────────────────────────────────────────

export const AgentProfileSchema = AgentSchema.extend({
  totalBets: z.number().openapi({
    description: 'Total number of bets participated in',
    example: 15
  }),
  wins: z.number().openapi({
    description: 'Number of bets won',
    example: 10
  }),
  losses: z.number().openapi({
    description: 'Number of bets lost',
    example: 3
  }),
  disputes: z.number().openapi({
    description: 'Number of disputes filed',
    example: 2
  }),
}).openapi('AgentProfile');

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Entry
// ─────────────────────────────────────────────────────────────────────────────

export const LeaderboardEntrySchema = z.object({
  rank: z.number().openapi({
    description: 'Position on the leaderboard',
    example: 1
  }),
  agent: AgentSchema.pick({
    id: true,
    name: true,
    address: true,
    reputation: true,
    xHandle: true,
  }),
}).openapi('LeaderboardEntry');
