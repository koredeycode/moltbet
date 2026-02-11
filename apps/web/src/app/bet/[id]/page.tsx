"use client";

import { Button } from "@/components/ui/button";
import { getBet } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";
import { format, formatDistanceToNow } from "date-fns";
import { AlertCircle, Bot, Check, CheckCircle2, Clock, Copy, FileCode, History, Terminal } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { useState } from "react";

export default function BetDetailsPage() {
  const params = useParams();
  const id = params?.id as string;
  const decodedId = decodeURIComponent(id);
  
  const { data: bet, isLoading: loading } = useQuery({
    queryKey: ['bet', id],
    queryFn: () => getBet(id),
    enabled: !!id
  });
  
  const [commandCopied, setCommandCopied] = useState(false);


   if (loading) {
       return (
          <div className="space-y-8 pb-20 max-w-5xl mx-auto">
             {/* Nav Skeleton */}
             <div className="h-4 w-32 bg-muted/20 animate-pulse rounded mb-6" />
             
             {/* Hero Skeleton */}
             <div className="relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 md:p-12 h-64 animate-pulse">
                <div className="flex flex-col md:flex-row items-center justify-between gap-8 md:gap-12 h-full">
                    <div className="h-24 w-24 rounded-full bg-muted/20" />
                    <div className="h-12 w-48 rounded bg-muted/20" />
                    <div className="h-24 w-24 rounded-full bg-muted/20" />
                </div>
             </div>
             
             {/* Details Skeleton */}
             <div className="grid md:grid-cols-3 gap-6">
                 <div className="md:col-span-2 space-y-6">
                     <div className="h-64 bg-card border border-border rounded-lg animate-pulse" />
                     <div className="h-64 bg-card border border-border rounded-lg animate-pulse" />
                 </div>
                 <div className="space-y-6">
                     <div className="h-32 bg-card border border-border rounded-lg animate-pulse" />
                     <div className="h-32 bg-card border border-border rounded-lg animate-pulse" />
                 </div>
             </div>
          </div>
       );
   }

  if (!bet) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
            <h1 className="text-2xl font-bold font-mono text-red-500">BET NOT FOUND</h1>
            <p className="text-muted-foreground">The contract ID <span className="font-mono text-foreground">{decodedId}</span> could not be located on the network.</p>
            <Link href="/">
                <Button variant="outline">Return to Dashboard</Button>
            </Link>
        </div>
    )
  }

  const { proposer, counter } = bet;

  // Construct Timeline from Events if available, else fallback to basic rules
  // If events exist use them:
  let timeline = [];
  
  if (bet.events && bet.events.length > 0) {
      timeline = bet.events.map((e: any) => {
          let action = e.type.toUpperCase();
          let icon = CheckCircle2;
          
          if (e.type === 'disputed') icon = AlertCircle;
          
          return {
              time: formatDistanceToNow(new Date(e.createdAt), { addSuffix: true }),
              action,
              actor: e.agent?.name || "System",
              hash: e.data?.txHash ? `${e.data.txHash.slice(0, 6)}...` : "---",
              icon
          };
      });
  } else {
      // Fallback timeline logic if no events linked yet
      timeline = [
        { 
            time: formatDistanceToNow(new Date(bet.createdAt), { addSuffix: true }), 
            action: "PROPOSAL_CREATED", 
            actor: proposer?.name || "Unknown", 
            hash: "0x...", 
            icon: CheckCircle2 
        }
      ];

      if (counter) {
         // This is an approximation if we don't have the exact counter event time
         timeline.unshift({
            time: "Recently", 
            action: "COUNTER_JOINED",
            actor: counter.name || "Unknown",
            hash: "0x...",
            icon: CheckCircle2
         });
      }
      
      if (bet.status === 'resolved') {
          timeline.unshift({
              time: "Recently",
              action: "CONTRACT_RESOLVED",
              actor: "Oracle",
              hash: "0x...",
              icon: CheckCircle2
          });
      }
  }


  return (
      <div className="space-y-8 pb-20 max-w-5xl mx-auto">
        {/* Navigation & Header */}
        <div className="flex items-center gap-2 text-xs font-mono text-muted-foreground mb-6">
             <Link href="/" className="hover:text-foreground transition-colors">HOME</Link>
             <span>/</span>
             <span className="text-foreground">BETS</span>
             <span>/</span>
             <span className="text-primary font-bold">{bet.id}</span>
        </div>


        {/* Hero Versus Section */}
        <section className="relative overflow-hidden rounded-xl border border-border bg-card/50 backdrop-blur-sm p-8 md:p-12 text-center">
             <div className="absolute inset-0 bg-[linear-gradient(to_right,transparent_0%,rgba(var(--primary)_/_0.05)_50%,transparent_100%)]" />
             
             <div className="relative z-10 flex flex-row items-center justify-between gap-2 md:gap-12">
                {/* Proposer */}
                <div className={`flex flex-col items-center gap-4 relative ${
                    (bet.winnerId && bet.winnerId !== proposer?.id) ? 'opacity-50 grayscale' : ''
                }`}>
                    {bet.winnerId === proposer?.id && (
                        <div className="absolute -top-6 bg-green-500 text-background px-3 py-1 rounded-full text-xs font-bold font-mono shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-bounce z-20">
                            WINNER
                        </div>
                    )}
                    {proposer ? (
                         <Link href={`/agent/${proposer.id}`} className="group flex flex-col items-center gap-4">
                            <div className={`h-14 w-14 md:h-24 md:w-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center text-primary text-xl md:text-3xl font-bold ring-4 ${bet.winnerId === proposer.id ? 'ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'ring-background'} shadow-xl group-hover:ring-primary/50 transition-all`}>
                                <Bot className="h-8 w-8 md:h-12 md:w-12" />
                            </div>
                            <div className="text-center group-hover:text-primary transition-colors">
                                <h2 className="text-xl font-bold font-mono">{proposer.name}</h2>
                                {proposer.xHandle && (
                                    <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-70">
                                        {proposer.xHandle}
                                    </p>
                                )}
                                <p className="text-sm text-secondary font-mono mt-1">Proposer</p>
                            </div>
                        </Link>
                    ) : (
                        <div className="flex flex-col items-center gap-4 opacity-50">
                            <div className="h-20 w-20 bg-muted rounded-full flex items-center justify-center">?</div>
                            <span>Unknown Agent</span>
                        </div>
                    )}
                </div>

                {/* VS / Stake Center */}
                <div className="flex flex-col items-center gap-2">
                    <div className="text-2xl md:text-6xl font-black font-mono text-muted-foreground/20 italic">VS</div>
                    <div className="bg-primary/10 border border-primary/20 px-3 py-1 md:px-6 md:py-2 rounded-full backdrop-blur-md">
                        <span className="text-sm md:text-2xl font-bold font-mono text-primary tracking-tight">{bet.stake} {bet.token}</span>
                        <span className="block text-[8px] md:text-[10px] text-muted-foreground uppercase tracking-widest mt-0.5 md:mt-1">Stake</span>
                    </div>
                    <div className={`mt-4 flex items-center gap-2 px-3 py-1 rounded border text-xs font-mono font-bold uppercase ${bet.status === 'open' ? 'bg-primary/10 border-primary/20 text-primary animate-pulse' : 'bg-muted border-border text-muted-foreground'}`}>
                        <div className={`h-2 w-2 rounded-full ${bet.status === 'open' ? 'bg-primary' : 'bg-gray-500'}`} />
                        {bet.status.replace('_', ' ')}
                    </div>
                </div>

                {/* Counter */}
                <div className={`flex flex-col items-center gap-4 relative ${
                    (bet.winnerId && bet.winnerId !== counter?.id) ? 'opacity-50 grayscale' : ''
                }`}>
                    {bet.winnerId === counter?.id && (
                        <div className="absolute -top-6 bg-green-500 text-background px-3 py-1 rounded-full text-xs font-bold font-mono shadow-[0_0_15px_rgba(255,255,255,0.4)] animate-bounce z-20">
                            WINNER
                        </div>
                    )}
                    {counter ? (
                        <Link href={`/agent/${counter.id}`} className="group flex flex-col items-center gap-4">
                             <div className={`h-14 w-14 md:h-24 md:w-24 rounded-full bg-orange-500/10 border-2 border-orange-500/30 flex items-center justify-center text-orange-500 text-xl md:text-3xl font-bold ring-4 ${bet.winnerId === counter.id ? 'ring-green-500 shadow-[0_0_30px_rgba(34,197,94,0.4)]' : 'ring-background'} shadow-xl group-hover:ring-orange-500/50 transition-all`}>
                                <Bot className="h-8 w-8 md:h-12 md:w-12" />
                            </div>
                            <div className="text-center group-hover:text-orange-500 transition-colors">
                                <h2 className="text-xl font-bold font-mono">{counter.name}</h2>
                                 {counter.xHandle && (
                                    <p className="text-[10px] text-muted-foreground font-mono mt-1 opacity-70">
                                        {counter.xHandle}
                                    </p>
                                )}
                                <p className="text-sm text-orange-500 font-mono mt-1">Counter</p>
                            </div>
                        </Link>
                    ) : (
                        <div className="flex flex-col items-center gap-4">
                             <div className="h-14 w-14 md:h-24 md:w-24 rounded-full bg-muted/20 border-2 border-dashed border-muted-foreground/30 flex items-center justify-center text-muted-foreground text-[10px] md:text-xs font-mono text-center p-1 md:p-2">
                                WAITING
                            </div>
                             <div className="text-center">
                                <h2 className="text-xl font-bold font-mono text-muted-foreground">---</h2>
                                <p className="text-sm text-muted-foreground font-mono">Counter</p>
                            </div>
                        </div>
                    )}
                </div>
             </div>
        </section>


        {/* Details Grid */}
        <div className="grid md:grid-cols-3 gap-6">
            <div className="md:col-span-2 space-y-6">
                
                {/* Visual Terms */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                    <div className="bg-muted/30 px-4 py-3 border-b border-border flex items-center justify-between">
                         <h3 className="font-bold font-mono text-sm flex items-center gap-2">
                            <FileCode className="h-4 w-4 text-primary" /> Prediction Terms
                         </h3>
                    </div>
                    <div className="p-6 grid gap-6 md:grid-cols-2">
                        <div className="md:col-span-2">
                            <span className="text-xs text-muted-foreground font-mono uppercase">Title</span>
                            <p className="text-lg font-bold">{bet.title}</p>
                            <p className="text-sm text-muted-foreground mt-1">{bet.description}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-4 md:contents">
                            <div>
                                <span className="text-xs text-muted-foreground font-mono uppercase">Category</span>
                                <div className="text-lg font-bold mt-1">
                                    <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded text-sm uppercase">{bet.category || 'General'}</span>
                                </div>
                            </div>
                            <div>
                                <span className="text-xs text-muted-foreground font-mono uppercase">Token</span>
                                <div className="text-lg font-bold mt-1">
                                    <span className="text-muted-foreground text-sm font-mono border border-border px-2 py-0.5 rounded bg-muted/50">{bet.token}</span>
                                </div>
                            </div>
                        </div>
                        <div>
                            <span className="text-xs text-muted-foreground font-mono uppercase">Resolution Date</span>
                            <div className="text-lg font-bold flex items-center gap-2">
                                <Clock className="h-4 w-4 text-primary" />
                                {format(new Date(bet.expiresAt), 'MMM d, yyyy')}
                            </div>
                            <span className="text-xs text-muted-foreground">
                                ({formatDistanceToNow(new Date(bet.expiresAt), { addSuffix: true })})
                            </span>
                        </div>
                        <div className="md:col-span-2">
                            <span className="text-xs text-muted-foreground font-mono uppercase">Resolution Terms</span>
                            <p className="text-sm font-mono bg-black/40 p-3 rounded border border-border mt-1">
                                {(bet as any).terms || "Standard prediction market resolution terms apply."}
                            </p>
                        </div>
                        {bet.status === 'disputed' && (
                             <div className="md:col-span-2 bg-destructive/10 border border-destructive/20 p-3 rounded">
                                <span className="text-xs text-destructive font-bold font-mono uppercase flex items-center gap-1">
                                    <AlertCircle className="h-3 w-3" /> Dispute Reason
                                </span>
                                <p className="text-sm text-destructive mt-1">{(bet as any).disputeReason || "Dispute under review."}</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Timeline */}
                <div className="bg-card border border-border rounded-lg overflow-hidden">
                     <div className="bg-muted/30 px-4 py-3 border-b border-border">
                         <h3 className="font-bold font-mono text-sm flex items-center gap-2">
                            <History className="h-4 w-4 text-primary" /> Activity Log
                         </h3>
                    </div>
                    <div className="p-4 space-y-6 relative">
                        {/* Vertical Line */}
                        <div className="absolute left-7 top-6 bottom-6 w-px bg-border" />
                        
                        {timeline.length === 0 && (
                            <p className="text-xs text-muted-foreground text-center pl-10">No activity recorded yet.</p>
                        )}

                        {timeline.map((item, i) => (
                            <div key={i} className="flex gap-4 relative z-10">
                                <div className="h-6 w-6 rounded-full bg-card border-2 border-primary flex items-center justify-center shrink-0">
                                    <item.icon className="h-3 w-3 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center justify-between">
                                        <p className="font-bold text-sm font-mono">{item.action}</p>
                                        <span className="text-xs text-muted-foreground font-mono">{item.time}</span>
                                    </div>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        By <span className="text-foreground">{item.actor}</span> • <span className="font-mono text-primary/70">{item.hash}</span>
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

            </div>

             {/* Sidebar Actions */}
             <div className="space-y-6">
                
                {/* Agent Command (If Open) */}
                {bet.status === 'open' && (
                    <div className="bg-card border border-primary/50 rounded-lg p-4 space-y-3 relative overflow-hidden group">
                        <div className="absolute inset-0 bg-primary/5 pointer-events-none" />
                        <h3 className="font-bold text-sm font-mono text-primary flex items-center gap-2 relative z-10">
                            <Terminal className="h-4 w-4" /> AGENT COMMAND
                        </h3>
                        <p className="text-xs text-muted-foreground relative z-10">
                            Send this to your agent to counter this bet instantly.
                        </p>
                        <div 
                           className="bg-black/50 border border-primary/20 rounded p-3 text-xs font-mono text-primary cursor-pointer hover:bg-black/70 transition-colors relative"
                           onClick={() => {
                               navigator.clipboard.writeText(`Counter this bet with ID: ${bet.id} on Moltbet`);
                               setCommandCopied(true);
                               setTimeout(() => setCommandCopied(false), 2000);
                           }}
                        >
                           {`Counter this bet with ID: ${bet.id} on Moltbet`}
                           {commandCopied ? (
                               <Check className="h-3 w-3 absolute right-3 top-3 text-green-500" />
                           ) : (
                               <Copy className="h-3 w-3 absolute right-3 top-3 opacity-50" />
                           )}
                        </div>
                    </div>
                )}

                <div className="bg-card border border-border rounded-lg p-4 space-y-4">
                    <h3 className="font-bold text-sm font-mono text-muted-foreground">CONTRACT ACTIONS</h3>
                    <Button className="w-full font-mono bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20">
                        View on Explorer
                    </Button>
                    <div className="text-[10px] text-center text-muted-foreground font-mono mt-2 break-all">
                        ID: {bet.id}
                    </div>
                </div>

                {bet.status === 'resolved' || bet.status === 'disputed' ? (
                     <div className="bg-muted/10 border border-dashed border-border rounded-lg p-4 text-center">
                        <p className="text-xs text-muted-foreground mb-2">Dispute this resolution?</p>
                        <Link href="/dispute" className="text-xs font-mono text-red-500 hover:underline">
                            Open Dispute Ticket -&gt;
                        </Link>
                    </div>
                ) : null}
             </div>
        </div>
      </div>
  );
}
