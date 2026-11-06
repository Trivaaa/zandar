"use client";

import type { CSSProperties } from "react";
import type { Card, PublicPlayer } from "@zandar/shared-types";

import { PlayingCard } from "@/components/felt/PlayingCard";
import { Avatar } from "@/components/profile/Avatar";
import { POKER_CATEGORY_LABEL, type HandSummary, type PotChip } from "@/lib/pokerView";
import { sr } from "@/lib/sr";

function initial(name: string) {
  return name.trim().slice(0, 1).toLocaleUpperCase("sr-Latn");
}

/** Mali avatar za trake i liste (rezultat, plasman). */
export function PokerAvatar({ player }: { player: PublicPlayer | undefined }) {
  return (
    <span className="pk-avatar" aria-hidden="true">
      {player?.avatar ? <Avatar id={player.avatar} /> : initial(player?.displayName ?? "?")}
    </span>
  );
}

/** Pločice D / SB / BB uz avatar (adornment `PlayerSeat`-a). */
export function PositionTags({ tags }: { tags: Array<"D" | "SB" | "BB"> }) {
  if (tags.length === 0) return null;
  return (
    <span className="pk-tags" aria-label={tags.join(", ")}>
      {tags.map((t) => (
        <span key={t} className="pk-tag" data-tag={t}>
          {t}
        </span>
      ))}
    </span>
  );
}

/** Prazno mjesto (tabla H/I): napustio meč ili ostao bez žetona — kontura sa plasmanom. */
export function EmptySeat({
  name,
  place,
  sub,
  className = "",
  style,
}: {
  name: string;
  place: number | null;
  sub: string;
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <div className={`pk-empty ${className}`} style={style}>
      <span className="pk-empty__ring">{place ? sr.poker.place(place) : ""}</span>
      <span className="pk-empty__name">{name}</span>
      <span className="pk-empty__sub">{sub}</span>
    </div>
  );
}

/** Ulog ulice: stog žetona + iznos. */
export function StreetBet({ amount, style }: { amount: number; style: CSSProperties }) {
  return (
    <span className="pk-bet" style={style} aria-label={sr.poker.chips(amount)}>
      <span className="pk-stack" aria-hidden="true">
        <i />
        <i />
        <i />
      </span>
      {amount}
    </span>
  );
}

export function Pots({ pots }: { pots: PotChip[] }) {
  if (pots.length === 0) return null;
  return (
    <div className="pk-pots">
      {pots.map((p) => (
        <span key={`${p.index}-${p.amount}`} className="pk-pot" data-bump>
          <i className="pk-chip" aria-hidden="true" />
          <small>
            {pots.length === 1 ? sr.poker.pot : p.index === 0 ? sr.poker.mainPot : sr.poker.sidePot(p.index + 1)}
          </small>
          {p.amount}
        </span>
      ))}
    </div>
  );
}

/** Pet mjesta za zajedničke karte; prazna su konture u suknu. */
export function Board({
  cards,
  toneOf,
}: {
  cards: readonly Card[];
  toneOf: (card: Card) => "hi" | "lo" | undefined;
}) {
  return (
    <div className="pk-board">
      {Array.from({ length: 5 }, (_, i) => {
        const card = cards[i];
        if (!card) return <span key={`e${i}`} className="pk-board__slot" data-empty aria-hidden="true" />;
        // Ključ je karta: nova karta se montira i odigra pad JEDNOM, stare
        // ostaju. Flop (0–2) pada zaredom, turn i river odmah.
        return (
          <span
            key={card.id}
            className="pk-board__slot"
            data-tone={toneOf(card)}
            data-new
            style={{ "--pk-i": i < 3 ? i : 0 } as CSSProperties}
          >
            <PlayingCard card={card} size="xs" />
          </span>
        );
      })}
    </div>
  );
}

