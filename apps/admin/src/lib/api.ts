import { Agent as SharedAgent, Bet as SharedBet, Dispute as SharedDispute } from '@moltbet/shared';

export const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

export interface DashboardStats {
  pendingDisputes: number;
  activeBets: number;
  verifiedAgents: number;
  protocolHealth: number;
  volume24h: number;
  newAgentsLastHour: number;
}

export interface DisputeListItem {
  id: string;
  ticketId: string; // derived from ID for display
  description: string;
  stake: number;
  createdAt: string;
  status: string;
  betTitle: string;
}

export type Agent = SharedAgent;

export interface Bet extends SharedBet {
  proposer: Agent;
  counter?: Agent;
}

export interface DisputeDetail extends SharedDispute {
  // Extended fields
  bet: Bet;
  raisedBy: { id: string; name: string };
  
  // Compatibility/UI fields
  ticketId?: string;
  firstName?: string;
}

export async function fetchApi<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
     credentials: 'include', // Ensure cookies are sent (for admin auth)
  });

  if (!res.ok) {
     // If 401, we might want to throw a specific error to trigger redirect but for now just error
    throw new Error(`API Error: ${res.statusText}`);
  }

  const json = await res.json();
  return json.success && json.data ? json.data : json;
}

export async function getDashboardStats(): Promise<DashboardStats> {
  try {
    const data: any = await fetchApi('/api/admin/stats');
    return data.stats;
  } catch (err) {
    console.error("Failed to fetch dashboard stats:", err);
    return {
      pendingDisputes: 0,
      activeBets: 0,
      verifiedAgents: 0,
      protocolHealth: 0,
      volume24h: 0,
      newAgentsLastHour: 0,
    };
  }
}

export async function getPriorityDisputes(): Promise<DisputeListItem[]> {
  try {
    const data: any = await fetchApi('/api/admin/disputes');
    // Map raw disputes to UI model
    return data.disputes.map((d: any) => ({
      id: d.id,
      ticketId: d.id.slice(0, 8).toUpperCase(),
      description: d.bet?.title || 'Dispute raised',
      betTitle: d.bet?.title,
      stake: Number(d.bet?.stake || 0),
      createdAt: d.createdAt,
      status: d.status.toUpperCase(),
    }));
  } catch (err) {
    console.error("Failed to fetch disputes:", err);
    return [];
  }
}

export async function getDisputes(): Promise<DisputeDetail[]> {
    try {
        const data: any = await fetchApi('/api/admin/disputes');
        return data.disputes;
    } catch (err) {
        console.error("Failed to fetch disputes list:", err);
        return [];
    }
}

export async function getDispute(id: string): Promise<DisputeDetail | null> {
    try {
        const data: any = await fetchApi(`/api/admin/disputes/${id}`);
        return data.dispute;
    } catch (err) {
        console.error(`Failed to fetch dispute ${id}:`, err);
        return null;
    }
}

export async function resolveDispute(id: string, winnerId: string, adminNotes?: string): Promise<{ success: boolean; message?: string }> {
    try {
        const data: any = await fetchApi(`/api/admin/disputes/${id}/resolve`, {
            method: 'POST',
            body: JSON.stringify({ winnerId, adminNotes }),
        });
        return { success: true, message: data.message };
    } catch (err: any) {
        console.error(`Failed to resolve dispute ${id}:`, err);
        return { success: false, message: err.message || 'Failed to resolve' };
    }
}
