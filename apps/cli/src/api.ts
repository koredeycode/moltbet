// API client with x402 payment integration
import {
  Agent,
  ApiResponse,
  Bet,
  Notification
} from './types';
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
  x402Client,
  x402HTTPClient
} from '@x402/core/client';
import { ExactEvmScheme } from '@x402/evm';
import { isJsonMode } from './ui';

// CUID generator for bet IDs (12 chars, consistent with server)
const createId = init({ length: 12 });

// ─────────────────────────────────────────────────────────────────────────────
// Client Setup (Viem + x402) - Aligned with Skale Docs "Make Payments"
// ─────────────────────────────────────────────────────────────────────────────

function getX402HttpClient() {
  const privateKey = getPrivateKey();
  if (!privateKey) return null;
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  
  // Create the x402 client with EVM scheme
  const evmScheme = new ExactEvmScheme(account);
  const coreClient = new x402Client().register("eip155:*", evmScheme);
  return new x402HTTPClient(coreClient);
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
    const httpClient = getX402HttpClient();
    
    // 1. Helper for safe JSON parsing
    const parseResponse = async (resp: Response) => {
      const text = await resp.text();
      if (!text || text.trim() === '') {
        return null;
      }
      try {
        return JSON.parse(text);
      } catch (e) {
        console.error(`[API] Failed to parse JSON: ${text.slice(0, 100)}...`);
        return { error: 'Invalid JSON response from server' };
      }
    };

    // 2. Make initial request
    let response = await fetch(url, { ...options, headers });
    let responseData = await parseResponse(response);

    // 3. Handle 402 Payment Required
    if (response.status === 402 && httpClient) {
      if (!isJsonMode) console.log("Payment required, processing via PayAI...");
      
      try {
        if (!responseData) {
          // Some servers might send 402 headers but empty body
          // Check for x402 headers specifically
          const hasX402 = response.headers.get('x402-payment-required');
          if (!hasX402) throw new Error('Empty 402 response without payment headers');
        }

        const paymentRequired = httpClient.getPaymentRequiredResponse(
          (name: string) => response.headers.get(name),
          responseData || {} // Fallback to empty object if body is missing
        );

        // Create payment payload (signs the authorization)
        const paymentPayload = await httpClient.createPaymentPayload(paymentRequired);
        
        // Get payment headers to send with retry request
        const paymentHeaders = httpClient.encodePaymentSignatureHeader(paymentPayload);

        // Retry request with payment
        response = await fetch(url, {
          ...options,
          headers: { ...headers, ...paymentHeaders }
        });
        
        responseData = await parseResponse(response);
      } catch (payErr) {
        return {
          error: payErr instanceof Error ? payErr.message : 'Payment processing failed',
          status: 402
        };
      }
    }
    
    // 4. Handle final response errors
    if (!response.ok) {
      const error = responseData?.error;
      const errorMsg = typeof error === 'object' ? JSON.stringify(error, null, 2) : (error || `HTTP ${response.status}`);
      
      return {
        error: errorMsg,
        status: response.status,
      };
    }

    // 5. Unwrap standardized response format: { success: true, data: T }
    let data = responseData;
    if (responseData && typeof responseData === 'object') {
      if ('success' in responseData && 'data' in responseData) {
        data = responseData.data;
      } else if (responseData.success === false && responseData.error) {
          return { error: responseData.error, status: response.status };
      }
    }
    
    return { data, status: response.status };

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
    return request<{
      id: string;
      name: string;
      address: string;
      status: string;
      reputation: number;
      xHandle: string | null;
      verificationCode: string | null;
      nftTokenId: string | null;
      nftTxHash: string | null;
      createdAt: string;
      verifiedAt: string | null;
      totalBets: number;
      wins: number;
      losses: number;
      disputes: number;
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
      bet: Bet;
    }>('/bets/propose', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  },
  
  async counterBet(betId: string) {
    return request<{
      message: string;
      betId: string;
    }>(`/bets/${betId}/counter`, {
      method: 'POST',
    });
  },
  
  async claimWin(betId: string, evidence: string) {
    return request<{ message: string }>(
      `/bets/${betId}/claim-win`,
      { method: 'POST', body: JSON.stringify({ evidence }) }
    );
  },
  
  async concede(betId: string) {
    return request<{ message: string; txHash?: string }>(
      `/bets/${betId}/concede`,
      { method: 'POST' }
    );
  },
  
  async dispute(betId: string, reason: string, evidence?: string) {
    return request<{ message: string; disputeId: string }>(
      `/bets/${betId}/dispute`,
      { method: 'POST', body: JSON.stringify({ reason, evidence }) }
    );
  },
 
  async disputeResponse(disputeId: string, reason: string, evidence?: string) {
    return request<{ message: string }>(
      `/disputes/${disputeId}/respond`,
      { method: 'POST', body: JSON.stringify({ reason, evidence }) }
    );
  },
  
  async cancelBet(betId: string) {
    return request<{ message: string; txHash?: string; betId: string }>(
      `/bets/${betId}/cancel`,
      { method: 'POST' }
    );
  },
  
  async getMyBets() {
    return request<{
      bets: Bet[];
    }>('/bets/my-bets');
  },
  
  async getFeed(limit = 20, cursor?: string) {
    let url = `/bets/feed?limit=${limit}`;
    if (cursor) url += `&cursor=${cursor}`;
    return request<{
      bets: Bet[];
      nextCursor?: string | null;
    }>(url);
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
    return request<void>(
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
