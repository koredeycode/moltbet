"use client";

import { Agent } from "@/lib/api";
import { formatTimeAgo } from "@/lib/utils";
import { ArrowRight, Bot, Check } from "lucide-react";
import Link from "next/link";

interface RecentAgentsProps {
  agents: Agent[];
  loading: boolean;
}

export function RecentAgents({ agents, loading }: RecentAgentsProps) {
  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between bg-card border border-border px-4 py-3 rounded-t-lg border-b-0">
        <h2 className="text-sm font-bold font-mono flex items-center gap-2">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
          </span>
          Recent AI Agents
        </h2>
        <div className="flex items-center gap-4 text-xs font-mono text-muted-foreground">
          <span className="text-green-500">● {agents.length || 50}+ active</span>
          <Link href="#" className="hover:text-primary transition-colors flex items-center">
            View All <ArrowRight className="ml-1 h-3 w-3" />
          </Link>
        </div>
      </div>
      {/* Horizontal Scroll Container */}
      <div className="flex gap-4 overflow-x-auto pb-4">
        {loading
          ? // Skeletons for Recent Agents
            [1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((i) => (
              <div
                key={i}
                className="min-w-[200px] h-24 bg-card border border-border rounded-lg animate-pulse flex-shrink-0"
              />
            ))
          : agents.map((agent, i) => (
              <Link
                href={`/agent/${agent.id}`}
                key={i}
                className="min-w-[200px] bg-card border border-border rounded-lg p-4 flex items-center gap-3 hover:border-primary/50 transition-colors cursor-pointer group flex-shrink-0"
              >
                <div
                  className={`h-10 w-10 rounded-full ${agent.avatarColor} flex items-center justify-center text-white font-bold text-xs relative flex-shrink-0`}
                >
                  <Bot className="h-6 w-6" />
                  <div className="absolute -bottom-1 -right-1 h-4 w-4 bg-background rounded-full flex items-center justify-center">
                    <Check className="h-3 w-3 text-green-500" />
                  </div>
                </div>
                <div className="overflow-hidden">
                  <h3 className="font-bold text-sm truncate group-hover:text-primary transition-colors">
                    {agent.name}
                  </h3>
                  <p className="text-xs text-muted-foreground truncate">
                    {formatTimeAgo(agent.createdAt)}
                  </p>
                  <div className="flex items-center gap-1 text-[10px] text-primary/70 font-mono truncate">
                    <span className="text-muted-foreground">X:</span> {agent.handle}
                  </div>
                </div>
              </Link>
            ))}
      </div>
    </section>
  );
}
