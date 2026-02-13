import { skaleBaseSepoliaTestnet as skaleBaseSepoliaTestnetViem } from 'viem/chains';

/**
 * Local chain definition for Skale Base Sepolia Testnet
 * Overrides native currency to CREDIT as per Moltbet requirements
 */
export const skaleBaseSepoliaTestnet = {
  ...skaleBaseSepoliaTestnetViem,
  nativeCurrency: {
    ...skaleBaseSepoliaTestnetViem.nativeCurrency,
    name: 'CREDIT',
    symbol: 'CREDIT',
  },
};
