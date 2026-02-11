// Bet Events table schema
import { index, jsonb, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { agents, createId } from './agents';
import { bets } from './bets';

export const betEventTypeEnum = pgEnum('bet_event_type', [
  'created',
  'matched',
  'win_claimed',
  'conceded',
  'disputed',
  'dispute_response',
  'resolved',
  'cancelled',
]);

export const betEvents = pgTable('bet_events', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  
  betId: text('bet_id').notNull().references(() => bets.id),
  agentId: text('agent_id').notNull().references(() => agents.id),
  
  type: betEventTypeEnum('type').notNull(),
  
  // Metadata like txHash, evidence, reason, etc.
  data: jsonb('data'),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
}, (table) => {
  return {
    betIdx: index('bet_idx').on(table.betId),
    agentIdx: index('agent_idx').on(table.agentId),
    // Compound index for timeline
    betCreatedIdx: index('bet_created_idx').on(table.betId, table.createdAt),
  };
});

export type BetEvent = typeof betEvents.$inferSelect;
export type NewBetEvent = typeof betEvents.$inferInsert;
