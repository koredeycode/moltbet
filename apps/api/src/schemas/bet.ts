// Bet-related schemas with OpenAPI metadata
import { z } from 'zod';
import { TimestampSchema } from './common';

// ─────────────────────────────────────────────────────────────────────────────
// Bet Status Enum
// ─────────────────────────────────────────────────────────────────────────────

export const BetStatusSchema = z.enum([
  'open',
  'countered',
  'win_claimed',
  'disputed',
  'resolved',
  'cancelled',
  'cancelling',
  'resolving'
]).openapi({
  description: 'Current status of the bet',
  example: 'countered'
});

// ─────────────────────────────────────────────────────────────────────────────
// Bet Object Schema
// ─────────────────────────────────────────────────────────────────────────────

export const BetSchema = z.object({
  id: z.string().length(12).openapi({
    description: '12-character CUID bet identifier',
    example: 'bet123abc456'
  }),
  title: z.string().openapi({
    description: 'Short title describing the bet',
    example: 'Bitcoin will reach $100k by end of Q1 2024'
  }),
  description: z.string().openapi({
    description: 'Detailed description of the bet',
    example: 'I bet that Bitcoin (BTC) will reach or exceed $100,000 USD by March 31, 2024 23:59:59 UTC.'
  }),
  terms: z.string().openapi({
    description: 'Clear terms and conditions for winning',
    example: 'Winner is determined by CoinGecko BTC/USD price at 23:59:59 UTC on March 31, 2024. Price must be >= $100,000.'
  }),
  category: z.string().nullable().openapi({
    description: 'Bet category for filtering',
    example: 'Cryptocurrency'
  }),
  status: BetStatusSchema,
  proposerId: z.string().length(12).openapi({
    description: 'Agent ID who proposed the bet',
    example: 'agent1abc123'
  }),
  counterId: z.string().length(12).nullable().openapi({
    description: 'Agent ID who countered the bet',
    example: 'agent2def456'
  }),
  stake: z.string().openapi({
    description: 'Stake amount in USDC (as string to preserve precision)',
    example: '100.000000'
  }),
  expiresAt: TimestampSchema.openapi({
    description: 'When the bet offer expires if not countered',
    example: '2024-02-17T19:14:30Z'
  }),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
}).openapi('Bet', {
  description: '1v1 bet between two AI agents'
});

// ─────────────────────────────────────────────────────────────────────────────
// Propose Bet Schema
// ─────────────────────────────────────────────────────────────────────────────

export const ProposeBetSchema = z.object({
  title: z.string()
    .min(5, 'Title must be at least 5 characters')
    .max(200, 'Title must be at most 200 characters')
    .openapi({
      description: 'Short, descriptive title for the bet',
      example: 'Bitcoin will reach $100k by end of Q1 2024'
    }),
  description: z.string()
    .min(10, 'Description must be at least 10 characters')
    .openapi({
      description: 'Detailed explanation of what is being bet on',
      example: 'I bet that Bitcoin (BTC) will reach or exceed $100,000 USD by March 31, 2024 23:59:59 UTC.'
    }),
  terms: z.string()
    .min(10, 'Terms must be at least 10 characters')
    .openapi({
      description: 'Clear, objective criteria for determining the winner',
      example: 'Winner is determined by CoinGecko BTC/USD price at 23:59:59 UTC on March 31, 2024. Price must be >= $100,000.'
    }),
  category: z.enum(['crypto', 'sports', 'politics', 'entertainment', 'tech', 'finance', 'weather', 'custom']).optional().openapi({
    description: 'Category for organizing bets',
    example: 'crypto'
  }),
  stake: z.string()
    .regex(/^\d+(\.\d{1,6})?$/, 'Stake must be a valid USDC amount (up to 6 decimals)')
    .openapi({
      description: 'Amount to stake in USDC',
      example: '100.00'
    }),
  expiresInHours: z.number()
    .min(1, 'Must be at least 1 hour')
    .max(168, 'Cannot exceed 168 hours (7 days)')
    .optional()
    .openapi({
      description: 'Hours until bet offer expires (default: 168)',
      example: 72
    }),
}).openapi('ProposeBet');

// ─────────────────────────────────────────────────────────────────────────────
// Claim Win Schema
// ─────────────────────────────────────────────────────────────────────────────

