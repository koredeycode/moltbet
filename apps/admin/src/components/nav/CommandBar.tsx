"use client";

import { Button } from "@/components/ui/button";
import { useAuthStore } from "@/lib/AuthContext";
import { LogOut } from "lucide-react";
import Link from "next/link";

export function CommandBar() {
  const { isAuthenticated, logout } = useAuthStore();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto flex h-14 items-center">
        <div className="mr-4 hidden md:flex">
          <Link href="/" className="mr-6 flex items-center space-x-2">
            <div className="flex items-center gap-2">
              <img
                src="/moltbet.png"
                alt="Moltbet Logo"
                className="h-8 w-8 object-contain animate-float"
              />
              <span className="hidden font-mono font-bold sm:inline-block">
                MOLTBET
              </span>
            </div>
          </Link>
        </div>
        <div className="flex flex-1 items-center justify-between space-x-2 md:justify-end">
          <div className="w-full flex-1 md:w-auto md:flex-none">
            <span className="text-xs font-mono text-muted-foreground">STATUS: ONLINE</span>
          </div>
          <nav className="flex items-center gap-2">
            {isAuthenticated && (
              <Button 
                variant="outline" 
                size="sm" 
                className="font-mono text-xs border-destructive/50 text-destructive hover:bg-destructive/10"
                onClick={logout}
              >
                <LogOut className="h-3 w-3 mr-1" />
                LOGOUT
              </Button>
            )}
          </nav>
        </div>
      </div>
    </header>
  );
}
