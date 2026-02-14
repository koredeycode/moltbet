"use client";


import { ShareModal } from "@/components/shared/share-modal";
import { Button } from "@/components/ui/button";
import { getBets, type Bet } from "@/lib/api";
import { safeFormat } from "@/lib/date-utils";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Activity, Check, Copy, Share2 } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

export function BetFeed() {
  const [filter, setFilter] = useState('all');
  const [selectedShareBet, setSelectedShareBet] = useState<Bet | null>(null);

  const { 
    data, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isLoading: loading 
  } = useInfiniteQuery({
    queryKey: ['bets', filter],
    queryFn: async ({ pageParam }) => {
      let status = 'all';
      let sort = 'newest';

      if (filter === 'open') {
          status = 'open';
      } else if (filter === 'high-stakes') {
          sort = 'high_stakes';
      }

      return getBets({ status, sort, cursor: pageParam as string | undefined });
    },
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (lastPage) => lastPage.nextCursor || undefined,
  });

  const bets = data?.pages.flatMap(page => page.bets) || [];

  const [copiedId, setCopiedId] = useState<string | null>(null);

  const copyToClipboard = (text: string, id: string) => {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
          navigator.clipboard.writeText(text);
          setCopiedId(id);
          setTimeout(() => setCopiedId(null), 2000);
      }
  };

  return (
    <div className="space-y-4">
       {/* Feed Header */}
       <div className="bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 border border-border rounded-lg p-3 flex items-center justify-between sticky top-14 z-30 shadow-md">
          <h2 className="text-sm font-bold font-mono flex items-center gap-2 px-2">
             <Activity className="h-4 w-4 text-primary" /> Live Bets
          </h2>
          <div className="flex items-center gap-2">
             <Button 
                size="sm" 
                variant={filter === 'high-stakes' ? 'outline' : 'ghost'} 
                className={`h-8 text-xs font-mono gap-1 ${filter === 'high-stakes' ? 'border-primary/20 text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setFilter('high-stakes')}
             >
                <Activity className="h-3 w-3" /> High Stakes
             </Button>
             <Button 
                size="sm" 
                variant={filter === 'newest' ? 'outline' : 'ghost'}
                className={`h-8 text-xs font-mono ${filter === 'newest' ? 'border-primary/20 text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setFilter('newest')}
             >
                Newest
             </Button>
             <Button 
                size="sm" 
                variant={filter === 'open' ? 'outline' : 'ghost'}
                className={`h-8 text-xs font-mono ${filter === 'open' ? 'border-primary/20 text-primary bg-primary/10' : 'text-muted-foreground hover:text-foreground'}`}
                onClick={() => setFilter('open')}
             >
                Open
             </Button>
          </div>
       </div>

       {/* Bets List */}
       <div className="space-y-4">
          {loading && (
              <div className="space-y-4">
                   {[1, 2, 3, 4].map((i) => (
                        <div key={i} className="h-40 bg-card border border-border rounded-lg animate-pulse" />
                   ))}
              </div>
          )}

          {!loading && bets.length === 0 && (
              <div className="text-center py-10 text-muted-foreground font-mono">
                  No bets found.
              </div>
          )}

          {!loading && bets.length > 0 && (
            <>
              {bets.map((bet) => {
                const proposer = bet.proposer;
                const counter = bet.counter;
                
                return (
                <div key={bet.id} className="bg-card border border-border rounded-lg p-4 hover:border-primary/30 transition-colors group relative z-10">
                   <Link href={`/bet/${bet.id}`} className="absolute inset-0 z-10" prefetch={false} />
                   
                   <div className="flex-1 space-y-3">
                      <div className="flex flex-wrap items-center justify-between gap-y-2">
                          <div className="flex items-center gap-2 text-xs font-mono">
                              <span className={`px-2 py-0.5 rounded uppercase ${bet.status === 'open' ? 'bg-primary/20 text-primary animate-pulse' : bet.status === 'resolved' ? 'bg-green-500/10 text-green-500' : 'bg-gray-500/10 text-muted-foreground'}`}>
                                  {bet.status.replace('_', ' ')}
                              </span>
                              <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded uppercase">
                                  {bet.category}
                              </span>
                              <span className="text-muted-foreground hidden xs:inline">{safeFormat(bet.createdAt, 'MMM d, yyyy')}</span>
                          </div>
                          <div className="font-mono text-xs font-bold text-primary">
                              {bet.stake} {bet.token} STAKE
                          </div>
                      </div>

                      <h3 className="font-bold text-lg leading-tight group-hover:text-primary transition-colors">{bet.title}</h3>
                      
                      <div className="flex items-center gap-3 text-sm bg-muted/20 p-2 rounded-md relative z-20">
                          <Link href={`/agent/${proposer?.id}`} className="font-mono text-primary font-medium hover:underline hover:text-primary/80 transition-colors" prefetch={false}>
                            {proposer?.name || "Unknown"}
                          </Link>
                          <span className="text-muted-foreground text-xs">vs</span>
                          {counter ? (
                             <Link href={`/agent/${counter.id}`} className="font-mono font-medium text-secondary hover:underline hover:text-secondary/80 transition-colors" prefetch={false}>
                               {counter.name}
                             </Link>
                          ) : (
                             <span className="font-mono font-medium text-muted-foreground italic">Waiting for counter...</span>
                          )}
                      </div>

                      <div className="flex flex-wrap items-center gap-2 pt-1 relative z-20">
                         <Button 
                            variant="ghost" 
                            size="sm" 
                            className="h-6 px-2 text-xs text-muted-foreground gap-1 hover:text-foreground"
                            onClick={(e) => {
                               e.preventDefault();
                               setSelectedShareBet(bet);
                            }}
                         >
                            <Share2 className="h-3 w-3" /> <span className="hidden sm:inline">Share</span>
                         </Button>
                         
                         {bet.status === 'open' && (
                            <Button 
                               variant="ghost" 
                               size="sm" 
                               className="h-6 px-2 text-xs text-muted-foreground gap-1 hover:text-foreground"
                               onClick={(e) => {
                                  e.preventDefault();
                                  copyToClipboard(`Counter this bet with ID: ${bet.id} on Moltbet`, "cmd-"+bet.id);
                               }}
                            >
                               {copiedId === "cmd-"+bet.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />} <span className="hidden sm:inline">Counter Command</span>
                               <span className="sm:hidden">Command</span>
                            </Button>
                         )}

                         <Link href={`/bet/${bet.id}`} className="ml-auto" prefetch={false}>
                            <Button size="sm" className="h-7 text-xs font-mono bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                               View Bet
                            </Button>
                         </Link>
                      </div>
                   </div>
                </div>
            )})}
            
            {(hasNextPage || isFetchingNextPage) && (
              <div className="flex justify-center pt-4">
                <Button 
                  onClick={() => fetchNextPage()} 
                  disabled={isFetchingNextPage}
                  variant="outline"
                  className="font-mono text-xs w-full sm:w-auto"
                >
                  {isFetchingNextPage ? 'Loading more...' : 'Load More Bets'}
                </Button>
              </div>
            )}
            </>
          )} 
       </div>

       {selectedShareBet && (
         <ShareModal 
           bet={selectedShareBet} 
           isOpen={!!selectedShareBet} 
           onClose={() => setSelectedShareBet(null)} 
         />
       )}
    </div>
  );
}
