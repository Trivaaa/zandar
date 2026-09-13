import Link from "next/link";

import { BellIcon, SuitIcon } from "@/components/icons";
import { upcomingGamePath, type UpcomingGame } from "@/lib/games";
import { sr } from "@/lib/sr";

/**
 * Jedna igra „U planu?". Cijela kartica je JEDAN link ka prijavi — bez dugmeta
 * unutra, bez play ikone i katanca: igra se ne pokreće, prijavljuje se interes.
 *
 * `aria-label` sadrži vidljivo ime („Obavještenje za Poker" sadrži „Poker"),
 * pa glasovna kontrola koja izgovori vidljivi naziv i dalje pogađa link.
 */
export function TeaserCard({ game }: { game: UpcomingGame }) {
  const copy = sr.games[game.slug];
  return (
    <Link
      href={upcomingGamePath(game.slug)}
      className="teaser-card"
      aria-label={sr.upcoming.cardLabel(copy.name)}
    >
      <span className="teaser-card__motif" aria-hidden="true">
        <span className="card-back" />
        <SuitIcon suit={game.suit} className="teaser-card__suit" />
      </span>
      <span className="teaser-card__text" aria-hidden="true">
        <span className="teaser-card__name">{copy.name}</span>
        <span className="teaser-card__tag">{sr.upcoming.tag}</span>
      </span>
      <BellIcon className="teaser-card__bell" />
    </Link>
  );
}
