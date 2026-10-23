"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { parseTableTheme, type TableTheme } from "@zandar/shared-types";
import { roomPath } from "@/lib/routes";
import { createRoom } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { savePlayerName, usePlayerName } from "@/lib/playerName";
import { readTableThemeRaw, saveTableTheme } from "@/lib/tableTheme";
import { CreateRoomScreen } from "@/components/lobby/CreateRoomScreen";

const subscribeToNothing = () => () => {};

export default function CreatePage() {
  const router = useRouter();
  const savedName = usePlayerName();
  // `null` = igrač još nije kucao → polje nosi sačuvano ime.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const displayName = nameDraft ?? savedName ?? "";
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [targetScore, setTargetScore] = useState(21);
  // Zadnja izabrana podloga, zajednička sa brzom igrom; `null` = nije dirano.
  const savedTheme = useSyncExternalStore(subscribeToNothing, readTableThemeRaw, () => null);
  const [themeDraft, setThemeDraft] = useState<TableTheme | null>(null);
  const tableTheme = themeDraft ?? parseTableTheme(savedTheme);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      // Pamti se PRIJE zahtjeva, kao kod brze igre: mrežna greška ne briše izbor.
      saveTableTheme(tableTheme);
      const res = await createRoom({ displayName, playerCount, targetScore, tableTheme });
      savePlayerName(displayName);
      saveSession({
        roomId: res.roomId,
        playerId: res.playerId,
        sessionToken: res.playerSessionToken,
      });
      router.push(roomPath(res.roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepoznata greška");
      setLoading(false);
    }
  }

  return (
    <CreateRoomScreen
      displayName={displayName}
      onDisplayName={setNameDraft}
      playerCount={playerCount}
      onPlayerCount={setPlayerCount}
      targetScore={targetScore}
      onTargetScore={setTargetScore}
      tableTheme={tableTheme}
      onTableTheme={setThemeDraft}
      onCreate={() => void handleCreate()}
      onBack={() => router.push("/")}
      loading={loading}
      {...(error ? { error } : {})}
    />
  );
}
