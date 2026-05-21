"use client";

import Link from "next/link";

export default function Home() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-green-900 via-green-950 to-zinc-950 text-white">
      {/* Hero */}
      <section className="px-4 py-16 sm:py-24 md:py-32 max-w-4xl mx-auto">
        <div className="text-center space-y-6 sm:space-y-8">
          <div className="text-6xl sm:text-7xl">🃏</div>
          <h1 className="text-5xl sm:text-7xl md:text-8xl font-bold tracking-tight">
            Žandar
          </h1>
          <p className="text-lg sm:text-2xl text-green-200 max-w-xl mx-auto leading-relaxed">
            Klasična kartaška sa rajom — sad i online.
          </p>
          <div className="pt-4">
            <Link
              href="/create"
              className="inline-block px-8 sm:px-12 py-4 sm:py-5 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-zinc-900 rounded-lg font-bold text-lg sm:text-xl shadow-2xl shadow-yellow-500/20 transition-all hover:scale-105"
            >
              🎴 Kreiraj sobu
            </Link>
          </div>
          <p className="text-sm text-green-400 pt-2">
            Besplatno · Bez registracije · 2–4 igrača
          </p>
        </div>
      </section>

      {/* How it works */}
      <section className="px-4 py-12 sm:py-16 max-w-2xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-center mb-8 sm:mb-10">
          Kako se igra
        </h2>
        <div className="space-y-3 sm:space-y-4">
          <div className="flex gap-4 items-start bg-zinc-900/70 rounded-lg p-4 sm:p-5 border border-zinc-800">
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 text-zinc-900 rounded-full flex items-center justify-center font-bold text-lg">
              1
            </div>
            <div>
              <h3 className="font-bold mb-1">Kreiraj sobu</h3>
              <p className="text-sm text-zinc-400">
                Izaberi broj igrača (2, 3 ili 4) i ciljni broj poena (default 21).
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start bg-zinc-900/70 rounded-lg p-4 sm:p-5 border border-zinc-800">
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 text-zinc-900 rounded-full flex items-center justify-center font-bold text-lg">
              2
            </div>
            <div>
              <h3 className="font-bold mb-1">Pošalji link prijateljima</h3>
              <p className="text-sm text-zinc-400">
                Kopiraj invite link i pošalji u WhatsApp/Viber. Odobri svakog ko se pridruži.
              </p>
            </div>
          </div>
          <div className="flex gap-4 items-start bg-zinc-900/70 rounded-lg p-4 sm:p-5 border border-zinc-800">
            <div className="shrink-0 w-10 h-10 sm:w-12 sm:h-12 bg-yellow-500 text-zinc-900 rounded-full flex items-center justify-center font-bold text-lg">
              3
            </div>
            <div>
              <h3 className="font-bold mb-1">Igrajte zajedno</h3>
              <p className="text-sm text-zinc-400">
                Pokreni partiju kad svi uđu. Prvi do ciljnog broja poena pobjeđuje.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="px-4 py-8 sm:py-12 max-w-4xl mx-auto">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
          <div className="bg-zinc-900/70 rounded-lg p-5 sm:p-6 text-center border border-zinc-800">
            <div className="text-3xl sm:text-4xl mb-2">📱</div>
            <h3 className="font-semibold text-sm sm:text-base">Bilo gdje</h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Telefon, tablet, laptop
            </p>
          </div>
          <div className="bg-zinc-900/70 rounded-lg p-5 sm:p-6 text-center border border-zinc-800">
            <div className="text-3xl sm:text-4xl mb-2">⚡</div>
            <h3 className="font-semibold text-sm sm:text-base">~30 min</h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              Trajanje partije
            </p>
          </div>
          <div className="bg-zinc-900/70 rounded-lg p-5 sm:p-6 text-center border border-zinc-800">
            <div className="text-3xl sm:text-4xl mb-2">🎉</div>
            <h3 className="font-semibold text-sm sm:text-base">Reactions</h3>
            <p className="text-xs sm:text-sm text-zinc-400 mt-1">
              8 emoji za zafrkavanje
            </p>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="px-4 py-12 sm:py-16 max-w-md mx-auto text-center">
        <Link
          href="/create"
          className="inline-block w-full px-8 py-4 bg-yellow-500 hover:bg-yellow-400 active:bg-yellow-600 text-zinc-900 rounded-lg font-bold text-lg shadow-lg transition-colors"
        >
          Hajde da igramo →
        </Link>
      </section>

      {/* Footer */}
      <footer className="px-4 py-8 text-center text-zinc-500 text-xs sm:text-sm border-t border-zinc-900">
        <p>Žandar MVP · v1.0</p>
      </footer>
    </main>
  );
}
