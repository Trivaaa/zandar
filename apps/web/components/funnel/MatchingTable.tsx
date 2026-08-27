"use client";

/** Fill order around the oval: local player bottom, then across, left, right. */
const placeClass = ["bottom", "top", "left", "right"] as const;

/**
 * Minimalni oblik koji ovaj ekran stvarno čita. Uklapaju se i `RoomPlayer`
 * (lib/api) i `PublicPlayer` (shared-types) — matching se crta i prije nego
 * partija postoji, pa ne smije tražiti `connectionStatus`.
 */
export type MatchingPlayer = {
  id: string;
  displayName: string;
  seatIndex: number;
};

export type MatchingTableProps = {
  /** Pre-sorted by the parent: the local player is FIRST. */
  players: MatchingPlayer[];
  myPlayerId: string | null;
  /** How many seats are shown, 1..4, in fill order. The parent owns the clock. */
  revealed: number;
  statusText: string;
  done: boolean;
  className?: string | undefined;
};

/**
 * A table being SET, not a search: no counter, no percentage, no join log, no
 * spinner language. The only preparing indicator is a thin numberless bar.
 * Presentation only — nothing here measures time or reorders players.
 */
export function MatchingTable({
  players,
  myPlayerId,
  revealed,
  statusText,
  done,
  className = "",
}: MatchingTableProps) {
  // Sto se crta i dok roster ne stigne — "Pripremamo sto..." je upravo ta
  // faza, a prazan felt bi je poništio. Prazna mjesta su mjesta, ne rupe.
  const places = players.length > 0 ? players.length : 4;
  const shown = Math.max(0, Math.min(revealed, places));

  return (
    <div className={`screen matching ${className}`} data-done={done}>
      <div className="matching__head">
        <h1
          className={`matching__headline font-sans ${done ? "font-display text-2xl" : "text-base"}`}
        >
          {statusText}
        </h1>
        {done ? null : (
          <div className="matching__bar" aria-hidden="true">
            <span className="matching__fill" />
          </div>
        )}
      </div>

      <div className="matching__table">
        <div className="matching__oval" aria-hidden="true" />
        {Array.from({ length: places }, (_, i) => {
          const player = i < shown ? players[i] : undefined;
          const isYou = player !== undefined && myPlayerId !== null && player.id === myPlayerId;
          return (
            <div
              key={i}
              className={`matching__place matching__place--${placeClass[i]}`}
              data-place-index={i}
              data-filled={player !== undefined}
            >
              <span className="matching__avatar font-display text-base" aria-hidden="true">
                {player ? player.displayName.slice(0, 1) : ""}
              </span>
              <span className={`matching__name font-sans text-sm ${isYou ? "matching__you" : ""}`}>
                {player ? player.displayName : ""}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
