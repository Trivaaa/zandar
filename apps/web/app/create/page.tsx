"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createRoom } from "@/lib/api";
import { saveSession } from "@/lib/session";

export default function CreatePage() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [playerCount, setPlayerCount] = useState<2 | 3 | 4>(2);
  const [targetScore, setTargetScore] = useState(21);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await createRoom({ displayName, playerCount, targetScore });
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
        <h1 className="text-2xl font-bold mb-4">Kreiraj sobu</h1>

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
          <label className="block text-sm text-zinc-400 mb-2">Broj igrača</label>
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
                {n}
              </button>
            ))}
          </div>
          {playerCount === 4 && (
            <p className="text-xs text-zinc-400 mt-2">
              2v2 partnerstvo (sjedišta 0+2 vs 1+3)
            </p>
          )}
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
          {loading ? "Kreiranje..." : "Kreiraj sobu"}
        </button>
      </form>
    </main>
  );
}