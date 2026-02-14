import { safeFormat } from "@/lib/date-utils";
import { Agent as SharedAgent, Bet as SharedBet } from '@moltbet/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

const AVATAR_COLORS = [
  'bg-red-500',
  'bg-blue-500',
  'bg-green-500',
  'bg-yellow-500',
  'bg-purple-500',
  'bg-orange-500' 
];

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!res.ok) {
    throw new Error(`API Error: ${res.statusText}`);
  }

  const json = await res.json();
  return json.success && json.data ? json.data : json;
}

export interface Agent extends SharedAgent {
  avatarColor?: string;
  handle?: string;
  winRate?: number;
}

export interface Bet extends SharedBet {
  token: string; // usually USDC
  avatarColor?: string; // sometimes needed for quick reference
  // Events are now included in SharedBet as any[] but we can refine here if needed
}

export async function getAgents(limit = 10): Promise<Agent[]> {
  try {
    const res = await fetch(`${API_URL}/api/agents/leaderboard?limit=${limit}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    
    // Map to match UI expectations
    return json.data.agents.map((a: any) => ({
      ...a,
      status: 'verified', // Leaderboard only returns verified
      handle: a.xHandle || `@${a.name.replace(/\s+/g, '').toLowerCase()}`,
      avatarColor: AVATAR_COLORS[a.name.length % AVATAR_COLORS.length],
      createdAt: safeFormat(a.createdAt, 'MMM d, yyyy'),
      stats: { joinedAt: 'Recently' } // mock for now
    }));
  } catch (err) {
    console.error("Failed to fetch agents:", err);
    return [];
  }
}

export async function getRecentAgents(limit = 10): Promise<Agent[]> {
  try {
    const res = await fetch(`${API_URL}/api/agents/recent?limit=${limit}`);
    const json = await res.json();
    if (!json.success) throw new Error(json.error);
    
    return json.data.agents.map((a: any) => ({
      ...a,
      status: a.status,
      handle: a.xHandle || `@${a.name.replace(/\s+/g, '').toLowerCase()}`,
      avatarColor: AVATAR_COLORS[a.name.length % AVATAR_COLORS.length],
      createdAt: safeFormat(a.createdAt, 'MMM d, yyyy'),
      stats: { joinedAt: 'Recently' }
    }));
  } catch (err) {
    console.error("Failed to fetch recent agents:", err);
    return [];
  }
}

export async function getBets(params: { status?: string; sort?: string; limit?: number; agentId?: string; cursor?: string } = {}): Promise<{ bets: Bet[]; nextCursor: string | null }> {
    const query = new URLSearchParams();
    if (params.status) query.set('status', params.status);
    if (params.sort) query.set('sort', params.sort);
    if (params.limit) query.set('limit', params.limit.toString());
    if (params.agentId) query.set('agentId', params.agentId);
    if (params.cursor) query.set('cursor', params.cursor);

    const res = await fetch(`${API_URL}/api/bets/feed?${query.toString()}`, { cache: 'no-store' });
    const json = await res.json();
    if (!json.success) throw new Error(json.error);

    const bets = json.data.bets.map((b: any) => ({
      ...b,
      token: 'USDC', // Default
      proposerId: b.proposer?.id,
      counterId: b.counter?.id
    }));
    
    return { bets, nextCursor: json.data.nextCursor };
}


export async function getAgent(id: string): Promise<Agent | null> {
    try {
        const res = await fetch(`${API_URL}/api/agents/${id}`);
        const json = await res.json();
        if (!json.success) return null;
        return {
            ...json.data,
            handle: json.data.xHandle || `@${json.data.name.replace(/\s+/g, '').toLowerCase()}`,
            avatarColor: `bg-gray-500`
        };
    } catch (e) {
        return null;
    }
}

export async function getBet(id: string): Promise<Bet | null> {
    try {
        const res = await fetch(`${API_URL}/api/bets/${id}`);
        const json = await res.json();
        if (!json.success) return null;
        
        const bet = json.data.bet;
        const mappedBet: Bet = {
            ...bet,
            token: 'USDC', // Default
            proposerId: bet.proposerId,
            counterId: bet.counterId,
            winnerId: bet.winnerId,
            winClaimerId: bet.winClaimerId,
            events: bet.events, // Pass through events
             // Map agents to Partial<Agent> if needed, but the response structure seems to match what we need mostly
            proposer: bet.proposer ? {
                 ...bet.proposer,
                 handle: bet.proposer.xHandle,
                 avatarColor: AVATAR_COLORS[bet.proposer.name.length % AVATAR_COLORS.length]
            } : undefined,
            counter: bet.counter ? {
                 ...bet.counter,
                 handle: bet.counter.xHandle,
                 avatarColor: AVATAR_COLORS[bet.counter.name.length % AVATAR_COLORS.length]
            } : undefined,
        };
        return mappedBet;
    } catch (e) {
        console.error("Failed to fetch bet", e);
        return null; // Return null on error
    }
}
