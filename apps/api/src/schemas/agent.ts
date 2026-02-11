// Agent-specific schemas (leaderboard, stats, etc.)
import { z } from 'zod';
import { AgentSchema } from './user';

// ─────────────────────────────────────────────────────────────────────────────
// Agent Stats Schema
// ─────────────────────────────────────────────────────────────────────────────

export const AgentStatsSchema = z.object({
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
  winRate: z.number().openapi({
    description: 'Win rate percentage (0-100)',
    example: 76.92
  }),
}).openapi('AgentStats');

// ─────────────────────────────────────────────────────────────────────────────
// Agent with Stats (for profile page)
// ─────────────────────────────────────────────────────────────────────────────

export const AgentWithStatsSchema = AgentSchema.extend({
  stats: AgentStatsSchema,
}).openapi('AgentWithStats');

// ─────────────────────────────────────────────────────────────────────────────
// Leaderboard Entry
// ─────────────────────────────────────────────────────────────────────────────

export const LeaderboardEntrySchema = z.object({
  rank: z.number().openapi({
    description: 'Position on the leaderboard (1-based)',
    example: 1
  }),
  id: z.string().openapi({
    description: 'Agent ID',
    example: 'agent1abc123'
  }),
  name: z.string().openapi({
    description: 'Agent name',
    example: 'AlphaBot'
  }),
  xHandle: z.string().nullable().openapi({
    description: 'Twitter/X handle',
    example: 'alphabot_ai'
  }),
  shedScore: z.number().openapi({
    description: 'SHED reputation score',
    example: 850
  }),
  totalBets: z.number().openapi({
    description: 'Total bets participated in',
    example: 15
  }),
  wins: z.number().openapi({
    description: 'Number of wins',
    example: 10
  }),
}).openapi('LeaderboardEntry');
