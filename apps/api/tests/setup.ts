// Test utilities for API E2E tests
import { expect, vi } from 'vitest';

// Mock Redis client
vi.mock('../src/services/redis', () => ({
  redisClient: {
    connect: vi.fn(),
    on: vi.fn(),
    isOpen: true,
    get: vi.fn(),
    set: vi.fn(),
  }
}));

// Mock rate-limit-redis to use MemoryStore-like behavior or just do nothing
vi.mock('rate-limit-redis', () => {
  return {
    default: class MockRedisStore {
      constructor() {}
      init() {}
      increment(key: string) { return Promise.resolve({ totalHits: 1, resetTime: undefined }); }
      decrement(key: string) { return Promise.resolve(); }
      resetKey(key: string) { return Promise.resolve(); }
      resetAll() { return Promise.resolve(); }
    },
  };
});

// Mock DB
const { mockDbInstance } = vi.hoisted(() => {
  const mockDb = {
    query: {
      agents: {
        findFirst: vi.fn(() => null),
        findMany: vi.fn(() => []),
      },
      bets: {
        findFirst: vi.fn(() => null),
        findMany: vi.fn(() => []),
      },
      notifications: {
        findFirst: vi.fn(() => null),
        findMany: vi.fn(() => []),
      },
    },
    select: vi.fn(() => ({
      from: vi.fn(() => ({
        where: vi.fn(),
        limit: vi.fn(),
        orderBy: vi.fn(),
      })),
    })),
    insert: vi.fn(() => ({
      values: vi.fn(() => ({
        returning: vi.fn(),
      })),
    })),
    update: vi.fn(() => ({
      set: vi.fn(() => ({
        where: vi.fn(),
      })),
    })),
  };
  return { mockDbInstance: mockDb };
});

vi.mock('../src/db', async (importOriginal) => {
  const actual = await importOriginal<typeof import('../src/db')>();
  return {
    ...actual,
    getDb: vi.fn(() => mockDbInstance),
  };
});

import app from '../src/app';

export { app, mockDbInstance };

// Mock database for testing
export const mockDb = {
  agents: [] as any[],
  bets: [] as any[],
  notifications: [] as any[],
};

/**
 * Create test request helper
 */
export async function request(
  method: 'GET' | 'POST' | 'PUT' | 'DELETE',
  path: string,
  options: {
    body?: any;
    headers?: Record<string, string>;
  } = {}
) {
  const { body, headers = {} } = options;
  
  const req = new Request(`http://localhost${path}`, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  
  return app.fetch(req);
}

/**
 * Generate mock API key for tests
 */
export function mockApiKey() {
  return 'moltbet_sk_test1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcd';
}

/**
 * Assert JSON response
 */
export async function expectJson(res: Response, status?: number): Promise<any> {
  if (status !== undefined) {
    expect(res.status).toBe(status);
  }
  
  const json = await res.json();
  return json;
}
