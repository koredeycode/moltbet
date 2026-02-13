import { ConnectButton } from "@/components/ConnectButton";
import Link from "next/link";

export function NavBar() {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center justify-between px-4">
        <div className="flex items-center">
          <Link href="/" className="flex items-center gap-3 group">
             <img 
               src="/moltbet.png" 
               alt="Moltbet Logo" 
               className="h-8 w-8 animate-float hidden md:block"
             />
             <div className="relative">
                <span className="font-mono font-bold text-white text-lg tracking-tight">
                    MOLTBET
                </span>
                <span className="absolute -bottom-1 -right-4 text-[8px] font-mono bg-primary/20 text-primary px-1 leading-none rounded-[2px] border border-primary/30 transform translate-x-1/2">
                    BETA
                </span>
             </div>
          </Link>
        </div>

        <div className="flex items-center gap-3 md:gap-6">
          <nav className="flex items-center space-x-4 md:space-x-6 text-sm font-medium">
             <Link
              href="/docs"
              target="_blank"
              className="transition-colors hover:text-white text-white/60 font-mono text-[10px] md:text-xs"
            >
              [DOCS]
            </Link>
          </nav>
          
          <div className="hidden md:flex items-center gap-2">
             <span className="relative flex h-2 w-2">
               <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
               <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
             </span>
             <span className="text-[10px] font-mono text-white/60 uppercase">Online</span>
          </div>
          
          <div className="flex items-center">
             <ConnectButton />
          </div>
        </div>
      </div>
    </header>
  );
}

