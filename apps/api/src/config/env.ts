// Environment variables
import 'dotenv/config';

export const env = {
  // Database
  DATABASE_URL: process.env.DATABASE_URL || '',
  REDIS_URL: process.env.REDIS_URL || '',
  
  // Blockchain
  BASE_SEPOLIA_RPC: process.env.BASE_SEPOLIA_RPC || 'https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha',
  FACILITATOR_PRIVATE_KEY: process.env.FACILITATOR_PRIVATE_KEY || '',
  FACILITATOR_URL: process.env.FACILITATOR_URL || 'https://facilitator.payai.network',
  RECEIVING_ADDRESS: process.env.RECEIVING_ADDRESS || '',
  NETWORK_CHAIN_ID: process.env.NETWORK_CHAIN_ID || '324705682',
  
  // Contracts
  USDC_ADDRESS: process.env.USDC_ADDRESS || '0x2e08028E3C4c2356572E096d8EF835cD5C6030bD',
  ESCROW_ADDRESS: process.env.ESCROW_ADDRESS || '',
  IDENTITY_ADDRESS: process.env.IDENTITY_ADDRESS || '0x31090447FD9D51B98486F16426129603C8B7f0b0',
  
  // Auth
  API_KEY_SALT: process.env.API_KEY_SALT || 'dev-salt',
  
  // Admin Auth
  ADMIN_USERNAME: process.env.ADMIN_USERNAME || 'admin',
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || 'admin123',
  JWT_SECRET: process.env.JWT_SECRET || 'dev-jwt-secret-change-in-production',
  
  // Server
  PORT: parseInt(process.env.PORT || '3000', 10),
  NODE_ENV: process.env.NODE_ENV || 'development',
};

export function validateEnv() {
  const required = ['DATABASE_URL', 'FACILITATOR_PRIVATE_KEY'];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0 && env.NODE_ENV === 'production') {
    throw new Error(`Missing required environment variables: ${missing.join(', ')}`);
  }
}
