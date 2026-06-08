"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { singlePlayer } from "@/lib/api";
import { saveSession } from "@/lib/session";

const TIER_LABELS: Record<1 | 2 | 3, { label: string; desc: string }> = {
  1: { label: "Početnik", desc: "Greške, sporije odluke — dobro za učenje" },
  2: { label: "Igrač", desc: "Pristojna igra, prati vrijedne karte" },
  3: { label: "Majstor", desc: "Optimalne odluke, teška konkurencija" },
};

export default function PracticePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [targetScore, setTargetScore] = useState(21);
  const [tier, setTier] = useState<1 | 2 | 3>(2);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await singlePlayer({ displayName, playerCount, targetScore, tier });
      saveSession({
        roomId: res.roomId,
        playerId: res.playerId,
        sessionToken: res.playerSessionToken,
      });
      router.push(`/room/${res.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nepoznata greška");
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-green-900 text-white p-8 flex items-center justify-center">
      <form
        onSubmit={handleSubmit}
        className="max-w-md w-full bg-zinc-900 rounded-lg p-6 space-y-4"
      >
        <div className="text-center mb-2">
          <div className="text-4xl mb-2">🤖</div>
          <h1 className="text-2xl font-bold">Vježbaj</h1>
          <p className="text-sm text-zinc-400 mt-1">
            Igraj protiv računara — naučite pravila bez pritiska.
          </p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-1">Tvoje ime</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            required
            maxLength={30}
            className="w-full px-3 py-2 bg-zinc-800 rounded border border-zinc-700 focus:border-yellow-500 outline-none"
            placeholder="npr. Igor"
          />
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Težina protivnika</label>
          <div className="flex gap-2">
            {([1, 2, 3] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTier(t)}
                className={`flex-1 py-2 rounded border transition-colors text-sm ${
                  tier === t
                    ? "bg-yellow-500 text-zinc-900 border-yellow-500 font-bold"
                    : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                }`}
              >
                {TIER_LABELS[t].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-zinc-500 mt-2">{TIER_LABELS[tier].desc}</p>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">Broj protivnika</label>
          <div className="flex gap-2">
            {([2, 3, 4] as const).map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setPlayerCount(n)}
                className={`flex-1 py-2 rounded border transition-colors ${
                  playerCount === n
                    ? "bg-yellow-500 text-zinc-900 border-yellow-500 font-bold"
                    : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                }`}
              >
                {n === 2 ? "1 protivnik" : n === 3 ? "2 protivnika" : "3 protivnika"}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="block text-sm text-zinc-400 mb-2">
            Ciljni broj poena
          </label>
          <div className="flex gap-2">
            {[11, 21, 51, 101].map((n) => (
              <button
                key={n}
                type="button"
                onClick={() => setTargetScore(n)}
                className={`flex-1 py-2 rounded border transition-colors ${
                  targetScore === n
                    ? "bg-yellow-500 text-zinc-900 border-yellow-500 font-bold"
                    : "bg-zinc-800 border-zinc-700 hover:border-zinc-600"
                }`}
              >
                {n}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-800 rounded text-sm">⚠️ {error}</div>
        )}

        <button
          type="submit"
          disabled={loading || !displayName.trim()}
          className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? "Pripremam igru..." : "Počni vježbati →"}
        </button>
      </form>
    </main>
  );
}
