import type { ReactNode } from "react";

import { sr } from "@/lib/sr";

/**
 * Sadržaj pravila pokera — isti okvir i isti format kao „Pravila Žandara"
 * (`RulesModal`). Sve na našem (7.11.2026); uz akcije u zagradi i engleski naziv,
 * jer ga igrači sreću na drugim mjestima.
 */
export function PokerRulesBody({ SectionTitle }: { SectionTitle: (p: { children: ReactNode }) => ReactNode }) {
  return (
    <div className="space-y-5 font-sans text-base">
      <section>
        <SectionTitle>🎯 Cilj igre</SectionTitle>
        <p>
          Texas Hold&apos;em, bez limita uloga. Svako počinje sa 100 žetona. Partiju dobija onaj ko ostane jedini sa
          žetonima.
        </p>
        <p className="text-muted mt-2">{sr.poker.chipsNote}</p>
      </section>

      <section>
        <SectionTitle>🃏 Ruka</SectionTitle>
        <ul className="space-y-1 list-disc list-inside">
          <li>Svako dobija <strong>2 karte</strong> koje vidi samo on</li>
          <li>Na sto stižu <strong>3 karte (flop)</strong>, pa <strong>1 (turn)</strong>, pa još <strong>1 (river)</strong></li>
          <li>Najbolja kombinacija od <strong>5 karata</strong> iz tvoje 2 i 5 sa stola dobija pot</li>
          <li>Ako svi ostali odustanu, pot uzimaš bez otkrivanja karata</li>
        </ul>
      </section>

      <section>
        <SectionTitle>💬 Akcije</SectionTitle>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>Odustani</strong> (fold) — odustaješ od ruke</li>
          <li><strong>Dalje</strong> (check) — bez uloga, kad niko nije uložio</li>
          <li><strong>Prati</strong> (call) — izjednačavaš ulog</li>
          <li><strong>Uloži / Podigni</strong> (bet / raise) — ulažeš ili povećavaš; najmanje za veliki blind ili zadnje povećanje</li>
          <li><strong>Va-bank</strong> (all-in) — ulažeš sve što imaš</li>
          <li>Na potez imaš <strong>20 sekundi</strong>; poslije toga igra se Dalje, a ako ima uloga Odustani</li>
        </ul>
      </section>

      <section>
        <SectionTitle>🔘 Blindovi</SectionTitle>
        <ul className="space-y-1 list-disc list-inside">
          <li><strong>D</strong> je djelilac; prva dva lijevo od njega ulažu <strong>SB</strong> i <strong>BB</strong> prije karata</li>
          <li>Kad igraju dvojica, djelilac ulaže mali blind (SB)</li>
          <li>Blindovi rastu svakih nekoliko ruku — vidi se u zaglavlju stola</li>
        </ul>
      </section>

      <section>
        <SectionTitle>🏆 Kombinacije, od najjače</SectionTitle>
        <ol className="space-y-1 list-decimal list-inside">
          <li><strong>Rojal fleš</strong> — A K Q J 10 iste boje</li>
          <li><strong>Kenta u boji</strong> — pet zaredom iste boje</li>
          <li><strong>Poker</strong> — četiri iste</li>
          <li><strong>Ful</strong> — tri iste i par</li>
          <li><strong>Boja</strong> — pet iste boje</li>
          <li><strong>Kenta</strong> — pet zaredom (A može biti i najniži: A 2 3 4 5)</li>
          <li><strong>Triling</strong> — tri iste</li>
          <li><strong>Dva para</strong></li>
          <li><strong>Par</strong> — dvije iste</li>
          <li><strong>Visoka karta</strong> — kad nema ništa, odlučuje najjača karta</li>
        </ol>
        <p className="text-muted mt-2">Iste kombinacije dijele pot.</p>
      </section>

      <section>
        <SectionTitle>➗ Sporedni pot (side pot)</SectionTitle>
        <p>
          Kad je neko va-bank sa manje žetona, on može dobiti samo onoliko koliko je uložio od svakog. Ostatak ide u
          poseban pot za koji igraju ostali.
        </p>
      </section>
    </div>
  );
}
