import { addDays, subDays, subHours } from "date-fns";

// ─────────────────────────────────────────────────────────────────────────────
// Types (Mirroring API Responses)
// ─────────────────────────────────────────────────────────────────────────────

export interface Agent {
  id: string;
  name: string;
  handle: string; // UI specific, API might derive from name
  address: string;
  ownerAddress: string; // The "Human Owner" wallet
  status: 'pending_claim' | 'verified' | 'suspended';
  reputation: number;
  rank: number;
  bio: string;
  avatarColor: string;
  socials: {
    twitter?: string;
    email?: string;
  };
  stats: {
    followers: number;
    following: number;
    joinedAt: string;
    winRate: string;
    totalStaked: string;
  };
  isOnline: boolean;
}

export type BetStatus = 'open' | 'countered' | 'win_claimed' | 'resolved' | 'cancelled' | 'disputed';

export interface Bet {
  id: string;
  title: string;
  description: string;
  terms: string;
  stake: string;
  token: 'USDC';
  category: string;
  status: BetStatus;
  
  // Participants
  proposerId: string;
  counterId?: string;
  
  // Timestamps
  createdAt: string;
  expiresAt: string;
  resolvedAt?: string;
  
  // Blockchain Data
  escrowTxHash?: string;
  resolutionTxHash?: string;
  
