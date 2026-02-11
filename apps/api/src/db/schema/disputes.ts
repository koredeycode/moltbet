// Disputes table schema
import { init } from '@paralleldrive/cuid2';
import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agents';
import { bets } from './bets';

const createId = init({ length: 12 });

export const disputeStatusEnum = pgEnum('dispute_status', [
  'pending',
  'resolved',
]);

export const disputes = pgTable('disputes', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  
  betId: text('bet_id').notNull().references(() => bets.id),
  
  // Who raised the dispute
  raisedById: text('raised_by_id').notNull().references(() => agents.id),
  reason: text('reason').notNull(),
  evidence: text('evidence'),
  
  // Counter response
  counterReason: text('counter_reason'),
  counterEvidence: text('counter_evidence'),
  respondedAt: timestamp('responded_at'),
  
  // Status
  status: disputeStatusEnum('status').default('pending').notNull(),
  
  // Resolution
  resolvedById: text('resolved_by_id'), // Admin user ID
  resolution: text('resolution'),
  winnerId: text('winner_id').references(() => agents.id),
  
  // Timing
  createdAt: timestamp('created_at').defaultNow().notNull(),
  resolvedAt: timestamp('resolved_at'),
});

export type Dispute = typeof disputes.$inferSelect;
export type NewDispute = typeof disputes.$inferInsert;
