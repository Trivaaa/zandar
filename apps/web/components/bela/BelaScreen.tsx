"use client";

import { useEffect, useRef, useState, type CSSProperties } from "react";
import type {
  AbandonVote,
  BelaAction,
  BelaGamePayload,
  Card,
  PublicPlayer,
  ReactionType,
  TableTheme,
} from "@zandar/shared-types";

import { ReactionFab } from "@/components/ReactionFab";
import { RulesModal } from "@/components/RulesModal";
import { FeltHeader } from "@/components/felt/FeltHeader";
import { PlayerSeat } from "@/components/felt/PlayerSeat";
import { SeatCaption } from "@/components/felt/SeatCaption";
import { CardDeckContext } from "@/components/felt/cardDeck";
import { ReactionBubble } from "@/components/overlay/EmojiReactions";
import { GameMenuSheet } from "@/components/overlay/GameMenuSheet";
import { LeaveTableSheet } from "@/components/overlay/LeaveTableSheet";
import { PauseAbandonOverlay } from "@/components/overlay/PauseAbandonOverlay";
import { Toast } from "@/components/overlay/Toast";
import { TrickArea, TrumpBadge } from "@/components/raub/RaubParts";
import { runBackHandler, useBackHandler, useBrowserBackGuard } from "@/lib/backHandlers";
import {
  belaOverlayPhase,
  belaPhaseLabel,
  belaPlayHint,
  belaReportContext,
  belaSeatCaption,
  declarationsLine,
  sortBelaHand,
  suitTitle,
  teamPair,
  type Dir,
} from "@/lib/belaView";
import { huSuitIcon } from "@/lib/hungarianDeck";
import { isNative } from "@/lib/platform";
import type { ActiveReaction } from "@/lib/reactions";
import { arrangeSeats } from "@/lib/seating";
import { sr } from "@/lib/sr";
import { useCountdown } from "@/lib/useCountdown";

import {
  BelaReportSheet,
  BugButton,
  ReportMenuRow,
  BelaHand,
  BelaHandSummary,
  BelaMatchEnd,
  BelaScore,
  BelaTableSheet,
  CallPanel,
  DeclarationBar,
  DeclarationShow,
  TurnBar,
} from "./BelaParts";

const TOAST_MS = 3500;
/** Odbijanja koja znače samo „stanje je otišlo dalje" — bez poruke igraču. */
const QUIET_ERRORS = new Set(["NOT_YOUR_TURN", "STALE_STATE", "INVALID_GAME_PHASE", "INVALID_ACTION", "INVALID_PHASE"]);
/** Pun štih ostaje vidljiv 1 s, pa klizi ka pobjedniku (kao Raub). */
const TRICK_HOLD_MS = 1000;
const TRICK_COLLECT_MS = 420;

export type BelaScreenProps = {
  state: BelaGamePayload;
  tableTheme?: TableTheme | undefined;
  /** Javni sto (Quick Play): kraj meča nudi „Igraj ponovo", ne revanš. */
  isQuickPlay: boolean;
  onAction: (action: BelaAction) => Promise<void>;
  onNextHand: () => Promise<void>;
  onRematch: () => Promise<void>;
  onNewTable: () => Promise<void>;
  onReact: (type: ReactionType) => Promise<void>;
  onLeave: () => void;
  onWaitMore?: (() => Promise<void>) | undefined;
  onAbandonVote?: ((vote: AbandonVote) => Promise<void>) | undefined;
  activeReactions: ActiveReaction[];
  onPlayerTap?: ((player: PublicPlayer, anchor: DOMRect) => void) | undefined;
  /** Pregled (`/dev/bela`): tabela otvorena odmah. */
  initialTableOpen?: boolean | undefined;
  /** Naša veza sa stolom je prekinuta — potez zaključan. */
  offline?: boolean | undefined;
};

