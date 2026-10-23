"use client";

import { LetterCard, gameMeta } from "@/components/home/GameRow";
import { ArrowRightIcon, BookIcon, FriendsIcon, StarIcon } from "@/components/icons";
import { Sheet } from "@/components/sheet/Sheet";
import type { GameConfig } from "@/lib/games";
import { sr } from "@/lib/sr";

/**
 * List igre iz „Još igara" (SPEC_POCETNA §5.1, H4): naziv i opis, Igraj,
 * S prijateljima, Pravila, Zakači na vrh / Otkači, Zatvori. Samo prikaz.
 */
export function GameSheet({
  game,
  pinned,
  onPlay,
  onFriends,
  onRules,
  onTogglePin,
  onClose,
}: {
  game: GameConfig;
  pinned: boolean;
  onPlay: () => void;
  onFriends: () => void;
  onRules: () => void;
  onTogglePin: () => void;
  onClose: () => void;
}) {
  const copy = sr.games[game.slug];
  return (
    <Sheet
      title={
        <span className="game-sheet__head">
          <LetterCard game={game} />
          <span className="game-sheet__head-text">
            <span>{copy.name}</span>
            <span className="game-sheet__meta">{gameMeta(game)}</span>
          </span>
        </span>
      }
      closeLabel={sr.home.close}
      onClose={onClose}
    >
      <div className="qp-sheet">
        {"about" in copy ? <p className="sheet__note sheet__note--muted">{copy.about}</p> : null}
        <button type="button" className="home__cta sheet__btn" onClick={onPlay}>
          <span>{sr.home.play}</span>
          <ArrowRightIcon className="home__cta-arrow" />
        </button>
        <button type="button" className="home__friends sheet__btn" onClick={onFriends}>
          <FriendsIcon className="home__friends-icon" />
          <span>{sr.home.friends}</span>
        </button>
        <div className="game-sheet__pair">
          {game.hasRules ? (
            <button type="button" className="game-sheet__small" onClick={onRules}>
              <BookIcon className="game-sheet__icon" />
              <span>{sr.home.rules}</span>
            </button>
          ) : null}
          <button type="button" className="game-sheet__small" aria-pressed={pinned} onClick={onTogglePin}>
            <StarIcon filled={pinned} className="game-sheet__icon" />
            <span>{pinned ? sr.home.unpin : sr.home.pin}</span>
          </button>
        </div>
      </div>
    </Sheet>
  );
}
