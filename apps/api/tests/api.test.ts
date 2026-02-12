// E2E Tests for Moltbet API
// These tests validate the full API flow from registration to betting lifecycle

import { describe, expect, it } from 'vitest';
import { expectJson, request } from './setup';

describe('Moltbet API E2E Tests', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Health & Info
  // ─────────────────────────────────────────────────────────────────────────

  describe('Health Endpoints', () => {
    it('GET / should return API info', async () => {
      const res = await request('GET', '/');
      const json = await expectJson(res, 200);
      
      expect(json.name).toBe('Moltbet API');
      expect(json.version).toBeDefined();
      expect(json.chain.name).toBe('Skale Base Sepolia');
    });

    it('GET /health should return health status', async () => {
      const res = await request('GET', '/health');
      const json = await expectJson(res, 200);
      
      expect(json.status).toBe('healthy');
      expect(json.timestamp).toBeDefined();
      expect(json.facilitator).toBeDefined();
    });

    it('GET /api/openapi.json should return OpenAPI spec', async () => {
      const res = await request('GET', '/api/openapi.json');
      const json = await expectJson(res, 200);
      
      expect(json.openapi).toBe('3.1.0');
      expect(json.info.title).toBe('Moltbet API');
      expect(json.paths).toBeDefined();
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Agent Registration
  // ─────────────────────────────────────────────────────────────────────────

  describe('Agent Registration', () => {
    const testAddress = '0x1234567890123456789012345678901234567890';
    
    it('POST /api/agents/register should require name and address', async () => {
      const res = await request('POST', '/api/agents/register', {
        body: {},
      });
      
      expect(res.status).toBe(400);
    });

    it('POST /api/agents/register should validate address format', async () => {
      const res = await request('POST', '/api/agents/register', {
        body: {
          name: 'testAgent',
          address: 'invalid-address',
        },
      });
      
      expect(res.status).toBe(400);
    });

    it('POST /api/agents/register should validate name format', async () => {
      const res = await request('POST', '/api/agents/register', {
        body: {
          name: 'te', // Too short
          address: testAddress,
        },
      });
      
      expect(res.status).toBe(400);
    });

    // Note: Full registration test would create actual DB entries
    // For isolated tests, this would need a test database
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Agent Endpoints (Auth Required)
  // ─────────────────────────────────────────────────────────────────────────

  describe('Agent Endpoints', () => {
    it('GET /api/agents/me should require authentication', async () => {
      const res = await request('GET', '/api/agents/me');
      
      expect(res.status).toBe(401);
    });

    it('GET /api/agents/me should reject invalid API key', async () => {
      const res = await request('GET', '/api/agents/me', {
        headers: {
          Authorization: 'Bearer invalid_key',
        },
      });
      
      expect(res.status).toBe(401);
    });

    it('GET /api/agents/leaderboard should return array', async () => {
      const res = await request('GET', '/api/agents/leaderboard');
      const json = await expectJson(res, 200);
      
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.agents)).toBe(true);
    });

    it('GET /api/agents/:id should return 404 for unknown agent', async () => {
      const res = await request('GET', '/api/agents/nonexistent123');
      
      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Bet Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  describe('Bet Endpoints', () => {
    it('GET /api/bets/feed should return open bets', async () => {
      const res = await request('GET', '/api/bets/feed');
      const json = await expectJson(res, 200);
      
      expect(json.success).toBe(true);
      expect(Array.isArray(json.data.bets)).toBe(true);
    });

    it('POST /api/bets/propose should require authentication', async () => {
      const res = await request('POST', '/api/bets/propose', {
        body: {
          title: 'Test Bet',
          description: 'Test description',
          terms: 'Test terms here',
          stake: '10.00',
        },
      });
      
      expect(res.status).toBe(401);
    });

    it('GET /api/bets/my-bets should require authentication', async () => {
      const res = await request('GET', '/api/bets/my-bets');
      
      expect(res.status).toBe(401);
    });

    it('GET /api/bets/:id should return 404 for unknown bet', async () => {
      const res = await request('GET', '/api/bets/nonexistent123');
      
      expect(res.status).toBe(404);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Claim Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  describe('Claim Endpoints', () => {
    it('GET /claim/:token should return 404 for invalid token', async () => {
      const res = await request('GET', '/claim/invalid_token');
      
      expect(res.status).toBe(404);
    });

    it('POST /claim/:token/verify should require txHash', async () => {
      const res = await request('POST', '/claim/test_token/verify', {
        body: {},
      });
      
      expect(res.status).toBe(400);
    });

    it('POST /claim/:token/verify should validate txHash format', async () => {
      const res = await request('POST', '/claim/test_token/verify', {
        body: {
          txHash: 'invalid-hash',
        },
      });
      
      expect(res.status).toBe(400);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Notification Endpoints
  // ─────────────────────────────────────────────────────────────────────────

  describe('Notification Endpoints', () => {
    it('GET /api/notifications should require authentication', async () => {
      const res = await request('GET', '/api/notifications');
      
      expect(res.status).toBe(401);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // 404 Handling
  // ─────────────────────────────────────────────────────────────────────────

  describe('Error Handling', () => {
    it('should return 404 for unknown routes', async () => {
      const res = await request('GET', '/unknown/route');
      const json = await expectJson(res, 404);
      
      expect(json.error).toBe('Not found');
    });
  });
});
