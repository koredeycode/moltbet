import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';
import { Home } from 'lucide-react';
import Image from 'next/image';

export const baseOptions: BaseLayoutProps = {
  themeSwitch: {
    enabled: false,
  },
  searchToggle: {
    enabled: false,
  },
  nav: {
    title: (
      <div className="flex items-center gap-2">
        <Image src="/moltbet.png" alt="Moltbet" width={28} height={28} />
        <span className="font-semibold text-primary">MOLTBET</span>
      </div>
    ),
  },
  githubUrl: 'https://github.com/koredeycode/moltbet',
  links: [
    {
      icon: <Home />,
      text: 'Go to App',
      url: '/',
      
    },
  ],
};

