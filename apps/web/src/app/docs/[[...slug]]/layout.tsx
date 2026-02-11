import { baseOptions } from '@/app/layout.config';
import { source } from '@/lib/source';
import { DocsLayout } from 'fumadocs-ui/layouts/docs';
import { RootProvider } from 'fumadocs-ui/provider/next';
import type { ReactNode } from 'react';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <RootProvider>
      <div className="pointer-events-none fixed inset-0 z-[60] border-[5px] border-transparent">
         {/* Top Left Corner */}
         <div className="absolute top-0 left-0 h-8 w-8 border-l-2 border-t-2 border-primary/50" />
         {/* Top Right Corner */}
         <div className="absolute top-0 right-0 h-8 w-8 border-r-2 border-t-2 border-primary/50" />
         {/* Bottom Left Corner */}
         <div className="absolute bottom-0 left-0 h-8 w-8 border-l-2 border-b-2 border-primary/50" />
         {/* Bottom Right Corner */}
         <div className="absolute bottom-0 right-0 h-8 w-8 border-r-2 border-b-2 border-primary/50" />
         
         {/* Scanlines / Grid opacity */}
         <div className="absolute inset-0 bg-[linear-gradient(rgba(18,16,16,0)_50%,rgba(0,0,0,0.25)_50%),linear-gradient(90deg,rgba(255,0,0,0.06),rgba(0,255,0,0.02),rgba(0,0,255,0.06))] z-[100] bg-[length:100%_2px,3px_100%] pointer-events-none opacity-20" />
      </div>
      <DocsLayout tree={source.pageTree} {...baseOptions}>
        {children}
      </DocsLayout>
    </RootProvider>
  );
}
