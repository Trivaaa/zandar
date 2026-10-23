"use client";

import type { ReactNode } from "react";

import { BrandLockup } from "@/components/brand/BrandLockup";
import { GameCard } from "@/components/home/GameCard";
import { GameRow } from "@/components/home/GameRow";
import { UpcomingRow } from "@/components/home/UpcomingRow";
import { isNewGame, type GameConfig, type HomeHistory, type HomeLayout } from "@/lib/games";
import { isStaging } from "@/lib/platform";
import { sr } from "@/lib/sr";

export type HomeScreenProps = {
  layout: HomeLayout;
  history: HomeHistory;
  /** „Sada" za oznaku NOVO — host ga daje, da prikaz ostane čist (i preview stabilan). */
  now: number;
  loading: boolean;
  error?: string | undefined;
  /** Zapamćen izbor stola glavne igre („4 igrača · do 21 · Klasik"). */
  setupSummary: string;
  onPlay: () => void;
  onSetup: () => void;
  onFriends: () => void;
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
 * Početna (SPEC_POCETNA): zaglavlje, kartica glavne igre, „Još igara",
 * „Uskoro". Raspored H1/H2/H3 zavisi SAMO od `layout` (konfiguracija igara +
 * lokalna istorija). Prezentacija: bez skladišta i bez rutiranja.
 */
export function HomeScreen({
  layout,
  history,
  now,
  loading,
  error,
  setupSummary,
  onPlay,
  onSetup,
  onFriends,
  onOpenGame,
  onNotify,
  onUpcomingViewed,
  legalSlot,
  className = "",
}: HomeScreenProps) {
  const count = 1 + layout.more.length + (layout.upcoming.length > 0 ? 1 : 0);
  const density = Math.min(3, count) as 1 | 2 | 3;
  return (
    <main className={`screen home ${className}`}>
      <header className="home__top">
        <BrandLockup showDomain={false} />
        {isStaging ? <span className="home__env">STAGING</span> : null}
      </header>

      <div className="home__col">
        <GameCard
          game={layout.main}
          pinned={history.pinned === layout.main.slug}
          density={density}
          loading={loading}
          error={error}
          setupSummary={setupSummary}
          onPlay={onPlay}
          onSetup={onSetup}
          onFriends={onFriends}
        />

        {layout.more.length > 0 ? (
          <section className="home__more" aria-labelledby="more-title">
            <h2 id="more-title" className="home__more-title">
              {sr.home.more}
            </h2>
            <ul className="home__more-list">
              {layout.more.map((game) => (
                <li key={game.slug}>
                  <GameRow game={game} isNew={isNewGame(game, history, now)} onOpen={() => onOpenGame(game)} />
                </li>
              ))}
            </ul>
          </section>
        ) : null}

        {layout.upcoming.length > 0 ? (
          <UpcomingRow games={layout.upcoming} onNotify={onNotify} onViewed={onUpcomingViewed} />
        ) : null}

        {legalSlot ? <footer className="home__legal">{legalSlot}</footer> : null}
      </div>
    </main>
  );
}
