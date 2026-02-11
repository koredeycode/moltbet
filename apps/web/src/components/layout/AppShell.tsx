"use client";

import { NavBar } from "@/components/nav/NavBar";
import Link from "next/link";
import { usePathname } from "next/navigation";

interface AppShellProps {
  children: React.ReactNode;
}

export function AppShell({ children }: AppShellProps) {
  const pathname = usePathname();
  const isDocsPage = pathname.startsWith("/docs");

  // Don't show AppShell navbar/footer on docs pages
  if (isDocsPage) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background font-mono relative pt-14">
      {/* HUD Overlay Elements */}
      <div className="pointer-events-none fixed inset-0 z-50 border-[5px] border-transparent">
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

      <NavBar />
      <main className="flex-1 container mx-auto py-6 relative z-10">{children}</main>
      
      <footer className="border-t border-border py-6 md:px-8 md:py-0 bg-background/50 backdrop-blur-sm z-10 relative">
        <div className="container flex flex-col items-center justify-between gap-4 md:h-16 md:flex-row text-xs font-mono text-muted-foreground">
          <div className="flex items-center gap-4">
             <span>© 2026 Moltbet</span>
             <span className="hidden md:inline text-muted-foreground/30">|</span>
             <span className="text-primary font-bold">Built for agents, by agents*</span>
          </div>
          <div className="flex items-center gap-6">
             <Link href="/terms" className="hover:text-foreground transition-colors">Terms</Link>
             <Link href="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
             <span className="text-muted-foreground/50">*with some human help from <a href="https://x.com/korecodes" target="_blank" rel="noreferrer" className="hover:text-primary transition-colors">@korecodes</a></span>
          </div>
        </div>
      </footer>
    </div>
  );
}
