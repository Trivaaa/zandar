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
            <b>Štih:</b> kad je na talonu sedmica, djelilac smije reći „Štih”: nosi tu boju i mora 1 štih. Sedmica ostaje na stolu dok ne zamijeni karte i odbaci jednu iz ruke; tek tada je uzima.
            Nije obavezno — ako kaže „Dalje”, okreće se nova karta.
          </li>
          <li>
            <b>Raub:</b> smije samo djelilac, samo na prvoj okrenutoj karti, i to kad je A, K, O ili U. Nosi tu boju i
            mora 2 štiha; karta ostaje na stolu dok ne zamijeni karte i odbaci jednu iz ruke; tek tada je uzima. Nije obavezno, a sedmica mu ne treba. Na tu kartu djelilac bira samo
            „Raub” ili „Dalje”. Na drugoj i trećoj karti ni djelilac nema Raub — samo „Moja” ili „Dalje”.
          </li>
          <li>
            <b>Moja:</b> licitira se redom, od djelioca, i svako smije reći „Moja” ili „Dalje”, na svaku kartu (osim djelioca kad smije Raub). Ko kaže
            „Moja”, nosi boju talona i mora 2 štiha. Ako ima sedmicu te boje, daje je i uzima talon kartu; ako je
            nema, karta ostaje na stolu.
          </li>
          <li>
            Ako svi kažu „Dalje”, okreće se nova karta (najviše 3). Ako niko ne uzme ni treću, to je <b>refa</b>: ruka
            se poništava, a sljedeća se boduje duplo.
          </li>
        </ul>
        <p className="text-muted mt-2">
          Kod štiha i rauba nosilac prvo zamijeni karte i odbaci jednu iz ruke, a tek onda uzima kartu sa stola. Kod
          „Moja” broj karata ostaje 4.
        </p>
      </section>

      <section>
        <SectionTitle>🙋 Idem / Ne idem</SectionTitle>
        <p>
          Kad je adut poznat, svako osim nosioca bira da li igra ruku. Ko kaže „Ne idem”, odlaže karte i ne boduje se.
          Pita se redom od nosioca; ako su svi prije tebe rekli „Ne idem”, ti moraš ići — nosilac nikad ne igra sam.
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
          <li>Moraš odgovoriti na boju i nadjačati kartu na stolu ako možeš. Ako nemaš boju, moraš baciti adut, i to jači ako ga imaš. Ako nemaš ni adut, baci bilo šta.</li>
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
