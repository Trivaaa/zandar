"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { getCaptureOptions, type GameEvent } from "@zandar/game-core";
import type {
  Card as CardType,
  CaptureOption,
  PrivateGameStateView,
  ReactionType,
} from "@zandar/shared-types";
import { SeatBubble } from "@/components/SeatBubble";
import { TableArea } from "@/components/TableArea";
import { HandFan } from "@/components/HandFan";
import { TurnTimer } from "@/components/TurnTimer";
import { ScorePill } from "@/components/ScorePill";
import { ReactionFab } from "@/components/ReactionFab";
import { PauseAbandonOverlay } from "@/components/PauseAbandonOverlay";
import { RulesModal } from "@/components/RulesModal";
import { MoveReveal } from "@/components/MoveReveal";
import { FeedbackToggles } from "@/components/FeedbackToggles";
import { arrangeSeats } from "@/lib/seating";
import { getReactionEmoji } from "@/lib/reactions";
import { vibrate, HAPTIC } from "@/lib/haptics";
import { playSfx } from "@/lib/sound";
import { useGameEvents } from "@/lib/useGameEvents";
import { flyToPile } from "@/lib/flyAnimation";
import type { ActiveReaction } from "@/components/GameView";

/**
 * GameScreen — pozicijski live game ekran (DS Faza B integracija).
 *
 * Spaja sve B-komponente sa public game state-om: pozicijski sto (TableSeats +
 * GameTable), TableArea (capture/trail), HandArea (fluid tap), TurnTimer na
 * aktivnom, ScorePill, ReactionFab, PauseAbandonOverlay (uklj. abandoned ekran).
 * Bot-agnostičan — koristi samo PublicPlayer/PrivateGameStateView.
 */

type GameStateWithDeadline = PrivateGameStateView & { turnDeadline?: number };

type GameScreenProps = {
  state: GameStateWithDeadline;
  onPlayCard: (
    cardId: string,
    selectedCaptureCardIds: string[],
  ) => Promise<void>;
  onNextHand: () => Promise<void>;
  onRematch: () => Promise<void>;
  onReact: (type: string) => Promise<void>;
  onLeave?: () => void;
  /** Napusti ovaj sto i nađi novi (Quick Play sa novim igračima). */
  onFindNewTable?: () => void;
  activeReactions: ActiveReaction[];
};

function pileLabel(
  pileId: string,
  players: PrivateGameStateView["players"],
): string {
  if (pileId === "team-0") return "Tim A";
  if (pileId === "team-1") return "Tim B";
  return players.find((p) => p.id === pileId)?.displayName ?? pileId;
}

/** Imena članova tima (za pile "team-N"); null za individualni pile. */
function pileMembers(
  pileId: string,
  players: PrivateGameStateView["players"],
): string | null {
  const m = /^team-(\d+)$/.exec(pileId);
  if (!m) return null;
  const teamId = Number(m[1]);
  const names = players
    .filter((p) => p.teamId === teamId)
    .map((p) => p.displayName);
  return names.length > 0 ? names.join(" · ") : null;
}