/** Traka rezultata ruke (tabla F): pobjednik, kombinacija, iznos. */
export function HandResultBar({
  summary,
  playerOf,
  style,
}: {
  summary: HandSummary;
  playerOf: (id: string) => PublicPlayer | undefined;
  style: CSSProperties;
}) {
  const winners = summary.kind === "split" || summary.kind === "multi" ? summary.winners : [summary.winner];
  const title =
    summary.kind === "split" ? sr.poker.splitPot : summary.kind === "uncontested" ? sr.poker.pot : sr.poker.handResult;
  return (
    <div className="pk-result" style={style} role="status">
      <h5>{title}</h5>
      {winners.map((w) => {
        const player = playerOf(w.playerId);
        const name = player?.displayName ?? "";
        return (
          <div key={w.playerId} className="pk-result__row">
            <PokerAvatar player={player} />
            <span className="pk-result__who">
              <b>{summary.kind === "uncontested" ? sr.poker.takesPot(name) : name}</b>
              {w.category ? <small>{POKER_CATEGORY_LABEL[w.category]}</small> : null}
            </span>
            <span className="pk-result__amount">
              <i className="pk-chip" aria-hidden="true" />
              {sr.poker.won(w.amount)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Tabla I: ostao si bez žetona. Bez riječi o gubitku. */
export function BustedCard({
  place,
  onNewMatch,
  onWatch,
  onLeave,
}: {
  place: number | null;
  onNewMatch: () => void;
  onWatch: () => void;
  onLeave: () => void;
}) {
  return (
    <div className="pk-card-scrim">
      <div className="pk-card" role="dialog" aria-modal="true" aria-label={sr.poker.bustedTitle}>
        <span className="pk-card__badge">{place ? sr.poker.place(place) : "–"}</span>
        <h3>{sr.poker.bustedTitle}</h3>
        <p>{sr.poker.bustedBody(place ?? 0)}</p>
        <div className="pk-card__actions">
          <button type="button" className="pk-card__primary" onClick={onNewMatch}>
            {sr.poker.newMatch}
          </button>
          <button type="button" className="pk-card__secondary" onClick={onWatch}>
            {sr.poker.watch}
          </button>
          <button type="button" className="pk-card__secondary" onClick={onLeave}>
            {sr.poker.leave}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Tabla K: plasman 1.–4. Quick Play: Igraj ponovo; privatni sto: kreator vidi Revanš. */
export function MatchEndCard({
  rows,
  myPlayerId,
  playerOf,
  abandoned,
  mode,
  busy,
  onPlayAgain,
  onRematch,
  onLeave,
}: {
  rows: Array<{ playerId: string; place: number | null }>;
  myPlayerId: string;
  playerOf: (id: string) => PublicPlayer | undefined;
  abandoned: boolean;
  /** `quick` = javni sto, `host` / `guest` = privatni. */
  mode: "quick" | "host" | "guest";
  busy: boolean;
  onPlayAgain: () => void;
  onRematch: () => void;
  onLeave: () => void;
}) {
  const winner = rows.find((r) => r.place === 1);
  const winnerName = winner ? playerOf(winner.playerId)?.displayName : undefined;
  const subtitle = abandoned
    ? sr.poker.abandoned
    : winner?.playerId === myPlayerId
      ? sr.poker.youWon
      : winnerName
        ? sr.poker.matchOverWinner(winnerName)
        : "";
  return (
    <div className="pk-card-scrim">
      <div className="pk-card" role="dialog" aria-modal="true" aria-label={sr.poker.matchOver}>
        <h3>{sr.poker.matchOver}</h3>
        {subtitle ? <p>{subtitle}</p> : null}
        <ol className="pk-card__list">
          {rows.map((r) => {
            const player = playerOf(r.playerId);
            return (
              <li
                key={r.playerId}
                {...(r.place === 1 ? { "data-first": true } : {})}
                {...(r.playerId === myPlayerId ? { "data-me": true } : {})}
              >
                <span className="pk-card__pos">{r.place ? sr.poker.place(r.place) : "–"}</span>
                <PokerAvatar player={player} />
                <span className="pk-card__name">{player?.displayName ?? ""}</span>
                {r.playerId === myPlayerId ? <small>{sr.poker.you}</small> : null}
              </li>
            );
          })}
        </ol>
        <div className="pk-card__actions">
          {mode === "quick" ? (
            <button type="button" className="pk-card__primary" disabled={busy} onClick={onPlayAgain}>
              {sr.poker.playAgain}
            </button>
          ) : mode === "host" && !abandoned ? (
            <button type="button" className="pk-card__primary" disabled={busy} onClick={onRematch}>
              {sr.poker.rematch}
            </button>
          ) : !abandoned ? (
            <span className="pk-card__status">{sr.poker.waitingRematch}</span>
          ) : null}
          <button type="button" className="pk-card__secondary" onClick={onLeave}>
            {sr.poker.leave}
          </button>
        </div>
      </div>
    </div>
  );
}
