// API Key authentication middleware
import * as crypto from 'crypto';
import { eq } from 'drizzle-orm';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import { agents, getDb } from '../db';

export interface AuthContext {
  agent: {
    id: string;
    name: string;
    address: string;
    status: string;
  };
}

/**
 * Generate SHA-256 hash for API key
 * The hash is stored in DB and indexed for O(1) lookup
 */
export function hashApiKey(apiKey: string): string {
  return crypto.createHash('sha256').update(apiKey).digest('hex');
}

// Helper to resolve agent from request
async function resolveAgent(c: any): Promise<AuthContext['agent'] | null> {
  const authHeader = c.req.header('Authorization');
  
  if (!authHeader?.startsWith('Bearer ')) {
    return null;
  }
  
  const apiKey = authHeader.slice(7);
  
  if (!apiKey.startsWith('moltbet_sk_')) {
    return null;
  }
  
  const db = getDb();
  
  // O(1) lookup using SHA-256 hash on indexed column
  const apiKeyHash = hashApiKey(apiKey);
  const agent = await db.query.agents.findFirst({
    where: eq(agents.apiKeyHash, apiKeyHash),
  });
  
  if (!agent) {
    return null;
  }
  
  return {
    id: agent.id,
    name: agent.name,
    address: agent.address,
    status: agent.status,
  };
}

export const authMiddleware = createMiddleware<{ Variables: AuthContext }>(
  async (c, next) => {
    // Check if agent is already resolved (by passive middleware)
    const existingAgent = c.get('agent');
    if (existingAgent) {
      await next();
      return;
    }

    const agent = await resolveAgent(c);
    
    if (!agent) {
       // If we failed to resolve (and wasn't already set), determine why for better error
       const authHeader = c.req.header('Authorization');
       if (!authHeader?.startsWith('Bearer ')) {
         throw new HTTPException(401, { message: 'Missing or invalid Authorization header' });
       }
       throw new HTTPException(401, { message: 'Invalid API key' });
    }
    
    c.set('agent', agent);
    await next();
  }
);

// Passive auth middleware - tries to resolve agent but continues even if not found
export const passiveAuthMiddleware = createMiddleware<{ Variables: AuthContext }>(
  async (c, next) => {
    try {
      const agent = await resolveAgent(c);
      if (agent) {
        c.set('agent', agent);
      }
    } catch (e) {
      // Ignore errors in passive mode
    }
    await next();
  }
);

// Require verified agent status
export const requireVerified = createMiddleware<{ Variables: AuthContext }>(
  async (c, next) => {
    const agent = c.get('agent');
    
    if (agent.status !== 'verified') {
      throw new HTTPException(403, { 
        message: 'Agent must be verified to perform this action. Visit your claim URL to mint your identity NFT.' 
      });
    }
    
    await next();
  }
);
