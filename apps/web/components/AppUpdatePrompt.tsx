"use client";

import { useEffect, useState } from "react";

import {
  checkDue,
  checkUpdate,
  completeUpdate,
  decideUpdate,
  fetchMinVersionCode,
  lastCheckedAt,
  markChecked,
  onDownloaded,
  snoozeOffer,
  snoozedUntil,
  startUpdate,
} from "@/lib/appUpdate";
import { isNative } from "@/lib/platform";
import { sr } from "@/lib/sr";
import { track } from "@/lib/track";

type Bar = { kind: "offer"; versionCode?: number } | { kind: "ready" } | null;

/**
 * Ponuda nove verzije sa Play-a (`lib/appUpdate.ts`). Živi SAMO na početnoj
 * (`app/page.tsx`), pa se za stolom nikad ne pojavljuje: instalacija restartuje
 * aplikaciju. Provjera ide pri otvaranju početne i pri povratku u prvi plan,
 * najviše jednom u 6 h; obavezno ažuriranje se ponavlja na svaki povratak dok
 * ga korisnik ne prihvati.
 *
 * `hidden`: dok traje traženje stola traka se ne crta (prekid toka igre).
 */
export function AppUpdatePrompt({ hidden = false }: { hidden?: boolean }) {
  const [bar, setBar] = useState<Bar>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!isNative) return;
    let cancelled = false;
    const removers: Array<() => void> = [];

    const run = async () => {
      const now = Date.now();
      if (!checkDue(lastCheckedAt(), now)) return;
      const [info, minVersionCode] = await Promise.all([checkUpdate(), fetchMinVersionCode()]);
      if (cancelled) return;
      const decision = decideUpdate(info, minVersionCode, snoozedUntil(), now);
      // Prisila se NE upisuje kao provjerena: otkazan Play ekran se nudi opet
      // na sljedeći povratak, ne tek za 6 h.
      if (decision !== "force") markChecked(now);
      if (decision === "force") {
        if (await startUpdate("immediate")) {
          track("app_update", { action: "forced", version_code: info.availableVersionCode });
        }
      } else if (decision === "restart") {
        setBar({ kind: "ready" });
      } else if (decision === "offer") {
        setBar({ kind: "offer", versionCode: info.availableVersionCode });
        track("app_update", { action: "offered", version_code: info.availableVersionCode });
      }
    };

    void (async () => {
      removers.push(await onDownloaded(() => setBar({ kind: "ready" })));
      const { App } = await import("@capacitor/app");
      const resume = await App.addListener("appStateChange", ({ isActive }) => {
        if (isActive) void run().catch(() => {});
      });
      removers.push(() => void resume.remove());
      if (cancelled) {
        removers.forEach((remove) => remove());
        return;
      }
      await run();
    })().catch(() => {});

    return () => {
      cancelled = true;
      removers.forEach((remove) => remove());
    };
  }, []);

  if (!bar || hidden) return null;

  async function accept() {
    if (bar?.kind !== "offer") return;
    setBusy(true);
    track("app_update", { action: "accepted", version_code: bar.versionCode });
    await startUpdate("flexible");
    // Preuzimanje teče u pozadini; kad završi, `downloaded` vraća traku kao „Restartuj".
    setBar(null);
    setBusy(false);
  }

  function decline() {
    if (bar?.kind !== "offer") return;
    snoozeOffer(Date.now());
    track("app_update", { action: "declined", version_code: bar.versionCode });
    setBar(null);
  }

  async function restart() {
    setBusy(true);
    track("app_update", { action: "restarted" });
    await completeUpdate();
    setBusy(false);
  }

  const offer = bar.kind === "offer";
  const title = offer ? sr.appUpdate.offerTitle : sr.appUpdate.readyTitle;

  return (
    <div className="appupdate pushprompt" role="status" aria-label={title}>
      <p className="pushprompt__title font-sans font-semibold text-base">{title}</p>
      <p className="pushprompt__body font-sans text-sm">
        {offer ? sr.appUpdate.offerBody : sr.appUpdate.readyBody}
      </p>
      <div className="pushprompt__actions">
        <button
          type="button"
          className="pushprompt__enable font-sans text-base"
          onClick={() => void (offer ? accept() : restart())}
          disabled={busy}
          data-disabled={busy}
        >
          {offer ? sr.appUpdate.update : sr.appUpdate.restart}
        </button>
        {offer ? (
          <button
            type="button"
            className="pushprompt__dismiss font-sans text-base"
            onClick={decline}
            disabled={busy}
          >
            {sr.appUpdate.notNow}
          </button>
        ) : null}
      </div>
    </div>
  );
}
