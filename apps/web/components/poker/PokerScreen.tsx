"use client";

import { useEffect, useState, type CSSProperties } from "react";
import type {
  Card,
  PokerActionRequest,
  PokerGamePayload,
  PokerSeatView,
  PublicPlayer,
  ReactionType,
  TableTheme,
} from "@zandar/shared-types";

import { FeedbackToggles } from "@/components/FeedbackToggles";
import { ReactionFab } from "@/components/ReactionFab";
import { RulesModal } from "@/components/RulesModal";
import { FeltHeader } from "@/components/felt/FeltHeader";
import { PlayerSeat } from "@/components/felt/PlayerSeat";
import { PlayingCard } from "@/components/felt/PlayingCard";
import { SeatCaption } from "@/components/felt/SeatCaption";
import { ReactionBubble } from "@/components/overlay/EmojiReactions";
import { GameMenuSheet } from "@/components/overlay/GameMenuSheet";
import { LeaveTableSheet } from "@/components/overlay/LeaveTableSheet";
import { Toast } from "@/components/overlay/Toast";
import { useBackHandler, useBrowserBackGuard } from "@/lib/backHandlers";
import { isNative } from "@/lib/platform";
import {
  actionLabel,
  actionTone,
  displayPots,
  handHint,
  positionTags,
  sortedPlacements,
  summarizeHand,
  winningCardIds,
} from "@/lib/pokerView";
import type { ActiveReaction } from "@/lib/reactions";
import { arrangeSeats } from "@/lib/seating";
import { sr } from "@/lib/sr";
import { useCountdown } from "@/lib/useCountdown";
import { usePokerBeat } from "@/lib/usePokerBeat";

import { ActionPanel } from "./ActionPanel";
import {
  Board,
  BustedCard,
  EmptySeat,
  HandResultBar,
  MatchEndCard,
  Pots,
  PositionTags,
  StreetBet,
} from "./PokerParts";
import { RaiseSheet } from "./RaiseSheet";

/** Rok poteza (`DEFAULT_POKER_CONFIG.turnTimeoutSeconds`) — za udio prstena. */
const TURN_TOTAL_SECONDS = 20;
const TOAST_MS = 3500;

export type PokerScreenProps = {
  state: PokerGamePayload;
  tableTheme?: TableTheme | undefined;
  /** Javni sto (Quick Play): kraj meča nudi „Igraj ponovo", ne revanš. */
  isQuickPlay: boolean;
  onAction: (action: Pick<PokerActionRequest, "type" | "amount">) => Promise<void>;
  onRematch: () => Promise<void>;
  /** Novi javni poker sto (Igraj ponovo / Nova partija). */
  onNewTable: () => Promise<void>;
  onReact: (type: ReactionType) => Promise<void>;
  onLeave: () => void;
  activeReactions: ActiveReaction[];
  onPlayerTap?: ((player: PublicPlayer, anchor: DOMRect) => void) | undefined;
};

type Orientation = "top" | "left" | "right" | "bottom";

/**
 * Poker nema timove, a server 4-mjesnom stolu (zajednička logika sobe) daje
 * `teamId` — bez ovoga bi sjedišta nosila Žandarove boje Mi/Oni.
 */
function withoutTeam(player: PublicPlayer): PublicPlayer {
  const rest = { ...player };
  delete rest.teamId;
  return rest;
}

/**
 * Poker sto (Claude Design „UI · Poker NL", ekrani A–M).
 *
 * Isti felt, iste podloge, isti `PlayerSeat`, meni, reakcije i list za
 * izlazak kao Žandar; novo je samo ono što poker ima: board, pot(ovi), ulog
 * ulice, zadnja akcija, D/SB/BB, akcioni i raise panel, rezultat ruke i
 * plasman. Server je sudija: panel šalje namjeru, legalno je ono što
 * `state.legal` kaže, a sto se crta tek iz sljedećeg stanja.
 */
