"use client";

import { TeaserCard } from "@/components/home/TeaserCard";
import { UPCOMING_GAMES } from "@/lib/games";
import { sr } from "@/lib/sr";
import { useSeenOnce } from "@/lib/useSeenOnce";

/**
 * Sekcija budućih igara. `onViewed` se zove JEDNOM po prikazu, i to tek kad je
 * sekcija stvarno u vidnom polju (vidi `useSeenOnce`) — montiranje nije prikaz.
 */
export function UpcomingGames({ onViewed }: { onViewed?: (() => void) | undefined }) {
  const ref = useSeenOnce<HTMLElement>(onViewed);

  return (
    <section ref={ref} className="upcoming" aria-labelledby="upcoming-title">
      <h2 id="upcoming-title" className="upcoming__title">
        {sr.upcoming.title}
      </h2>
      <p className="upcoming__body">{sr.upcoming.body}</p>
      <ul className="upcoming__grid">
        {UPCOMING_GAMES.map((game) => (
          <li key={game.slug}>
            <TeaserCard game={game} />
          </li>
        ))}
      </ul>
    </section>
  );
}
