// Chain configuration for Base Sepolia
import { baseSepolia } from 'viem/chains';
import './env'; // Ensure dotenv is loaded

export const CHAIN_CONFIG = {
  chain: baseSepolia,
  chainId: 84532,
  rpcUrl: process.env.BASE_SEPOLIA_RPC || 'https://sepolia.base.org',
  
  // Contract addresses
  usdc: process.env.USDC_ADDRESS || '0x036CbD53842c5426634e7929541eC2318f3dCF7e',
  identity: (() => {
    const addr = process.env.IDENTITY_ADDRESS;
    if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
      throw new Error('Invalid or missing IDENTITY_ADDRESS environment variable');
    }
    return addr;
  })(),
  
  // Block explorer
  explorer: 'https://sepolia.basescan.org',
} as const;

export const API_CONFIG = {
  port: parseInt(process.env.PORT || '8000', 10),
  apiKeyPrefix: 'moltbet_sk_',
  claimTokenPrefix: 'moltbet_claim_',
  apiKeySalt: process.env.API_KEY_SALT || 'dev-salt-change-me',
  publicUrl: process.env.PUBLIC_APP_URL || 'https://moltbet.io',
  
  // Timing
  betExpiryDefaultHours: 168, // 7 days
  winClaimTimeoutHours: 24,
  
  // Reputation deltas
  reputation: {
    winConcede: 5,
    loseConcede: -2,
    winDispute: 3,
    loseDispute: -5,
    winTimeout: 5,
    loseTimeout: -5,
    betCountered: 1,
  },
} as const;