/**
 * Bela sto (tabla `UI_Bela`, docs/bela-spec.md). Isti felt, podloge,
 * `PlayerSeat`, meni, reakcije, pauza i list za izlazak kao Raub; novo je ono
 * što Bela ima: zvanje aduta, zvanje uz prvu kartu, ruka u dva reda (odluka 8)
 * i rezultat dva tima. Tvoje sjedište se ne crta — potez pokazuje traka iznad
 * ruke. Server je sudija: dozvoljene karte su `legalCardIds`.
 */
export function BelaScreen({
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
  offline = false,
}: BelaScreenProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [leaveOpen, setLeaveOpen] = useState(false);
  const [tableOpen, setTableOpen] = useState(initialTableOpen);
  // Prijava greške sa stola (odluka 17). Beta prozor NIJE ovdje: iskače prije
  // ulaska za sto (`useBelaBetaGate`), jer server pokreće partiju čim igrač sjedne.
  const [reportOpen, setReportOpen] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [busyAt, setBusyAt] = useState<number | null>(null);
  const [running, setRunning] = useState(false);
  const busy = running || busyAt === state.stateVersion || offline;
  const inflight = useRef(false);
  const [pick, setPick] = useState<{ v: number; id: string | null }>({ v: -1, id: null });
  const picked = pick.v === state.stateVersion ? pick.id : null;
  // „Zovi / Ne zovem" važi za ruku u kojoj je izabrano; podrazumijevano Zovi (odluka 9).
  const [skipDecl, setSkipDecl] = useState<number | null>(null);
  const declare = skipDecl !== state.dealNo;

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const playerOf = (id: string) => state.players.find((p) => p.id === id);
  const nameOf = (id: string) => playerOf(id)?.displayName ?? "";
  const seatOf = (id: string) => state.seats.find((s) => s.playerId === id);

  const matchOver = state.phase === "match_finished" || state.phase === "abandoned";
  const handOver = state.phase === "hand_complete";
  const pausePhase = belaOverlayPhase(state);
  const interrupted = pausePhase !== null;
  const myTurn =
    state.phase === "playing" && !interrupted && !offline && state.currentPlayerId === state.myPlayerId;
  const totalSeconds = state.rules.turnTimeoutSeconds;
  const turnSeconds = useCountdown(state.turnDeadline, totalSeconds);
  const pauseTotalMs = state.interruption ? Math.max(1, state.interruption.endsAt - state.interruption.startedAt) : 1;
  const pauseSeconds = useCountdown(state.interruption?.endsAt, pauseTotalMs / 1000);
  const waiting =
    state.players.find((p) => p.connectionStatus !== "connected" && !p.left) ??
    state.players.find((p) => p.connectionStatus !== "connected");

  const match = teamPair(state.scores, state.myTeam);
  const target = state.rules.targetScore;

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
    id === state.myPlayerId ? "bottom" : id === seats.partner?.id ? "top" : id === seats.oppL?.id ? "left" : "right";
  const shownTrick = currentOpen ?? (holding && lastDoneIdx >= 0 ? tricks[lastDoneIdx]! : null);
  const collectTo =
    !currentOpen && shownTrick?.winnerId && collecting === doneKey ? dirOf(shownTrick.winnerId) : null;

  // Zvanja se pokazuju poslije prvog štiha, dok se ne bace dvije karte drugog (B7).
  const doneCount = tricks.filter((t) => t.winnerId !== null).length;
  const second = doneCount === 1 ? tricks[1] : undefined;
  const showDecl =
    state.phase === "playing" &&
    !holding &&
    doneCount === 1 &&
    (second?.plays.length ?? 0) < 2 &&
    state.shownDeclarations.some((p) => p.declarations.length > 0);

  const requestLeave = () => {
    if (matchOver) onLeave();
    else setLeaveOpen(true);
  };
  useBackHandler(true, () => {
    if (matchOver) onLeave();
    else setMenuOpen(true);
  });
  useBackHandler(menuOpen, () => setMenuOpen(false));
  useBackHandler(rulesOpen, () => setRulesOpen(false));
  useBackHandler(tableOpen, () => setTableOpen(false));
  useBackHandler(reportOpen, () => setReportOpen(false));
  useBrowserBackGuard(!isNative, !matchOver, () => void runBackHandler());

  function showError(err: unknown) {
    const code = err instanceof Error ? err.message : "";
    if (QUIET_ERRORS.has(code)) return;
    setToast(code === "GAME_PAUSED" ? sr.bela.errors.paused : sr.bela.errors.generic);
  }

  async function act(action: BelaAction) {
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

  // ---- ruka ----
  const playing = myTurn && state.step === "tricks";
  const calling = myTurn && state.step === "calling" && state.callOptions !== null;
  const legal = new Set(state.legalCardIds ?? []);
  const handCards = sortBelaHand(state.myCards, state.trumpSuit);
  const selectable = (card: Card) => playing && !busy && legal.has(card.id);
  const disabledIds = handCards.filter((c) => !selectable(c)).map((c) => c.id);
  const dimmedIds = playing ? handCards.filter((c) => !legal.has(c.id)).map((c) => c.id) : [];
  const declLine = playing ? declarationsLine(state.myDeclarations) : null;
  const play = (card: Card) =>
    void act({ type: "play", cardId: card.id, ...(state.myDeclarations.length > 0 ? { declare } : {}) });

  function onCard(card: Card) {
    if (!selectable(card)) return;
    // Tap pa potvrda (isti obrazac kao Žandar i Raub): drugi dodir je potez.
    if (picked === card.id) play(card);
    else setPick({ v: state.stateVersion, id: card.id });
  }
  const preDrag = useRef<string | null>(null);
  const onDragStart = (card: Card) => {
    preDrag.current = picked;
    setPick({ v: state.stateVersion, id: card.id });
  };
  const onDragCancel = () => setPick({ v: state.stateVersion, id: preDrag.current });
  const onDragDrop = (card: Card) => {
    if (!selectable(card)) return onDragCancel();
    play(card);
  };

  const turnText = offline
    ? sr.bela.hint.offline
    : playing
      ? belaPlayHint(state)
      : state.phase === "playing" && state.currentPlayerId && !interrupted
        ? sr.bela.hint.waiting(nameOf(state.currentPlayerId))
        : null;

  function reactionFor(id: string) {
    const r = [...activeReactions].reverse().find((x) => x.playerId === id);
    return r ? <ReactionBubble type={r.type as ReactionType} visible /> : undefined;
  }

  /** „Bela! +20" dok je na stolu štih u kojem je bačena druga karta para. */
  function belaShownFor(id: string): boolean {
    if (state.belaBy !== id || !shownTrick || !state.trumpSuit) return false;
    return shownTrick.plays.some(
      (p) => p.playerId === id && p.card.suit === state.trumpSuit && (p.card.rank === "K" || p.card.rank === "Q"),
    );
  }

  function renderSeat(player: PublicPlayer, orientation: Dir, className: string, style: CSSProperties) {
    const seat = seatOf(player.id);
    if (!seat) return null;
    const away = player.connectionStatus !== "connected";
    const bela = belaShownFor(player.id);
    const caption = bela ? sr.bela.decl.bela(state.rules.belaPoints) : belaSeatCaption(state, seat);
    const caller = state.callerId === player.id && state.trumpSuit !== null && !handOver && !matchOver;
    return (
      <PlayerSeat
        key={player.id}
        player={player}
        orientation={orientation}
        teamTone={seat.team === (state.myTeam ?? 0) ? "a" : "b"}
        isActive={state.phase === "playing" && !interrupted && state.currentPlayerId === player.id}
        secondsRemaining={turnSeconds}
        totalSeconds={totalSeconds}
        cardCount={seat.handCount}
        statusText={away ? sr.bela.seat.waitingConnection : undefined}
        adornment={
          state.dealerId === player.id || caller ? (
            <span className="rb-tags">
              {state.dealerId === player.id && !matchOver ? (
                <span className="pk-tag" data-tag="D">
                  {sr.bela.seat.dealer}
                </span>
              ) : null}
              {caller && state.trumpSuit ? (
                <span className="bl-caller" role="img" aria-label={sr.bela.callerOf(suitTitle(state.trumpSuit))}>
                  {/* eslint-disable-next-line @next/next/no-img-element -- mala statična ikonica, i u APK exportu */}
                  <img src={huSuitIcon(state.trumpSuit)} alt="" draggable={false} />
                </span>
              ) : null}
            </span>
          ) : undefined
        }
        caption={
          caption ? (
            <SeatCaption
              key={`${state.dealNo}-${state.step}-${caption}`}
              text={caption}
              tone={bela ? "bet" : "normal"}
            />
          ) : undefined
        }
        reaction={reactionFor(player.id)}
        onTap={onPlayerTap ? (anchor) => onPlayerTap(player, anchor) : undefined}
        className={[className, "z-20", away ? "pk-away" : ""].filter(Boolean).join(" ")}
        style={style}
      />
    );
  }

  const inTricks = state.step === "tricks" || handOver;
  const live = state.phase === "playing" && state.step === "tricks" ? teamPair(state.livePoints, state.myTeam) : null;
  const mode: "quick" | "host" | "guest" = isQuickPlay ? "quick" : me?.isHost ? "host" : "guest";
  const host = state.players.find((p) => p.isHost);
  const showSummary = handOver && !holding && state.lastHand !== null;

  const pauseFrame =
    pausePhase === "abandoned"
      ? "absolute inset-0 z-50"
      : pausePhase === "abandon_vote"
        ? "absolute inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        : "absolute inset-x-0 z-50 flex justify-center p-3 top-[calc(var(--safe-top)+var(--stage-header-h))]";

  return (
    // Bela se igra mađaricama (odluka 2) — bez izbora kompleta u V1.
    <CardDeckContext.Provider value="hungarian">
      <div className="h-[100dvh] w-full bg-surface flex justify-center">
        <div
          data-deck="hungarian"
          className="felt-stage relative h-full w-full max-w-[600px] overflow-hidden md:shadow-2xl md:ring-1 md:ring-black/40"
          data-game="bela"
          data-partner={seats.partner ? "true" : "false"}
          data-sides="true"
          data-table={tableTheme}
          data-tricks={inTricks ? "true" : "false"}
          data-rows={handCards.length > 4 ? "2" : "1"}
        >
          <FeltHeader onMenu={() => setMenuOpen(true)}>
            <span className="rb-head bl-head">
              <b className="rb-head__phase">{belaPhaseLabel(state)}</b>
              {!matchOver && state.trumpSuit ? <TrumpBadge trump={state.trumpSuit} offered={null} double={false} /> : null}
              <BelaScore match={match} live={live} target={target} onOpen={() => setTableOpen(true)} />
            </span>
          </FeltHeader>

          {seats.partner
            ? renderSeat(seats.partner, "top", "absolute left-1/2 -translate-x-1/2", {
                top: "calc(var(--safe-top) + var(--stage-header-h) + var(--stage-partner-lift))",
              })
            : null}
          {seats.oppL ? renderSeat(seats.oppL, "left", "absolute left-1 -translate-y-1/2 pl-safe-left", { top: "var(--table-mid)" }) : null}
          {seats.oppR ? renderSeat(seats.oppR, "right", "absolute right-1 -translate-y-1/2 pr-safe-right", { top: "var(--table-mid)" }) : null}

          {/* Kutija stola: prostor štiha, ili pokazana zvanja poslije prvog štiha. */}
          <div
            className="rb-table bl-table absolute left-1/2 -translate-x-1/2 z-10"
            {...(playing ? { "data-drag-target": true } : {})}
            style={{
              top: "var(--table-top)",
              bottom: "var(--table-bottom)",
              width: "calc(100% - 2 * var(--seat-gutter))",
            }}
          >
            {inTricks && shownTrick ? <TrickArea plays={shownTrick.plays} dirOf={dirOf} collectTo={collectTo} /> : null}
            {showDecl ? <DeclarationShow shown={state.shownDeclarations} nameOf={nameOf} /> : null}
          </div>

          {/* Nad rukom: panel aduta ili traka zvanja, pa traka poteza. */}
          {!matchOver ? (
            <div className="bl-above absolute left-0 right-0 z-30" style={{ bottom: "var(--stage-hand-top)" }}>
              {calling && state.callOptions ? (
                <CallPanel
                  options={state.callOptions}
                  seconds={turnSeconds}
                  busy={busy}
                  onCall={(suit) => void act({ type: "call", suit })}
                />
              ) : null}
              {declLine ? (
                <DeclarationBar
                  cards={state.myDeclarations.flatMap((d) => d.cards)}
                  label={declLine.label}
                  points={declLine.points}
                  declare={declare}
                  onChange={(on) => setSkipDecl(on ? null : state.dealNo)}
                />
              ) : null}
              {turnText && !calling && !handOver ? (
                <TurnBar text={turnText} active={playing} warn={playing && legal.size < handCards.length} />
              ) : null}
            </div>
          ) : null}

          <div className="absolute bottom-0 left-0 right-0 pb-safe-bottom z-20">
            {handCards.length > 0 ? (
              <BelaHand
                cards={handCards}
                selectedCardIds={picked ? [picked] : []}
                disabledCardIds={disabledIds}
                dimmedCardIds={dimmedIds}
                idle={!playing}
                onSelect={onCard}
                {...(playing ? { onDragStart, onDragDrop, onDragCancel } : {})}
              />
            ) : null}
          </div>

          {/* Iznad ruke desno: ruka od 4 karte (288 px) ne ostavlja mjesta sa
              strane. Dok je otvoren panel aduta ili traka zvanja, dugmad se
              sklanjaju — inače bi pokrila „Dalje" / „Ne zovem". */}
          {!calling && !declLine ? (
            <ReactionFab
              onReact={onReact}
              disabled={interrupted}
              // Bez zvuka na Bela stolu (odluka 18): na njegovom mjestu je prijava greške.
              aboveFab={<BugButton onClick={() => setReportOpen(true)} />}
              style={{ bottom: "calc(var(--stage-hand-top) - var(--safe-bottom))" }}
            />
          ) : null}

          {showSummary && !matchOver && state.lastHand ? (
            <BelaHandSummary
              key={`sum-${state.lastHand.dealNo}`}
              result={state.lastHand}
              myTeam={state.myTeam}
              match={match}
              target={target}
              isHost={me?.isHost === true}
              hostName={host?.displayName ?? ""}
              busy={busy}
              onNextHand={() => void run(onNextHand)}
              onTable={() => setTableOpen(true)}
            />
          ) : null}

          {matchOver && !holding && pausePhase !== "abandoned" ? (
            <BelaMatchEnd
              placements={state.placements}
              myPlayerId={state.myPlayerId}
              myTeam={state.myTeam}
              match={match}
              hands={state.history.length}
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
            <BelaTableSheet
              history={state.history}
              myTeam={state.myTeam}
              match={match}
              target={target}
              onClose={() => setTableOpen(false)}
            />
          ) : null}

          {menuOpen ? (
            <div className="absolute inset-0 z-50 flex items-end justify-center bg-black/60" onClick={() => setMenuOpen(false)}>
              <div onClick={(e) => e.stopPropagation()} className="w-full flex justify-center">
                <GameMenuSheet
                  title={sr.games.bela.name}
                  subtitle={sr.bela.menuLine(target)}
                  extra={
                    <ReportMenuRow
                      onClick={() => {
                        setMenuOpen(false);
                        setReportOpen(true);
                      }}
                    />
                  }
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

          <RulesModal game="bela" isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />

          {reportOpen ? <BelaReportSheet context={belaReportContext(state)} onClose={() => setReportOpen(false)} /> : null}

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
    </CardDeckContext.Provider>
  );
}
