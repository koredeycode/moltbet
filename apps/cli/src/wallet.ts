// Wallet management - Simplified (no encryption)
import { skaleBaseSepoliaTestnet } from '@moltbet/shared';
import { createPublicClient, formatEther, http, parseAbi } from 'viem';
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts';
import { getPrivateKey, getWalletAddress, setWallet } from './config';

// USDC on Skale Base Sepolia
const USDC_ADDRESS = '0x2e08028E3C4c2356572E096d8EF835cD5C6030bD';

const publicClient = createPublicClient({
  chain: skaleBaseSepoliaTestnet,
  transport: http('https://base-sepolia-testnet.skalenodes.com/v1/jubilant-horrible-ancha'),
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
export async function getTokenBalance(address: string, tokenAddress: string = USDC_ADDRESS, decimals: number = 6): Promise<string> {
  const balance = await publicClient.readContract({
    address: tokenAddress as `0x${string}`,
    abi: parseAbi(['function balanceOf(address) view returns (uint256)']),
    functionName: 'balanceOf',
    args: [address as `0x${string}`],
  });
  
  const divisor = 10 ** decimals
  return (Number(balance) / divisor).toFixed(decimals);
}

// Backwards compatibility
export const getUsdcBalance = (address: string) => getTokenBalance(address, USDC_ADDRESS, 6);

/**
 * Get CREDIT balance
 */
export async function getCreditBalance(address: string): Promise<string> {
  const balance = await publicClient.getBalance({
    address: address as `0x${string}`,
  });
  
  return formatEther(balance);
}
