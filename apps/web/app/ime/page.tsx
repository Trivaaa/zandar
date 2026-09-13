"use client";

import { Suspense, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { NameStep } from "@/components/funnel/NameStep";
import { isValidPlayerName, savePlayerName, usePlayerName } from "@/lib/playerName";
import type { NameNext } from "@/lib/routes";
import { sr } from "@/lib/sr";
import { startQuickPlay } from "@/lib/startQuickPlay";

/**
 * `/ime?next=quickplay|home` — korak sa imenom.
 *
 * Zasebna ruta, a ne sheet na home-u: Android „nazad" (`NativeShell`) na `/`
 * gasi aplikaciju, a ovdje radi `router.back()` bez ijedne dopune. Query oblik
 * radi i u statičkom exportu (APK).
 */
function NameFromQuery() {
  const router = useRouter();
  const next: NameNext = useSearchParams().get("next") === "home" ? "home" : "quickplay";
  const saved = usePlayerName();
  // `null` = igrač još nije kucao → polje nosi sačuvano ime (izmjena iz postavki).
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? saved ?? "";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const busy = useRef(false);

  function leave() {
    // Direktno otvoren `/ime` nema gdje „nazad" — tad je odredište home.
    if (window.history.length > 1) router.back();
    else router.replace("/");
  }

  async function submit() {
    if (busy.current || !isValidPlayerName(value)) return;
    if (next === "home") {
      savePlayerName(value);
      leave();
      return;
    }
    busy.current = true;
    setError(null);
    setLoading(true);
    try {
      // `replace`: „nazad" sa matching ekrana vodi na home, ne opet na ime.
      router.replace(await startQuickPlay(value));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
      setLoading(false);
      busy.current = false;
    }
  }

  return (
    <NameStep
      value={value}
      onChange={setDraft}
      onSubmit={() => void submit()}
      onBack={leave}
      loading={loading}
      loadingLabel={sr.home.playLoading}
      {...(error ? { error } : {})}
    />
  );
}

export default function NamePage() {
  return (
    <Suspense fallback={<main className="screen namestep" />}>
      <NameFromQuery />
    </Suspense>
  );
}
