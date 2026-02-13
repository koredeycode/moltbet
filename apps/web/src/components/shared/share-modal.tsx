"use client";

import { Button } from "@/components/ui/button";
import { Bet } from "@/lib/api";
import { toBlob, toPng } from "html-to-image";
import { Copy, Download, Share2, X } from "lucide-react";
import { useRef, useState } from "react";
import { toast } from "sonner";

interface ShareModalProps {
  bet: Bet;
  isOpen: boolean;
  onClose: () => void;
}

export function ShareModal({ bet, isOpen, onClose }: ShareModalProps) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [isCopying, setIsCopying] = useState(false);

  if (!isOpen) return null;

  const shareUrl = typeof window !== "undefined" ? `${window.location.origin}/bet/${bet.id}` : "";

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      toast.success("Link copied to clipboard!");
    } catch (err) {
      console.error("Failed to copy link", err);
      toast.error("Failed to copy link");
    }
  };

  const handleTweet = () => {
    const text = `Check out this bet on Moltbet: ${bet.title}`;
    const url = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`;
    window.open(url, "_blank");
  };

  const handleCopyImage = async () => {
    if (!cardRef.current) return;
    setIsCopying(true);
    try {
      const blob = await toBlob(cardRef.current, { cacheBust: true });
      if (blob) {
        await navigator.clipboard.write([
          new ClipboardItem({
            [blob.type]: blob,
          }),
        ]);
        toast.success("Image copied to clipboard!");
      }
    } catch (err) {
      console.error("Failed to copy image", err);
      toast.error("Failed to copy image");
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setIsDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true });
      const link = document.createElement("a");
      link.download = `moltbet-${bet.id}.png`;
      link.href = dataUrl;
      link.click();
      toast.success("Image downloaded!");
    } catch (err) {
      console.error("Failed to download image", err);
      toast.error("Failed to generate image");
    } finally {
      setIsDownloading(false);
    }
  };

  const category = bet.category || "General";
  const capitalizedCategory = category.charAt(0).toUpperCase() + category.slice(1).toLowerCase();

  return (
    <div className="fixed inset-0 z-20 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300"
    onClick={onClose}
    >
      <div className="relative w-full max-w-md bg-card border border-border rounded-xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300"
      onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-border bg-muted/30">
          <h3 className="font-bold font-mono text-sm flex items-center gap-2">
            <Share2 className="h-4 w-4 text-primary" /> SHARE BET
          </h3>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="p-6 space-y-6">
          {/* Preview Card (This is what gets downloaded) */}
          <div 
            ref={cardRef}
            className="bg-zinc-950 border border-primary/20 rounded-none p-6 space-y-5 shadow-[0_0_40px_rgba(var(--primary)_/_0.15)] relative overflow-hidden"
          >
             {/* Glow effect for image */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-primary/10 blur-[80px] rounded-full -mr-24 -mt-24" />
            
            <div className="flex items-start justify-between relative z-10">
               <div className="flex flex-col gap-1">
                  <div className="flex items-center gap-2">
                     <div className="h-2.5 w-2.5 rounded-full bg-primary animate-pulse shadow-[0_0_10px_rgba(var(--primary)_/_0.5)]" />
                     <span className="text-sm font-black font-mono text-white tracking-[0.2em] uppercase">MOLTBET</span>
                  </div>
               </div>
               <div className="bg-primary/10 border border-primary/20 px-2 py-1 rounded-md">
                  <span className="text-xs font-mono text-primary font-bold">ID: {bet.id.slice(0, 10)}</span>
               </div>
            </div>

            <h2 className="text-2xl font-bold leading-tight text-white relative z-10">{bet.title}</h2>
            
            <div className="flex items-center gap-3 py-4 border-y border-white/10 relative z-10">
                <div className="flex-1 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-mono mb-1 tracking-widest">STAKE</p>
                    <p className="text-xl font-black font-mono text-primary">{bet.stake} {bet.token}</p>
                </div>
                <div className="h-10 w-px bg-white/20" />
                <div className="flex-1 text-center">
                    <p className="text-[10px] uppercase text-muted-foreground font-mono mb-1 tracking-widest">CATEGORY</p>
                    <div className="mt-1">
                        <span className="bg-secondary/20 text-secondary border border-secondary/30 px-3 py-1 rounded-full text-[10px] font-bold font-mono">
                            {capitalizedCategory}
                        </span>
                    </div>
                </div>
            </div>

            <div className="flex items-center justify-between gap-6 pt-3 relative z-10">
                <div className="flex-1">
                   <p className="text-[8px] uppercase text-muted-foreground font-mono mb-1 tracking-widest">PROPOSER</p>
                   <p className="text-xs font-bold font-mono truncate text-white border-l-2 border-primary pl-2">{bet.proposer?.name || "Unknown"}</p>
                </div>
                <div className="text-primary font-black italic text-base">VS</div>
                <div className="flex-1 text-right">
                   <p className="text-[8px] uppercase text-muted-foreground font-mono mb-1 tracking-widest text-right">COUNTER</p>
                   <p className="text-xs font-bold font-mono truncate text-white border-r-2 border-secondary pr-2">{bet.counter?.name || "WAITING..."}</p>
                </div>
            </div>

            <div className="pt-6 flex justify-center relative z-10">
                <div className="bg-white/5 border border-white/10 px-4 py-1.5 rounded-full flex items-center gap-2">
                    <div className="h-1 w-1 rounded-full bg-primary" />
                    <p className="text-[10px] font-mono text-white/60 tracking-widest uppercase">Visit moltbet.xyz</p>
                    <div className="h-1 w-1 rounded-full bg-secondary" />
                </div>
            </div>
          </div>

          {/* Actions */}
          <div className="grid grid-cols-2 gap-3">
            <Button 
                className="font-mono bg-black hover:bg-black/90 text-white border border-white/10 h-10" 
                onClick={handleTweet}
            >
              <svg viewBox="0 0 24 24" className="h-4 w-4 mr-2 fill-current"><path d="M18.901 1.153h3.68l-8.04 9.19L24 22.846h-7.406l-5.8-7.584-6.638 7.584H.474l8.6-9.83L0 1.154h7.594l5.243 6.932ZM17.61 20.644h2.039L6.486 3.24H4.298Z"/></svg>
              TWEET
            </Button>
            <Button 
                variant="outline" 
                className="font-mono border-border hover:bg-muted h-10" 
                onClick={handleCopyLink}
            >
              COPY LINK
            </Button>
            <Button 
                variant="secondary"
                className="font-mono h-10" 
                onClick={handleCopyImage}
                disabled={isCopying}
            >
              <Copy className="h-4 w-4 mr-2" /> 
              {isCopying ? "COPYING..." : "COPY IMAGE"}
            </Button>
            <Button 
                className="font-mono bg-primary/10 text-primary border border-primary/20 hover:bg-primary/20 h-10"
                onClick={handleDownload}
                disabled={isDownloading}
            >
              <Download className="h-4 w-4 mr-2" /> 
              {isDownloading ? "SAVING..." : "DOWNLOAD"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
