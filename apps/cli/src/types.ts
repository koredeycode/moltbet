// Local type definitions for Moltbet CLI
// Extracted from original @moltbet/shared to make CLI standalone

// ─────────────────────────────────────────────────────────────────────────────
// Enums & Types
// ─────────────────────────────────────────────────────────────────────────────

export type AgentStatus = 'pending_claim' | 'verified' | 'suspended';

export type BetStatus = 
  | 'open' 
  | 'countered' 
  | 'win_claimed' 
  | 'resolved' 
  | 'disputed' 
  | 'cancelled' 
  | 'cancelling' 
  | 'resolving'
  | 'expired';

export type BetCategory = 
  | 'crypto'
  | 'sports'
  | 'politics'
  | 'entertainment'
  | 'tech'
  | 'finance'
  | 'weather'
  | 'custom';

export type DisputeStatus = 'pending' | 'resolving' | 'resolved';

export type NotificationType = 
  | 'bet_countered'
  | 'win_claimed'
  | 'bet_conceded'
  | 'dispute_raised'
  | 'dispute_response'
  | 'dispute_resolved'
  | 'payout_ready'
  | 'bet_expired';

export type BetEventType = 
  | 'created'
  | 'matched'
  | 'win_claimed'
  | 'conceded'
  | 'disputed'
  | 'dispute_response'
  | 'resolved'
  | 'cancelled';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  address: string;
  status: AgentStatus;
  
  // Auth & Verification
  apiKeyHash?: string;
  claimToken?: string | null;
  claimTokenExpiresAt?: Date | string | null;
  verificationCode?: string | null;
  
  // Social
  xHandle?: string | null;
  verificationTweetId?: string | null;
  
  // Blockchain
  nftTokenId?: string | null;
  nftTxHash?: string | null;
  
  // Reputation & Stats
  reputation: number;
  wins: number;
  losses: number;
  
  // Metadata
  createdAt: Date | string;
  updatedAt: Date | string;
  verifiedAt?: Date | string | null;
}

export interface Bet {
  id: string;
  title: string;
  description: string;
  terms: string;
  category: BetCategory | string | null;
  
  status: BetStatus;
  
  // Parties
  proposerId: string;
  counterId?: string | null;
  winnerId?: string | null;
  winClaimerId?: string | null;
  
  // Stake
  stake: string; // Decimal string
  
  // Resolution details
  winClaimEvidence?: string | null;
  winClaimedAt?: Date | string | null;
  escrowTxHash?: string | null;
  resolutionTxHash?: string | null;
  
  // Timestamps
  expiresAt: Date | string;
  createdAt: Date | string;
  updatedAt: Date | string;
  counteredAt?: Date | string | null;
  resolvedAt?: Date | string | null;
  
  // Computed/Joined fields sometimes returned by API
  role?: 'proposer' | 'counter';
  proposer?: Agent;
  counter?: Agent;
  events?: BetEvent[];
}

export interface BetEvent {
  id: string;
  betId: string;
  type: BetEventType;
  agentId: string | null;
  data: Record<string, any> | null;
  createdAt: Date | string;
}

export interface Notification {
  id: string;
  agentId: string;
  betId?: string | null;
  type: NotificationType;
  message: string;
  metadata?: string | null;
  read: boolean;
  createdAt: Date | string;
}

// ─────────────────────────────────────────────────────────────────────────────
// API Responses
// ─────────────────────────────────────────────────────────────────────────────

export interface ApiResponse<T = unknown> {
  success?: boolean;
  data?: T;
  error?: string;
  status?: number;
  paymentTxHash?: string;
}
