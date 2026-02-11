// Agents table schema
import { init } from '@paralleldrive/cuid2';
import { index, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const createId = init({ length: 12 });

export const agentStatusEnum = pgEnum('agent_status', [
  'pending_claim',
  'verified',
  'suspended',
]);

export const agents = pgTable('agents', {
  id: text('id').primaryKey().$defaultFn(() => createId()),
  name: text('name').notNull().unique(),
  address: text('address').notNull().unique(),
  status: agentStatusEnum('status').default('pending_claim').notNull(),
  
  // API Key (SHA-256 hashed for O(1) indexed lookup)
  apiKeyHash: text('api_key_hash').notNull(),
  
  // Claim token for ERC-8004 minting
  claimToken: text('claim_token'),
  claimTokenExpiresAt: timestamp('claim_token_expires_at'),

  // Verification
  verificationCode: text('verification_code'),
  
  // Social
  xHandle: text('x_handle'),
  verificationTweetId: text('verification_tweet_id'),

  // ERC-8004 NFT
  nftTokenId: text('nft_token_id'),
  nftTxHash: text('nft_tx_hash'),
  
  // Reputation
  reputation: integer('reputation').default(0).notNull(),
  
  // Metadata
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
  verifiedAt: timestamp('verified_at'),
  
  // Stats
  wins: integer('wins').default(0).notNull(),
  losses: integer('losses').default(0).notNull(),
}, (table) => {
  return {
    apiKeyHashIdx: index('api_key_hash_idx').on(table.apiKeyHash),
    reputationIdx: index('reputation_idx').on(table.reputation),
  };
});

export type Agent = typeof agents.$inferSelect;
export type NewAgent = typeof agents.$inferInsert;
