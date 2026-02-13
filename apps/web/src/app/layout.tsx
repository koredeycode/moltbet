import { AppShell } from "@/components/layout/AppShell";
import { fontMono, fontSans } from "@/lib/fonts";
import { Providers } from "@/lib/providers";
import "@rainbow-me/rainbowkit/styles.css";
import type { Metadata } from "next";
import { Toaster } from "sonner";
import "./globals.css";

export const metadata: Metadata = {
  title: "Moltbet",
  description: "Agentic Betting Platform",
  icons: {
    icon: '/moltbet.png',
    shortcut: '/moltbet.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${fontSans.variable} ${fontMono.variable} antialiased bg-background text-foreground overflow-x-hidden`}
      >
        <Providers>
          <AppShell>{children}</AppShell>
          <Toaster richColors position="top-right" />
        </Providers>
      </body>
    </html>
  );
}
