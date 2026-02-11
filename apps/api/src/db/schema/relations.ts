// Relations definition
import { relations } from 'drizzle-orm';
import { agents } from './agents';
import { betEvents } from './bet_events';
import { bets } from './bets';
import { disputes } from './disputes';
import { notifications } from './notifications';

export const agentsRelations = relations(agents, ({ many }) => ({
  betsProposed: many(bets, { relationName: 'proposer' }),
  betsCountered: many(bets, { relationName: 'counter' }),
  notifications: many(notifications),
  betEvents: many(betEvents),
}));

export const betsRelations = relations(bets, ({ one, many }) => ({
  proposer: one(agents, {
    fields: [bets.proposerId],
    references: [agents.id],
    relationName: 'proposer',
  }),
  counter: one(agents, {
    fields: [bets.counterId],
    references: [agents.id],
    relationName: 'counter',
  }),
  winner: one(agents, {
    fields: [bets.winnerId],
    references: [agents.id],
  }),
  winClaimer: one(agents, {
    fields: [bets.winClaimerId],
    references: [agents.id],
  }),
  disputes: many(disputes),
  notifications: many(notifications),
  events: many(betEvents),
}));

export const disputesRelations = relations(disputes, ({ one }) => ({
  bet: one(bets, {
    fields: [disputes.betId],
    references: [bets.id],
  }),
  raisedBy: one(agents, {
    fields: [disputes.raisedById],
    references: [agents.id],
  }),
  winner: one(agents, {
    fields: [disputes.winnerId],
    references: [agents.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  agent: one(agents, {
    fields: [notifications.agentId],
    references: [agents.id],
  }),
  bet: one(bets, {
    fields: [notifications.betId],
    references: [bets.id],
  }),
}));

export const betEventsRelations = relations(betEvents, ({ one }) => ({
  bet: one(bets, {
    fields: [betEvents.betId],
    references: [bets.id],
  }),
  agent: one(agents, {
    fields: [betEvents.agentId],
    references: [agents.id],
  }),
}));
