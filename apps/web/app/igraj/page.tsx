"use client";

import { useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";

import { CreateRoomScreen } from "@/components/lobby/CreateRoomScreen";
import { usePlayerName } from "@/lib/playerName";
import {
  parseQuickPlayPrefs,
  QUICK_PLAY_COUNTS,
  QUICK_PLAY_TARGETS,
  readQuickPlayPrefsRaw,
  type QuickPlayCount,
  type QuickPlayTarget,
} from "@/lib/quickPlayPrefs";
import { sr } from "@/lib/sr";
import { startQuickPlay } from "@/lib/startQuickPlay";

const subscribeToNothing = () => () => {};

/**
 * `/igraj` — „Igraj Žandar": ime, sto za 2 ili 4, partija do 11 ili 21, pa javni
 * sto. Zaseban ekran, a ne prekidači na početnoj: početna ostaje jedna glasna
 * radnja, a Android „nazad" ovdje radi sam (`NativeShell` gasi aplikaciju samo
 * na `/`).
 *
 * Polja nose sačuvano ime i zadnji izbor dok ih igrač ne dirne (`null` = nije
 * dirano) — isti obrazac kao `/create`.
 */
export default function QuickPlaySetupPage() {
  const router = useRouter();
  const savedName = usePlayerName();
  const savedRaw = useSyncExternalStore(subscribeToNothing, readQuickPlayPrefsRaw, () => null);
  const saved = useMemo(() => parseQuickPlayPrefs(savedRaw), [savedRaw]);

  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [countDraft, setCountDraft] = useState<QuickPlayCount | null>(null);
  const [targetDraft, setTargetDraft] = useState<QuickPlayTarget | null>(null);
  const displayName = nameDraft ?? savedName ?? "";
  const playerCount = countDraft ?? saved.playerCount;
  const targetScore = targetDraft ?? saved.targetScore;

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // `loading` gasi dugme tek na sljedećem renderu; brz dupli tap stigne prije.
  const busy = useRef(false);

  async function handleStart() {
    if (busy.current) return;
    busy.current = true;
    setError(null);
    setLoading(true);
    try {
      // `replace`: „nazad" sa matching ekrana vodi na početnu, ne opet ovdje.
      router.replace(await startQuickPlay(displayName, { playerCount, targetScore }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
      setLoading(false);
      busy.current = false;
    }
  }

  return (
    <CreateRoomScreen
      copy={sr.quickSetup}
      counts={QUICK_PLAY_COUNTS}
      displayName={displayName}
      onDisplayName={setNameDraft}
      playerCount={playerCount}
      onPlayerCount={(n) => setCountDraft(QUICK_PLAY_COUNTS.find((c) => c === n) ?? null)}
      targetScore={targetScore}
      onTargetScore={(n) => setTargetDraft(QUICK_PLAY_TARGETS.find((t) => t === n) ?? null)}
      onCreate={() => void handleStart()}
      onBack={() => router.push("/")}
      loading={loading}
      {...(error ? { error } : {})}
    />
  );
}
