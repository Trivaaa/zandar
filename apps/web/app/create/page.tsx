"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roomPath } from "@/lib/routes";
import { createRoom } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { savePlayerName, usePlayerName } from "@/lib/playerName";
import { CreateRoomScreen } from "@/components/lobby/CreateRoomScreen";

export default function CreatePage() {
  const router = useRouter();
  const savedName = usePlayerName();
  // `null` = igrač još nije kucao → polje nosi sačuvano ime.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const displayName = nameDraft ?? savedName ?? "";
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [targetScore, setTargetScore] = useState(21);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const res = await createRoom({ displayName, playerCount, targetScore });
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
      onCreate={() => void handleCreate()}
      onBack={() => router.push("/")}
      loading={loading}
      {...(error ? { error } : {})}
    />
  );
}
