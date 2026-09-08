"use client";

/**
 * RulesModal — puna pravila Žandara.
 *
 * Jedini ekran koji je do sad ostao na sirovoj `zinc` paleti i na 14px prozi.
 * Publika su ljudi 40–65 sa naočarima na dohvat ruke, a ovo je najduži tekst
 * u proizvodu — pa ide na `text-base` (16px) i kroz tokene kao i sve ostalo.
 *
 * Touch feedback ide preko `active:`, ne `hover:` (hover se lijepi na touchu).
 */

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

/** Naslov sekcije — mesing, konzistentan kroz cijeli modal. */
function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-sans font-bold text-lg text-accent mb-2">{children}</h3>
  );
}

export function RulesModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4"
      role="dialog"
      aria-modal="true"
      aria-label="Pravila Žandara"
    >
      <div className="bg-surface-raised rounded-token-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-accent/20 pt-safe-top pb-safe-bottom">
        <div className="flex justify-between items-center gap-2 mb-4">
          <h2 className="font-sans text-2xl font-bold">📖 Pravila Žandara</h2>
          <button
            onClick={onClose}
            className="shrink-0 w-12 h-12 flex items-center justify-center rounded-token-md text-3xl leading-none text-muted active:bg-surface active:text-white"
            type="button"
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <div className="space-y-5 font-sans text-base">
          <section>
            <SectionTitle>🎯 Cilj igre</SectionTitle>
            <p>
              Prvi igrač (ili tim u 4-player partnerstvu) koji dostigne ciljni
              broj poena (default 21) pobjeđuje.
            </p>
          </section>

          <section>
            <SectionTitle>🎴 Vrijednosti karata</SectionTitle>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>A</strong> = 1</li>
              <li><strong>2-10</strong> = nominalna vrijednost</li>
              <li><strong>Q i K</strong> kupe samo isti rang</li>
              <li><strong>J</strong> je žandar — kupi sve karte sa stola</li>
            </ul>
          </section>

          <section>
            <SectionTitle>✋ Kako se kupi</SectionTitle>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Isti rang:</strong> 7 kupi 7</li>
              <li><strong>Zbir:</strong> 10 kupi 7+3 ili 6+4</li>
              <li><strong>Žandar:</strong> J kupi sve sa stola</li>
            </ul>
          </section>

          <section>
            <SectionTitle>⚠️ Bitna pravila</SectionTitle>
            <ul className="space-y-1 list-disc list-inside">
              <li>Ako možeš kupiti, <strong>MORAŠ kupiti</strong></li>
              <li>Samo <strong>jedna kombinacija</strong> po potezu</li>
              <li>Ako imaš više opcija, biraš jednu</li>
              <li>Ako ne možeš kupiti, karta ostaje na stolu</li>
            </ul>
          </section>

          <section>
            <SectionTitle>🏆 Bodovi (ukupno 5 po ruci)</SectionTitle>
            <ul className="space-y-1 list-disc list-inside">
              <li><strong>Najviše karata:</strong> 2 poena</li>
              <li><strong>Najviše trefova:</strong> 1 poen</li>
              <li><strong>2 tref:</strong> 1 poen</li>
              <li><strong>10 karo:</strong> 1 poen</li>
            </ul>
            <p className="text-muted italic mt-2">
              Neriješeno = niko ne dobija taj bod
            </p>
          </section>

          <section>
            <SectionTitle>🏁 Kraj ruke</SectionTitle>
            <p>
              Kad se isprazne ruke i špil, posljednji igrač koji je kupio
              dobija preostale karte sa stola. Računaju se bodovi i dijeli se
              nova ruka.
            </p>
          </section>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 min-h-12 px-4 py-3 bg-accent text-accent-contrast rounded-token-md font-sans font-bold text-base active:opacity-80"
          type="button"
        >
          Jasno mi je!
        </button>
      </div>
    </div>
  );
}
