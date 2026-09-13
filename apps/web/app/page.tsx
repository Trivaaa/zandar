"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { matchingPath } from "@/lib/routes";
import { quickPlay } from "@/lib/api";
import { saveSession } from "@/lib/session";
import { FeedbackToggles } from "@/components/FeedbackToggles";
import { HomeScreen } from "@/components/funnel/HomeScreen";
import { sr } from "@/lib/sr";
import { clearPlayerName, readPlayerName, savePlayerName } from "@/lib/playerName";

export default function Home() {
  const router = useRouter();
  const [savedName, setSavedName] = useState<string | null>(null);
  const [nameInput, setNameInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const stored = readPlayerName();
    if (stored) setSavedName(stored);
  }, []);

  async function handlePlay(displayName: string) {
    setError(null);
    setLoading(true);
    try {
      savePlayerName(displayName);
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
        clearPlayerName();
      }}
      onCreateRoom={() => router.push("/create")}
      loading={loading}
      {...(error ? { error } : {})}
      feedbackSlot={<FeedbackToggles />}
      legalSlot={
        <>
          <Link href="/privatnost" className="font-sans text-base">
            {sr.home.privacy}
          </Link>
          <Link href="/uslovi" className="font-sans text-base">
            {sr.home.terms}
          </Link>
          <Link href="/o-nama" className="font-sans text-base">
            {sr.home.about}
          </Link>
        </>
      }
    />
  );
}