export function PokerScreen({
  state: live,
  tableTheme,
  isQuickPlay,
  onAction,
  onRematch,
  onNewTable,
  onReact,
  onLeave,
  activeReactions,
  onPlayerTap,
}: PokerScreenProps) {
  // Sto kao priča: dok `hold` postoji, sto drži uloge, board, pot i stackove
  // kakvi su bili i pušta ih korak po korak (`usePokerBeat`, plan animacija).
  const { view: state, hold } = usePokerBeat(live);
  const playing = hold !== null;
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  // Zaključano za JEDNU verziju stanja: čim server pošalje novo (potez primljen),
  // panel i raise list se otključaju/zatvore sami — bez efekta koji to radi.
  const [raiseAt, setRaiseAt] = useState<number | null>(null);
  const [busyAt, setBusyAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const raiseOpen = raiseAt === state.stateVersion;
  const busy = running || busyAt === state.stateVersion;
  const setRaiseOpen = (open: boolean) => setRaiseAt(open ? state.stateVersion : null);
  const [bustSeen, setBustSeen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const mySeat = state.seats.find((s) => s.playerId === state.myPlayerId);
  const seatOf = (id: string) => state.seats.find((s) => s.playerId === id);
  const playerOf = (id: string) => state.players.find((p) => p.id === id);

  const matchOver = state.phase === "match_finished" || state.phase === "abandoned";
  const handOver = state.phase === "hand_complete";
  // Panel i sat tek kad priča prethodnog poteza završi.
  const myTurn =
    !playing && state.phase === "betting" && state.currentPlayerId === state.myPlayerId && state.legal !== null;
  const iAmOut = mySeat?.status === "bankrupt" || mySeat?.status === "left";

  // Toast greške ili rasta blindova — roditelj drži sat.
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // Prva ruka novog nivoa blindova (nivo raste na početku ruke, nikad usred).
  // Iz pogleda: nivo = ⌈ruka / N⌉, pa je N = (ostalo + ruka − 1) / nivo.
  const handsPerLevel = (state.handsUntilNextLevel + state.handNo - 1) / Math.max(1, state.blindLevel);
  const levelUpHand = state.blindLevel > 1 && state.handsUntilNextLevel === handsPerLevel && !handOver;

  const turnSeconds = useCountdown(state.turnDeadline, TURN_TOTAL_SECONDS);

  const requestLeave = () => {
    // Bez žetona ili poslije kraja meča nema šta da se izgubi — bez potvrde.
    if (iAmOut || matchOver) onLeave();
    else setLeaveOpen(true);
  };
  useBackHandler(true, requestLeave);
  useBackHandler(menuOpen, () => setMenuOpen(false));
  useBackHandler(rulesOpen, () => setRulesOpen(false));
  useBackHandler(raiseOpen, () => setRaiseOpen(false));
  useBrowserBackGuard(!isNative, !matchOver && !iAmOut, requestLeave);

  async function act(action: Pick<PokerActionRequest, "type" | "amount">) {
    if (busy) return;
    setBusyAt(state.stateVersion);
    try {
      await onAction(action);
    } catch (err) {
      setBusyAt(null);
      setToast(err instanceof Error ? err.message : "Greška");
    }
  }

  async function run(fn: () => Promise<void>) {
    if (running) return;
    setRunning(true);
    try {
      await fn();
    } catch (err) {
      setToast(err instanceof Error ? err.message : "Greška");
    } finally {
      setRunning(false);
    }
  }

  // ---- izvedeno za crtanje ----
  const seats = arrangeSeats(state.players, state.myPlayerId);
  const result = handOver || matchOver ? state.lastHandResult : null;
  const summary = result ? summarizeHand(result) : null;
  const showResult = Boolean(summary) && (!hold || hold.result === true);
  const winners = new Set(
    summary ? (summary.kind === "split" || summary.kind === "multi" ? summary.winners : [summary.winner]).map((w) => w.playerId) : [],
  );
  const hiIds = hold && !hold.highlight ? new Set<string>() : winningCardIds(result);
  // Tuđe karte se okreću redom (`hold.revealed`), ne sve odjednom.
  const showdownOf = (id: string) =>
    hold?.revealed && !hold.revealed.includes(id) ? undefined : result?.showdown.find((h) => h.playerId === id);
  const toneOf = (card: Card): "hi" | "lo" | undefined =>
    hiIds.size === 0 ? undefined : hiIds.has(card.id) ? "hi" : "lo";
  const pots =
    hold?.pot !== undefined
      ? hold.pot > 0
        ? [{ label: "main" as const, index: 0, amount: hold.pot }]
        : []
      : displayPots(state);
  const boardCards = hold?.board !== undefined ? state.board.slice(0, hold.board) : state.board;
  const dealing = hold?.dealt === false;
  const waitingName =
    state.phase === "betting" && state.currentPlayerId && state.currentPlayerId !== state.myPlayerId
      ? (playerOf(state.currentPlayerId)?.displayName ?? null)
      : null;
  const hint =
    mySeat && !mySeat.folded && state.myCards.length === 2 && !dealing ? handHint(state.myCards, boardCards) : null;

  function reactionFor(id: string) {
    const r = [...activeReactions].reverse().find((x) => x.playerId === id);
    return r ? <ReactionBubble type={r.type as ReactionType} visible /> : undefined;
  }

  function renderSeat(player: PublicPlayer, orientation: Orientation, className: string, style: CSSProperties) {
    const seat = seatOf(player.id);
    if (!seat) return null;
    // Igrač koji je upravo ostao bez žetona sjedi dok mu se ne isplati ruka.
    const stillSeated = hold?.stillSeated?.includes(player.id) ?? false;
    if (seat.status === "left" || (seat.status === "bankrupt" && !stillSeated)) {
      return (
        <EmptySeat
          key={player.id}
          name={player.displayName}
          place={seat.place}
          sub={seat.status === "left" ? sr.poker.seatEmpty : sr.poker.noChips}
          className={`${className} z-20`}
          style={style}
        />
      );
    }
    const isMe = player.id === state.myPlayerId;
    const shown = isMe ? undefined : showdownOf(player.id);
    const classes = [
      className,
      "z-20",
      seat.folded && seat.inHand ? "pk-folded" : "",
      seat.status === "sitting_out" ? "pk-away" : "",
      winners.has(player.id) && (!hold || hold.highlight) ? "pk-winner" : "",
    ]
      .filter(Boolean)
      .join(" ");
    const action = hold?.captions
      ? (hold.captions[player.id] ?? null)
      : seat.lastAction && !handOver && !matchOver
        ? seat.lastAction
        : null;
    return (
      <PlayerSeat
        key={player.id}
        player={withoutTeam(player)}
        orientation={orientation}
        isYou={isMe}
        isActive={!playing && state.phase === "betting" && state.currentPlayerId === player.id}
        secondsRemaining={turnSeconds}
        totalSeconds={TURN_TOTAL_SECONDS}
        cardCount={!isMe && seat.hasCards && !shown && !dealing ? 2 : 0}
        faceCards={shown?.holeCards}
        cardTone={toneOf}
        coins={hold?.stacks?.[player.id] ?? seat.stack}
        showCoins
        statusText={seat.status === "sitting_out" ? sr.poker.waitingConnection : undefined}
        adornment={<PositionTags tags={positionTags(state, seat)} />}
        caption={
          action ? (
            <SeatCaption key={`${state.handNo}-${state.street}-${action.type}-${action.amount}`} text={actionLabel(action)} tone={actionTone(action)} />
          ) : undefined
        }
        reaction={reactionFor(player.id)}
        onTap={onPlayerTap && !isMe ? (anchor) => onPlayerTap(player, anchor) : undefined}
        className={classes}
        style={style}
      />
    );
  }

  /** Ulog ulice ispred igrača, na liniji prema sredini stola. */
  function betStyle(where: Orientation): CSSProperties {
    switch (where) {
      case "top":
        return { left: "50%", transform: "translateX(-50%)", top: "calc(var(--table-top) + 0.15rem)" };
      case "left":
        return { left: "calc(var(--seat-gutter) + 0.5rem)", top: "calc(var(--pk-side-top) + 2.25rem)" };
      case "right":
        return { right: "calc(var(--seat-gutter) + 0.5rem)", top: "calc(var(--pk-side-top) + 2.25rem)" };
      case "bottom":
        return { left: "50%", transform: "translateX(-50%)", bottom: "calc(var(--table-bottom) + 0.15rem)" };
    }
  }
  function bet(player: PublicPlayer | undefined, where: Orientation) {
    const seat: PokerSeatView | undefined = player ? seatOf(player.id) : undefined;
    if (!seat) return null;
    const amount = hold?.bets ? (hold.bets[seat.playerId] ?? 0) : handOver || matchOver ? 0 : seat.streetBet;
    if (amount <= 0) return null;
    return (
      <StreetBet
        key={`bet-${seat.playerId}`}
        playerId={seat.playerId}
        amount={amount}
        hidden={hold?.hiddenBets?.includes(seat.playerId) ?? false}
        style={betStyle(where)}
      />
    );
  }

  const hasSides = Boolean(seats.oppL || seats.oppR);
  const centerTop = hasSides
    ? "calc(var(--pk-side-top) + var(--pk-side-h))"
    : "calc(var(--table-top) + 1.75rem)";

  const bustedPlace = mySeat?.status === "bankrupt" ? mySeat.place : null;
  // Poslije trake rezultata, ne preko nje: igrač prvo vidi kako je ruka završila.
  const showBusted = mySeat?.status === "bankrupt" && !matchOver && !handOver && !bustSeen && !playing;
  const mode: "quick" | "host" | "guest" = isQuickPlay ? "quick" : me?.isHost ? "host" : "guest";

  return (
    <div className="h-[100dvh] w-full bg-surface flex justify-center">
      <div
        className="felt-stage relative h-full w-full max-w-[600px] overflow-hidden md:shadow-2xl md:ring-1 md:ring-black/40"
        data-game="poker"
        data-partner={seats.partner ? "true" : "false"}
        data-sides={hasSides ? "true" : "false"}
        data-table={tableTheme}
      >
        <FeltHeader onMenu={() => setMenuOpen(true)}>
          <span className="pk-blinds">
            {sr.poker.blinds}{" "}
            <b>
              {state.smallBlind}/{state.bigBlind}
            </b>
            <i aria-hidden="true" />
            {sr.poker.nextLevel(state.handsUntilNextLevel)}
          </span>
        </FeltHeader>

        {seats.partner
          ? renderSeat(seats.partner, "top", "absolute left-1/2 -translate-x-1/2", {
              top: "calc(var(--safe-top) + var(--stage-header-h) + var(--stage-partner-lift))",
            })
          : null}
        {seats.oppL
          ? renderSeat(seats.oppL, "left", "absolute left-1 pl-safe-left", { top: "var(--pk-side-top)" })
          : null}
        {seats.oppR
          ? renderSeat(seats.oppR, "right", "absolute right-1 pr-safe-right", { top: "var(--pk-side-top)" })
          : null}

        {bet(seats.partner, "top")}
        {bet(seats.oppL, "left")}
        {bet(seats.oppR, "right")}
        {bet(seats.me, "bottom")}

        {/* Sredina: board i pot(ovi). Sjedišta sa strane su iznad nje (tabla A). */}
        <div
          className="pk-center absolute left-0 right-0 z-10"
          data-deal-from
          style={{ top: centerTop, bottom: "calc(var(--table-bottom) + 1.75rem)" }}
        >
          <Board cards={boardCards} toneOf={toneOf} />
          {/* Sidro letova (ulozi u pot, pot ka pobjedniku) — postoji i kad je pot prazan. */}
          <div className="pk-pot-anchor" data-pot-anchor>
            <Pots pots={pots} />
          </div>
        </div>

        {summary && showResult ? (
          <HandResultBar
            key={`res-${state.handNo}`}
            summary={summary}
            playerOf={playerOf}
            style={{ bottom: "calc(var(--table-bottom) + 0.25rem)" }}
          />
        ) : null}

        {seats.me
          ? renderSeat(seats.me, "bottom", "absolute left-1/2 -translate-x-1/2", {
              bottom: "var(--stage-banner-top)",
            })
          : null}

        {/* Tvoje dvije karte — desno od tvog sjedišta, licem gore. */}
        {/* Igrač koji je upravo ostao bez žetona vidi svoje karte do kraja priče ruke. */}
        {state.myCards.length > 0 && (!iAmOut || (hold?.stillSeated?.includes(state.myPlayerId) ?? false)) && !dealing ? (
          <div
            className="pk-mine"
            {...(mySeat?.folded ? { "data-folded": true } : {})}
            style={{
              left: "calc(50% + var(--seat-avatar-me) / 2 + 0.9rem)",
              bottom: "calc(var(--stage-banner-top) + 0.25rem)",
            }}
          >
            <div className="pk-mine__cards">
              {state.myCards.map((card) => (
                <span key={card.id} className="pk-mine__slot" data-tone={toneOf(card)}>
                  <PlayingCard card={card} size="sm" animateDeal />
                </span>
              ))}
            </div>
            {hint ? <span className="pk-hint">{hint}</span> : null}
          </div>
        ) : null}

        {!matchOver && !iAmOut ? (
          <ActionPanel
            legal={myTurn ? state.legal : null}
            busy={busy}
            onFold={() => void act({ type: "fold" })}
            onCheckOrCall={() => void act({ type: state.legal?.canCheck ? "check" : "call" })}
            onRaise={() => setRaiseOpen(true)}
            waitingName={waitingName}
            outOfHand={Boolean(mySeat?.folded && mySeat.inHand)}
            // „Sljedeća ruka počinje…" tek uz traku rezultata, ne dok showdown traje.
            between={handOver && (!hold || hold.result === true)}
          />
        ) : null}

        {raiseOpen && myTurn && state.legal ? (
          <RaiseSheet
            legal={state.legal}
            currentBet={state.currentBet}
            potTotal={state.potTotal}
            bigBlind={state.bigBlind}
            busy={busy}
            onConfirm={(to) => {
              const legal = state.legal!;
              void act(
                to >= legal.maxTo
                  ? { type: "allin" }
                  : { type: legal.canBet ? "bet" : "raise", amount: to },
              );
            }}
            onClose={() => setRaiseOpen(false)}
          />
        ) : null}

        <ReactionFab
          onReact={onReact}
          side="left"
          style={{ bottom: "var(--stage-hand-top)" }}
          aboveFab={<FeedbackToggles stacked />}
        />

        {menuOpen ? (
          <div
            className="absolute inset-0 z-50 flex items-end justify-center bg-black/60"
            onClick={() => setMenuOpen(false)}
          >
            <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
              <GameMenuSheet
                onRules={() => {
                  setMenuOpen(false);
                  setRulesOpen(true);
                }}
                onLeave={() => {
                  setMenuOpen(false);
                  requestLeave();
                }}
                onClose={() => setMenuOpen(false)}
              />
            </div>
          </div>
        ) : null}

        {showBusted ? (
          <BustedCard
            place={bustedPlace}
            onNewMatch={() => void run(onNewTable)}
            onWatch={() => setBustSeen(true)}
            onLeave={onLeave}
          />
        ) : null}

        {matchOver && !playing ? (
          <MatchEndCard
            rows={sortedPlacements(state)}
            myPlayerId={state.myPlayerId}
            playerOf={playerOf}
            abandoned={state.phase === "abandoned"}
            mode={mode}
            busy={busy}
            onPlayAgain={() => void run(onNewTable)}
            onRematch={() => void run(onRematch)}
            onLeave={onLeave}
          />
        ) : null}

        {levelUpHand ? (
          <span key={`lvl-${state.blindLevel}`} className="pk-level" role="status">
            {sr.poker.levelUp(state.smallBlind, state.bigBlind)}
          </span>
        ) : null}

        <Toast
          message={toast ?? ""}
          visible={toast != null}
          className="absolute left-1/2 -translate-x-1/2 z-50 max-w-[90vw]"
          style={{ bottom: "calc(var(--stage-hand-top) + 0.5rem)" }}
        />

        <RulesModal game="poker" isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

        {leaveOpen ? (
          <LeaveTableSheet
            onConfirm={() => {
              setLeaveOpen(false);
              onLeave();
            }}
            onClose={() => setLeaveOpen(false)}
          />
        ) : null}
      </div>
    </div>
  );
}
