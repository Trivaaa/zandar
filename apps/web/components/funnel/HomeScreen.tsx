"use client";

import type { ReactNode } from "react";

import { BrandLockup } from "@/components/brand/BrandLockup";
import { GameCard } from "@/components/home/GameCard";
import { GameTile, UpcomingTile } from "@/components/home/GameTile";
import { isNewGame, type GameConfig, type HomeHistory, type HomeLayout } from "@/lib/games";
import { isStaging } from "@/lib/platform";
import { sr } from "@/lib/sr";
import { useSeenOnce } from "@/lib/useSeenOnce";

export type HomeScreenProps = {
  layout: HomeLayout;
  history: HomeHistory;
  /** „Sada" za oznaku NOVO — host ga daje, da prikaz ostane čist (i preview stabilan). */
  now: number;
  loading: boolean;
  error?: string | undefined;
  /** Brza igra sa zapamćenim izborom (Postavke → Brza igra). */
  onPlay: () => void;
  /** Napravi sto i pozovi prijatelje (`/create`). */
  onCreate: () => void;
  onOpenGame: (game: GameConfig) => void;
  onNotify: () => void;
  /** Prikaz reda „Uskoro" (analitika). Zove se jednom po prikazu. */
  onUpcomingViewed?: (() => void) | undefined;
  /** Privatnost / uslovi / o nama — samo web (Google OAuth traži link sa
   * početne); na Androidu ih host izostavlja, tamo su u Postavkama. */
  legalSlot?: ReactNode;
  className?: string | undefined;
};

/**
 * Početna v3 · K1 (SPEC_POCETNA_V3): marka, glavna igra kao sto,
 * pa pločice — „Još igara" (žive) i „Uskoro" (najavljene). Raspored zavisi
 * SAMO od `layout` (konfiguracija igara + lokalna istorija). Prezentacija:
 * bez skladišta i bez rutiranja.
 */
export function HomeScreen({
  layout,
  history,
  now,
  loading,
  error,
  onPlay,
  onCreate,
  onOpenGame,
  onNotify,
  onUpcomingViewed,
  legalSlot,
  className = "",
}: HomeScreenProps) {
  // Sto je niži samo kad ima „Još igara" (A3); pločice „Uskoro" su niže i
  // staju ispod punog stola (A1).
  const compact = layout.more.length > 0;
  return (
    <main className={`screen home ${className}`}>
      <header className="home__top">
        <BrandLockup showDomain={false} className="brand--home" />
        {isStaging ? <span className="home__env">STAGING</span> : null}
      </header>

      <div className="home__col" data-sections={Number(layout.more.length > 0) + Number(layout.upcoming.length > 0)}>
        <GameCard
          game={layout.main}
          pinned={history.pinned === layout.main.slug}
          compact={compact}
          loading={loading}
          error={error}
          onPlay={onPlay}
          onCreate={onCreate}
        />

        {layout.more.length > 0 ? (
          <section className="home__section" aria-labelledby="more-title">
            <h2 id="more-title" className="home__section-title">
              {sr.home.more}
            </h2>
            <ul className="home-tiles">
              {layout.more.map((game) => (
                <li key={game.slug}>
                  <GameTile game={game} isNew={isNewGame(game, history, now)} onOpen={() => onOpenGame(game)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {layout.upcoming.length > 0 ? (
          <UpcomingSection games={layout.upcoming} onNotify={onNotify} onViewed={onUpcomingViewed} />
        ) : null}

        {legalSlot ? <footer className="home__legal">{legalSlot}</footer> : null}
      </div>
    </main>
  );
}

/**
 * „Uskoro": pločica po najavljenoj igri. `onViewed` se zove JEDNOM, tek kad
 * je sekcija stvarno u vidnom polju (`useSeenOnce`) — isti događaj kao ranije.
 */
function UpcomingSection({
  games,
  onNotify,
  onViewed,
}: {
  games: readonly GameConfig[];
  onNotify: () => void;
  onViewed?: (() => void) | undefined;
}) {
  const ref = useSeenOnce<HTMLElement>(onViewed);
  return (
    <section ref={ref} className="home__section" aria-labelledby="soon-title">
      <h2 id="soon-title" className="home__section-title">
        {sr.home.soonTitle}
      </h2>
      <ul className="home-tiles">
        {games.map((game) => (
          <li key={game.slug}>
            <UpcomingTile game={game} onNotify={onNotify} />
          </li>
        ))}
      </ul>
    </section>
  );
}
