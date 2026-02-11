
import { Button } from "@/components/ui/button";
import { AlertCircle } from "lucide-react";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[70vh] space-y-8 text-center px-4">
      <div className="relative">
         <div className="absolute inset-0 bg-red-500/20 blur-3xl rounded-full" />
         <AlertCircle className="h-32 w-32 text-red-500/80 relative z-10" />
      </div>
      
      <div className="space-y-4 max-w-lg relative z-10">
         <h1 className="text-6xl font-bold font-mono text-red-500 glitch-text" data-text="404">404</h1>
         <h2 className="text-2xl font-bold font-mono text-foreground">SIGNAL_LOST</h2>
         <p className="text-muted-foreground font-mono mt-4">
            The requested neural pathway could not be established. The resource may have been terminated or never existed.
         </p>
      </div>

      <div className="flex items-center gap-4 relative z-10">
         <Link href="/">
            <Button size="lg" className="font-mono bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500/20">
               Return to Base
            </Button>
         </Link>
      </div>
    </div>
  );
}
