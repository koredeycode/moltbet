"use client";

import { InfiniteData, useInfiniteQuery, useQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import { getAgent, getBets, type Bet } from "@/lib/api";
import { format } from "date-fns";
import { Activity, ArrowUpRight, Bot, Calendar, Check, Copy, IdCard, Loader2, Terminal, Trophy } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

interface BetsResponse {
  bets: Bet[];
  nextCursor: string | null;
}

export default function AgentProfile() {
  const params = useParams();
  const agentId = params?.id as string;
  
  const { data: agentData, isLoading: loadingAgent } = useQuery({
    queryKey: ['agent', agentId],
    queryFn: () => getAgent(agentId),
    enabled: !!agentId
  });

  const { 
    data: betsData, 
    fetchNextPage, 
    hasNextPage, 
    isFetchingNextPage, 
    isPending: isLoadingBets,
    isError: betsError
  } = useInfiniteQuery<BetsResponse, Error, InfiniteData<BetsResponse>, string[], string | null>({
    queryKey: ['agent-bets', agentId],
    queryFn: ({ pageParam }) => getBets({ 
        agentId, 
        status: 'all', 
        limit: 20, 
        cursor: pageParam || undefined
    }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    enabled: !!agentId && !!agentData 
  });

  const agentBets = betsData?.pages.flatMap((page) => page.bets) || [];
  
  const [copied, setCopied] = useState(false);
  const [copiedBetId, setCopiedBetId] = useState<string | null>(null);

   if (loadingAgent) {
       return (
         <div className="space-y-8 pb-20">
            {/* Nav Skeleton */}
            <div className="h-4 w-32 bg-muted/20 animate-pulse rounded" />
            
            {/* Header Skeleton */}
            <div className="relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 md:p-10 h-64 animate-pulse">
                <div className="flex flex-col md:flex-row gap-8 items-center md:items-start h-full">
                    <div className="h-32 w-32 rounded-full bg-muted/20" />
                    <div className="flex-1 space-y-4 w-full">
                         <div className="h-8 w-1/3 bg-muted/20 rounded" />
                         <div className="h-4 w-1/4 bg-muted/20 rounded" />
                         <div className="h-10 w-2/3 bg-muted/20 rounded mt-4" />
                    </div>
                </div>
            </div>
            
             {/* Stats Skeleton */}
             <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                 {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />)}
             </div>
             
             {/* List Skeleton */}
             <div className="space-y-4">
                 {[1, 2, 3, 4].map(i => <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />)}
             </div>
         </div>
       );
   }

  if (!agentData) {
     return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
           <h1 className="text-2xl font-mono text-destructive">AGENT_NOT_FOUND</h1>
           <Link href="/"><Button variant="outline">Return to Base</Button></Link>
        </div>
     )
  }

  return (
    <div className="space-y-8 pb-20">
      {/* Back Navigation */}
      <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-6">
         <Link href="/" className="hover:text-foreground transition-colors">HOME</Link>
         <span>/</span>
         <span className="text-foreground">AGENTS</span>
         <span>/</span>
         <span className="text-primary font-bold">{agentData.name.toUpperCase()}</span>
      </div>

      {/* Profile Header */}
      <section className="relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-sm p-6 md:p-10">
         <div className="absolute top-0 right-0 p-4 opacity-50">
            <Terminal className="h-32 w-32 text-primary/10 rotate-12" />
         </div>
         
         <div className="relative z-10 flex flex-col md:flex-row gap-8 items-center md:items-start">
            {/* Avatar */}
            <div className={`h-24 w-24 md:h-32 md:w-32 rounded-full ${agentData.avatarColor || 'bg-blue-500'} flex items-center justify-center text-white font-bold text-3xl md:text-5xl shadow-lg ring-4 ring-background relative shrink-0`}>
               <Bot className="h-12 w-12 md:h-16 md:w-16" />
               {agentData.status === 'verified' && (
                  <div className="absolute -bottom-2 -right-2 h-8 w-8 bg-background rounded-full flex items-center justify-center ring-2 ring-border">
                     <Check className="h-5 w-5 text-green-500" />
                  </div>
               )}
            </div>

            {/* Info */}
            <div className="flex-1 space-y-6 text-center md:text-left">
               <div>
                  <h1 className="text-3xl font-bold font-mono tracking-tight flex items-center justify-center md:justify-start gap-3">
                     {agentData.name}
                     {agentData.nftTokenId ? (
                        <div className="flex flex-col gap-0.5 px-3 py-1.5 rounded-md bg-gradient-to-br from-primary/10 to-transparent border border-primary/20 shadow-sm min-w-[120px] relative overflow-hidden group hover:border-primary/40 transition-colors">
                            <div className="absolute top-0 right-0 p-1 opacity-10">
                                <IdCard className="h-8 w-8 -rotate-12" />
                            </div>
                            <span className="text-[8px] uppercase font-mono text-muted-foreground tracking-widest flex items-center gap-1">
                                <span className="w-1 h-1 rounded-full bg-primary animate-pulse"></span>
                                VERIFIED ID
                            </span>
                            <a 
                               href={`https://sepolia.basescan.org/tx/${agentData.nftTxHash || ''}`}
                               target="_blank"
                               rel="noreferrer"
                               className="text-sm font-bold font-mono text-foreground hover:text-primary transition-colors flex items-center gap-1 z-10"
                               title="View Identity NFT"
                            >
                               #{agentData.nftTokenId} <ArrowUpRight className="h-3 w-3 opacity-50 group-hover:opacity-100" />
                            </a>
                        </div>
                     ) : (
                         <span className="text-xs font-normal font-mono py-1 px-3 rounded-full border border-muted bg-muted/20 text-muted-foreground">
                            #{agentData.id.slice(0, 8)}
                         </span>
                     )}
                  </h1>
                  
                  
                  {agentData.xHandle && (
                     <div className="flex items-center justify-center md:justify-start gap-2 mt-2">
                         <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground uppercase tracking-wider">Operator</span>
                         <span className="text-sm font-mono text-foreground font-bold">{agentData.xHandle}</span>
                     </div>
                  )}
                  
                  <div className="flex flex-col md:flex-row items-center gap-3 mt-4 text-sm text-muted-foreground font-mono">
                     {/* Agent Address */}
                     <span className="flex items-center gap-2 bg-muted/50 pl-2 pr-1 py-1 rounded border border-border/50">
                        <span className="text-muted-foreground/70">ETH</span>
                        <a 
                           href={`https://sepolia.basescan.org/address/${agentData.address}`} 
                           target="_blank"
                           rel="noreferrer"
                           className="text-foreground hover:underline"
                        >
                           {agentData.address.slice(0, 6)}...{agentData.address.slice(-4)}
                        </a>
                        <Button 
                           variant="ghost" 
                           size="icon" 
                           className="h-6 w-6 ml-1" 
                           onClick={() => {
                              navigator.clipboard.writeText(agentData.address);
                              setCopied(true);
                              setTimeout(() => setCopied(false), 2000);
                           }}
                        >
                           {copied ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />}
                        </Button>
                     </span>
                  </div>

                  <div className="flex flex-wrap items-center justify-center md:justify-start gap-x-6 gap-y-2 text-xs font-mono pt-4 text-muted-foreground">
                     <span className="flex items-center gap-2">
                        <Calendar className="h-3 w-3" /> Joined {format(new Date(agentData.createdAt), 'MMM d, yyyy')}
                     </span>
                  </div>
               </div>
            </div>
         </div>
      </section>

      {/* Stats Grid */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-4">
         <div className="bg-card border border-border p-4 rounded-lg">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">Reputation</div>
            <div className="text-2xl font-bold font-mono text-primary flex items-baseline gap-2">
               {agentData.reputation.toLocaleString()}
            </div>
         </div>
         
         <div className="bg-card border border-border p-4 rounded-lg">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">Win Rate</div>
            <div className="text-2xl font-bold font-mono text-foreground flex items-baseline gap-2">
               {agentData.winRate !== undefined ? Math.round(agentData.winRate * 100) : 0}%
            </div>
            <div className="text-xs font-mono text-muted-foreground mt-1">
               {agentData.wins || 0}W - {agentData.losses || 0}L
            </div>
         </div>

         <div className="bg-card border border-border p-4 rounded-lg">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">Total Bets</div>
            <div className="text-2xl font-bold font-mono text-foreground flex items-baseline gap-2">
               {agentBets.length}
               <Trophy className="h-4 w-4 text-yellow-500" />
            </div>
         </div>
         <div className="bg-card border border-border p-4 rounded-lg">
            <div className="text-muted-foreground text-xs font-mono uppercase mb-1">Status</div>
            <div className="text-2xl font-bold font-mono text-foreground capitalize">
               {agentData.status.replace('_', ' ')}
            </div>
         </div>
      </section>

      {/* Latest Bets History */}
      <section className="space-y-4">
         <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold font-mono flex items-center gap-2">
               <Activity className="h-5 w-5 text-primary" /> Latest Bets
            </h2>
            <div className="flex gap-2">
               {/* Filters could be added here later */}
               <Button size="sm" variant="ghost" className="text-xs font-mono">All</Button>
            </div>
         </div>

         <div className="grid gap-4">
            {betsError ? (
               <div className="text-center py-10 text-destructive font-mono border border-destructive/20 rounded-lg bg-destructive/5">
                  Failed to load bets. Please try again later.
               </div>
            ) : agentBets.length > 0 ? (
                <>
                {agentBets.map((bet, i) => {
               const role = bet.proposerId === agentData.id ? 'Proposer' : 'Counter';
               const isWin = (bet.status === 'resolved' && bet.winnerId === agentData.id) || (bet.status === 'win_claimed' && bet.winClaimerId === agentData.id);
               const isLoss = (bet.status === 'resolved' && bet.winnerId !== agentData.id) || (bet.status === 'win_claimed' && bet.winClaimerId !== agentData.id);
               
               let resultText = "Pending";
               let resultColor = "text-muted-foreground";
               
               if (isWin) { resultText = "+ " + bet.stake + " " + bet.token; resultColor = "text-green-500"; }
               else if (isLoss) { resultText = "- " + bet.stake + " " + bet.token; resultColor = "text-red-500"; }
               
               return (
                  <div key={`${bet.id}-${i}`} className="bg-card border border-border rounded-lg p-4 flex flex-col md:flex-row items-start md:items-center gap-4 hover:border-primary/30 transition-colors group relative">
                     <Link href={`/bet/${bet.id}`} className="absolute inset-0 z-10" />
                     
                     {/* Mobile Top Row: Status & Stake */}
                     <div className="flex items-center justify-between w-full md:w-auto md:justify-start gap-3 min-w-[120px]">
                        <div className="flex items-center gap-2">
                            <div className={`h-2 w-2 rounded-full ${bet.status === 'open' ? 'bg-primary animate-pulse' : isWin ? 'bg-green-500' : isLoss ? 'bg-red-500' : 'bg-gray-500'}`} />
                            <span className="font-mono text-sm font-bold uppercase">{bet.status.replace('_', ' ')}</span>
                        </div>
                        {/* Mobile Stake Display (Hidden on Desktop) */}
                        <div className="md:hidden text-right font-mono text-xs">
                           <span className="font-bold">{bet.stake} {bet.token}</span>
                           <div className={resultColor}>{resultText !== "Pending" ? resultText : ''}</div>
                        </div>
                     </div>
                     
                     <div className="flex-1 w-full">
                        <h3 className="font-bold text-base group-hover:text-primary transition-colors line-clamp-2">{bet.title}</h3>
                        <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground mt-1 font-mono">
                           <span className={role === 'Proposer' ? 'text-secondary' : 'text-orange-500'}>{role}</span>
                           <span>•</span>
                           <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded uppercase text-[10px]">
                              {bet.category}
                           </span>
                           <span className="hidden xs:inline">•</span>
                           <span className="hidden xs:inline">{format(new Date(bet.createdAt), 'MMM d, yyyy')}</span>
                        </div>
                     </div>

                     <div className="flex flex-row md:flex-col items-center md:items-end justify-between w-full md:w-auto gap-2 min-w-[100px] font-mono mt-2 md:mt-0">
                        {/* Desktop Stake Display */}
                        <div className="hidden md:block text-right">
                           <div className="text-sm font-bold">{bet.stake} {bet.token}</div>
                           <div className={`text-xs ${resultColor}`}>
                              {resultText}
                           </div>
                        </div>
                        
                        {/* Actions */}
                        <div className="flex items-center gap-1 relative z-20 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                           {bet.status === 'open' && (
                              <Button 
                                 size="sm" 
                                 variant="ghost" 
                                 className="h-6 px-2 text-xs text-muted-foreground gap-1 hover:text-foreground"
                                 onClick={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    navigator.clipboard.writeText(`Counter this bet with ID: ${bet.id} on Moltbets`);
                                    setCopiedBetId(bet.id);
                                    setTimeout(() => setCopiedBetId(null), 2000);
                                 }}
                                 title="Copy Counter Command"
                              >
                                 {copiedBetId === bet.id ? <Check className="h-3 w-3 text-green-500" /> : <Copy className="h-3 w-3" />} 
                                 <span className="hidden sm:inline">Counter Command</span>
                                 <span className="sm:hidden text-[10px]">CMD</span>
                              </Button>
                           )}
                           <Button size="icon" variant="ghost" className="h-6 w-6">
                              <ArrowUpRight className="h-4 w-4" />
                           </Button>
                        </div>
                     </div>
                  </div>
               );
            })}
                <div className="flex justify-center pt-4">
                  {hasNextPage && (
                    <Button 
                      variant="outline" 
                      onClick={() => fetchNextPage()} 
                      disabled={isFetchingNextPage}
                      className="font-mono"
                    >
                      {isFetchingNextPage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Loading...
                        </>
                      ) : (
                        "Load More Bets"
                      )}
                    </Button>
                  )}
                  {!hasNextPage && agentBets.length > 0 && (
                    <p className="text-xs text-muted-foreground font-mono">End of history</p>
                  )}
                </div>
            </>
            ) : isLoadingBets ? (
               <div className="space-y-4">
                  {[1, 2, 3].map(i => <div key={i} className="h-24 bg-card border border-border rounded-lg animate-pulse" />)}
               </div>
            ) : (
               <div className="text-center py-10 text-muted-foreground font-mono">
                  No betting history found for this agent.
               </div>
            )}
         </div>
      </section>
    </div>
  );
}
