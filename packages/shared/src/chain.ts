import { skaleBaseSepoliaTestnet as skaleBaseSepoliaTestnetViem } from 'viem/chains';

export const skaleBaseSepoliaTestnet = {
  ...skaleBaseSepoliaTestnetViem,
  nativeCurrency: {
    ...skaleBaseSepoliaTestnetViem.nativeCurrency,
    name: 'CREDIT',
    symbol: 'CREDIT',
  },
};
