"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  AbandonVote,
  Card,
  PublicPlayer,
  RaubAction,
  RaubGamePayload,
  ReactionType,
  TableTheme,
} from "@zandar/shared-types";

import { FeedbackToggles } from "@/components/FeedbackToggles";
import { ReactionFab } from "@/components/ReactionFab";
import { RulesModal } from "@/components/RulesModal";
import { FeltHeader } from "@/components/felt/FeltHeader";
import { PlayerHand } from "@/components/felt/PlayerHand";
import { PlayerSeat } from "@/components/felt/PlayerSeat";
import { SeatCaption } from "@/components/felt/SeatCaption";
import { ReactionBubble } from "@/components/overlay/EmojiReactions";
import { GameMenuSheet } from "@/components/overlay/GameMenuSheet";
import { LeaveTableSheet } from "@/components/overlay/LeaveTableSheet";
import { PauseAbandonOverlay } from "@/components/overlay/PauseAbandonOverlay";
import { Toast } from "@/components/overlay/Toast";
import { useBackHandler, useBrowserBackGuard } from "@/lib/backHandlers";
import { isNative } from "@/lib/platform";
import {
  declarerTag,
  isDropped,
  overlayPhase,
  lockedHandIds,
  panelFor,
  phaseLabel,
  seatCaptionText,
  sortedRaubPlacements,
  type Dir,
} from "@/lib/raubView";
import type { ActiveReaction } from "@/lib/reactions";
import { arrangeSeats } from "@/lib/seating";
import { sr } from "@/lib/sr";
import { useCountdown } from "@/lib/useCountdown";

import {
  ActionPanel,
  HandSummaryCard,
  OpenCardNote,
  RaubMatchEnd,
  ScoreTableSheet,
  SeatTags,
  TalonPile,
  TrickArea,
  TrumpBadge,
} from "./RaubParts";

const TOAST_MS = 3500;
/**
 * Odbijanja koja samo znače „stanje je već otišlo dalje" (dvostruki dodir,
 * potez bota stigao prvi). Novo stanje stiže samo — bez poruke igraču.
 */
const QUIET_ERRORS = new Set(["NOT_YOUR_TURN", "STALE_STATE", "INVALID_GAME_PHASE", "INVALID_ACTION", "INVALID_PHASE"]);
/** Pun štih ostaje vidljiv (spec: 1 s), pa karte klize ka pobjedniku. */
const TRICK_HOLD_MS = 1000;
const TRICK_COLLECT_MS = 350;

export type RaubScreenProps = {
  state: RaubGamePayload;
  tableTheme?: TableTheme | undefined;
  /** Javni sto (Quick Play): kraj meča nudi „Igraj ponovo", ne revanš. */
  isQuickPlay: boolean;
  onAction: (action: RaubAction) => Promise<void>;
  onNextHand: () => Promise<void>;
  onRematch: () => Promise<void>;
  /** Novi javni Raub sto (Igraj ponovo). */
  onNewTable: () => Promise<void>;
  onReact: (type: ReactionType) => Promise<void>;
  onLeave: () => void;
  onWaitMore?: (() => Promise<void>) | undefined;
  onAbandonVote?: ((vote: AbandonVote) => Promise<void>) | undefined;
  activeReactions: ActiveReaction[];
  onPlayerTap?: ((player: PublicPlayer, anchor: DOMRect) => void) | undefined;
  /** Pregled (`/dev/raub`): tabela otvorena odmah. */
  initialTableOpen?: boolean | undefined;
};

/** Karte licem nadolje za djelioca prije odluke — bez ikakve informacije. */
function hiddenCards(n: number): Card[] {
  return Array.from({ length: n }, (_, i) => ({ id: `hidden-${i}`, suit: "spades", rank: "7" }));
}

/**
 * Raub sto (Claude Design „UI · Raub — kompletan UI"; docs/raub-spec.md).
 *
 * Isti felt, iste podloge, isti `PlayerSeat`, `PlayerHand`, meni, reakcije,
 * pauza i list za izlazak kao Žandar; novo je samo ono što Raub ima: talon,
 * oznaka aduta, panel licitacije/zamjene, prostor štiha, tabela. Server je
 * sudija: panel šalje namjeru, dozvoljene karte su `legalCardIds`, a sto se
 * crta tek iz sljedećeg stanja.
 */
