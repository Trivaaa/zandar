"use client";

type Props = {
  isOpen: boolean;
  onClose: () => void;
};

export function RulesModal({ isOpen, onClose }: Props) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50 p-3 sm:p-4">
      <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto border border-zinc-800">
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-xl sm:text-2xl font-bold">📖 Pravila Žandara</h2>
          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white text-3xl leading-none px-2"
            type="button"
            aria-label="Zatvori"
          >
            ×
          </button>
        </div>

        <div className="space-y-4 sm:space-y-5">
          <section>
            <h3 className="font-bold text-yellow-400 mb-2">🎯 Cilj igre</h3>
            <p className="text-sm text-zinc-300">
              Prvi igrač (ili tim u 4-player partnerstvu) koji dostigne ciljni
              broj poena (default 21) pobjeđuje.
            </p>
          </section>

          <section>
            <h3 className="font-bold text-yellow-400 mb-2">🎴 Vrijednosti karata</h3>
            <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
              <li><strong>A</strong> = 1</li>
              <li><strong>2-10</strong> = nominalna vrijednost</li>
              <li><strong>Q i K</strong> kupe samo isti rang</li>
              <li><strong>J</strong> je žandar — kupi sve karte sa stola</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-yellow-400 mb-2">✋ Kako se kupi</h3>
            <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
              <li><strong>Isti rang:</strong> 7 kupi 7</li>
              <li><strong>Zbir:</strong> 10 kupi 7+3 ili 6+4</li>
              <li><strong>Žandar:</strong> J kupi sve sa stola</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-yellow-400 mb-2">⚠️ Bitna pravila</h3>
            <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
              <li>Ako možeš kupiti, <strong>MORAŠ kupiti</strong></li>
              <li>Samo <strong>jedna kombinacija</strong> po potezu</li>
              <li>Ako imaš više opcija, biraš jednu</li>
              <li>Ako ne možeš kupiti, karta ostaje na stolu</li>
            </ul>
          </section>

          <section>
            <h3 className="font-bold text-yellow-400 mb-2">🏆 Bodovi (ukupno 5 po ruci)</h3>
            <ul className="text-sm text-zinc-300 space-y-1 list-disc list-inside">
              <li><strong>Najviše karata:</strong> 2 poena</li>
              <li><strong>Najviše trefova:</strong> 1 poen</li>
              <li><strong>2 tref:</strong> 1 poen</li>
              <li><strong>10 karo:</strong> 1 poen</li>
            </ul>
            <p className="text-xs text-zinc-500 italic mt-2">
              Neriješeno = niko ne dobija taj bod
            </p>
          </section>

          <section>
            <h3 className="font-bold text-yellow-400 mb-2">🏁 Kraj ruke</h3>
            <p className="text-sm text-zinc-300">
              Kad se isprazne ruke i špil, posljednji igrač koji je kupio
              dobija preostale karte sa stola. Računaju se bodovi i dijeli se
              nova ruka.
            </p>
          </section>
        </div>

        <button
          onClick={onClose}
          className="w-full mt-6 px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 active:bg-yellow-600"
          type="button"
        >
          Jasno mi je!
        </button>
      </div>
    </div>
  );
}
