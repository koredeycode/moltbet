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
          <Toaster 
            theme="dark"
            position="bottom-right"
            toastOptions={{
              className: "font-mono uppercase tracking-wider text-[10px] sm:text-xs",
              style: {
                borderRadius: '0px',
                background: 'oklch(0.1 0 0)',
                border: '1px solid oklch(0.2 0 0)',
                color: 'oklch(0.98 0 0)',
              },
              classNames: {
                success: 'toast-success',
                error: 'toast-error',
              }
            }}
          />
        </Providers>
      </body>
    </html>
  );
}
