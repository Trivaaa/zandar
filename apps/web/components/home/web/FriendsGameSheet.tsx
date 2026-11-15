"use client";

import { GameFan } from "@/components/home/web/WebGameCard";
import { ChevronRightIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet/Sheet";
import type { GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

/**
 * „Igraj s prijateljima" na web početnoj (W4): ovdje se bira SAMO igra; broj
 * igrača, cilj i izgled stola bira se na sljedećem ekranu (`/create`). Samo prikaz.
 */
export function FriendsGameSheet({
  games,
  onPick,
  onClose,
}: {
  games: readonly GameConfig[];
  onPick: (game: GameConfig) => void;
  onClose: () => void;
}) {
  return (
    <Sheet title={sr.homeWeb.friends} closeLabel={sr.home.close} onClose={onClose}>
      <div className="web-friends">
        <p className="sheet__note sheet__note--muted">{sr.homeWeb.friendsSheetSub}</p>
        <ul className="web-friends__list">
          {games.map((game) => {
            const name = sr.games[game.slug].name;
            return (
              <li key={game.slug}>
                <button
                  type="button"
                  className="web-friends__row"
                  data-tint={game.tint}
                  onClick={() => onPick(game)}
                  aria-label={sr.homeWeb.friendsGame(name)}
                >
                  <span className="web-friends__art">
                    <GameFan game={game} className="web-friends__fan" />
                  </span>
                  <span className="web-friends__text">
                    {name}
                    <small>{sr.homeWeb.friendsPlayers[game.slug]}</small>
                  </span>
                  <ChevronRightIcon className="web-friends__chev" />
                </button>
              </li>
            );
          })}
        </ul>
      </div>
    </Sheet>
  );
}
