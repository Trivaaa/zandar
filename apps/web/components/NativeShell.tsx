"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNative } from "@/lib/platform";

/**
 * Hardversko "nazad" na Androidu. WebView ne zna za Next-ov history, pa bez
 * ovoga dugme gasi aplikaciju usred ruke.
 *
 * `@capacitor/app` se uvozi dinamički — statički uvoz bi paket uvukao i u web
 * bundle, gdje nema šta da radi.
 */
export function NativeShell() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative) return;

    let remove: (() => void) | undefined;
    let cancelled = false;

    void (async () => {
      const { App } = await import("@capacitor/app");
      const handle = await App.addListener("backButton", () => {
        // Putanju čitamo iz `location`, ne iz `usePathname`, da se listener ne
        // registruje ispočetka na svaku navigaciju.
        const path = window.location.pathname;
        // Home je korijen — tu "nazad" znači izlaz, a ne prazan ekran.
        if (path === "/" || path === "") void App.exitApp();
        else router.back();
      });
      if (cancelled) void handle.remove();
      else remove = () => void handle.remove();
    })();

    return () => {
      cancelled = true;
      remove?.();
    };
  }, [router]);

  return null;
}
