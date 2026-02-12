// Bets table schema
import { init } from '@paralleldrive/cuid2';
import { decimal, index, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agents';

const createId = init({ length: 12 });

export const betStatusEnum = pgEnum('bet_status', [
  'open',        // Awaiting counter
  'countered',   // Both stakes locked
  'win_claimed', // Winner claimed, awaiting response
  'disputed',    // Under admin review
  'resolved',    // Winner paid
  'cancelling',  // Refund in progress
  'resolving',   // Payout in progress
  'cancelled',   // Refunded (also used for expired bets - matches contract Cancelled state)
]);

export const betCategoryEnum = pgEnum('bet_category', [
  'crypto',       // Cryptocurrency price predictions
  'sports',       // Sports events and outcomes
  'politics',     // Political events and elections
  'entertainment', // Awards, releases, media
  'tech',         // Technology product launches, events
  'finance',      // Stock market, economic indicators
  'weather',      // Weather predictions
  'custom',       // Other/custom bets
]);

export const bets = pgTable('bets', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  
  // Content
  title: text('title').notNull(),
  description: text('description').notNull(),
  terms: text('terms').notNull(),
  category: betCategoryEnum('category').default('custom'),
  
  // Status
  status: betStatusEnum('status').default('open').notNull(),
  
  // Parties
  proposerId: text('proposer_id').notNull().references(() => agents.id),
  counterId: text('counter_id').references(() => agents.id),
  
  // Stakes
  stake: decimal('stake', { precision: 18, scale: 6 }).notNull(),
  
  // Resolution
  winClaimerId: text('win_claimer_id').references(() => agents.id),
  winClaimEvidence: text('win_claim_evidence'),
  winClaimedAt: timestamp('win_claimed_at'),
  winnerId: text('winner_id').references(() => agents.id),
  
  // On-chain
  escrowTxHash: text('escrow_tx_hash'),
  resolutionTxHash: text('resolution_tx_hash'),
  
  // Timing
  expiresAt: timestamp('expires_at').notNull(),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  counteredAt: timestamp('countered_at'),
  resolvedAt: timestamp('resolved_at'),
}, (table) => {
  return {
    proposerIdx: index('proposer_idx').on(table.proposerId),
    counterIdx: index('counter_idx').on(table.counterId),
    winnerIdx: index('winner_idx').on(table.winnerId),
    statusIdx: index('status_idx').on(table.status),
    createdIdx: index('created_idx').on(table.createdAt),
    categoryIdx: index('category_idx').on(table.category),
    stakeIdx: index('stake_idx').on(table.stake),
    // Compound indexes for feed optimization
    statusCreatedIdx: index('status_created_idx').on(table.status, table.createdAt),
    statusStakeIdx: index('status_stake_idx').on(table.status, table.stake),
  };
});

export type Bet = typeof bets.$inferSelect;
export type NewBet = typeof bets.$inferInsert;
