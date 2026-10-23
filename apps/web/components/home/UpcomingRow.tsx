"use client";

import { BellIcon } from "@/components/icons";
import type { GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";
import { useSeenOnce } from "@/lib/useSeenOnce";

/**
 * „Uskoro" (SPEC_POCETNA §7): jedan red za sve najavljene igre + Javi mi.
 * Zamijenio je pločice budućih igara. `onViewed` se zove JEDNOM, tek kad je
 * red stvarno u vidnom polju (`useSeenOnce`) — isti događaj kao ranije.
 */
export function UpcomingRow({
  games,
  onNotify,
  onViewed,
}: {
  games: readonly GameConfig[];
  onNotify: () => void;
  onViewed?: (() => void) | undefined;
}) {
  const ref = useSeenOnce<HTMLElement>(onViewed);
  const names = games.map((g) => sr.games[g.slug].name);
  return (
    <section ref={ref} className="soon" aria-labelledby="soon-title">
      <div className="soon__text">
        <h2 id="soon-title" className="soon__title">
          {sr.home.soon(names)}
        </h2>
        <p className="soon__sub">{sr.home.soonSub}</p>
      </div>
      <button type="button" className="soon__notify" onClick={onNotify} aria-haspopup="dialog">
        <BellIcon className="soon__icon" />
        <span>{sr.home.notifyMe}</span>
      </button>
    </section>
  );
}
