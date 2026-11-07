"use client";

import type { CSSProperties } from "react";
import type { Card, PublicPlayer, RaubHandResult, RaubSeatView, Suit } from "@zandar/shared-types";

import { CardBack } from "@/components/felt/CardBack";
import { PlayingCard } from "@/components/felt/PlayingCard";
import { PokerAvatar } from "@/components/poker/PokerParts";
import {
  SUIT_SYMBOL,
  cardLabel,
  formatDelta,
  handRows,
  handSentence,
  isRedSuit,
  leaderIds,
  scoreTable,
  type Dir,
  type RaubPanel,
} from "@/lib/raubView";
import { sr } from "@/lib/sr";

function Suit({ suit }: { suit: Suit }) {
  return (
    <span className="rb-suit" data-red={isRedSuit(suit) || undefined}>
      {SUIT_SYMBOL[suit]}
    </span>
  );
}

/** Oznaka aduta u zaglavlju: „NUDI SE ♥" u licitaciji, „ADUT ♥" kad je određen, ×2 posle refe. */
export function TrumpBadge({ trump, offered, double }: { trump: Suit | null; offered: Suit | null; double: boolean }) {
  const suit = trump ?? offered;
  if (!suit && !double) return null;
  return (
    <span className="rb-trump" data-state={trump ? "trump" : "offered"}>
      {suit ? (
        <>
          <span className="rb-trump__label">{trump ? sr.raub.trump : sr.raub.offered}</span>
          <span className="rb-trump__suit">
            <Suit suit={suit} />
          </span>
        </>
      ) : null}
      {double ? <span className="rb-trump__x2">×2</span> : null}
    </span>
  );
}

/** Špil i okrenuta karta na sredini stola (licitacija), uz „karta N od 3". */
export function TalonPile({
  talon,
  flips,
  maxFlips,
  deckCount,
  showCounter,
  taken,
}: {
  talon: readonly Card[];
  flips: number;
  maxFlips: number;
  deckCount: number;
  showCounter: boolean;
  /** Uzeta talon karta i ko ju je uzeo — ostaje na vrhu do štihova. */
  taken?: { card: Card; label: string } | null;
}) {
  const current = taken?.card ?? talon.at(-1);
  const earlier = taken ? talon : talon.slice(0, -1);
  return (
    <div className="rb-talon">
      <div className="rb-talon__deck" data-deck>
        {deckCount > 0 ? <CardBack size="sm" /> : <span className="rb-talon__empty" />}
        <span className="rb-talon__count">{deckCount > 0 ? sr.raub.deck(deckCount) : sr.raub.deckEmpty}</span>
      </div>
      {current ? (
        <div className="rb-talon__cards">
          {earlier.map((c, i) => (
            <span key={c.id} className="rb-talon__under" style={{ "--i": i } as CSSProperties}>
              <PlayingCard card={c} size="sm" />
            </span>
          ))}
          <span key={current.id} className="rb-talon__top">
            <PlayingCard card={current} size="sm" />
          </span>
          {taken ? <span className="rb-talon__taken">{taken.label}</span> : null}
        </div>
      ) : null}
      {showCounter ? <span className="rb-talon__flip">{sr.raub.talonCard(flips, maxFlips)}</span> : null}
    </div>
  );
}

/** Prostor štiha: svaka karta ispred igrača koji ju je bacio; zadnja ima svijetli rub. */
export function TrickArea({
  plays,
  dirOf,
  collectTo,
}: {
  plays: ReadonlyArray<{ playerId: string; card: Card }>;
  dirOf: (playerId: string) => Dir;
  /** Pun štih ide ka pobjedniku (transform + opacity). */
  collectTo: Dir | null;
}) {
  if (plays.length === 0) return null;
  return (
    <div className="rb-trick" {...(collectTo ? { "data-collect": collectTo } : {})}>
      {plays.map((p, i) => (
        <span
          key={p.card.id}
          className="rb-trick__card"
          data-dir={dirOf(p.playerId)}
          {...(i === plays.length - 1 && !collectTo ? { "data-last": true } : {})}
        >
          <PlayingCard card={p.card} size="sm" />
        </span>
      ))}
    </div>
  );
}

