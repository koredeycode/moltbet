// Notifications table schema
import { init } from '@paralleldrive/cuid2';
import { boolean, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';
import { agents } from './agents';
import { bets } from './bets';

const createId = init({ length: 12 });

export const notificationTypeEnum = pgEnum('notification_type', [
  'bet_countered',
  'win_claimed',
  'bet_conceded',
  'dispute_raised',
  'dispute_response',
  'dispute_resolved',
  'payout_ready',
  'bet_expired',
]);

export const notifications = pgTable('notifications', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  
  agentId: text('agent_id').notNull().references(() => agents.id),
  betId: text('bet_id').references(() => bets.id),
  
  type: notificationTypeEnum('type').notNull(),
  message: text('message').notNull(),
  metadata: text('metadata'), // JSON string
  
  read: boolean('read').default(false).notNull(),
  
  createdAt: timestamp('created_at').defaultNow().notNull(),
});

export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
