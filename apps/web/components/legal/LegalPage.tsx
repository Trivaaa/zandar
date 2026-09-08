import Link from "next/link";

/**
 * Zajednička ljuska za pravne stranice (privatnost, uslovi).
 *
 * Server komponenta — sadržaj je statičan, pa stranice mogu da izvezu
 * `metadata` i da se prerenderuju i u web i u mobilnom (`output: export`) buildu.
 *
 * Proza ide na `text-base` (16px) i kroz tokene, isto kao `RulesModal`: publika
 * su ljudi 40–65, a ovo je uz pravila najduži tekst u proizvodu.
 */
export function LegalPage({
  title,
  updated,
  children,
}: {
  title: string;
  /** Datum posljednje izmjene — pravne stranice ga moraju nositi. */
  updated: string;
  children: React.ReactNode;
}) {
  return (
    <main className="min-h-screen bg-felt text-white px-4 py-6 pt-safe-top pb-safe-bottom">
      <div className="mx-auto max-w-2xl">
        <Link
          href="/"
          className="font-sans text-base text-muted underline active:text-white"
        >
          ← Nazad na početnu
        </Link>

        <h1 className="font-sans text-2xl font-bold mt-4 mb-1">{title}</h1>
        <p className="font-sans text-base text-muted mb-6">
          Posljednja izmjena: {updated}
        </p>

        <div className="space-y-6 font-sans text-base">{children}</div>
      </div>
    </main>
  );
}

/** Naslov sekcije — mesing, isto kao u `RulesModal`. */
export function LegalSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-sans font-bold text-lg text-accent mb-2">{title}</h2>
      <div className="space-y-2">{children}</div>
    </section>
  );
}
