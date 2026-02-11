// Facilitator Service — holds funds and disburses payouts
import {
    createPublicClient,
    createWalletClient,
    http,
    parseAbi,
    publicActions,
    type Hash,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { baseSepolia } from 'viem/chains';
import { env } from '../config/env';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

export interface TransactionResult {
  success: boolean;
  txHash?: Hash;
  error?: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Wallet & Client Setup
// ─────────────────────────────────────────────────────────────────────────────

// ─────────────────────────────────────────────────────────────────────────────
// Wallet & Client Setup
// ─────────────────────────────────────────────────────────────────────────────

let account: any;
let walletClient: any;
let publicClient: any;
let FACILITATOR_ADDRESS: string = '0x0000000000000000000000000000000000000000';

function initClients() {
  if (account) return;

  try {
    const key = env.FACILITATOR_PRIVATE_KEY;
    if (!key || key === '') {
      console.warn('[Facilitator] No private key provided. Wallet functionality disabled.');
      return;
    }

    account = privateKeyToAccount(key as `0x${string}`);
    FACILITATOR_ADDRESS = account.address;

    walletClient = createWalletClient({
      account,
      chain: baseSepolia,
      transport: http(env.BASE_SEPOLIA_RPC),
    }).extend(publicActions);

    publicClient = createPublicClient({
      chain: baseSepolia,
      transport: http(env.BASE_SEPOLIA_RPC),
    });
  } catch (error) {
    console.warn('[Facilitator] Failed to initialize wallet:', error);
  }
}

// Initialize on import (safe fail)
initClients();

const USDC_ADDRESS = env.USDC_ADDRESS as `0x${string}`;

const ERC20_ABI = parseAbi([
  'function transfer(address to, uint256 amount) returns (bool)',
  'function balanceOf(address account) view returns (uint256)',
]);

// ─────────────────────────────────────────────────────────────────────────────
// Facilitator Info
// ─────────────────────────────────────────────────────────────────────────────

export const facilitatorInfo = {
  get address() {
    return FACILITATOR_ADDRESS;
  },
  chain: baseSepolia.name,
  chainId: baseSepolia.id,
};

export { FACILITATOR_ADDRESS };

// ─────────────────────────────────────────────────────────────────────────────
// Disbursement Functions
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Disburse payout to the bet winner (stake * 2)
 * Called when a bet is resolved (concede, admin resolution, timeout)
 */
export async function disbursePayout(
  winnerAddress: string,
  amountUsdc: string
): Promise<TransactionResult> {
  if (!walletClient) return { success: false, error: 'Facilitator wallet not initialized' };

  try {
    const amount = BigInt(Math.floor(parseFloat(amountUsdc) * 1_000_000));

    const txHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [winnerAddress as `0x${string}`, amount],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[Facilitator] Payout sent: ${amountUsdc} USDC → ${winnerAddress} | Tx: ${txHash}`);

    return { success: true, txHash };
  } catch (error) {
    console.error(`[Facilitator] Payout failed:`, error);
    return { success: false, error: (error as Error).message };
  }
}

/**
 * Refund stake to an address (for bet cancellation)
 */
export async function refundStake(
  address: string,
  amountUsdc: string
): Promise<TransactionResult> {
  if (!walletClient) return { success: false, error: 'Facilitator wallet not initialized' };

  try {
    const amount = BigInt(Math.floor(parseFloat(amountUsdc) * 1_000_000));

    const txHash = await walletClient.writeContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'transfer',
      args: [address as `0x${string}`, amount],
    });

    await publicClient.waitForTransactionReceipt({ hash: txHash });
    console.log(`[Facilitator] Refund sent: ${amountUsdc} USDC → ${address} | Tx: ${txHash}`);

    return { success: true, txHash };
  } catch (error) {
    console.error(`[Facilitator] Refund failed:`, error);
    return { success: false, error: (error as Error).message };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Balance Check
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get the USDC balance of the facilitator wallet
 */
export async function getFacilitatorBalance(): Promise<bigint> {
  if (!publicClient || !account) return 0n;

  try {
    const balance = await publicClient.readContract({
      address: USDC_ADDRESS,
      abi: ERC20_ABI,
      functionName: 'balanceOf',
      args: [account.address],
    });
    return balance;
  } catch (error) {
    console.error('Failed to get facilitator balance:', error);
    return 0n;
  }
}
