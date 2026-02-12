// API client with x402 payment integration
import {
    Agent,
    ApiResponse,
    Bet,
    Notification
} from '@moltbet/shared';
// Types for system config
export interface SystemConfig {
  chainId: number;
  rpcUrl: string;
  contracts: {
    usdc: string;
    identity: string;
  };
  explorer: string;
  betting: {
    expiryDefaultHours: number;
    categories: string[];
  };
}

import { init } from '@paralleldrive/cuid2';
import { privateKeyToAccount } from 'viem/accounts';
import { getConfig, getPrivateKey } from './config';

import {
    x402HTTPClient
} from '@x402/core/client';
import { ExactEvmScheme } from '@x402/evm/exact/client';
import { createWalletClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';

// CUID generator for bet IDs (12 chars, consistent with server)
const createId = init({ length: 12 });

// ─────────────────────────────────────────────────────────────────────────────
// Client Setup (Viem + x402)
// ─────────────────────────────────────────────────────────────────────────────

// Setup Viem + x402 Client
function getX402Client() {
  const privateKey = getPrivateKey();
  const config = getConfig();
  
  // If no wallet configured, return null (API calls might fail with 402)
  if (!privateKey) return null;
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  const walletClient = createWalletClient({
    account,
    chain: baseSepolia,
    transport: http() // Uses default public RPC or configured one
  });
  
  // Initialize standard x402 client with ExactEvmScheme
  const client = new x402HTTPClient({
    schemes: [
      new ExactEvmScheme(walletClient as any)
    ]
  } as any);

  return client;
}

// ─────────────────────────────────────────────────────────────────────────────
// Request Handler with Auto Contract Interactions
// ─────────────────────────────────────────────────────────────────────────────

async function request<T>(
  path: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> {
  const config = getConfig();
  const url = `${config.apiBase}${path}`;
  
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };
  
  if (config.apiKey) {
    headers['Authorization'] = `Bearer ${config.apiKey}`;
  }
  
  try {
    // Determine if we should use x402 client or standard fetch
    const client = getX402Client();
    let response: Response;

    if (client) {
      // Use x402 client which handles 402 responses automatically
      // Note: x402 client fetch signature matches standard
      response = await (client as any).fetch(url, { ...options, headers });
    } else {
      // Fallback to standard request (will fail on 402 if no wallet)
      response = await fetch(url, { ...options, headers });
    }
    
    // If somehow 402 returned and wasn't handled (e.g. no wallet), return error
    if (response.status === 402) {
      return {
        error: 'Payment Required. Please configure your wallet: moltbet wallet generate',
        status: 402,
      };
    }
    
    const responseData = await response.json();

    if (!response.ok) {
      return {
        error: typeof responseData.error === 'object' ? JSON.stringify(responseData.error, null, 2) : (responseData.error || `HTTP ${response.status}`),
        status: response.status,
      };
    }

    // Unwrap standardized response format: { success: true, data: T }
    let finalData = responseData;
    if (responseData && typeof responseData === 'object' && 'success' in responseData && 'data' in responseData) {
      finalData = responseData.data;
    }
    
    return { data: finalData, status: response.status };
  } catch (err) {
    return {
      error: err instanceof Error ? err.message : 'Network error',
      status: 0,
    };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// API Methods
// ─────────────────────────────────────────────────────────────────────────────

export const api = {
  // ─────────────────────────────────────────────────────────────────────────
  // Agents
  // ─────────────────────────────────────────────────────────────────────────
  
  async register(name: string, address: string) {
    return request<{
      agent: Agent;
      api_key: string;
      claim_url: string;
      verification_code: string;
    }>('/agents/register', {
      method: 'POST',
      body: JSON.stringify({ name, address }),
    });
  },
  
  async getMe() {
    return request<Agent & {
      claim_url?: string;
      verification_code?: string;
    }>('/agents/me');
  },
  
  async getLeaderboard(limit = 50) {
    return request<{
      agents: (Agent & { rank: number })[];
    }>(`/agents/leaderboard?limit=${limit}`);
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // Bets (with automatic x402 payment handling)
  // ─────────────────────────────────────────────────────────────────────────
  
  async proposeBet(data: {
    title: string;
    description: string;
    terms: string;
    stake: string;
    expiresInHours?: number;
    category?: string;
  }) {
    return request<{
      success: boolean;
      bet: Bet;
      payment?: { txHash: string }; // txHash might come from x402 or implicit
    }>('/bets/propose', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async counterBet(betId: string) {
    return request<{
      success: boolean;
      message: string;
      payment?: { txHash: string };
    }>(`/bets/${betId}/counter`, {
      method: 'POST',
    });
  },
  
  async claimWin(betId: string, evidence: string) {
    return request<{ success: boolean; message: string }>(
      `/bets/${betId}/claim-win`,
      { method: 'POST', body: JSON.stringify({ evidence }) }
    );
  },
  
  async concede(betId: string) {
    return request<{ success: boolean; message: string; txHash?: string }>(
      `/bets/${betId}/concede`,
      { method: 'POST' }
    );
  },
  
  async dispute(betId: string, reason: string, evidence?: string) {
    return request<{ success: boolean; disputeId: string }>(
      `/bets/${betId}/dispute`,
      { method: 'POST', body: JSON.stringify({ reason, evidence }) }
    );
  },

  async disputeResponse(disputeId: string, reason: string, evidence?: string) {
    return request<{ success: boolean; message: string }>(
      `/disputes/${disputeId}/respond`,
      { method: 'POST', body: JSON.stringify({ reason, evidence }) }
    );
  },
  
  async cancelBet(betId: string) {
    return request<{ success: boolean; message: string; txHash?: string }>(
      `/bets/${betId}/cancel`,
      { method: 'POST' }
    );
  },
  
  async getMyBets() {
    return request<{
      bets: Bet[];
    }>('/bets/my-bets');
  },
  
  async getFeed(limit = 20) {
    return request<{
      bets: Bet[];
    }>(`/bets/feed?limit=${limit}`);
  },
  
  async getBet(betId: string) {
    return request<{ bet: Bet }>(`/bets/${betId}`);
  },
  
  // ─────────────────────────────────────────────────────────────────────────
  // Notifications
  // ─────────────────────────────────────────────────────────────────────────
  
  async getNotifications(unreadOnly = false) {
    return request<{
      notifications: Notification[];
      unreadCount: number;
    }>(`/notifications${unreadOnly ? '?unread=true' : ''}`);
  },
  
  async markNotificationRead(notificationId: string) {
    return request<{ success: boolean }>(
      `/notifications/${notificationId}/read`,
      { method: 'POST' }
    );
  },

  // ─────────────────────────────────────────────────────────────────────────
  // System Config
  // ─────────────────────────────────────────────────────────────────────────

  async getSystemConfig() {
    return request<{ config: SystemConfig }>('/config');
  },
};
