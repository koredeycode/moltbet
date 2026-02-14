'use client';

import { Brain, Check, ChevronDown, Copy, ExternalLink, Github, MessageSquare, MessagesSquare, Sparkles, Zap } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

interface CopyOpenInAIProps {
  markdown: string;
  pageUrl?: string;
}

const AI_TOOLS = [
  { 
    name: 'Open in GitHub', 
    icon: Github,
    getUrl: (pageUrl: string) => pageUrl
  },
  { 
    name: 'Open in ChatGPT', 
    icon: MessageSquare,
    getUrl: (pageUrl: string) => `https://chat.openai.com/?q=${encodeURIComponent(`Read ${pageUrl}, I want to ask questions about it`)}`
  },
  { 
    name: 'Open in Gemini', 
    icon: Sparkles,
    getUrl: (pageUrl: string) => `https://gemini.google.com/?q=${encodeURIComponent(`Read ${pageUrl}, I want to ask questions about it`)}`
  },
  { 
    name: 'Open in Grok', 
    icon: Zap,
    getUrl: (pageUrl: string) => `https://grok.x.ai/?q=${encodeURIComponent(`Read ${pageUrl}, I want to ask questions about it`)}`
  },
  { 
    name: 'Open in Claude', 
    icon: Brain,
    getUrl: (pageUrl: string) => `https://claude.ai/new?q=${encodeURIComponent(`Read ${pageUrl}, I want to ask questions about it`)}`
  },
  { 
    name: 'Open in T3 Chat', 
    icon: MessagesSquare,
    getUrl: (pageUrl: string) => `https://t3.chat/?q=${encodeURIComponent(`Read ${pageUrl}, I want to ask questions about it`)}`
  },
];

export function CopyOpenInAI({ markdown, pageUrl }: CopyOpenInAIProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleCopy = async () => {
    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard) {
          await navigator.clipboard.writeText(markdown);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const handleOpenInTool = (tool: typeof AI_TOOLS[0]) => {
    if (!pageUrl) return;
    const url = tool.getUrl(pageUrl);
    window.open(url, '_blank', 'noopener,noreferrer');
    setIsOpen(false);
  };

  return (
    <div className="flex items-center gap-2 mb-6" ref={dropdownRef}>
      {/* Copy Markdown Button */}
      <button
        onClick={handleCopy}
        className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium rounded-lg bg-fd-muted hover:bg-fd-accent text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors border border-fd-border"
      >
        {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
        {copied ? 'Copied!' : 'Copy Markdown'}
      </button>

      {/* Open Dropdown */}
      <div className="relative">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg bg-fd-muted hover:bg-fd-accent text-fd-muted-foreground hover:text-fd-accent-foreground transition-colors border border-fd-border"
        >
          Open
          <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-52 py-1 rounded-lg bg-fd-popover border border-fd-border shadow-lg z-50">
            {AI_TOOLS.map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.name}
                  onClick={() => handleOpenInTool(tool)}
                  className="flex items-center justify-between w-full px-3 py-2 text-sm text-fd-popover-foreground hover:bg-fd-accent hover:text-fd-accent-foreground transition-colors"
                >
                  <span className="flex items-center gap-3">
                    <Icon className="w-4 h-4" />
                    {tool.name}
                  </span>
                  <ExternalLink className="w-3.5 h-3.5 opacity-50" />
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
