"use client";

import { FeedbackRow } from "@/components/funnel/HomeScreen";
import type { GameListItem } from "@/components/home/GameList";
import { WebAppStrip } from "@/components/home/web/WebAppStrip";
import { WebGameCard } from "@/components/home/web/WebGameCard";
import { WebTopNav } from "@/components/home/web/WebTopNav";
import { ChevronRightIcon, FriendsIcon } from "@/components/icons";
import type { GameConfig } from "@/lib/games";
import { isStaging } from "@/lib/platform";
import { sr } from "@/lib/sr";

export type WebHomeProps = {
  items: readonly GameListItem[];
  /** Igra za koju se upravo traži sto (ili je traženje palo). */
  loadingSlug: string | null;
  error?: string | undefined;
  onPlay: (game: GameConfig) => void;
  onFriends: () => void;
  onFeedback: () => void;
  /** Desktop zaglavlje Igraj · Prijatelji · Profil (uz nalog, kao donja traka). */
  showNav: boolean;
  /**
   * „Vrati se za sto" (V2–V4): stoji na mjestu trake aplikacije — dok igrač
   * ima partiju, ne nudimo mu preuzimanje.
   */
  resumeSlot?: React.ReactNode;
  /** Samo `/dev/home`: traka aplikacije i bez Android pregledača. */
  appPreview?: { installed: boolean } | undefined;
  className?: string | undefined;
};

/**
 * Početna za web — novi igrači (tabla „UI · Početna za web", W1/W1b/W2). Bez
 * naziva na vrhu: posjetilac je došao zbog igre, pa ekran počinje trakom
 * aplikacije i karticama. Jedno žuto dugme po kartici; „s kim" je jedan red
 * ispod. Aplikacija NE koristi ovaj ekran (`isNative` → `HomeScreen`).
 * Samo prikaz: bez skladišta i bez rutiranja.
 */
export function WebHome({
  items,
  loadingSlug,
  error,
  onPlay,
  onFriends,
  onFeedback,
  showNav,
  appPreview,
  resumeSlot,
  className = "",
}: WebHomeProps) {
  const busy = loadingSlug !== null && !error;
  return (
    <main className={`screen home home--web ${className}`}>
      {showNav ? <WebTopNav /> : null}
      <div className="home__col web-home__col">
        {resumeSlot ?? <WebAppStrip preview={appPreview} />}
        {isStaging ? <span className="home__env web-home__env">STAGING</span> : null}
        {/* Desktop (V4): uz traku naslov kaže „Ili izaberi novu igru". */}
        <h1 className="web-home__title">{resumeSlot ? sr.homeResume.orNew : sr.homeWeb.title}</h1>
        <ul className="web-home__games">
          {items.map(({ game, badge }) => {
            const mine = loadingSlug === game.slug;
            return (
              <WebGameCard
                key={game.slug}
                game={game}
                badge={mine && error ? null : badge}
                loading={mine && busy}
                disabled={busy}
                error={mine ? error : undefined}
                onPlay={() => onPlay(game)}
              />
            );
          })}
        </ul>
        <button type="button" className="web-home__friends" onClick={onFriends}>
          <FriendsIcon className="web-home__friends-icon" />
          <span className="web-home__friends-text">
            {sr.homeWeb.friends}
            <small>{sr.homeWeb.friendsSub}</small>
          </span>
          <ChevronRightIcon className="web-home__friends-chev" />
        </button>
        <FeedbackRow onOpen={onFeedback} />
      </div>
    </main>
  );
}
