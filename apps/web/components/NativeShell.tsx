"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { isNative } from "@/lib/platform";
import { runBackHandler } from "@/lib/backHandlers";
import { consumeInstallRoom } from "@/lib/installReferrer";
import { roomIdFromLink, roomPath } from "@/lib/routes";

const LAUNCH_URL_KEY = "zandar:launchUrlHandled";

/**
 * Link koji je POKRENUO aplikaciju obrađuje se jednom po pokretanju.
 * `getLaunchUrl` vraća isti URL dok proces živi, pa bi ponovno učitavanje
 * WebView-a (ili remount) igrača vratilo u sobu iz koje je upravo izašao.
 * sessionStorage živi koliko i WebView sesija — novo pokretanje istim linkom
 * opet prolazi.
 */
function takeLaunchUrl(url: string): boolean {
  try {
    if (window.sessionStorage.getItem(LAUNCH_URL_KEY) === url) return false;
    window.sessionStorage.setItem(LAUNCH_URL_KEY, url);
  } catch {
    // Bez skladišta: radije jednom previše nego da pozivnica ne otvori sobu.
  }
  return true;
}

/**
 * Native shell: hardversko "nazad" i pozivnice.
 *
 * "Nazad": WebView ne zna za Next-ov history, pa bez ovoga dugme gasi
 * aplikaciju usred ruke.
 *
 * Pozivnice (`https://kartaonica.com/room/:id`) stižu na tri načina:
 *   - aplikacija radi → `appUrlOpen` (App Link, vidi AndroidManifest);
 *   - link je pokrenuo aplikaciju → `getLaunchUrl` (`appUrlOpen` se javlja
 *     samo na NOVI intent, hladan start ga ne dobija);
 *   - aplikacija je instalirana sa pozivnice → Play Install Referrer
 *     (`lib/installReferrer.ts`), samo pri prvom pokretanju.
 * Sva tri vode na `/room?id=` — isti ekran i isti tok ulaska kao na webu.
 *
 * `@capacitor/app` se uvozi dinamički — statički uvoz bi paket uvukao i u web
 * bundle, gdje nema šta da radi.
 */
export function NativeShell() {
  const router = useRouter();

  useEffect(() => {
    if (!isNative) return;

    const removers: Array<() => void> = [];
    let cancelled = false;

    const openRoom = (url: string): boolean => {
      const roomId = roomIdFromLink(url);
      if (!roomId) return false;
      // `push`, ne `replace`: "nazad" iz sobe vodi na početnu, ne gasi aplikaciju.
      router.push(roomPath(roomId));
      return true;
    };

    void (async () => {
      const { App } = await import("@capacitor/app");

      const back = await App.addListener("backButton", () => {
        // Putanju čitamo iz `location`, ne iz `usePathname`, da se listener ne
        // registruje ispočetka na svaku navigaciju.
        // Otvoren sheet/modal (postavke, pravila) se zatvara prvi — inače bi
        // „nazad" na home-u ugasio aplikaciju ispod otvorenog sloja.
        if (runBackHandler()) return;
        const path = window.location.pathname;
        // Home je korijen — tu "nazad" znači izlaz, a ne prazan ekran.
        if (path === "/" || path === "") void App.exitApp();
        else router.back();
      });
      removers.push(() => void back.remove());

      const opened = await App.addListener("appUrlOpen", ({ url }) => {
        openRoom(url);
      });
      removers.push(() => void opened.remove());

      if (cancelled) {
        removers.forEach((remove) => remove());
        return;
      }

      const launch = await App.getLaunchUrl();
      const fromLink =
        launch?.url && takeLaunchUrl(launch.url) ? openRoom(launch.url) : false;

      // Referrer se troši i kad je link već odveo u sobu — inače bi ga sljedeće
      // pokretanje pročitalo i odvelo u staru pozivnicu.
      const installRoom = await consumeInstallRoom();
      if (!cancelled && !fromLink && installRoom) router.push(roomPath(installRoom));
    })().catch(() => {});

    return () => {
      cancelled = true;
      removers.forEach((remove) => remove());
    };
  }, [router]);

  return null;
}
