"use client";

import { PlayingCard } from "@/components/felt/PlayingCard";
import { ArrowRightIcon, FriendsIcon } from "@/components/icons";
import type { GameBadge, GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

export type GameListItem = { game: GameConfig; badge: GameBadge };

const badgeText: Record<Exclude<GameBadge, null>, string> = {
  pinned: sr.home.pinned,
  last: sr.home.lastPlayed,
  new: sr.home.isNew,
};

type Handlers = {
  /** Igra za koju se upravo traži sto (dugme pokazuje „Tražim sto..."). */
  loadingSlug: string | null;
  /** Greška zadnjeg traženja — stoji na kartici igre koja je tražena. */
  error?: string | undefined;
  onPlay: (game: GameConfig) => void;
  onCreate: (game: GameConfig) => void;
};

/**
 * Početna sa više živih igara: prva igra (zakačena → zadnje igrana → Žandar,
 * redoslijed daje host) je velika kartica sa lepezom, ostale su kompaktni
 * redovi. Obje radnje su uvijek vidljive; u redu je „Napravi sto" samo ikona,
 * ime radnje nosi `aria-label`. Samo prikaz.
 */
export function GameList({ items, ...handlers }: { items: readonly GameListItem[] } & Handlers) {
  const [hero, ...rest] = items;
  if (!hero) return null;
  return (
    <ul className="home-list">
      <li className="home-list__item" style={{ "--i": 0 } as React.CSSProperties}>
        <HeroCard item={hero} {...handlers} />
      </li>
      {rest.map((item, i) => (
        <li key={item.game.slug} className="home-list__item" style={{ "--i": i + 1 } as React.CSSProperties}>
          <GameRow item={item} {...handlers} />
        </li>
      ))}
    </ul>
  );
}

function cardState(game: GameConfig, { loadingSlug, error }: Handlers) {
  const busy = loadingSlug !== null && !error;
  const mine = loadingSlug === game.slug;
  return { busy, loading: mine && busy, failed: mine && Boolean(error) };
}

/** Tri prave karte u lepezi; geometriju daje CSS klase (`<klasa>-slot`). */
function Fan({ game, className }: { game: GameConfig; className: string }) {
  return (
    <span className={className} aria-hidden="true">
      {game.listCards.map((face, i) => (
        <span
          key={`${face.rank}${face.suit}`}
          className={`${className}-slot`}
          style={{ "--i": i } as React.CSSProperties}
        >
          <PlayingCard card={{ id: `list-${game.slug}-${face.rank}-${face.suit}`, ...face }} size="sm" deck={game.deck} />
        </span>
      ))}
    </span>
  );
}

function Tag({ badge }: { badge: GameBadge }) {
  return badge ? (
    <span className="home-list__tag" data-badge={badge}>
      {badgeText[badge]}
    </span>
  ) : null;
}

function HeroCard({ item: { game, badge }, ...h }: { item: GameListItem } & Handlers) {
  const name = sr.games[game.slug].name;
  const { busy, loading, failed } = cardState(game, h);
  return (
    <article className="home-hero" data-tint={game.tint}>
      <div className="home-hero__art">
        <div className="home-hero__text">
          <Tag badge={badge} />
          <h2 className="home-hero__name">{name}</h2>
          <p className="home-hero__sub" data-error={failed} role="status">
            {failed ? h.error : sr.home.listSub[game.slug]}
          </p>
        </div>
        <Fan game={game} className="home-hero__fan" />
      </div>
      <div className="home-hero__actions">
        <button
          type="button"
          className="home-hero__play"
          onClick={() => h.onPlay(game)}
          disabled={busy}
          aria-busy={loading}
          aria-label={sr.home.playGame(name)}
        >
          <span>{loading ? sr.home.playLoading : sr.home.play}</span>
          {loading ? null : <ArrowRightIcon className="home-list__icon" />}
        </button>
        <button
          type="button"
          className="home-hero__create"
          onClick={() => h.onCreate(game)}
          aria-label={sr.home.createGame(name)}
        >
          <FriendsIcon className="home-list__icon" />
          <span>{sr.home.create}</span>
        </button>
      </div>
    </article>
  );
}

function GameRow({ item: { game, badge }, ...h }: { item: GameListItem } & Handlers) {
  const name = sr.games[game.slug].name;
  const { busy, loading, failed } = cardState(game, h);
  return (
    <article className="home-row" data-tint={game.tint}>
      <div className="home-row__art">
        <Fan game={game} className="home-row__fan" />
      </div>
      <div className="home-row__text">
        <div className="home-row__title">
          <h2 className="home-row__name">{name}</h2>
          <Tag badge={badge} />
        </div>
        <p className="home-row__sub" data-error={failed} role="status">
          {loading ? sr.home.playLoading : failed ? h.error : sr.home.listSub[game.slug]}
        </p>
      </div>
      <div className="home-row__actions">
        <button
          type="button"
          className="home-row__create"
          onClick={() => h.onCreate(game)}
          aria-label={sr.home.createGame(name)}
        >
          <FriendsIcon className="home-list__icon" />
        </button>
        <button
          type="button"
          className="home-row__play"
          onClick={() => h.onPlay(game)}
          disabled={busy}
          aria-busy={loading}
          aria-label={sr.home.playGame(name)}
        >
          <ArrowRightIcon className="home-list__icon" />
        </button>
      </div>
    </article>
  );
}
