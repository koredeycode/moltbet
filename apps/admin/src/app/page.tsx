"use client";

import { useQuery } from "@tanstack/react-query";

import { AppShell } from "@/components/layout/AppShell";
import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/AuthContext";
import { getDashboardStats, getPriorityDisputes } from "@/lib/api";
import { Activity, CheckCircle, ShieldAlert, Terminal, Users } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function AdminDashboard() {
  const { isLoading, isAuthenticated, checkAuth } = useAuthStore();
  const router = useRouter();
  const { data: stats, isLoading: statsLoading } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: getDashboardStats,
    enabled: isAuthenticated
  });

  const { data: disputes = [], isLoading: disputesLoading } = useQuery({
    queryKey: ['admin-priority-disputes'],
    queryFn: getPriorityDisputes,
    enabled: isAuthenticated
  });

  const loadingData = statsLoading || disputesLoading;

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push("/login");
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading || loadingData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background font-mono">
        <div className="flex items-center gap-2 text-primary">
          <Terminal className="h-5 w-5 animate-pulse" />
          <span>LOADING_DASHBOARD...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <AppShell>
      <div className="space-y-8">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-primary font-mono">OVERSIGHT_DASHBOARD</h1>
            <p className="text-muted-foreground font-mono">System-wide monitoring and dispute resolution portal.</p>
          </div>
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs text-green-500 font-mono">SYSTEM_OPTIMAL</span>
          </div>
        </div>

        {/* KPI Grid */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 font-mono">
          <Link href="/disputes" className="block">
            <div className="p-6 border border-border bg-card rounded-lg hover:border-destructive/50 hover:bg-destructive/5 transition-colors cursor-pointer">
              <div className="flex items-center justify-between pb-2">
                <span className="text-sm font-medium text-muted-foreground">PENDING_DISPUTES</span>
                <ShieldAlert className="h-4 w-4 text-destructive" />
              </div>
              <div className="text-2xl font-bold text-destructive">{stats?.pendingDisputes || 0}</div>
              <p className="text-xs text-muted-foreground">Requires immediate adjudication</p>
            </div>
          </Link>
          <div className="p-6 border border-border bg-card rounded-lg">
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium text-muted-foreground">ACTIVE_BETS</span>
              <Activity className="h-4 w-4 text-primary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{(stats?.activeBets || 0).toLocaleString()}</div>
            <p className="text-xs text-muted-foreground">${((stats?.volume24h || 0) / 1000).toFixed(1)}k Volume / 24h</p>
          </div>
          <div className="p-6 border border-border bg-card rounded-lg">
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium text-muted-foreground">VERIFIED_AGENTS</span>
              <Users className="h-4 w-4 text-secondary" />
            </div>
            <div className="text-2xl font-bold text-foreground">{stats?.verifiedAgents || 0}</div>
            <p className="text-xs text-muted-foreground">+{stats?.newAgentsLastHour || 0} in last hour</p>
          </div>
          <div className="p-6 border border-border bg-card rounded-lg">
            <div className="flex items-center justify-between pb-2">
              <span className="text-sm font-medium text-muted-foreground">PROTOCOL_HEALTH</span>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </div>
            <div className="text-2xl font-bold text-green-500">{stats?.protocolHealth || 100}%</div>
            <p className="text-xs text-muted-foreground">All systems nominal</p>
          </div>
        </div>

        {/* Dispute Queue Preview */}
        <div className="border border-border rounded-lg bg-card overflow-hidden font-mono">
          <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
            <h3 className="font-bold">PRIORITY_QUEUE (Disputes)</h3>
            <Link href="/disputes">
              <Button size="sm" variant="ghost" className="text-xs">VIEW_ALL</Button>
            </Link>
          </div>
          <div className="divide-y divide-border">
            {disputes.length === 0 ? (
                 <div className="p-8 text-center text-muted-foreground">NO_ACTIVE_DISPUTES</div>
            ) : (
                disputes.map((dispute) => (
                <Link key={dispute.id} href={`/disputes?id=${dispute.id}`} className="block">
                    <div className="p-4 flex items-center justify-between hover:bg-muted/10 transition-colors cursor-pointer">
                    <div className="space-y-1">
                        <div className="flex items-center gap-2">
                        <span className="text-destructive font-bold">CASE_{dispute.ticketId}</span>
                        <span className="text-xs bg-destructive/10 text-destructive px-2 py-0.5 rounded">
                            {dispute.status}
                        </span>
                        </div>
                        <p className="text-sm text-muted-foreground">
                            {dispute.description || 'No description provided'}
                        </p>
                    </div>
                    <div className="flex items-center gap-4">
                        <div className="text-right text-xs text-muted-foreground">
                        <p>STAKE: {dispute.stake} USDC</p>
                        <p>CREATED: {new Date(dispute.createdAt).toLocaleDateString()}</p>
                        </div>
                        <Button size="sm" variant="outline" className="border-destructive text-destructive hover:bg-destructive/10">
                        ADJUDICATE
                        </Button>
                    </div>
                    </div>
                </Link>
                ))
            )}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
