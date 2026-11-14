import type { ReactNode } from "react";

/**
 * Sadržaj pravila Rauba (docs/raub-spec.md, „Pravila igre”) — isti okvir i
 * format kao „Pravila Žandara” (`RulesModal`). Kratko, krupno, za stolom.
 */
export function RaubRulesBody({ SectionTitle }: { SectionTitle: (p: { children: ReactNode }) => ReactNode }) {
  return (
    <div className="space-y-5 font-sans text-base">
      <section>
        <SectionTitle>🎯 Cilj igre</SectionTitle>
        <p>
          Svi počinju od 21 boda i odbrojavaju prema nuli. Svaki uzet štih skida 1 bod, a neuspjeh dodaje kaznu. Ko prvi
          stigne do 0 ili ispod, pobjeđuje. Svako igra za sebe.
        </p>
      </section>

      <section>
        <SectionTitle>🃏 Karte</SectionTitle>
        <p>32 mađarske karte u četiri boje: srce, list, žir i tikva. Jačina: A, K, O (iber), U (dečko), 10, 9, 8, 7 — ista za adut i za ostale boje.</p>
        <p className="mt-2">Svako dobija 4 karte, a jedna se okreće na sredinu stola (talon).</p>
      </section>

      <section>
        <SectionTitle>👑 Ko nosi adut</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li>
            <b>Štih:</b> kad je na talonu sedmica, djelilac smije reći „Štih”: uzima je, nosi tu boju i mora 1 štih.
            Nije obavezno — ako kaže „Dalje”, okreće se nova karta.
          </li>
          <li>
            <b>Raub:</b> smije samo djelilac, i to kad je na talonu A, K, O ili U. Uzima kartu s talona, nosi tu boju
            i mora 2 štiha. Nije obavezno, a sedmica mu ne treba.
          </li>
          <li>
            <b>Moja:</b> licitira se redom, od djelioca, i svako smije reći „Moja” ili „Dalje”, na svaku kartu. Ko kaže
            „Moja”, nosi boju talona i mora 2 štiha. Ako ima sedmicu te boje, daje je i uzima talon kartu; ako je
            nema, karta ostaje na stolu.
          </li>
          <li>
            Ako svi kažu „Dalje”, okreće se nova karta (najviše 3). Ako niko ne uzme ni treću, to je <b>refa</b>: ruka
            se poništava, a sljedeća se boduje duplo.
          </li>
        </ul>
        <p className="text-muted mt-2">
          Kod štiha i rauba igrač ima 5 karata i odmah odbacuje jednu (ne kartu uzetu s talona). Kod „Moja” broj karata
          ostaje 4.
        </p>
      </section>

      <section>
        <SectionTitle>🙋 Idem / Ne idem</SectionTitle>
        <p>
          Kad je adut poznat, svako osim nosioca bira da li igra ruku. Ko kaže „Ne idem”, odlaže karte i ne boduje se.
          Ako niko ne ide, nosilac upisuje sva 4 štiha.
        </p>
      </section>

      <section>
        <SectionTitle>🔁 Zamjena</SectionTitle>
        <p>
          Od nosioca, redom, svako ko igra može zamijeniti do 4 karte iz špila. Prvi ko zamijeni sve 4 dobija 5 karata
          (treća je otvorena za sve) i odbacuje jednu. Kad se špil isprazni, zamjene više nema.
        </p>
      </section>

      <section>
        <SectionTitle>⚔️ Štihovi</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li>Prvi štih otvara nosilac. Sljedeći otvara ko je uzeo prethodni.</li>
          <li>Moraš odgovoriti na boju. Ako je nemaš, moraš baciti adut. Ako nemaš ni adut, baci bilo šta.</li>
          <li>Štih nosi najjači adut, a bez aduta najjača karta tražene boje.</li>
          <li>Karte koje ne smiješ baciti su zatamnjene.</li>
        </ul>
      </section>

      <section>
        <SectionTitle>🧮 Bodovi</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li>Svaki štih: −1.</li>
          <li>Bez ijednog štiha: +2.</li>
          <li>Štih (mora 1) bez štiha: +3.</li>
          <li>Nosilac koji mora 2: jedan štih +3, nijedan +4.</li>
          <li>„Ne idem”: 0.</li>
          <li>Poslije refe sljedeća odigrana ruka ide duplo. Svaka refa duplira po jednu ruku.</li>
        </ul>
      </section>
    </div>
  );
}
