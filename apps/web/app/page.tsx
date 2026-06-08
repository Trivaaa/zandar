"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { quickPlay } from "@/lib/api";
import { saveSession } from "@/lib/session";

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
      // Step 3: promijeni u /matching/${res.roomId}
      router.push(`/room/${res.roomId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
      setLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (nameInput.trim()) handlePlay(nameInput.trim());
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-green-900 via-green-950 to-zinc-950 text-white flex flex-col">
      {/* Hero — dominantni CTA */}
      <section className="flex-1 flex flex-col items-center justify-center px-4 py-16 sm:py-24">
        <div className="text-center space-y-5 max-w-md w-full">
          <div className="text-6xl sm:text-7xl">🃏</div>

          <h1 className="text-5xl sm:text-7xl font-bold tracking-tight">
            Žandar
          </h1>

          <p className="text-base sm:text-xl text-green-200">
            Klasična kartaška — sad i online. Odmah.
          </p>

          {/* Primarna akcija */}
          <div className="pt-4 space-y-3">
            {savedName ? (
              /* Povratni korisnik — jedan tap */
              <div className="space-y-3">
                <p className="text-sm text-zinc-400">
                  Igraš kao{" "}
                  <strong className="text-white">{savedName}</strong>
                  {" · "}
                  <button
                    type="button"
                    onClick={() => {
                      setSavedName(null);
                      localStorage.removeItem(NAME_KEY);
                    }}
                    className="underline hover:text-white transition-colors"
                  >
                    Promijeni
                  </button>
                </p>
                <button
                  type="button"
                  onClick={() => handlePlay(savedName)}
                  disabled={loading}
                  className="w-full px-8 py-5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-60 text-zinc-900 rounded-xl font-bold text-xl shadow-2xl shadow-yellow-500/25 transition-all hover:scale-[1.02] disabled:scale-100"
                >
                  {loading ? "Tražim sto..." : "Igra – nađi sto"}
                </button>
              </div>
            ) : (
              /* Novi korisnik — unos imena */
              <form onSubmit={handleSubmit} className="space-y-3">
                <input
                  type="text"
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  placeholder="Tvoje ime"
                  maxLength={30}
                  required
                  autoFocus
                  className="w-full px-4 py-3 bg-zinc-800/80 border border-zinc-700 focus:border-yellow-500 rounded-xl text-white text-lg outline-none text-center placeholder:text-zinc-500 transition-colors"
                />
                <button
                  type="submit"
                  disabled={loading || !nameInput.trim()}
                  className="w-full px-8 py-5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-60 text-zinc-900 rounded-xl font-bold text-xl shadow-2xl shadow-yellow-500/25 transition-all hover:scale-[1.02] disabled:scale-100"
                >
                  {loading ? "Tražim sto..." : "Igra – nađi sto"}
                </button>
              </form>
            )}

            {error && (
              <p className="text-red-400 text-sm">{error}</p>
            )}

            {/* Sekundarni CTA */}
            <div className="pt-3 border-t border-zinc-800">
              <Link
                href="/create"
                className="inline-block px-5 py-2.5 text-zinc-300 hover:text-white text-sm border border-zinc-700 hover:border-zinc-500 rounded-lg transition-colors"
              >
                Kreiraj privatnu sobu →
              </Link>
              <p className="text-xs text-zinc-600 mt-1.5">
                Privatni sto samo za tebe i prijatelje.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Sekundarna info sekcija */}
      <section className="px-4 pb-12 max-w-lg mx-auto w-full">
        <div className="grid grid-cols-3 gap-3 text-center">
          {[
            { icon: "⚡", label: "Odmah", sub: "Bez čekanja" },
            { icon: "📱", label: "Bilo gdje", sub: "Telefon, laptop" },
            { icon: "🆓", label: "Besplatno", sub: "Bez registracije" },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-zinc-900/60 rounded-lg p-3 border border-zinc-800/60"
            >
              <div className="text-2xl mb-1">{f.icon}</div>
              <p className="text-xs font-semibold">{f.label}</p>
              <p className="text-xs text-zinc-500">{f.sub}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="px-4 py-6 text-center text-zinc-600 text-xs border-t border-zinc-900">
        Žandar · Besplatno · Bez registracije
      </footer>
    </main>
  );
}
