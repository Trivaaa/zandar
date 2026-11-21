"use client";

import { BetaTag } from "@/components/home/BetaTag";
import { PlayingCard } from "@/components/felt/PlayingCard";
import { ArrowRightIcon } from "@/components/icons";
import type { GameBadge, GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

const badgeText: Record<Exclude<GameBadge, null>, string> = {
  pinned: sr.home.pinned,
  last: sr.home.lastPlayed,
  new: sr.home.isNew,
};

/** Mala lepeza od tri karte igre — kartica (W1/W2) i red u listu W4. */
export function GameFan({ game, className }: { game: GameConfig; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      {game.listCards.map((face, i) => (
        <span key={`${face.rank}${face.suit}`} className="web-fan__slot" style={{ "--i": i } as React.CSSProperties}>
          <PlayingCard card={{ id: `web-${game.slug}-${face.rank}-${face.suit}`, ...face }} size="sm" deck={game.deck} />
        </span>
      ))}
    </span>
  );
}

/**
 * Kartica igre na web početnoj (W1, W1b, W2): slika u boji igre, naziv sa
 * oznakom u istom redu, podnaslov i jedno žuto „Igraj". Cijela kartica je JEDNO
 * dugme — dodir na sliku radi isto što i „Igraj" (spec). Samo prikaz.
 */
export function WebGameCard({
  game,
  badge,
  loading,
  disabled,
  error,
  onPlay,
}: {
  game: GameConfig;
  badge: GameBadge;
  /** Upravo se traži sto za ovu igru. */
  loading: boolean;
  disabled: boolean;
  /** Greška traženja za ovu igru — stoji umjesto podnaslova. */
  error?: string | undefined;
  onPlay: () => void;
}) {
  const name = sr.games[game.slug].name;
  return (
    <li className="web-card" data-tint={game.tint}>
      <button
        type="button"
        className="web-card__hit"
        onClick={onPlay}
        disabled={disabled}
        aria-busy={loading}
        aria-label={sr.home.playGame(name)}
      >
        <span className="web-card__art">
          <GameFan game={game} className="web-card__fan" />
          <span className="web-card__text">
            <span className="web-card__name">
              {name}
              <BetaTag game={game} />
              {badge ? (
                <span className="web-card__tag" data-badge={badge}>
                  {badgeText[badge]}
                </span>
              ) : null}
            </span>
            <span className="web-card__sub" data-error={Boolean(error)} role="status">
              {error ?? sr.homeWeb.sub[game.slug]}
            </span>
          </span>
        </span>
        <span className="web-card__play">
          {loading ? sr.home.playLoading : sr.home.play}
          {loading ? null : <ArrowRightIcon className="web-card__arrow" />}
        </span>
      </button>
    </li>
  );
}
