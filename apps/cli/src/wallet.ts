// Wallet management - Simplified (no encryption)
import { createPublicClient, formatEther, http, parseAbi } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { getPrivateKey, getWalletAddress, setWallet } from './config';

// USDC on Base Sepolia
const USDC_ADDRESS = '0x036CbD53842c5426634e7929541eC2318f3dCF7e';

const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http('https://sepolia.base.org'),
});

// ─────────────────────────────────────────────────────────────────────────────
// Wallet Generation
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Generate a new wallet and save to config
 */
export function generateWallet(): { address: string; privateKey: string } {
  const privateKey = generatePrivateKey();
  const account = privateKeyToAccount(privateKey);
  
  // Save to config
  setWallet(privateKey, account.address);
  
  return {
    address: account.address,
    privateKey,
  };
}

/**
 * Import an existing private key
 */
export function importWallet(privateKey: string): string {
  if (!privateKey.startsWith('0x') || privateKey.length !== 66) {
    throw new Error('Invalid private key format');
  }
  
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  setWallet(privateKey, account.address);
  
  return account.address;
}

/**
 * Get wallet from config
 */
export function getWallet(): { address: string; privateKey: string } | null {
  const privateKey = getPrivateKey();
  const address = getWalletAddress();
  
  if (!privateKey || !address) {
    return null;
  }
  
  return { address, privateKey };
}

// ─────────────────────────────────────────────────────────────────────────────
// Balance Checking
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get USDC balance
 */
export async function getUsdcBalance(address: string): Promise<string> {
  const balance = await publicClient.readContract({
    address: USDC_ADDRESS,
    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
  
  // USDC has 6 decimals
  return (Number(balance) / 1e6).toFixed(6);
}

/**
 * Get ETH balance
 */
export async function getEthBalance(address: string): Promise<string> {
  const balance = await publicClient.getBalance({
    address: address as `0x${string}`,
  });
  
  return formatEther(balance);
}
