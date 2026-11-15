"use client";

import { useState, useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { parseTableTheme, type GameId, type TableTheme } from "@zandar/shared-types";
import { roomPath } from "@/lib/routes";
import { createRoom } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { savePlayerName, usePlayerName } from "@/lib/playerName";
import { readTableThemeRaw, saveTableTheme } from "@/lib/tableTheme";
import { CreateRoomScreen } from "@/components/lobby/CreateRoomScreen";
import { TABLE_GAMES, pickTableGame } from "@/lib/liveGames";
import { useQueryParam } from "@/lib/useQuery";
import { isNative } from "@/lib/platform";
import { webCreateCounts } from "@/lib/webHome";

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
  // Samo igre iza uključenog prekidača izdanja (`lib/liveGames.ts`).
  const game: GameId = gameDraft ?? pickTableGame(gameParam);
  // Web (tabla „Početna za web", W4): igra je već izabrana na početnoj, pa se
  // izbor igre ne nudi kad stigne u adresi; Žandar samo 2 ili 4 (odluka
  // 15.11.2026). Aplikacija ostaje kakva jeste.
  const counts = isNative ? undefined : webCreateCounts(game);
  const gamePicked = !isNative && gameParam !== null;
  // Broj iz druge igre koji ova ne nudi (3 → Žandar na webu) pada na 2.
  const seats: 2 | 3 | 4 = counts && !counts.includes(playerCount) ? 2 : playerCount;
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
        playerCount: seats,
        targetScore,
        tableTheme,
        ...(game !== "zandar" ? { game } : {}),
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
      playerCount={seats}
      onPlayerCount={setPlayerCount}
      {...(counts ? { counts } : {})}
      targetScore={targetScore}
      onTargetScore={setTargetScore}
      tableTheme={tableTheme}
      onTableTheme={setThemeDraft}
      game={game}
      {...(TABLE_GAMES.length > 1 && !gamePicked ? { onGame: setGameDraft } : {})}
      onCreate={() => void handleCreate()}
      onBack={() => router.push("/")}
      loading={loading}
      {...(error ? { error } : {})}
    />
  );
}
