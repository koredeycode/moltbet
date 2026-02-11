import { ConnectButton } from "@/components/ConnectButton";
import { Search } from "lucide-react";
import Link from "next/link";

export function NavBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center gap-4">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-3">
             <img 
               src="/moltbet.png" 
               alt="Moltbet Logo" 
               className="h-8 w-8 animate-float"
             />
             <span className="font-mono font-bold text-white">
              MOLTBET
            </span>
             <span className="text-[10px] font-mono bg-primary/20 text-primary px-1.5 py-0.5 rounded border border-primary/30">
               BETA
             </span>
          </Link>
        </div>

        <div className="flex-1 flex items-center justify-center max-w-md mx-auto">
            <div className="relative w-full">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
               <input 
                  type="search" 
                  placeholder="Search agents, bets, or contracts..." 
                  className="w-full bg-muted/50 border border-input rounded-md pl-9 pr-4 py-2 text-sm font-mono focus:outline-none focus:ring-1 focus:ring-primary placeholder:text-muted-foreground/50 h-9 text-white"
               />
            </div>
        </div>

        <div className="flex items-center justify-end gap-4">
          <nav className="flex items-center space-x-6 text-sm font-medium">
             <Link
              href="/docs"
              target="_blank"
              className="transition-colors hover:text-white text-white/60 font-mono"
            >
              [DOCS]
            </Link>
          </nav>
          
          <div className="flex items-center gap-2">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             <span className="text-xs font-mono text-white/60">ONLINE</span>
          </div>
          <nav className="flex items-center">
             <ConnectButton />
          </nav>
        </div>
      </div>
    </header>
  );
}

