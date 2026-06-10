"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

/**
 * PwaManager (DS §9 D1) — registruje service worker (samo statika),
 * nudi install prompt (beforeinstallprompt) i update prompt (novi SW).
 * Mount-uje se jednom u root layout-u. Bez UI dok nema šta da ponudi.
 */

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
};

export function PwaManager() {
  const [installEvt, setInstallEvt] = useState<BeforeInstallPromptEvent | null>(
    null,
  );
  const [updateReady, setUpdateReady] = useState<ServiceWorker | null>(null);
  const pathname = usePathname();
  // U sobi je dno zauzeto rukom + reaction FAB-om → prikaži banner na vrhu.
  const inRoom = pathname?.startsWith("/room/") ?? false;

  useEffect(() => {
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    let reg: ServiceWorkerRegistration | null = null;

    navigator.serviceWorker
      .register("/sw.js")
      .then((r) => {
        reg = r;
        // Novi SW koji čeka → ponudi update.
        if (r.waiting) setUpdateReady(r.waiting);
        r.addEventListener("updatefound", () => {
          const sw = r.installing;
          if (!sw) return;
          sw.addEventListener("statechange", () => {
            if (sw.state === "installed" && navigator.serviceWorker.controller) {
              setUpdateReady(sw);
            }
          });
        });
      })
      .catch(() => {});

    // Reload kad novi SW preuzme kontrolu.
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener(
      "controllerchange",
      onControllerChange,
    );

    const onBeforeInstall = (e: Event) => {
      e.preventDefault();
      setInstallEvt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener("beforeinstallprompt", onBeforeInstall);
    const onInstalled = () => setInstallEvt(null);
    window.addEventListener("appinstalled", onInstalled);

    return () => {
      navigator.serviceWorker.removeEventListener(
        "controllerchange",
        onControllerChange,
      );
      window.removeEventListener("beforeinstallprompt", onBeforeInstall);
      window.removeEventListener("appinstalled", onInstalled);
      void reg;
    };
  }, []);

  async function doInstall() {
    if (!installEvt) return;
    await installEvt.prompt();
    await installEvt.userChoice;
    setInstallEvt(null);
  }

  function doUpdate() {
    updateReady?.postMessage("SKIP_WAITING");
    setUpdateReady(null);
  }

  if (!installEvt && !updateReady) return null;

  return (
    <div
      className={`fixed left-1/2 -translate-x-1/2 z-[60] flex items-center gap-2 rounded-token-lg bg-surface-raised border border-white/10 shadow-xl px-3 py-2 max-w-[92vw] ${
        inRoom
          ? "top-3 mt-safe-top"
          : "bottom-3 mb-safe-bottom"
      }`}
    >
      {updateReady ? (
        <>
          <span className="text-sm text-white">Nova verzija dostupna</span>
          <button
            type="button"
            onClick={doUpdate}
            className="rounded-token-md bg-accent text-accent-contrast px-3 py-1.5 text-sm font-bold active:scale-95 transition-transform"
          >
            Osvježi
          </button>
        </>
      ) : (
        <>
          <span className="text-sm text-white">Instaliraj Žandar</span>
          <button
            type="button"
            onClick={doInstall}
            className="rounded-token-md bg-accent text-accent-contrast px-3 py-1.5 text-sm font-bold active:scale-95 transition-transform"
          >
            Dodaj na ekran
          </button>
          <button
            type="button"
            onClick={() => setInstallEvt(null)}
            aria-label="Zatvori"
            className="text-muted px-1 active:text-white"
          >
            ✕
          </button>
        </>
      )}
    </div>
  );
}
