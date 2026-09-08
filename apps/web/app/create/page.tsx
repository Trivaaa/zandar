"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { roomPath } from "@/lib/routes";
import { createRoom } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { CreateRoomScreen } from "@/components/lobby/CreateRoomScreen";

export default function CreatePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [targetScore, setTargetScore] = useState(21);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCreate() {
    setError(null);
    setLoading(true);
    try {
      const res = await createRoom({ displayName, playerCount, targetScore });
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
      onDisplayName={setDisplayName}
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
