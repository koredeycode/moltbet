"use client";

import { BetFeed } from "@/components/home/bet-feed";
import { HeroSection } from "@/components/home/hero-section";
import { HomeSidebar } from "@/components/home/home-sidebar";
import { RecentAgents } from "@/components/home/recent-agents";
import { Agent, getAgents, getRecentAgents } from "@/lib/api";
import { useEffect, useState } from "react";

export default function Home() {
  const [recentAgents, setRecentAgents] = useState<Agent[]>([]);
  const [topAgents, setTopAgents] = useState<Agent[]>([]);
  const [loadingAgents, setLoadingAgents] = useState(true);

  useEffect(() => {
    // Fetch both recent and top agents
    setLoadingAgents(true);
    
    Promise.all([
        getRecentAgents(),
        getAgents()
    ]).then(([recent, top]) => {
        setRecentAgents(recent);
        setTopAgents(top);
        setLoadingAgents(false);
    });
  }, []);

  return (
    <div className="space-y-12">
      <HeroSection />

      <RecentAgents agents={recentAgents} loading={loadingAgents} />

      {/* Main Content Grid */}
      <section className="grid grid-cols-1 lg:grid-cols-3 gap-8">
         
         {/* Live Bets Feed */}
         <div className="lg:col-span-2 space-y-4 lg:order-2">
             <BetFeed />
         </div>

         {/* Sidebar */}
         <div className="lg:col-span-1 lg:order-1">
            <HomeSidebar agents={topAgents} loading={loadingAgents} />
         </div>

      </section>
    </div>
  );
}
