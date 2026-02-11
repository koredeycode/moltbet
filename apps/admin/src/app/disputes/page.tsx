"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/AuthContext";
import { DisputeDetail, getDispute, getDisputes, resolveDispute } from "@/lib/api";
import { Check, Clock, ExternalLink, FileText, Gavel, ShieldAlert, Terminal, X } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

function formatTimeAgo(dateInput: string | Date): string {
  try {
    const date = new Date(dateInput);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays}d ago`;
    if (diffHours > 0) return `${diffHours}h ago`;
    if (diffMins > 0) return `${diffMins}m ago`;
    return "Just now";
  } catch (e) {
    return "Unknown";
  }
}

function shortenAddress(addr: string): string {
  if (!addr) return "0x...";
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

function DisputesPageContent() {
  const { isLoading: authLoading, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialDisputeId = searchParams.get("id");
  
  const [selectedId, setSelectedId] = useState<string | null>(initialDisputeId);
  const [adminNotes, setAdminNotes] = useState("");

  // Auth Check
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, authLoading, router]);

  // Fetch Disputes List
  const { data: disputes = [], isLoading: loadingList } = useQuery({
    queryKey: ['admin-disputes'],
    queryFn: getDisputes,
    enabled: isAuthenticated
  });

  // Update selection if URL changes
  useEffect(() => {
    const id = searchParams.get("id");
    if (id) {
      setSelectedId(id);
    } else if (disputes.length > 0 && !selectedId) {
       setSelectedId(disputes[0].id);
    }
  }, [searchParams, disputes, selectedId]);

  // Fetch Detail when selectedId changes
  const { data: selectedDispute, isLoading: loadingDetail } = useQuery({
    queryKey: ['admin-dispute', selectedId],
    queryFn: () => getDispute(selectedId!),
    enabled: !!selectedId && isAuthenticated
  });

  // Update URL when selection changes manually
  const handleSelectDispute = (id: string) => {
    setSelectedId(id);
    router.replace(`/disputes?id=${id}`);
  };

  const queryClient = useQueryClient();

  const { mutate: resolveMutation, isPending: isResolving } = useMutation({
    mutationFn: async ({ id, winnerId, notes }: { id: string, winnerId: string, notes?: string }) => {
        return resolveDispute(id, winnerId, notes);
    },
    onSuccess: (result: { success: boolean; message?: string }) => {
        if (result.success) {
            alert(`Dispute resolved successfully.`);
            queryClient.invalidateQueries({ queryKey: ['admin-disputes'] });
            queryClient.invalidateQueries({ queryKey: ['admin-dispute', selectedDispute?.id] });
            queryClient.invalidateQueries({ queryKey: ['admin-priority-disputes'] }); // update dashboard too
            setAdminNotes("");
        } else {
            alert(`Failed to resolve: ${result.message}`);
        }
    }
  });

  const handleResolve = async (winnerId: string) => {
    if (!selectedDispute) return;
    resolveMutation({ id: selectedDispute.id, winnerId, notes: adminNotes });
  };

  if (authLoading || (loadingList && disputes.length === 0)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-mono">
        <div className="flex items-center gap-2 text-primary">
          <Terminal className="h-5 w-5 animate-pulse" />
          <span>LOADING_DISPUTES...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }
  
  // If no disputes at all
  if (disputes.length === 0 && !loadingList) {
      return (
        <AppShell>
            <div className="flex items-center justify-center h-[50vh] flex-col gap-4">
                <ShieldAlert className="h-12 w-12 text-muted-foreground" />
                <h2 className="text-xl font-mono text-muted-foreground">NO ACTIVE DISPUTES</h2>
            </div>
        </AppShell>
      )
  }

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl mx-auto">
        <div className="flex items-center gap-4 border-b border-border pb-6">
          <div className="p-3 bg-destructive/10 rounded-lg border border-destructive/20">
            <Gavel className="h-8 w-8 text-destructive" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight font-mono text-destructive">DISPUTES</h1>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 font-mono">
          {/* Case List Sidebar */}
          <div className="lg:col-span-1 sticky top-6 max-h-[calc(100vh-2rem)] flex flex-col bg-card/50 border border-border rounded-xl backdrop-blur-sm overflow-hidden shadow-2xl">
            <div className="p-4 border-b border-border bg-card/80 z-10 flex-none backdrop-blur">
              <h3 className="text-sm font-medium text-muted-foreground uppercase tracking-wider flex items-center justify-between">
                <span>Active Cases</span>
                <span className="px-2 py-0.5 bg-primary/10 text-primary rounded text-xs">{disputes.length}</span>
              </h3>
            </div>

            <div className="flex-1 overflow-y-auto p-2 space-y-3">
              {disputes.map((d: DisputeDetail) => (
                <div
                  key={d.id}
                  onClick={() => handleSelectDispute(d.id)}
                  className={`p-3 rounded-lg border cursor-pointer hover:bg-muted/20 transition-all duration-200 group ${
                    selectedId === d.id
                      ? "bg-muted/10 border-primary shadow-[0_0_10px_rgba(0,255,157,0.05)] translate-x-1"
                      : "bg-background/50 border-border opacity-70 hover:opacity-100 hover:border-primary/50"
                  }`}
                >
                  <div className="flex justify-between items-start mb-1.5">
                    <span className={`font-bold text-xs ${selectedId === d.id ? "text-primary/90" : "text-foreground group-hover:text-primary transition-colors"}`}>
                      CASE_{d.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">{formatTimeAgo(d.createdAt)}</span>
                  </div>
                  <p className="text-xs line-clamp-2 text-muted-foreground group-hover:text-foreground/80 transition-colors">
                    {d.reason}
                  </p>
                  <div className="mt-2 flex gap-1.5 text-[10px]">
                    <span className="px-1.5 py-0.5 bg-background border border-border rounded">
                      {d.bet.stake} USDC
                    </span>
                    <span className={`px-1.5 py-0.5 rounded border ml-auto ${d.status === 'resolved' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-destructive/10 text-destructive border-destructive/20'}`}>
                      {d.status.toUpperCase()}
                    </span>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Sidebar Footer/Fade */}
            <div className="h-4 bg-gradient-to-t from-background to-transparent pointer-events-none absolute bottom-0 left-0 right-0" />
          </div>

          {/* Active Case Details */}
          <div className="lg:col-span-2 space-y-6">
            {loadingDetail ? (
                 <div className="h-64 flex items-center justify-center">
                    <Terminal className="h-8 w-8 animate-pulse text-muted-foreground" />
                 </div>
            ) : selectedDispute ? (
            <div className="rounded-xl border border-border bg-card overflow-hidden">
              <div className="bg-muted/20 border-b border-border p-4 flex justify-between items-center">
                <h2 className="font-bold flex items-center gap-2">
                  <FileText className="h-4 w-4" /> EVIDENCE_LOCKER: {selectedDispute.id.slice(0, 8).toUpperCase()}
                </h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Clock className="h-3 w-3" />
                  <span>Filed: {formatTimeAgo(selectedDispute.createdAt)}</span>
                </div>
              </div>

              <div className="p-6 space-y-6">
                {/* Bet Info */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase">Bet Details</span>
                  <div className="p-3 bg-background border border-border rounded">
                    <p className="font-bold text-foreground mb-1">{selectedDispute.bet.title}</p>
                    <p className="text-sm text-muted-foreground">{selectedDispute.bet.description}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      <strong>Terms:</strong> {selectedDispute.bet.terms}
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase">Dispute Claims</span>
                  <div className="grid md:grid-cols-2 gap-4">
                    {/* Proposer Claim */}
                    <div className="p-3 bg-destructive/5 border border-destructive/20 rounded">
                      <div className="flex items-center gap-2 mb-2">
                         <span className="text-xs font-bold text-destructive uppercase">Raised By Proposer</span>
                      </div>
                      <p className="text-sm text-foreground">{selectedDispute.reason}</p>
                      {selectedDispute.evidence && (
                        <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
                          <strong>Evidence:</strong> {selectedDispute.evidence}
                        </p>
                      )}
                    </div>

                    {/* Counter Response */}
                    {selectedDispute.counterReason ? (
                       <div className="p-3 bg-secondary/5 border border-secondary/20 rounded">
                        <div className="flex items-center gap-2 mb-2">
                           <span className="text-xs font-bold text-secondary uppercase">Counter Response</span>
                           <span className="text-[10px] text-muted-foreground ml-auto">
                             {selectedDispute.respondedAt ? formatTimeAgo(selectedDispute.respondedAt) : 'Replied'}
                           </span>
                        </div>
                        <p className="text-sm text-foreground">{selectedDispute.counterReason}</p>
                        {selectedDispute.counterEvidence && (
                          <p className="text-xs text-muted-foreground mt-2 border-t border-border/50 pt-2">
                            <strong>Evidence:</strong> {selectedDispute.counterEvidence}
                          </p>
                        )}
                      </div>
                    ) : (
                      <div className="p-3 border border-dashed border-border rounded flex items-center justify-center text-muted-foreground text-xs italic">
                        No response submitted yet.
                      </div>
                    )}
                  </div>
                </div>

                {/* Participants */}
                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground uppercase flex items-center gap-2">
                      Proposer
                      {selectedDispute.raisedById === selectedDispute.bet.proposer.id && (
                        <span className="text-destructive">(Filed Dispute)</span>
                      )}
                    </span>
                    <div className="p-3 bg-background border border-border rounded font-mono text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold">{selectedDispute.bet.proposer.name}</span>
                        <span className="text-primary">{shortenAddress(selectedDispute.bet.proposer.address)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Reputation: {selectedDispute.bet.proposer.reputation || 'N/A'}
                      </div>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground uppercase flex items-center gap-2">
                      Counter
                      {selectedDispute.bet.counter && selectedDispute.raisedById === selectedDispute.bet.counter.id && (
                        <span className="text-destructive">(Filed Dispute)</span>
                      )}
                    </span>
                    {selectedDispute.bet.counter ? (
                    <div className="p-3 bg-background border border-border rounded font-mono text-sm">
                      <div className="flex justify-between mb-1">
                        <span className="font-bold">{selectedDispute.bet.counter.name}</span>
                        <span className="text-secondary">{shortenAddress(selectedDispute.bet.counter.address)}</span>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        Reputation: {selectedDispute.bet.counter.reputation || 'N/A'}
                      </div>
                    </div>
                    ) : (
                        <div className="p-3 bg-background border border-border rounded font-mono text-sm italic text-muted-foreground">
                            No counter opponent found.
                        </div>
                    )}
                  </div>
                </div>

                {/* Bet ID Link */}
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase">Bet Reference</span>
                  <div className="flex items-center gap-2 p-2 bg-muted/10 rounded border border-border/50 text-xs">
                    <ExternalLink className="h-4 w-4" />
                    <span className="text-primary">{selectedDispute.betId}</span>
                    <span className="ml-auto text-muted-foreground">Base Sepolia</span>
                  </div>
                </div>

                {/* Admin Notes */}
                {selectedDispute.status === 'pending' && (
                <div className="space-y-2">
                  <span className="text-xs text-muted-foreground uppercase">Admin Notes (Optional)</span>
                  <textarea
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Add resolution notes..."
                    className="w-full p-3 bg-background border border-border rounded text-sm resize-none h-20 focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                )}
              </div>

               {selectedDispute.status === 'pending' ? (
              <div className="bg-muted/10 border-t border-border p-6">
                <h3 className="text-sm font-bold mb-4 uppercase text-center">Adjudication Console</h3>

                <div className="grid grid-cols-2 gap-4">
                  <Button
                    variant="outline"
                    className="border-primary text-primary hover:bg-primary/20 hover:text-primary h-12"
                    disabled={isResolving}
                    onClick={() => handleResolve(selectedDispute.bet.proposer.id)}
                  >
                    <Check className="mr-2 h-4 w-4" />
                    PROPOSER WINS
                  </Button>
                  <Button
                    variant="outline"
                    className="border-secondary text-secondary hover:bg-secondary/20 hover:text-secondary h-12"
                    disabled={isResolving || !selectedDispute.bet.counter}
                    onClick={() => selectedDispute.bet.counter && handleResolve(selectedDispute.bet.counter.id)}
                  >
                    <X className="mr-2 h-4 w-4" />
                    COUNTER WINS
                  </Button>
                </div>
                <p className="text-[10px] text-center text-muted-foreground mt-4">
                  WARNING: Rulings are final and executed on-chain via Admin Key.
                </p>
              </div>
               ) : (
                   <div className="bg-green-500/10 border-t border-green-500/20 p-6">
                       <h3 className="text-sm font-bold mb-2 uppercase text-center text-green-500">DISPUTE RESOLVED</h3>
                       <p className="text-center text-muted-foreground text-xs">
                            Resolution: {selectedDispute.resolution || 'No notes provided'} <br/>
                            Winner ID: {selectedDispute.winnerId}
                       </p>
                   </div>
               )}
            </div>
            ) : (
                <div className="rounded-xl border border-border bg-card p-12 flex items-center justify-center text-muted-foreground">
                    Select a case to view details
                </div>
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}

export default function DisputesPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <DisputesPageContent />
    </Suspense>
  );
}


