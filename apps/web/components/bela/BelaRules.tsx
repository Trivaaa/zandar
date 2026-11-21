import type { ReactNode } from "react";

/**
 * Sadržaj pravila Bele (docs/bela-spec.md, „Pravila igre", P-1…P-17 i odluke
 * 9–15) — isti okvir i format kao „Pravila Rauba". Kratko, krupno, za stolom.
 */
export function BelaRulesBody({ SectionTitle }: { SectionTitle: (p: { children: ReactNode }) => ReactNode }) {
  return (
    <div className="space-y-5 font-sans text-base">
      <section>
        <SectionTitle>🎯 Cilj igre</SectionTitle>
        <p>
          Igraju četvorica, dvoje na dvoje — partner ti sjedi preko puta. Pobjeđuje tim koji prvi skupi ciljni broj bodova
          (brza igra 501, sto s prijateljima do 501, 701 ili 1001).
        </p>
      </section>

      <section>
        <SectionTitle>🃏 Karte i bodovi</SectionTitle>
        <p>32 mađarske karte u četiri boje: srce, list, žir i tikva.</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>
            <b>Adut:</b> U 20, IX 14, A 11, X 10, K 4, O 3, VIII i VII 0 — U je najjači, pa IX.
          </li>
          <li>
            <b>Ostale boje:</b> A 11, X 10, K 4, O 3, U 2, IX, VIII i VII 0 — najjači je as.
          </li>
          <li>Zadnji štih nosi još 10. U ruci je ukupno 162 boda, bez zvanja.</li>
        </ul>
      </section>

      <section>
        <SectionTitle>🂠 Dijeljenje i adut</SectionTitle>
        <p>
          Svako dobija 6 karata koje vidi i 2 zatvorene. Redom, od igrača desno od djelioca, svako zove boju za adut ili
          kaže „Dalje”. Prvi koji zove boju, zvao je adut za svoj tim. Ako svi kažu „Dalje”, djelilac mora zvati.
          Zatim svako uzima svoje 2 zatvorene karte.
        </p>
      </section>

      <section>
        <SectionTitle>📣 Zvanja</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tri karte u nizu iste boje (terca) 20, četiri (kvarta) 50, pet i više 100.</li>
          <li>Četiri U 200, četiri IX 150, četiri asa, desetke, kralja ili O po 100.</li>
          <li>
            <b>Bela</b> — kralj i O aduta kod istog igrača — 20, uvijek se boduje. Javlja se sama kad baciš drugu od te dvije
            karte.
          </li>
        </ul>
        <p className="mt-2">
          Zvanje se prijavljuje uz tvoju prvu kartu u prvom štihu (aplikacija ga sama nađe). Boduje samo tim sa jačim
          zvanjem, ali onda sva svoja. Karte zvanja se pokažu poslije prvog štiha.
        </p>
      </section>

      <section>
        <SectionTitle>🂡 Igranje</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li>Mora se odgovoriti na boju i ići jače ako se može — i kad štih nosi partner.</li>
          <li>Ko nema boju, mora baciti adut (i nadjačati adut na stolu ako može).</li>
          <li>Ko nema ni boju ni adut, baca bilo koju kartu.</li>
          <li>Karte koje ne smiješ baciti su zatamnjene, a iznad ruke piše zašto.</li>
        </ul>
      </section>

      <section>
        <SectionTitle>🧮 Bodovanje ruke</SectionTitle>
        <ul className="list-disc pl-5 space-y-1">
          <li>Tim koji je zvao adut mora imati više od pola svih bodova ruke (karte + zvanja).</li>
          <li>
            <b>Pad:</b> ako nema, protivnik dobija sve bodove ruke, i zvanja tima koji je zvao.
          </li>
          <li>
            <b>Visi:</b> kod jednakih bodova, bodovi tima koji je zvao čekaju i idu pobjedniku sljedeće ruke.
          </li>
          <li>
            <b>Štiglja:</b> tim koji odnese svih 8 štihova dobija još 90.
          </li>
        </ul>
      </section>
    </div>
  );
}