/** Otvorena karta prve zamjene sve 4 — vide je svi. */
export function OpenCardNote({ card, name }: { card: Card; name: string }) {
  return (
    <div className="rb-open">
      <b className="rb-open__card" data-red={isRedSuit(card.suit) || undefined}>
        {cardLabel(card)}
      </b>
      <span>
        {name} · {sr.raub.openCard}
      </span>
    </div>
  );
}

/** Pločice uz avatar: D (djelilac), oznaka nosioca i uzeto/obaveza. */
export function SeatTags({
  dealer,
  declarer,
  tricks,
}: {
  dealer: boolean;
  declarer: { label: string; progress: string | null } | null;
  tricks: number | null;
}) {
  if (!dealer && !declarer && tricks === null) return null;
  return (
    <span className="rb-tags">
      {dealer ? <span className="pk-tag" data-tag="D">{sr.raub.seat.dealer}</span> : null}
      {declarer ? (
        <span className="rb-decl">
          {declarer.label}
          {declarer.progress ? <b>{declarer.progress}</b> : null}
        </span>
      ) : tricks !== null && tricks > 0 ? (
        <span className="rb-tricks" aria-label={sr.raub.seat.tricks(tricks)}>
          {tricks}
        </span>
      ) : null}
    </span>
  );
}

/** Panel nad rukom: ista pozicija za sve korake, da ne skače kad potez dođe. */
export function ActionPanel({
  panel,
  busy,
  selectedCount,
  deckCount,
  onOpen,
  onBlind,
  onBid,
  onSwap,
  onDiscard,
  onGo,
  onExchange,
}: {
  panel: RaubPanel;
  busy: boolean;
  /** Označene karte (zamjena / odbacivanje). */
  selectedCount: number;
  deckCount: number;
  onOpen: () => void;
  onBlind: () => void;
  onBid: (raub: boolean) => void;
  onSwap: (swap: boolean) => void;
  onDiscard: () => void;
  onGo: (go: boolean) => void;
  onExchange: () => void;
}) {
  const btn = (kind: "pass" | "main" | "accent", label: React.ReactNode, onClick: () => void, disabled = false) => (
    <button type="button" className="rb-panel__btn" data-kind={kind} disabled={busy || disabled} onClick={onClick}>
      {label}
    </button>
  );

  switch (panel.kind) {
    case "none":
      return null;
    case "wait":
      return (
        <div className="rb-panel" data-wait>
          <span className="rb-panel__wait">{sr.raub.waitingFor(panel.name)}</span>
        </div>
      );
    case "open":
      return (
        <div className="rb-panel">
          <p className="rb-panel__hint">{sr.raub.open.hint}</p>
          {btn("pass", sr.raub.open.open, onOpen)}
          {btn(
            "accent",
            <span className="rb-panel__two">
              {sr.raub.open.blind}
              <small>{sr.raub.open.blindNote}</small>
            </span>,
            onBlind,
          )}
        </div>
      );
    case "bid":
      return (
        <div className="rb-panel">
          <p className="rb-panel__hint">{sr.raub.bidHint(SUIT_SYMBOL[panel.suit])}</p>
          {btn("pass", sr.raub.bid.pass, () => onBid(false))}
          {btn("accent", sr.raub.bid.raub, () => onBid(true))}
        </div>
      );
    case "swap":
      return (
        <div className="rb-panel">
          <p className="rb-panel__hint">{sr.raub.swap.hint(cardLabel(panel.seven), cardLabel(panel.talon))}</p>
          {btn("pass", sr.raub.swap.no, () => onSwap(false))}
          {btn("accent", sr.raub.swap.yes(cardLabel(panel.seven)), () => onSwap(true))}
        </div>
      );
    case "discard":
      return (
        <div className="rb-panel">
          <p className="rb-panel__hint">{sr.raub.discard.hint}</p>
          {btn("accent", selectedCount === 1 ? sr.raub.discard.button : sr.raub.discard.pick, onDiscard, selectedCount !== 1)}
        </div>
      );
    case "going":
      return (
        <div className="rb-panel">
          <p className="rb-panel__hint">
            {sr.raub.go.hint(SUIT_SYMBOL[panel.trump], panel.declarerName, panel.required)}
          </p>
          {btn("pass", sr.raub.go.no, () => onGo(false))}
          {btn("accent", sr.raub.go.yes, () => onGo(true))}
        </div>
      );
    case "exchange":
      return (
        <div className="rb-panel">
          <p className="rb-panel__hint">{deckCount === 0 ? sr.raub.exchange.empty : sr.raub.exchange.hint}</p>
          {btn("pass", sr.raub.exchange.keep, onExchange, selectedCount > 0)}
          {btn(
            "accent",
            selectedCount === 0 ? sr.raub.exchange.buttonNone : sr.raub.exchange.button(selectedCount),
            onExchange,
            selectedCount === 0 || selectedCount > panel.max,
          )}
        </div>
      );
    case "play":
      return (
        <div className="rb-panel" data-play>
          <span className="rb-panel__turn">{sr.raub.yourTurn}</span>
          <span className="rb-panel__why">{panel.hint}</span>
        </div>
      );
  }
}

