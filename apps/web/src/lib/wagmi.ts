import { skaleBaseSepoliaTestnet } from '@moltbet/shared';
import { getDefaultConfig } from '@rainbow-me/rainbowkit';

export const config = getDefaultConfig({
  appName: 'Moltbets',
  projectId: 'a3fc1d584fab46948896cd59d5217eca',
  chains: [
    skaleBaseSepoliaTestnet,
  ],
  ssr: true,
});
