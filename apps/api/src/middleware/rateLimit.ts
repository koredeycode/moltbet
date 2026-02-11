import { Context } from 'hono';
import { rateLimiter, type Store } from 'hono-rate-limiter';
import RedisStore from "rate-limit-redis";
import { createClient } from "redis";

import { env } from '../config/env';

// Create Redis client
const redisClient = createClient({ url: env.REDIS_URL });
redisClient.connect();

// Helper to create limiters
const createLimiter = (windowMs: number, limit: number, prefix: string) => {
  return rateLimiter({
    windowMs,
    limit,
    standardHeaders: 'draft-6',
    keyGenerator: (c: Context) => {
      // Use agent ID if authenticated
      const agent = c.get('agent');
      if (agent) {
        return agent.id;
      }
      
      // Fallback to IP address
      const xForwardedFor = c.req.header('x-forwarded-for');
      if (xForwardedFor) {
        return xForwardedFor.split(',')[0].trim();
      }
      
      return '';
    },
    store: new RedisStore({
      prefix: `moltbet:rl:${prefix}:`,
      resetExpiryOnChange: true,  
      sendCommand: (...args: string[]) => redisClient.sendCommand(args),
    }) as unknown as Store,
    handler: (c, next) => { 
      const options = {
        windowMs,
        limit,
      };
      
      // Calculate retry after
      // Note: hono-rate-limiter doesn't easily expose the precise reset time in the handler context
      // without some hacking, but we can return the window size as a hint or just standards.
      // However, typical behavior provided by the lib's headers is best.
      // We will enhance the response body.
      
      return c.json({ 
        success: false,
        error: 'Too Many Requests',
        message: `Rate limit exceeded. Limit is ${limit} requests per ${windowMs / 1000} seconds.`,
        retry_after_seconds: Math.ceil(windowMs / 1000), 
      }, 429);
    },
  });
};

// 1. General Limiter (Global fallback)
// 100 requests per hour
// export const generalLimiter = createLimiter(60 * 60 * 1000, 100, 'general');
export const generalLimiter = createLimiter(60 * 60 * 1000, 100, 'general');

// 2. Auth Limiter (Sensitive: Register, Login, Claim)
// 10 requests per 15 minutes
export const authLimiter = createLimiter(15 * 60 * 1000, 10, 'auth');

// 3. Action Limiter Helpers (Business Rule: Bet Actions)
// Limits number of successful actions (Create/Counter) per hour
// Limit: 10 actions per hour
const BET_ACTION_LIMIT = 10;
const BET_ACTION_WINDOW = 60 * 60; // 1 hour in seconds

export async function checkBettingLimit(agentId: string): Promise<void> {
  const key = `moltbet:limit:betting:${agentId}`;
  const count = await redisClient.get(key);
  
  if (count && parseInt(count) >= BET_ACTION_LIMIT) {
    throw new Error(`Betting limit reached. You can only create/counter ${BET_ACTION_LIMIT} bets per hour.`);
  }
}

export async function incrementBettingLimit(agentId: string): Promise<void> {
  const key = `moltbet:limit:betting:${agentId}`;
  
  const multi = redisClient.multi();
  multi.incr(key);
  multi.expire(key, BET_ACTION_WINDOW, 'NX'); // Set expiry only if not exists
  await multi.exec();
}


