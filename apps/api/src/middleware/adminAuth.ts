// Admin authentication middleware
// Uses JWT cookie auth for web UI access

import * as bcrypt from 'bcrypt';
import { getCookie } from 'hono/cookie';
import { createMiddleware } from 'hono/factory';
import { HTTPException } from 'hono/http-exception';
import * as jose from 'jose';
import { env } from '../config/env';

// Hash the admin password on startup (cached in memory)
let adminPasswordHash: string | null = null;

async function getAdminPasswordHash(): Promise<string | null> {
  if (adminPasswordHash) return adminPasswordHash;
  
  if (!env.ADMIN_PASSWORD) {
    console.warn('[Admin] No ADMIN_PASSWORD set - admin routes disabled');
    return null;
  }
  
  adminPasswordHash = await bcrypt.hash(env.ADMIN_PASSWORD, 10);
  return adminPasswordHash;
}

// Initialize hash on module load
getAdminPasswordHash();

// JWT secret key (cached)
let jwtSecretKey: Uint8Array | null = null;

function getJWTSecret(): Uint8Array {
  if (!jwtSecretKey) {
    jwtSecretKey = new TextEncoder().encode(env.JWT_SECRET);
  }
  return jwtSecretKey;
}

/**
 * Verify JWT token from cookie
 */
export async function verifyJWT(token: string): Promise<boolean> {
  try {
    const { payload } = await jose.jwtVerify(token, getJWTSecret(), {
      issuer: 'moltbet-admin',
      audience: 'moltbet-admin',
    });
    
    return payload.role === 'admin';
  } catch {
    return false;
  }
}

/**
 * Sign a new JWT token
 */
export async function signAdminJWT(): Promise<string> {
  const jwt = await new jose.SignJWT({ role: 'admin' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setIssuer('moltbet-admin')
    .setAudience('moltbet-admin')
    .setExpirationTime('24h')
    .sign(getJWTSecret());
  
  return jwt;
}

/**
 * Validate admin credentials (username/password)
 */
export async function validateAdminCredentials(username: string, password: string): Promise<boolean> {
  if (username !== env.ADMIN_USERNAME) {
    return false;
  }
  
  const hash = await getAdminPasswordHash();
  if (!hash) {
    return false;
  }
  
  return bcrypt.compare(password, hash);
}

/**
 * Admin authentication middleware
 * Uses JWT cookie for authentication
 */
export const adminAuthMiddleware = createMiddleware(async (c, next) => {
  const jwtToken = getCookie(c, 'admin_token');
  
  if (!jwtToken) {
    throw new HTTPException(401, { 
      message: 'Admin authentication required',
    });
  }
  
  const valid = await verifyJWT(jwtToken);
  
  if (!valid) {
    throw new HTTPException(401, { 
      message: 'Invalid or expired token',
    });
  }
  
  c.set('isAdmin', true);
  await next();
});