export function GameScreen({
  state,
  onPlayCard,
  onNextHand,
  onRematch,
  onReact,
  onLeave,
  onFindNewTable,
  activeReactions,
}: GameScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!error) return;
    vibrate(HAPTIC.error); // haptika na nevažeću akciju (§50.3)
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  // Feedback sloj (§50.6): jedinstvena detekcija događaja pokreće capture-flash i
  // haptiku (a u Fazi 2 i zvuk). Capture-flash je keyed overlay u play-zoni.
  const stageRef = useRef<HTMLDivElement>(null);
  const [flash, setFlash] = useState<{ key: number; sweep: boolean }>({
    key: 0,
    sweep: false,
  });
  const handleGameEvent = useCallback((event: GameEvent) => {
    switch (event.type) {
      case "capture":
        // J-sweep dobija jači flash (§50.5); običan capture standardni.
        setFlash((f) => ({ key: f.key + 1, sweep: event.jackSweep }));
        flyToPile(stageRef.current, event.playerId); // ghost poleti ka kupcu
        playSfx(event.jackSweep ? "sweep" : "capture");
        if (event.byMe) vibrate(HAPTIC.capture); // haptika samo za MOJE kupljenje
        break;
      case "trail":
        playSfx("place");
        break;
      case "deal":
        playSfx("deal");
        break;
      case "yourTurn":
        playSfx("turn");
        vibrate(HAPTIC.turn);
        break;
      case "matchEnd":
        playSfx(event.iWon ? "win" : "lose");
        break;
      // handEnd → bez zvuka (matchEnd nosi rezultat)
    }
  }, []);
  useGameEvents(state, handleGameEvent);

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const isHost = me?.isHost ?? false;
  const isPlaying = state.phase === "playing";
  const myTurn = isPlaying && state.currentPlayerId === state.myPlayerId;
  const isHandOver = state.phase === "hand_finished";
  const isMatchOver = state.phase === "match_finished";

  const selectedCard = myTurn
    ? (state.myHand.find((c) => c.id === selectedId) ?? null)
    : null;

  const reactionsDisabled =
    state.phase === "paused_for_reconnect" ||
    state.phase === "abandon_vote" ||
    state.phase === "abandoned";

  const turnDeadline = isPlaying ? state.turnDeadline : undefined;
  const waiting = state.players.find((p) => p.connectionStatus !== "connected");

  async function play(cardId: string, captureIds: string[]) {
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      await onPlayCard(cardId, captureIds);
      setSelectedId(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Greška");
    } finally {
      setBusy(false);
    }
  }

  function handleCapture(option: CaptureOption) {
    if (selectedCard) void play(selectedCard.id, option.cardIds);
  }
  function handleTrail() {
    if (selectedCard) void play(selectedCard.id, []);
  }
  // Prvi tap: selekcija/lift. Drugi tap iste karte: izvrši ako je jednoznačno
  // (trail bez capture-a / jedan capture). Više opcija → tapni grupu na stolu.
  function handleSelect(card: CardType) {
    if (!myTurn || busy) return;
    if (selectedId === card.id) {
      const opts = getCaptureOptions(card, state.table);
      if (opts.length === 0) return void play(card.id, []);
      if (opts.length === 1) return void play(card.id, opts[0]!.cardIds);
      return; // multi-capture: izbor grupe je na stolu
    }
    setSelectedId(card.id);
  }

  async function runAction(fn: () => Promise<void>) {
    setPendingAction(true);
    try {
      await fn();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Greška");
    } finally {
      setPendingAction(false);
    }
  }

  const lastHandScore =
    state.handScores.length > 0
      ? state.handScores[state.handScores.length - 1]
      : null;
  const matchWinner = isMatchOver
    ? (Object.entries(state.matchScore).sort(([, a], [, b]) => b - a)[0]?.[0] ??
      null)
    : null;

  // Pozicijski raspored: ti dole, partner gore, protivnici lijevo/desno.
  const seats = arrangeSeats(state.players, state.myPlayerId);

  function seatTimer(isTurn: boolean) {
    return isTurn && turnDeadline != null ? (
      <TurnTimer deadline={turnDeadline} size="pill" />
    ) : undefined;
  }

  return (
    // Outer surround: na desktopu felt-stage se centrira, ostatak je tamna
    // podloga. Na mobilu (stage = w-full) izgleda identično kao prije.
    <div className="h-[100dvh] w-full bg-surface flex justify-center">
    <div
      ref={stageRef}
      className="relative h-full w-full max-w-[600px] overflow-hidden bg-felt md:shadow-2xl md:ring-1 md:ring-black/40"
      style={{
        backgroundImage:
          "radial-gradient(120% 90% at 50% 28%, rgba(255,255,255,0.06), transparent 55%), radial-gradient(140% 130% at 50% 125%, rgba(0,0,0,0.45), transparent 60%)",
      }}
    >
      {/* Partner / jedini protivnik — gore-centar */}
      {seats.partner && (
        <SeatBubble
          displayName={seats.partner.displayName}
          cardCount={state.handCounts[seats.partner.id] ?? 0}
          isCurrentTurn={state.currentPlayerId === seats.partner.id}
          connectionStatus={seats.partner.connectionStatus}
          teamId={seats.partner.teamId}
          seatId={seats.partner.id}
          showBacks
          timer={seatTimer(state.currentPlayerId === seats.partner.id)}
          className="top-3 left-1/2 -translate-x-1/2 mt-safe-top"
        />
      )}
      {/* Protivnik lijevo */}
      {seats.oppL && (
        <SeatBubble
          displayName={seats.oppL.displayName}
          cardCount={state.handCounts[seats.oppL.id] ?? 0}
          isCurrentTurn={state.currentPlayerId === seats.oppL.id}
          connectionStatus={seats.oppL.connectionStatus}
          teamId={seats.oppL.teamId}
          seatId={seats.oppL.id}
          showBacks
          backsOrientation="left"
          timer={seatTimer(state.currentPlayerId === seats.oppL.id)}
          className="top-[42%] left-1 -translate-y-1/2"
        />
      )}
      {/* Protivnik desno */}
      {seats.oppR && (
        <SeatBubble
          displayName={seats.oppR.displayName}
          cardCount={state.handCounts[seats.oppR.id] ?? 0}
          isCurrentTurn={state.currentPlayerId === seats.oppR.id}
          connectionStatus={seats.oppR.connectionStatus}
          teamId={seats.oppR.teamId}
          seatId={seats.oppR.id}
          showBacks
          backsOrientation="right"
          timer={seatTimer(state.currentPlayerId === seats.oppR.id)}
          className="top-[42%] right-1 -translate-y-1/2"
        />
      )}

      {/* Centralna play-zona — odigrane karte + capture/trail.
          Desktop (md): šira da se karte ne gomilaju u usku kolonu. */}
      <div className="absolute top-[46%] left-1/2 -translate-x-1/2 -translate-y-1/2 w-[64%] max-w-[230px] md:max-w-[380px] z-10">
        <div
          data-play-zone
          className="relative rounded-token-lg border border-white/10 bg-white/[0.03] shadow-[inset_0_0_40px_rgba(0,0,0,0.35)] px-3 py-2 min-h-[120px]"
        >
          <TableArea
            bare
            table={state.table}
            selectedCard={selectedCard}
            onCapture={handleCapture}
            onTrail={handleTrail}
          />
          {flash.key > 0 && (
            <span
              key={flash.key}
              aria-hidden
              className={`pointer-events-none absolute inset-0 rounded-token-lg ${
                flash.sweep ? "animate-jack-sweep" : "animate-capture-flash"
              }`}
            />
          )}
        </div>
      </div>

      {/* Ti — dole-centar iznad ruke */}
      {seats.me && (
        <SeatBubble
          displayName={seats.me.displayName}
          cardCount={state.myHand.length}
          isCurrentTurn={myTurn}
          connectionStatus={seats.me.connectionStatus}
          teamId={seats.me.teamId}
          seatId={seats.me.id}
          isMe
          timer={seatTimer(myTurn)}
          className="bottom-[150px] left-1/2 -translate-x-1/2"
        />
      )}

      {/* Ruka — lepeza na dnu */}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 pb-safe-bottom z-20">
        <HandFan
          cards={state.myHand}
          isMyTurn={myTurn}
          selectedCardId={selectedId}
          onSelectCard={handleSelect}
          disabled={busy}
        />
      </div>

      {/* Overlay: rezultat */}
      <ScorePill
        players={state.players}
        matchScore={state.matchScore}
        targetScore={state.targetScore}
        handScores={state.handScores}
      />

      {/* Move reveal — šta je zadnji potez uradio (ko/koja karta/šta pokupio) */}
      {isPlaying && <MoveReveal state={state} />}

      {/* Overlay: rules (gornji lijevi) */}
      <button
        type="button"
        onClick={() => setRulesOpen(true)}
        className="absolute top-0 left-0 z-40 m-2 mt-safe-top ml-safe-left rounded-token-md bg-surface-raised/95 border border-white/10 px-2.5 py-1.5 text-xs font-bold text-muted active:bg-surface"
      >
        ? Pravila
      </button>

      {/* Overlay: zvuk/vibracija (ispod Pravila) — §50.4 */}
      <FeedbackToggles className="absolute top-9 left-0 z-40 m-2 ml-safe-left" />

      {/* Overlay: reactions */}
      <ReactionFab onReact={onReact} disabled={reactionsDisabled} />

      {/* Floating active reactions (gornji centar) */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 z-30 mt-safe-top pt-12 flex flex-col items-center gap-1 pointer-events-none">
        {activeReactions.map((r) => {
          const sender = state.players.find((p) => p.id === r.playerId);
          return (
            <div
              key={r.id}
              className="bg-surface-raised/95 rounded-token-md px-2.5 py-1.5 shadow-lg flex items-center gap-1.5 animate-fade-in"
            >
              <span className="text-2xl">
                {getReactionEmoji(r.type as ReactionType)}
              </span>
              <span className="text-xs font-semibold truncate max-w-[40vw]">
                {sender?.displayName ?? "?"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Pause / abandon */}
      <PauseAbandonOverlay
        phase={state.phase}
        waitingForName={waiting?.displayName}
        myPlayerId={state.myPlayerId}
        onLeave={onLeave}
      />

      {/* End-of-hand / end-of-match modal */}
      {(isHandOver || isMatchOver) && lastHandScore && (
        <div className="absolute inset-0 z-50 bg-black/70 flex items-center justify-center p-4">
          <div className="relative w-full max-w-sm rounded-token-lg bg-surface-raised border border-white/10 shadow-xl p-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            {/* X — ostani na sajtu bez revanša (idi na početnu). Samo kraj meča. */}
            {isMatchOver && onLeave && (
              <button
                type="button"
                onClick={onLeave}
                aria-label="Zatvori i idi na početnu"
                className="absolute top-2 right-2 w-8 h-8 rounded-full flex items-center justify-center text-muted hover:text-white hover:bg-white/10 active:scale-95 transition"
              >
                ✕
              </button>
            )}

            <h2 className="text-xl font-bold mb-3 text-center px-6">
              {isMatchOver
                ? `🏆 ${matchWinner ? pileLabel(matchWinner, state.players) : ""} pobjeđuje!`
                : `Ruka #${lastHandScore.handNumber} gotova`}
            </h2>

            <div className="rounded-token-md bg-surface p-3 mb-3">
              <p className="font-semibold mb-2 text-sm text-muted">
                Poeni iz ove ruke:
              </p>
              {Object.entries(lastHandScore.pointsByPile).map(([pileId, pts]) => {
                const members = pileMembers(pileId, state.players);
                return (
                  <div key={pileId} className="flex justify-between items-start text-sm gap-2 py-0.5">
                    <span className="min-w-0">
                      <span className="font-medium">{pileLabel(pileId, state.players)}</span>
                      {members && (
                        <span className="block text-[11px] text-muted truncate">{members}</span>
                      )}
                    </span>
                    <span className={pts > 0 ? "text-accent font-bold" : "text-muted"}>
                      +{pts}
                    </span>
                  </div>
                );
              })}
            </div>

            <div className="rounded-token-md bg-surface p-3 mb-4">
              <p className="font-semibold mb-2 text-sm text-muted">
                Ukupni rezultat:
              </p>
              {Object.entries(state.matchScore).map(([pileId, score]) => {
                const members = pileMembers(pileId, state.players);
                return (
                  <div key={pileId} className="flex justify-between items-start text-sm gap-2 py-0.5">
                    <span className="min-w-0">
                      <span className="font-medium">{pileLabel(pileId, state.players)}</span>
                      {members && (
                        <span className="block text-[11px] text-muted truncate">{members}</span>
                      )}
                    </span>
                    <span className="font-bold tabular-nums shrink-0">
                      {score} / {state.targetScore}
                    </span>
                  </div>
                );
              })}
            </div>

            {isMatchOver ? (
              <div className="space-y-2">
                {isHost ? (
                  <button
                    type="button"
                    onClick={() => runAction(onRematch)}
                    disabled={pendingAction}
                    className="w-full px-4 py-3 bg-accent text-accent-contrast rounded-token-md font-bold active:scale-95 disabled:opacity-50 transition-transform"
                  >
                    {pendingAction ? "..." : "🔄 Revanš (isti sto)"}
                  </button>
                ) : (
                  <p className="text-center text-muted text-sm py-1">
                    Čeka se da host pokrene revanš…
                  </p>
                )}
                {onFindNewTable && (
                  <button
                    type="button"
                    onClick={onFindNewTable}
                    className="w-full px-4 py-3 bg-surface border border-white/15 rounded-token-md font-semibold active:scale-95 transition-transform"
                  >
                    🔎 Novi sto i igrači
                  </button>
                )}
                {onLeave && (
                  <button
                    type="button"
                    onClick={onLeave}
                    className="w-full text-center text-muted text-sm py-1.5 hover:text-white transition-colors"
                  >
                    Izađi na početnu
                  </button>
                )}
              </div>
            ) : isHost ? (
              <button
                type="button"
                onClick={() => runAction(onNextHand)}
                disabled={pendingAction}
                className="w-full px-4 py-3 bg-accent text-accent-contrast rounded-token-md font-bold active:scale-95 disabled:opacity-50 transition-transform"
              >
                {pendingAction ? "..." : "Sljedeća ruka →"}
              </button>
            ) : (
              <p className="text-center text-muted text-sm py-2">
                Čeka se da host pokrene sljedeću ruku…
              </p>
            )}
          </div>
        </div>
      )}

      {/* Error toast */}
      {error && (
        <div className="absolute bottom-24 left-1/2 -translate-x-1/2 z-50 bg-danger rounded-token-md px-4 py-2 max-w-[90vw] shadow-lg text-sm text-white">
          ⚠️ {error}
        </div>
      )}

      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </div>
    </div>
  );
}
