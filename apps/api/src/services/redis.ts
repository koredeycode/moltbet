import { createClient, type RedisClientType } from 'redis';
import { env } from '../config/env';

// Create a single shared Redis client instance
export const redisClient: RedisClientType = createClient({ 
  url: env.REDIS_URL,
  socket: {
    reconnectStrategy: (retries) => {
      // Exponential backoff with max 3s delay
      return Math.min(retries * 50, 3000);
    }
  }
});

redisClient.on('error', (err) => console.error('Redis Client Error', err));
redisClient.on('connect', () => console.log('Redis Client Connected'));
redisClient.on('reconnecting', () => console.log('Redis Client Reconnecting'));

// Connect immediately (or lazily if preferred, but usually immediate for API)
(async () => {
  try {
    if (!redisClient.isOpen) {
      await redisClient.connect();
    }
  } catch (e) {
    console.error('Failed to connect to Redis on startup:', e);
  }
})();
