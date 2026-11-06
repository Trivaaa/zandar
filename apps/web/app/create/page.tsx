"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { parseGameId, parseTableTheme, type GameId, type TableTheme } from "@zandar/shared-types";
import { roomPath } from "@/lib/routes";
import { createRoom } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { savePlayerName, usePlayerName } from "@/lib/playerName";
import { readTableThemeRaw, saveTableTheme } from "@/lib/tableTheme";
import { CreateRoomScreen } from "@/components/lobby/CreateRoomScreen";
import { pokerLive } from "@/lib/pokerRelease";
import { useQueryParam } from "@/lib/useQuery";

const subscribeToNothing = () => () => {};

export default function CreatePage() {
  const router = useRouter();
  const savedName = usePlayerName();
  // `null` = igrač još nije kucao → polje nosi sačuvano ime.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const displayName = nameDraft ?? savedName ?? "";
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  // `?game=poker` sa početne; bez prekidača izdanja poker se ne nudi ni ovdje.
  const gameParam = useQueryParam("game");
  const [gameDraft, setGameDraft] = useState<GameId | null>(null);
  const game: GameId = pokerLive ? (gameDraft ?? parseGameId(gameParam)) : "zandar";
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
      const res = await createRoom({
        displayName,
        playerCount,
        targetScore,
        tableTheme,
        ...(game === "poker" ? { game } : {}),
      });
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
      game={game}
      {...(pokerLive ? { onGame: setGameDraft } : {})}
      onCreate={() => void handleCreate()}
      onBack={() => router.push("/")}
      loading={loading}
      {...(error ? { error } : {})}
    />
  );
}
