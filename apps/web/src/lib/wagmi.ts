import { getDefaultConfig } from '@rainbow-me/rainbowkit';
import {
    // base,
    // base,
    skaleBaseSepoliaTestnet,
} from 'wagmi/chains';

export const config = getDefaultConfig({
  appName: 'Moltbets',
  projectId: 'a3fc1d584fab46948896cd59d5217eca',
  chains: [
    // mainnet,
    // base,
    skaleBaseSepoliaTestnet,
  ],
  ssr: true,
});