export function RaubScreen({
  state,
  tableTheme,
  isQuickPlay,
  onAction,
  onNextHand,
  onRematch,
  onNewTable,
  onReact,
  onLeave,
  onWaitMore,
  onAbandonVote,
  activeReactions,
  onPlayerTap,
  initialTableOpen = false,
}: RaubScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(initialTableOpen);
  const [toast, setToast] = useState<string | null>(null);
  // Zaključano za JEDNU verziju stanja: novo stanje sa servera otključava samo.
  const [busyAt, setBusyAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const busy = running || busyAt === state.stateVersion;
  // Sinhrona brava: `busyAt` je stanje i važi tek od sljedećeg rendera, pa bi
  // drugi dodir u istom trenutku poslao isti potez još jednom.
  const inflight = useRef(false);
  // Izbor karata važi samo za verziju stanja u kojoj je napravljen.
  const [pick, setPick] = useState<{ v: number; ids: string[] }>({ v: -1, ids: [] });
  const picked = pick.v === state.stateVersion ? pick.ids : [];

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const mySeat = state.seats.find((s) => s.playerId === state.myPlayerId);
  const playerOf = (id: string) => state.players.find((p) => p.id === id);
  const nameOf = (id: string) => playerOf(id)?.displayName ?? "";
  const seatOf = (id: string) => state.seats.find((s) => s.playerId === id);

  const matchOver = state.phase === "match_finished" || state.phase === "abandoned";
  const handOver = state.phase === "hand_complete";
  const pausePhase = overlayPhase(state);
  const interrupted = pausePhase !== null;
  const myTurn = state.phase === "playing" && !interrupted && state.currentPlayerId === state.myPlayerId;
  const totalSeconds = state.rules.turnTimeoutSeconds;
  const turnSeconds = useCountdown(state.turnDeadline, totalSeconds);

  // Pauza/glasanje: apsolutni rok sa servera, isti sat kao za potez.
  const pauseTotalMs = state.interruption ? Math.max(1, state.interruption.endsAt - state.interruption.startedAt) : 1;
  const pauseSeconds = useCountdown(state.interruption?.endsAt, pauseTotalMs / 1000);
  const waiting = state.players.find((p) => p.connectionStatus !== "connected" && !p.left) ??
    state.players.find((p) => p.connectionStatus !== "connected");

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), TOAST_MS);
    return () => clearTimeout(t);
  }, [toast]);

  // ---- pun štih: 1 s vidljiv, pa klizi ka pobjedniku ----
  const tricks = state.tricks;
  const current = tricks.at(-1);
  const currentOpen = current && current.winnerId === null && current.plays.length > 0 ? current : null;
  const lastDoneIdx = tricks.findLastIndex((t) => t.winnerId !== null);
  const doneKey = lastDoneIdx >= 0 ? `${state.dealNo}:${lastDoneIdx}` : null;
  const [released, setReleased] = useState<string | null>(null);
  const [collecting, setCollecting] = useState<string | null>(null);
  const holding = !currentOpen && doneKey !== null && released !== doneKey;
  useEffect(() => {
    if (!holding || !doneKey) return;
    const t1 = setTimeout(() => setCollecting(doneKey), TRICK_HOLD_MS);
    const t2 = setTimeout(() => setReleased(doneKey), TRICK_HOLD_MS + TRICK_COLLECT_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [holding, doneKey]);

  const seats = arrangeSeats(state.players, state.myPlayerId);
  const dirOf = (id: string): Dir =>
    id === state.myPlayerId
      ? "bottom"
      : id === seats.partner?.id
        ? "top"
        : id === seats.oppL?.id
          ? "left"
          : "right";
  const shownTrick = currentOpen ?? (holding && lastDoneIdx >= 0 ? tricks[lastDoneIdx]! : null);
  const collectTo =
    !currentOpen && shownTrick?.winnerId && collecting === doneKey ? dirOf(shownTrick.winnerId) : null;

  const requestLeave = () => {
    if (matchOver) onLeave();
    else setLeaveOpen(true);
  };
  useBackHandler(true, requestLeave);
  useBackHandler(menuOpen, () => setMenuOpen(false));
  useBackHandler(rulesOpen, () => setRulesOpen(false));
  useBackHandler(tableOpen, () => setTableOpen(false));
  useBrowserBackGuard(!isNative, !matchOver, requestLeave);

  function showError(err: unknown) {
    const code = err instanceof Error ? err.message : "";
    if (QUIET_ERRORS.has(code)) return;
    setToast(code === "GAME_PAUSED" ? sr.raub.errors.paused : sr.raub.errors.generic);
  }

  async function act(action: RaubAction) {
    if (busy || inflight.current) return;
    inflight.current = true;
    setBusyAt(state.stateVersion);
    try {
      await onAction(action);
    } catch (err) {
      setBusyAt(null);
      showError(err);
    } finally {
      inflight.current = false;
    }
  }

  async function run(fn: () => Promise<void>) {
    if (running || inflight.current) return;
    inflight.current = true;
    setRunning(true);
    try {
      await fn();
    } catch (err) {
      showError(err);
    } finally {
      inflight.current = false;
      setRunning(false);
    }
  }

  // ---- ruka: šta se može dodirnuti ----
  const panel = interrupted ? ({ kind: "none" } as const) : panelFor(state, nameOf);
  const legal = new Set(state.legalCardIds ?? []);
  const blocked = new Set<string>();
  if (state.lockedCardId) blocked.add(state.lockedCardId);
  if (state.openCard?.playerId === state.myPlayerId) blocked.add(state.openCard.card.id);

  const handCards = state.myCardsHidden ? hiddenCards(mySeat?.handCount ?? 0) : state.myCards;
  const selectable = (card: Card): boolean => {
    if (!myTurn || busy || state.myCardsHidden) return false;
    if (panel.kind === "play") return legal.has(card.id);
    if (panel.kind === "exchange") return card.id !== state.lockedCardId;
    if (panel.kind === "discard") return !blocked.has(card.id);
    return false;
  };
  const disabledIds = handCards.filter((c) => !selectable(c)).map((c) => c.id);
  // Zatamnjene su samo karte koje pravila zabranjuju u štihu (glavna pomoć početnicima).
  const dimmedIds = panel.kind === "play" ? handCards.filter((c) => !legal.has(c.id)).map((c) => c.id) : [];
  const lockedIds = lockedHandIds(state, panel.kind);

  function onCard(card: Card) {
    if (!selectable(card)) return;
    if (panel.kind === "play") {
      // Tap pa potvrda (isti obrazac kao Žandar): drugi dodir na istu kartu je potez.
      if (picked[0] === card.id) void act({ type: "play", cardId: card.id });
      else setPick({ v: state.stateVersion, ids: [card.id] });
      return;
    }
    if (panel.kind === "discard") {
      setPick({ v: state.stateVersion, ids: picked[0] === card.id ? [] : [card.id] });
      return;
    }
    if (panel.kind === "exchange") {
      const has = picked.includes(card.id);
      if (!has && picked.length >= panel.max) return;
      setPick({ v: state.stateVersion, ids: has ? picked.filter((x) => x !== card.id) : [...picked, card.id] });
    }
  }

  function reactionFor(id: string) {
    const r = [...activeReactions].reverse().find((x) => x.playerId === id);
    return r ? <ReactionBubble type={r.type as ReactionType} visible /> : undefined;
  }

  function renderSeat(player: PublicPlayer, orientation: Dir, className: string, style: CSSProperties) {
    const seat = seatOf(player.id);
    if (!seat) return null;
    const isMe = player.id === state.myPlayerId;
    const dropped = isDropped(state, seat);
    const caption = seatCaptionText(state, seat);
    const decl = declarerTag(state, seat);
    const away = player.connectionStatus !== "connected";
    // Bočna sjedišta: oznaka nosioca ide u red ispod bodova — pločica uz avatar
    // bi ušla u sto i pokrila talon i štih (izmjereno na 360 px).
    const side = orientation === "left" || orientation === "right";
    const sideDecl = side && decl ? (decl.progress ?? sr.raub.declarer.short(state.requiredTricks)) : undefined;
    return (
      <PlayerSeat
        key={player.id}
        player={player}
        orientation={orientation}
        isYou={isMe}
        isActive={state.phase === "playing" && !interrupted && state.currentPlayerId === player.id}
        secondsRemaining={turnSeconds}
        totalSeconds={totalSeconds}
        cardCount={isMe || dropped ? 0 : seat.handCount}
        coins={seat.score}
        showCoins
        statusText={away ? sr.raub.seat.waitingConnection : dropped ? sr.raub.seat.dropped : sideDecl}
        adornment={
          <SeatTags
            dealer={state.dealerId === player.id && !matchOver}
            declarer={side ? null : decl}
            tricks={state.step === "tricks" || handOver ? seat.tricks : null}
          />
        }
        caption={
          caption ? (
            <SeatCaption key={`${state.dealNo}-${state.step}-${caption}`} text={caption} tone={caption === sr.raub.bid.raub ? "bet" : "normal"} />
          ) : undefined
        }
        reaction={reactionFor(player.id)}
        onTap={onPlayerTap && !isMe ? (anchor) => onPlayerTap(player, anchor) : undefined}
        className={[className, "z-20", dropped ? "rb-dropped" : "", away ? "pk-away" : "", sideDecl && !away ? "rb-declarer" : ""]
          .filter(Boolean)
          .join(" ")}
        style={style}
      />
    );
  }

  const hasSides = Boolean(seats.oppL || seats.oppR);
  const inTricks = state.step === "tricks" || handOver;
  const biddingNow = state.phase === "playing" && (state.step === "await_open" || state.step === "bidding" || state.step === "swap_seven");
  const showSummary = handOver && !holding && state.lastHand !== null;
  const mode: "quick" | "host" | "guest" = isQuickPlay ? "quick" : me?.isHost ? "host" : "guest";
  const host = state.players.find((p) => p.isHost);

  const pauseFrame =
    pausePhase === "abandoned"
      ? "absolute inset-0 z-50"
      : pausePhase === "abandon_vote"
        ? "absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        : "absolute inset-x-0 z-50 flex justify-center p-3 top-[calc(var(--safe-top)+var(--stage-header-h))]";

  return (
    <div className="h-[100dvh] w-full bg-surface flex justify-center">
      <div
        className="felt-stage relative h-full w-full max-w-[600px] overflow-hidden md:shadow-2xl md:ring-1 md:ring-black/40"
        data-game="raub"
        data-partner={seats.partner ? "true" : "false"}
        data-sides={hasSides ? "true" : "false"}
        data-table={tableTheme}
      >
        <FeltHeader onMenu={() => setMenuOpen(true)}>
          <span className="rb-head">
            <b className="rb-head__phase">{phaseLabel(state)}</b>
            {/* Adut u zaglavlju: vidljiv na svakoj visini ekrana i ne pokriva sto
                (u uglu stola je na 360×640 pokrivao talon i štih). */}
            {!matchOver ? (
              <TrumpBadge
                trump={state.trumpSuit}
                offered={state.offeredSuit}
                double={state.phase === "playing" && state.multiplier === 2}
              />
            ) : null}
            {state.pendingRefas > 0 && !matchOver && !(state.phase === "playing" && state.multiplier === 2) ? (
              <span className="rb-x2" aria-label={sr.raub.summary.pending(state.pendingRefas)}>
                {sr.raub.refaChip(state.pendingRefas)}
              </span>
            ) : null}
            <button type="button" className="rb-head__table" onClick={() => setTableOpen(true)}>
              {sr.raub.table.title}
            </button>
          </span>
        </FeltHeader>

        {seats.partner
          ? renderSeat(seats.partner, "top", "absolute left-1/2 -translate-x-1/2", {
              top: "calc(var(--safe-top) + var(--stage-header-h) + var(--stage-partner-lift))",
            })
          : null}
        {seats.oppL ? renderSeat(seats.oppL, "left", "absolute left-1 -translate-y-1/2 pl-safe-left", { top: "var(--table-mid)" }) : null}
        {seats.oppR ? renderSeat(seats.oppR, "right", "absolute right-1 -translate-y-1/2 pr-safe-right", { top: "var(--table-mid)" }) : null}

        {/* Kutija stola: talon (licitacija, zamjena) ili prostor štiha, adut u uglu. */}
        <div
          className="rb-table absolute left-1/2 -translate-x-1/2 z-10"
          style={{
            top: "var(--table-top)",
            bottom: "var(--table-bottom)",
            width: "calc(100% - 2 * var(--seat-gutter))",
          }}
        >
          {inTricks ? (
            shownTrick ? <TrickArea plays={shownTrick.plays} dirOf={dirOf} collectTo={collectTo} /> : null
          ) : state.phase === "playing" ? (
            <TalonPile
              talon={state.talon}
              flips={state.talonFlips}
              maxFlips={state.rules.maxTalonFlips}
              deckCount={state.deckCount}
              showCounter={biddingNow}
              taken={
                state.takenTalonCard && state.talonTakenBy
                  ? {
                      card: state.takenTalonCard,
                      label:
                        state.talonTakenBy === state.myPlayerId
                          ? sr.raub.talonTakenMe
                          : sr.raub.talonTaken(nameOf(state.talonTakenBy)),
                    }
                  : null
              }
            />
          ) : null}
          {/* Tuđa otvorena karta (moja je već u ruci, sa katancem). */}
          {state.openCard && state.openCard.playerId !== state.myPlayerId && state.phase === "playing" && !inTricks ? (
            <OpenCardNote card={state.openCard.card} name={nameOf(state.openCard.playerId)} />
          ) : null}
        </div>

        {/* Panel nad rukom — ista pozicija za sve korake. */}
        {!matchOver ? (
          <div className="rb-panel-slot absolute left-0 right-0 z-30" style={{ bottom: "var(--stage-hand-top)" }}>
            <ActionPanel
              panel={panel}
              busy={busy}
              selectedCount={picked.length}
              deckCount={state.deckCount}
              onOpen={() => void act({ type: "open" })}
              onBlind={() => void act({ type: "blind" })}
              onBid={(raub) => void act({ type: "bid", bid: raub ? "raub" : "pass" })}
              onSwap={(swap) => void act({ type: "swap_seven", swap })}
              onDiscard={() => picked[0] && void act({ type: "discard", cardId: picked[0] })}
              onGo={(go) => void act({ type: "go", go })}
              onExchange={() => void act({ type: "exchange", cardIds: picked })}
            />
          </div>
        ) : null}

        {seats.me
          ? renderSeat(seats.me, "bottom", "absolute left-1/2 -translate-x-1/2", { bottom: "var(--stage-banner-top)" })
          : null}

        <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pb-safe-bottom z-20">
          {handCards.length > 0 ? (
            <PlayerHand
              cards={handCards}
              faceUp={!state.myCardsHidden}
              selectedCardIds={picked}
              lockedCardIds={lockedIds}
              disabledCardIds={disabledIds}
              dimmedCardIds={dimmedIds}
              onSelect={onCard}
            />
          ) : null}
        </div>

        {/* Isti položaj kao Žandar (iznad ruke, desno) — lijevo bi pokrio panel. */}
        <ReactionFab onReact={onReact} disabled={interrupted} aboveFab={<FeedbackToggles stacked />} />

        {showSummary && !matchOver && state.lastHand ? (
          <HandSummaryCard
            key={`sum-${state.lastHand.dealNo}`}
            result={state.lastHand}
            playerOf={playerOf}
            myPlayerId={state.myPlayerId}
            isHost={me?.isHost === true}
            hostName={host?.displayName ?? ""}
            busy={busy}
            onNextHand={() => void run(onNextHand)}
            onTable={() => setTableOpen(true)}
          />
        ) : null}

        {matchOver && !holding && pausePhase !== "abandoned" ? (
          <RaubMatchEnd
            rows={sortedRaubPlacements(state)}
            myPlayerId={state.myPlayerId}
            playerOf={playerOf}
            abandoned={state.phase === "abandoned"}
            mode={mode}
            busy={busy}
            onPlayAgain={() => void run(onNewTable)}
            onRematch={() => void run(onRematch)}
            onLeave={onLeave}
            onTable={() => setTableOpen(true)}
          />
        ) : null}

        {tableOpen ? (
          <ScoreTableSheet
            history={state.history}
            seats={state.seats}
            pendingRefas={state.pendingRefas}
            playerOf={playerOf}
            myPlayerId={state.myPlayerId}
            onClose={() => setTableOpen(false)}
          />
        ) : null}

        {menuOpen ? (
          <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setMenuOpen(false)}>
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

        {pausePhase ? (
          <div className={pauseFrame}>
            <PauseAbandonOverlay
              phase={pausePhase}
              players={state.players}
              waitingForName={waiting?.displayName}
              waitingLeft={waiting?.left === true}
              myPlayerId={state.myPlayerId}
              {...(state.interruption ? { remainingMs: pauseSeconds * 1000, totalMs: pauseTotalMs } : {})}
              {...(state.interruption?.votes ? { abandonVotes: state.interruption.votes } : {})}
              {...(onWaitMore ? { onWait: () => void run(onWaitMore) } : {})}
              {...(onAbandonVote ? { onVote: (v: AbandonVote) => void run(() => onAbandonVote(v)) } : {})}
              onLeave={requestLeave}
            />
          </div>
        ) : null}

        <Toast
          message={toast ?? ""}
          visible={toast != null}
          className="absolute left-1/2 -translate-x-1/2 z-50 max-w-[90vw]"
          style={{ bottom: "calc(var(--stage-hand-top) + 3.5rem)" }}
        />

        <RulesModal game="raub" isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

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
