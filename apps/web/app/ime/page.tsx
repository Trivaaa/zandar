"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { NameStep } from "@/components/funnel/NameStep";
import { isValidPlayerName, savePlayerName, usePlayerName } from "@/lib/playerName";
import { sr } from "@/lib/sr";

/**
 * `/ime` — izmjena imena iz postavki: sačuva i vrati se.
 *
 * Zasebna ruta, a ne sheet na home-u: Android „nazad" (`NativeShell`) na `/`
 * gasi aplikaciju, a ovdje radi `router.back()` bez ijedne dopune.
 *
 * Brza igra je ranije ovdje tražila ime (`?next=quickplay`); otkad ima svoj
 * ekran (`/igraj`) sa poljem za ime, taj put više ne postoji. Stari link sa
 * `?next=quickplay` se ponaša kao obična izmjena imena.
 */
export default function NamePage() {
  const router = useRouter();
  const saved = usePlayerName();
  // `null` = igrač još nije kucao → polje nosi sačuvano ime.
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? saved ?? "";

  function leave() {
    // Direktno otvoren `/ime` nema gdje „nazad" — tad je odredište home.
    if (window.history.length > 1) router.back();
    else router.replace("/");
  }

  function submit() {
    if (!isValidPlayerName(value)) return;
    savePlayerName(value);
    leave();
  }

  return (
    <NameStep
      value={value}
      onChange={setDraft}
      onSubmit={submit}
      onBack={leave}
      loading={false}
      loadingLabel={sr.home.playLoading}
    />
  );
}
