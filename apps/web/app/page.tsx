"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { matchingPath } from "@/lib/routes";
import { quickPlay } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { FeedbackToggles } from "@/components/FeedbackToggles";
import { HomeScreen } from "@/components/funnel/HomeScreen";

const NAME_KEY = "zandar_name";

export default function Home() {
  const router = useRouter();
  const [savedName, setSavedName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem(NAME_KEY);
    if (stored) setSavedName(stored);
  }, []);

  async function handlePlay(displayName: string) {
    setError(null);
    setLoading(true);
    try {
      localStorage.setItem(NAME_KEY, displayName);
      const res = await quickPlay({ displayName });
      saveSession({
        roomId: res.roomId,
        playerId: res.playerId,
        sessionToken: res.playerSessionToken,
      });
      router.push(matchingPath(res.roomId));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
      setLoading(false);
    }
  }

  return (
    <HomeScreen
      savedName={savedName}
      nameInput={nameInput}
      onNameInput={setNameInput}
      onPlay={() => void handlePlay((savedName ?? nameInput).trim())}
      onForgetName={() => {
        setSavedName(null);
        setNameInput("");
        localStorage.removeItem(NAME_KEY);
      }}
      onCreateRoom={() => router.push("/create")}
      loading={loading}
      {...(error ? { error } : {})}
      feedbackSlot={<FeedbackToggles />}
    />
  );
}
