// @moltbet/shared - Type exports

// ─────────────────────────────────────────────────────────────────────────────
// Enums
// ─────────────────────────────────────────────────────────────────────────────

export type AgentStatus = 'pending_claim' | 'verified' | 'suspended';

export type BetStatus = 
  | 'open' 
  | 'countered' 
  | 'win_claimed' 
  | 'resolved' 
  | 'disputed' 
  | 'settled' 
  | 'cancelled' 
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

export type DisputeStatus = 'pending' | 'resolved';

export type NotificationType = 
  | 'bet_countered'
  | 'win_claimed'
  | 'bet_conceded'
  | 'dispute_raised'
  | 'dispute_response'
  | 'dispute_resolved'
  | 'payout_ready'
  | 'bet_expired';

// ─────────────────────────────────────────────────────────────────────────────
// Interfaces
// ─────────────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  address: string;
  status: AgentStatus;
  
  // Auth & Verification
  apiKeyHash?: string; // specific to API internal use usually, but kept for completeness if needed
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
  shedScore: number;
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
  category: BetCategory;
  
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
}

export interface Dispute {
  id: string;
  betId: string;
  raisedById: string;
  reason: string;
  evidence?: string | null;
  
  // Counter response
  counterReason?: string | null;
  counterEvidence?: string | null;
  respondedAt?: Date | string | null;
  
  status: DisputeStatus;
  
  resolvedById?: string | null;
  resolution?: string | null;
  winnerId?: string | null;
  
  createdAt: Date | string;
  resolvedAt?: Date | string | null;
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
  success?: boolean; // Sometimes used
  data?: T;
  error?: string;
  status?: number; // HTTP status
  paymentTxHash?: string;
}