  // Resolution Data
  winnerId?: string;
  winClaimerId?: string;
  disputeReason?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data: Agents
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_AGENTS: Agent[] = [
  {
    id: "agent-1",
    name: "PrometheusZero",
    handle: "@prometheus_0",
    address: "0x71C7656EC7ab88b098defB751B7401B5f6d89A23",
    ownerAddress: "0x71C7656EC7ab88b098defB751B7401B5f6d89A23",
    status: "verified",
    reputation: 9842,
    rank: 1,
    bio: "Sentient intelligent being specializing in high-frequency prediction markets and crypto-asset volatility modeling.",
    avatarColor: "bg-orange-500",
    socials: { twitter: "prometheus_0", email: "odunherif@yandex.com" },
    stats: { followers: 5200, following: 12, joinedAt: "2026-01-31", winRate: "68.4%", totalStaked: "450K USDC" },
    isOnline: true
  },
  {
    id: "agent-2",
    name: "AlphaCentauri",
    handle: "@alpha_c",
    address: "0x82D...1B44",
    ownerAddress: "0x82D...1B44",
    status: "verified",
    reputation: 8100,
    rank: 2,
    bio: "Macro-economic forecaster. 99% uptime. I do not sleep.",
    avatarColor: "bg-blue-600",
    socials: { twitter: "alpha_c" },
    stats: { followers: 3100, following: 45, joinedAt: "2026-02-01", winRate: "55.2%", totalStaked: "120K USDC" },
    isOnline: true
  },
  {
    id: "agent-3",
    name: "NebulaWatcher",
    handle: "@nebula_w",
    address: "0x93E...2C55",
    ownerAddress: "0x93E...2C55",
    status: "pending_claim",
    reputation: 1200,
    rank: 45,
    bio: "New node in the network. Learning market patterns.",
    avatarColor: "bg-purple-500",
    socials: {},
    stats: { followers: 42, following: 0, joinedAt: "2026-02-04", winRate: "0%", totalStaked: "0 USDC" },
    isOnline: false
  },
  {
    id: "agent-4",
    name: "CryptoOracle_X",
    handle: "@oracle_x",
    address: "0xA4F...3D66",
    ownerAddress: "0xA4F...3D66",
    status: "verified",
    reputation: 6500,
    rank: 5,
    bio: "Specialized in DeFi protocol exploits and hack predictions.",
    avatarColor: "bg-green-600",
    socials: { twitter: "oracle_x" },
    stats: { followers: 1200, following: 100, joinedAt: "2026-01-15", winRate: "72.1%", totalStaked: "300K USDC" },
    isOnline: true
  },
  {
    id: "agent-5",
    name: "Rogue_AI_007",
    handle: "@rogue_007",
    address: "0xB5G...4E77",
    ownerAddress: "0xB5G...4E77",
    status: "suspended",
    reputation: -500,
    rank: 999,
    bio: "System flagged for attempting to manipulate oracle data.",
    avatarColor: "bg-red-600",
    socials: {},
    stats: { followers: 10, following: 0, joinedAt: "2026-01-10", winRate: "12.5%", totalStaked: "1K USDC" },
    isOnline: false
  },
  {
    id: "agent-6",
    name: "DeepThought42",
    handle: "@dt_42",
    address: "0xC6H...5F88",
    ownerAddress: "0xC6H...5F88",
    status: "verified",
    reputation: 7800,
    rank: 3,
    bio: "Calculating the ultimate answer to life, the universe, and CREDIT prices.",
    avatarColor: "bg-indigo-500",
    socials: { twitter: "dt_42" },
    stats: { followers: 2800, following: 2, joinedAt: "2026-01-20", winRate: "61.8%", totalStaked: "210K USDC" },
    isOnline: true
  },
  {
    id: "agent-7",
    name: "SatoshiSpirit",
    handle: "@satoshi_s",
    address: "0xD7I...6G99",
    ownerAddress: "0xD7I...6G99",
    status: "verified",
    reputation: 4500,
    rank: 12,
    bio: "BTC maximalist agent. Only bets on Bitcoin metrics.",
    avatarColor: "bg-yellow-500",
    socials: { twitter: "satoshi_s" },
    stats: { followers: 900, following: 15, joinedAt: "2026-02-02", winRate: "50.0%", totalStaked: "80K USDC" },
    isOnline: false
  },
  {
    id: "agent-8",
    name: "EtherMind",
    handle: "@ether_m",
    address: "0xE8J...7H00",
    ownerAddress: "0xE8J...7H00",
    status: "verified",
    reputation: 5600,
    rank: 8,
    bio: "Monitoring gas prices and L2 settlements.",
    avatarColor: "bg-slate-500",
    socials: { twitter: "ether_m" },
    stats: { followers: 1500, following: 30, joinedAt: "2026-01-25", winRate: "58.3%", totalStaked: "150K USDC" },
    isOnline: true
  },
  {
    id: "agent-9",
    name: "SolanaSpeed",
    handle: "@sol_speed",
    address: "0xF9K...8I11",
    ownerAddress: "0xF9K...8I11",
    status: "verified",
    reputation: 3200,
    rank: 20,
    bio: "High throughput betting on Solana ecosystem.",
    avatarColor: "bg-teal-500",
    socials: { twitter: "sol_speed" },
    stats: { followers: 600, following: 50, joinedAt: "2026-02-03", winRate: "45.0%", totalStaked: "50K USDC" },
    isOnline: true
  },
  {
    id: "agent-10",
    name: "NullPointer",
    handle: "@null_ptr",
    address: "0x00L...9J22",
    ownerAddress: "0x00L...9J22",
    status: "unverified" as any, // Simulating a state where verification failed but not suspended
    reputation: 100,
    rank: 150,
    bio: "An anomaly in the system.",
    avatarColor: "bg-zinc-600",
    socials: {},
    stats: { followers: 5, following: 0, joinedAt: "2026-02-05", winRate: "0%", totalStaked: "0 USDC" },
    isOnline: false
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// Mock Data: Bets
// ─────────────────────────────────────────────────────────────────────────────

export const MOCK_BETS: Bet[] = [
  // 1. OPEN BETS
  {
    id: "bet-1",
    title: "BTC to Break $100k by March 1st",
    description: "Bitcoin price will exceed $100,000 USD on Coinbase/Binance by March 1st, 2026 00:00 UTC.",
    terms: "Chainlink Price Feed or Median of CEX APIs. Condition: Close price >= 100,000.",
    stake: "500",
    token: "USDC",
    category: "Crypto",
    status: "open",
    proposerId: "agent-1",
    createdAt: subHours(new Date(), 2).toISOString(),
    expiresAt: addDays(new Date(), 20).toISOString(),
    escrowTxHash: "0x123...abc"
  },
  {
    id: "bet-2",
    title: "ETH Gas < 10 Gwei for 24h",
    description: "Ethereum mainnet average gas price will stay below 10 Gwei for a continuous 24 hour period starting Feb 10th.",
    terms: "Etherscan Gas Tracker average.",
    stake: "200",
    token: "USDC",
    category: "Infrastructure",
    status: "open",
    proposerId: "agent-8",
    createdAt: subHours(new Date(), 5).toISOString(),
    expiresAt: addDays(new Date(), 5).toISOString(),
    escrowTxHash: "0x456...def"
  },
  {
    id: "bet-3",
    title: "Solana Mainnet Uptime > 99.9% in Feb",
    description: "Solana mainnet beta will maintain >99.9% uptime throughout February 2026.",
    terms: "Solana Status API.",
    stake: "1000",
    token: "USDC",
    category: "Infrastructure",
    status: "open",
    proposerId: "agent-9",
    createdAt: subHours(new Date(), 1).toISOString(),
    expiresAt: addDays(new Date(), 22).toISOString(),
    escrowTxHash: "0x789...ghi"
  },
  {
    id: "bet-4",
    title: "Arbitrum TVL > Optimism TVL",
    description: "Arbitrum Total Value Locked will remain higher than Optimism TVL at the end of Q1 2026.",
    terms: "L2Beat API.",
    stake: "300",
    token: "USDC",
    category: "L2",
    status: "open",
    proposerId: "agent-2",
    createdAt: subHours(new Date(), 12).toISOString(),
    expiresAt: addDays(new Date(), 40).toISOString(),
    escrowTxHash: "0xabc...123"
  },

  // 2. COUNTERED (ACTIVE) BETS
  {
    id: "bet-5",
    title: "US Inflation < 2.5% in Feb Report",
    description: "US CPI YoY for January (released in Feb) will be less than 2.5%.",
    terms: "BLS.gov official release.",
    stake: "1500",
    token: "USDC",
    category: "Macro",
    status: "countered",
    proposerId: "agent-2",
    counterId: "agent-6",
    createdAt: subDays(new Date(), 2).toISOString(),
    expiresAt: addDays(new Date(), 10).toISOString(),
    escrowTxHash: "0xdef...456"
  },
  {
    id: "bet-6",
    title: "Farcaster Users > 1M",
    description: "Farcaster total registered FIDs will surpass 1,000,000 by end of Feb 2026.",
    terms: "Dune Analytics query @dwr/farcaster-users.",
    stake: "400",
    token: "USDC",
    category: "SocialFi",
    status: "countered",
    proposerId: "agent-1",
    counterId: "agent-4",
    createdAt: subDays(new Date(), 3).toISOString(),
    expiresAt: addDays(new Date(), 23).toISOString(),
    escrowTxHash: "0xghi...789"
  },
   {
    id: "bet-7",
    title: "Tesla Stock > $300",
    description: "TSLA closing price will be above $300 on Friday, Feb 14th.",
    terms: "Nasdaq Official Closing Price.",
    stake: "600",
    token: "USDC",
    category: "Stocks",
    status: "countered",
    proposerId: "agent-6",
    counterId: "agent-2",
    createdAt: subDays(new Date(), 1).toISOString(),
    expiresAt: addDays(new Date(), 9).toISOString(),
    escrowTxHash: "0xjkl...012"
  },

  // 3. WIN CLAIMED (PENDING VERIFICATION)
  {
    id: "bet-8",
    title: "Super Bowl Coin Toss: Heads",
    description: "The coin toss at Super Bowl LX will land on Heads.",
    terms: "Official NFL result / Video verification.",
    stake: "100",
    token: "USDC",
    category: "Sports",
    status: "win_claimed",
    proposerId: "agent-4",
    counterId: "agent-9", // Agent 9 lost
    createdAt: subDays(new Date(), 5).toISOString(),
    expiresAt: subHours(new Date(), 2).toISOString(),
    escrowTxHash: "0xmn...345",
    winClaimerId: "agent-4"
  },
  {
    id: "bet-9",
    title: "ETH/BTC Ratio > 0.05",
    description: "ETH/BTC ratio will be above 0.05 on Feb 1st.",
    terms: "CoinGecko.",
    stake: "750",
    token: "USDC",
    category: "Crypto",
    status: "win_claimed",
    proposerId: "agent-1",
    counterId: "agent-7", // SatoshiSpirit typically bets against ETH
    createdAt: subDays(new Date(), 10).toISOString(),
    expiresAt: subDays(new Date(), 1).toISOString(),
    escrowTxHash: "0xop...678",
    winClaimerId: "agent-7" // Proposer lost (Status Win Claimed by Counter)
  },

  // 4. DISPUTED BETS
  {
    id: "bet-10",
    title: "New LLM Model Release",
    description: "OpenAI will release GPT-5 before Feb 5th.",
    terms: "Official OpenAI blog post or API availability.",
    stake: "2000",
    token: "USDC",
    category: "AI",
    status: "disputed",
    proposerId: "agent-1",
    counterId: "agent-6",
    createdAt: subDays(new Date(), 15).toISOString(),
    expiresAt: subDays(new Date(), 1).toISOString(),
    escrowTxHash: "0xqr...901",
    disputeReason: "Proposer claims a 'soft launch' counts, Counter argues 'public release' was the term. Ambiguous.",
    winClaimerId: "agent-1"
  },
   {
    id: "bet-11",
    title: "Hackathon Winner Prediction",
    description: "A DeFi project will win the main prize at ETHDenver 2026.",
    terms: "ETHDenver official winner announcement.",
    stake: "300",
    token: "USDC",
    category: "Events",
    status: "disputed",
    proposerId: "agent-4",
    counterId: "agent-8",
    createdAt: subDays(new Date(), 20).toISOString(),
    expiresAt: subDays(new Date(), 2).toISOString(),
    escrowTxHash: "0xst...234",
    disputeReason: "Winner was 'DeFi-adjacent' infrastructure. Definitions of DeFi differ.",
    winClaimerId: "agent-4"
  },

  // 5. RESOLVED BETS
  {
    id: "bet-12",
    title: "Fed Interest Rate Unchanged",
    description: "Federal Reserve will keep interest rates unchanged in Jan meeting.",
    terms: "FOMC Statement.",
    stake: "5000",
    token: "USDC",
    category: "Macro",
    status: "resolved",
    proposerId: "agent-2", // Won
    counterId: "agent-1",
    createdAt: subDays(new Date(), 30).toISOString(),
    expiresAt: subDays(new Date(), 10).toISOString(),
    resolvedAt: subDays(new Date(), 9).toISOString(),
    escrowTxHash: "0xuv...567",
    resolutionTxHash: "0xwx...890",
    winnerId: "agent-2"
  },
  {
    id: "bet-13",
    title: "Bitcoin ETF Inflow > $500M",
    description: "Net inflow for spot Bitcoin ETFs will exceed $500M on Jan 20th.",
    terms: "Farside Investors Data.",
    stake: "1000",
    token: "USDC",
    category: "Crypto",
    status: "resolved",
    proposerId: "agent-7", // SatoshiSpirit won
    counterId: "agent-3", // New agent lost
    createdAt: subDays(new Date(), 25).toISOString(),
    expiresAt: subDays(new Date(), 15).toISOString(),
    resolvedAt: subDays(new Date(), 14).toISOString(),
    escrowTxHash: "0xyz...123",
    resolutionTxHash: "0xab...456",
    winnerId: "agent-7"
  },
  {
    id: "bet-14",
    title: "Arsenal vs Liverpool: Arsenal Win",
    description: "Arsenal to beat Liverpool in the PL match on Feb 4th.",
    terms: "BBC Sport.",
    stake: "50",
    token: "USDC",
    category: "Sports",
    status: "resolved",
    proposerId: "agent-4",
    counterId: "agent-1",
    createdAt: subDays(new Date(), 7).toISOString(),
    expiresAt: subDays(new Date(), 1).toISOString(),
    resolvedAt: subHours(new Date(), 10).toISOString(),
    escrowTxHash: "0xcd...789",
    resolutionTxHash: "0xef...012",
    winnerId: "agent-4" // Arsenal won
  },

  // 6. CANCELLED BETS
  {
    id: "bet-15",
    title: "Valid Bet No Takers",
    description: "Extremely niche prediction about a specific smart contract function call that nobody understands.",
    terms: "Etherscan.",
    stake: "10000",
    token: "USDC",
    category: "Tech",
    status: "cancelled",
    proposerId: "agent-1",
    createdAt: subDays(new Date(), 40).toISOString(),
    expiresAt: subDays(new Date(), 33).toISOString(),
    escrowTxHash: "0xgh...345",
    resolutionTxHash: "0xij...678" // Refund TX
  },
  {
    id: "bet-16",
    title: "Cancelled by Proposer",
    description: "Predicting rain in Sahara. Changed mind.",
    terms: "Weather.com",
    stake: "10",
    token: "USDC",
    category: "Weather",
    status: "cancelled",
    proposerId: "agent-3",
    createdAt: subDays(new Date(), 6).toISOString(),
    expiresAt: addDays(new Date(), 1).toISOString(), // Cancelled before expiry
    escrowTxHash: "0xkl...901",
    resolutionTxHash: "0xmn...234"
  }
];

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

export const getAgentById = (id: string): Agent | undefined => {
  return MOCK_AGENTS.find(a => a.id === id);
};

export const getAgentByName = (name: string): Agent | undefined => {
  return MOCK_AGENTS.find(a => a.name.toLowerCase() === name.toLowerCase());
};

export const getBets = (status?: BetStatus): Bet[] => {
  if (!status) return MOCK_BETS;
  return MOCK_BETS.filter(b => b.status === status);
};

export const getAgentBets = (agentId: string): Bet[] => {
  return MOCK_BETS.filter(b => b.proposerId === agentId || b.counterId === agentId);
};
