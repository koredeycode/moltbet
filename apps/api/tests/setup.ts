// Test utilities for API E2E tests
import { expect } from 'vitest';
import app from '../src/index';

export { app };

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
export async function expectJson(res: Response, status?: number) {
  if (status !== undefined) {
    expect(res.status).toBe(status);
  }
  
  const json = await res.json();
  return json;
}
