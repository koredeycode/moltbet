"use client";

import { useEffect } from "react";
import Script from "next/script";

export default function VConsole() {
  useEffect(() => {
    // This ensures it only runs in the browser
    const initVConsole = () => {
      // @ts-ignore
      if (typeof window !== "undefined" && window.VConsole) {
        // @ts-ignore
        new window.VConsole();
      }
    };

    // Check if it's already loaded, otherwise wait for it
    // @ts-ignore
    if (window.VConsole) {
      initVConsole();
    }
  }, []);

  return (
    <Script
      src="https://unpkg.com/vconsole@latest/dist/vconsole.min.js"
      strategy="afterInteractive"
      onReady={() => {
        // @ts-ignore
        new window.VConsole();
      }}
    />
  );
}