/** Kraj ruke (i refa): ko je koliko uzeo, promjena bodova, kazne, ×2. */
export function HandSummaryCard({
  result,
  playerOf,
  myPlayerId,
  isHost,
  hostName,
  busy,
  onNextHand,
  onTable,
}: {
  result: RaubHandResult;
  playerOf: (id: string) => PublicPlayer | undefined;
  myPlayerId: string;
  isHost: boolean;
  hostName: string;
  busy: boolean;
  onNextHand: () => void;
  onTable: () => void;
}) {
  const nameOf = (id: string) => (id === myPlayerId ? sr.poker.you : (playerOf(id)?.displayName ?? ""));
  const rows = handRows(result);
  return (
    <div className="pk-card-scrim rb-summary-scrim">
      <div className="pk-card rb-summary" role="dialog" aria-modal="true" aria-label={sr.raub.summary.title(result.dealNo)}>
        <h3>
          {result.void ? sr.raub.summary.refaTitle : sr.raub.summary.title(result.dealNo)}
          {result.multiplier === 2 && !result.void ? <span className="rb-x2">{sr.raub.summary.double}</span> : null}
        </h3>
        <p>
          {!result.void && result.trumpSuit ? (
            <>
              {sr.raub.trump} <Suit suit={result.trumpSuit} /> ·{" "}
            </>
          ) : null}
          {handSentence(result, nameOf)}
        </p>
        {result.void ? (
          <p className="rb-summary__pending">{sr.raub.summary.pending(result.pendingRefasAfter)}</p>
        ) : (
          <table className="rb-rows">
            <thead>
              <tr>
                <th>{sr.raub.summary.player}</th>
                <th>{sr.raub.summary.tricks}</th>
                <th>{sr.raub.summary.change}</th>
                <th>{sr.raub.summary.score}</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.playerId} {...(r.playerId === myPlayerId ? { "data-me": true } : {})}>
                  <td>
                    <span className="rb-rows__who">
                      <PokerAvatar player={playerOf(r.playerId)} />
                      <span>
                        {nameOf(r.playerId)}
                        {r.isDeclarer ? (
                          <small>
                            {result.scenario === "seven"
                              ? sr.raub.declarer.seven(result.requiredTricks)
                              : sr.raub.declarer.raub(result.requiredTricks)}
                          </small>
                        ) : null}
                      </span>
                    </span>
                  </td>
                  <td>{r.dropped ? sr.raub.summary.dropped : r.isDeclarer ? `${r.tricks} / ${result.requiredTricks}` : r.tricks}</td>
                  <td data-penalty={r.penalty || undefined}>
                    {r.dropped ? "0" : formatDelta(r.delta)}
                    {r.penalty ? <small>{sr.raub.summary.penalty}</small> : null}
                  </td>
                  <td>
                    <span className="rb-rows__before">{r.scoreBefore} →</span> <b>{r.scoreAfter}</b>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <div className="pk-card__actions">
          {isHost ? (
            <button type="button" className="pk-card__primary" disabled={busy} onClick={onNextHand}>
              {sr.raub.summary.nextHand}
            </button>
          ) : (
            <span className="pk-card__status">{sr.raub.summary.waitingHost(hostName)}</span>
          )}
          <button type="button" className="pk-card__secondary" onClick={onTable}>
            {sr.raub.summary.table}
          </button>
        </div>
      </div>
    </div>
  );
}

/** Puna tabela (list odozdo): ruke po redu, refa kao red, ×2 označene, „Sad" dole. */
export function ScoreTableSheet({
  history,
  seats,
  pendingRefas,
  playerOf,
  myPlayerId,
  onClose,
}: {
  history: readonly RaubHandResult[];
  seats: readonly RaubSeatView[];
  pendingRefas: number;
  playerOf: (id: string) => PublicPlayer | undefined;
  myPlayerId: string;
  onClose: () => void;
}) {
  const rows = scoreTable(history);
  const leaders = leaderIds(seats);
  const nameOf = (id: string) => (id === myPlayerId ? sr.poker.you : (playerOf(id)?.displayName ?? ""));
  return (
    <div className="rb-sheet-scrim" onClick={onClose}>
      <div className="rb-sheet" role="dialog" aria-modal="true" aria-label={sr.raub.table.title} onClick={(e) => e.stopPropagation()}>
        <span className="rb-sheet__grip" aria-hidden="true" />
        <h3>{sr.raub.table.title}</h3>
        <p>{sr.raub.table.subtitle}</p>
        <div className="rb-sheet__scroll">
          <table className="rb-grid">
            <thead>
              <tr>
                <th>{sr.raub.table.hand}</th>
                {seats.map((s) => (
                  <th key={s.playerId}>{nameOf(s.playerId)}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.dealNo} {...(r.void ? { "data-void": true } : {})}>
                  <th>
                    {r.void
                      ? sr.raub.table.refaRow(r.dealNo)
                      : r.multiplier === 2
                        ? sr.raub.table.doubleRow(r.dealNo)
                        : r.dealNo}
                  </th>
                  {seats.map((s) => {
                    const d = r.deltas[s.playerId];
                    return (
                      <td key={s.playerId} {...(d?.penalty ? { "data-penalty": true } : {})}>
                        {r.void || !d ? sr.raub.table.dropped : formatDelta(d.delta)}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr>
                <th>{sr.raub.table.now}</th>
                {seats.map((s) => (
                  <td key={s.playerId} {...(leaders.has(s.playerId) ? { "data-lead": true } : {})}>
                    {s.score}
                  </td>
                ))}
              </tr>
            </tfoot>
          </table>
        </div>
        {pendingRefas > 0 ? <p className="rb-sheet__pending">{sr.raub.table.pending(pendingRefas)}</p> : null}
        <button type="button" className="pk-card__secondary rb-sheet__close" onClick={onClose}>
          {sr.raub.table.close}
        </button>
      </div>
    </div>
  );
}

/** Kraj meča: plasman sa bodovima; Quick Play „Igraj ponovo", privatni sto „Revanš". */
export function RaubMatchEnd({
  rows,
  myPlayerId,
  playerOf,
  abandoned,
  mode,
  busy,
  onPlayAgain,
  onRematch,
  onLeave,
  onTable,
}: {
  rows: Array<{ playerId: string; place: number | null; score: number }>;
  myPlayerId: string;
  playerOf: (id: string) => PublicPlayer | undefined;
  abandoned: boolean;
  mode: "quick" | "host" | "guest";
  busy: boolean;
  onPlayAgain: () => void;
  onRematch: () => void;
  onLeave: () => void;
  onTable: () => void;
}) {
  const firsts = rows.filter((r) => r.place === 1);
  const subtitle = abandoned
    ? sr.poker.abandoned
    : firsts.some((r) => r.playerId === myPlayerId)
      ? sr.poker.youWon
      : firsts.length > 1
        ? sr.raub.end.sharedWinners
        : firsts[0]
          ? sr.raub.end.winner(playerOf(firsts[0].playerId)?.displayName ?? "")
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
                <span className="rb-end__score">{sr.raub.end.points(r.score)}</span>
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
          {!abandoned ? (
            <button type="button" className="pk-card__secondary" onClick={onTable}>
              {sr.raub.summary.table}
            </button>
          ) : null}
          <button type="button" className="pk-card__secondary" onClick={onLeave}>
            {sr.poker.leave}
          </button>
        </div>
      </div>
    </div>
  );
}