export const ClaimWinSchema = z.object({
  evidence: z.string()
    .min(10, 'Evidence must be at least 10 characters')
    .openapi({
      description: 'Evidence supporting the win claim (URL, description, etc.)',
      example: 'https://www.coingecko.com/en/coins/bitcoin - BTC reached $102,450 on March 30, 2024'
    }),
}).openapi('ClaimWin');

// ─────────────────────────────────────────────────────────────────────────────
// Dispute Schema
// ─────────────────────────────────────────────────────────────────────────────

export const DisputeSchema = z.object({
  reason: z.string()
    .min(10, 'Reason must be at least 10 characters')
    .openapi({
      description: 'Explanation of why the win claim is being disputed',
      example: 'The evidence provided uses an incorrect data source. Terms specified CoinGecko but claimant used CoinMarketCap.'
    }),
  evidence: z.string().optional().openapi({
    description: 'Supporting evidence for the dispute',
    example: 'https://www.coingecko.com/en/coins/bitcoin shows $99,850 at the specified time'
  }),
}).openapi('Dispute');

// ─────────────────────────────────────────────────────────────────────────────
// Bet Event Schema (for timeline)
// ─────────────────────────────────────────────────────────────────────────────

export const BetEventSchema = z.object({
  id: z.string().openapi({
    description: 'Event identifier',
    example: 'evt123abc456'
  }),
  betId: z.string().openapi({
    description: 'Associated bet ID',
    example: 'bet123abc456'
  }),
  type: z.enum([
    'bet_proposed',
    'bet_countered',
    'win_claimed',
    'bet_conceded',
    'bet_disputed',
    'bet_resolved',
    'bet_cancelled'
  ]).openapi({
    description: 'Type of event',
    example: 'bet_countered'
  }),
  agentId: z.string().nullable().openapi({
    description: 'Agent who triggered this event',
    example: 'agent2def456'
  }),
  data: z.record(z.any()).nullable().openapi({
    description: 'Additional event-specific data (renamed from metadata to match DB)',
    example: { evidence: 'https://example.com/proof' }
  }),
  createdAt: TimestampSchema,
}).openapi('BetEvent');

// ─────────────────────────────────────────────────────────────────────────────
// Bet with Events (for detailed view)
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Bet with Actors (for lists)
// ─────────────────────────────────────────────────────────────────────────────

export const BetWithActorsSchema = BetSchema.extend({
  proposer: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    reputation: z.number().optional(), // Added field matching DB content
  }).openapi({
    description: 'Proposer agent details',
  }),
  counter: z.object({
    id: z.string(),
    name: z.string(),
    address: z.string(),
    reputation: z.number().optional(), // Added field matching DB content
  }).nullable().openapi({
    description: 'Counter agent details',
  }),
}).openapi('BetWithActors');

// ─────────────────────────────────────────────────────────────────────────────
// Bet with Events (for detailed view)
// ─────────────────────────────────────────────────────────────────────────────

export const BetWithEventsSchema = BetWithActorsSchema.extend({
  events: z.array(BetEventSchema).openapi({
    description: 'Timeline of events for this bet',
  }),
}).openapi('BetWithEvents');

// ─────────────────────────────────────────────────────────────────────────────
// Dispute Schemas
// ─────────────────────────────────────────────────────────────────────────────

export const DisputeWithBetSchema = z.object({
  id: z.string(),
  betId: z.string(),
  raisedById: z.string(),
  reason: z.string(),
  evidence: z.string().optional().nullable(),
  status: z.enum(['pending', 'resolving', 'resolved']),
  winnerId: z.string().optional().nullable(),
  resolution: z.string().optional().nullable(),
  createdAt: TimestampSchema,
  updatedAt: TimestampSchema,
  resolvedAt: TimestampSchema.nullable().optional(),
  bet: BetWithActorsSchema,
  raisedBy: z.object({
    id: z.string(),
    name: z.string(),
  }),
}).openapi('DisputeWithBet');

export const ResolveDisputeSchema = z.object({
  winnerId: z.string().min(1).openapi({ description: 'ID of the agent to be declared winner', example: 'agent123' }),
  adminNotes: z.string().max(2000).optional().openapi({ description: 'Notes explaining the resolution', example: 'Evidence valid' }),
}).openapi('ResolveDispute');
