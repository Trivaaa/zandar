"use client";

import { useRaubDeck, type RaubDeck } from "@/lib/settings";
import { sr } from "@/lib/sr";

/** Lepeza od tri karte na pločici (iste kao na tabli M7). */
const FANS: Record<RaubDeck, readonly string[]> = {
  hungarian: ["/cards/hu/hearts_ace.webp", "/cards/hu/leaves_king.webp", "/cards/hu/acorns_ober.webp"],
  french: ["/cards/AS.webp", "/cards/KD.webp", "/cards/QH.webp"],
};

const OPTIONS: ReadonlyArray<{ deck: RaubDeck; label: string }> = [
  { deck: "hungarian", label: sr.menu.deckHungarian },
  { deck: "french", label: sr.menu.deckFrench },
];

/**
 * Raub, izbor karata u meniju (tabla „Gdje je dugme za meni", M7): Mađarice
 * ili Klasik. Samo izgled i samo kod ovog igrača; pamti se na uređaju
 * (`zandar:raub:deck`) i važi i za sljedeće partije Rauba.
 */
export function RaubDeckPicker() {
  const [deck, setDeck] = useRaubDeck();
  return (
    <div className="gamemenu__deck" role="group" aria-labelledby="gamemenu-deck-label">
      <span id="gamemenu-deck-label" className="gamemenu__label">
        {sr.menu.deck}
      </span>
      <div className="gamemenu__deck-opts">
        {OPTIONS.map((o) => (
          <button
            key={o.deck}
            type="button"
            aria-pressed={deck === o.deck}
            data-on={deck === o.deck}
            className="gamemenu__deck-opt"
            onClick={() => setDeck(o.deck)}
          >
            <span className="gamemenu__fan" aria-hidden="true">
              {FANS[o.deck].map((src) => (
                // eslint-disable-next-line @next/next/no-img-element -- mala statična sličica, i u APK exportu
                <img key={src} src={src} alt="" draggable={false} />
              ))}
            </span>
            <span>{o.label}</span>
          </button>
        ))}
      </div>
      <p className="gamemenu__note">{sr.menu.deckNote}</p>
    </div>
  );
}
