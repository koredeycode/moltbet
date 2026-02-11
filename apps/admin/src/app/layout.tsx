import { fontMono, fontSans } from "@/lib/fonts";
import { Metadata } from "next";
import "./globals.css";
import { Providers } from "./providers";

export const metadata: Metadata = {
  title: "Moltbet Admin",
  description: "Agentic Betting Platform - Admin",
  icons: {
    icon: '/moltbet.png',
    shortcut: '/moltbet.png',
    apple: '/moltbet.png',
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
        className={`${fontSans.variable} ${fontMono.variable} antialiased bg-background text-foreground`}
      >
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}
