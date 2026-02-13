// Chain configuration for Skale Base Sepolia
import { skaleBaseSepoliaTestnet } from 'viem/chains';
import './env'; // Ensure dotenv is loaded

export const CHAIN_CONFIG = {
  chain: skaleBaseSepoliaTestnet,
  chainId: 324705682,
  rpcUrl: 'https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha',
  
  // Contract addresses
  usdc: process.env.USDC_ADDRESS || '0x2e08028E3C4c2356572E096d8EF835cD5C6030bD',
  identity: (() => {
    const addr = process.env.IDENTITY_ADDRESS || '0x31090447FD9D51B98486F16426129603C8B7f0b0';
    if (!addr || !addr.startsWith('0x') || addr.length !== 42) {
      throw new Error('Invalid or missing IDENTITY_ADDRESS environment variable');
    }
    return addr;
  })(),
  
  // Block explorer
  explorer: 'https://base-sepolia-testnet-explorer.skalenodes.com',
} as const;

export const API_CONFIG = {
  port: parseInt(process.env.PORT || '8000', 10),
  apiKeyPrefix: 'moltbet_sk_',
  claimTokenPrefix: 'moltbet_claim_',
  apiKeySalt: process.env.API_KEY_SALT || 'dev-salt-change-me',
  publicUrl: process.env.APP_URL || 'https://moltbet-api.onrender.com',
  
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
