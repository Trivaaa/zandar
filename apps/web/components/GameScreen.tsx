"use client";

import { useEffect, useState } from "react";
import type {
  Card as CardType,
  CaptureOption,
  PrivateGameStateView,
  ReactionType,
} from "@zandar/shared-types";
import { TableSeats } from "@/components/TableSeats";
import { TableArea } from "@/components/TableArea";
import { HandArea } from "@/components/HandArea";
import { TurnTimer } from "@/components/TurnTimer";
import { ScorePill } from "@/components/ScorePill";
import { ReactionFab } from "@/components/ReactionFab";
import { PauseAbandonOverlay } from "@/components/PauseAbandonOverlay";
import { RulesModal } from "@/components/RulesModal";
import { getReactionEmoji } from "@/lib/reactions";
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

export function GameScreen({
  state,
  onPlayCard,
  onNextHand,
  onRematch,
  onReact,
  onLeave,
  activeReactions,
}: GameScreenProps) {
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

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
  function handleSelect(card: CardType) {
    setSelectedId((id) => (id === card.id ? null : card.id));
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

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-surface">
      <TableSeats
        players={state.players}
        myPlayerId={state.myPlayerId}
        currentPlayerId={state.currentPlayerId}
        handCounts={state.handCounts}
        capturedCounts={state.capturedCounts}
        turnDeadline={turnDeadline}
        table={
          <TableArea
            table={state.table}
            selectedCard={selectedCard}
            onCapture={handleCapture}
            onTrail={handleTrail}
          />
        }
        hand={
          <HandArea
            cards={state.myHand}
            isMyTurn={myTurn}
            selectedCardId={selectedId}
            onSelectCard={handleSelect}
            disabled={busy}
            timer={
              myTurn && turnDeadline != null ? (
                <TurnTimer deadline={turnDeadline} size="md" />
              ) : undefined
            }
          />
        }
      />

      {/* Overlay: rezultat */}
      <ScorePill
        players={state.players}
        matchScore={state.matchScore}
        targetScore={state.targetScore}
        handScores={state.handScores}
      />

      {/* Overlay: rules (gornji lijevi) */}
      <button
        type="button"
        onClick={() => setRulesOpen(true)}
        className="absolute top-0 left-0 z-40 m-2 mt-safe-top ml-safe-left rounded-token-md bg-surface-raised/95 border border-white/10 px-2.5 py-1.5 text-xs font-bold text-muted active:bg-surface"
      >
        ? Pravila
      </button>

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
          <div className="w-full max-w-sm rounded-token-lg bg-surface-raised border border-white/10 shadow-xl p-4 max-h-[90vh] overflow-y-auto animate-fade-in">
            <h2 className="text-xl font-bold mb-3 text-center">
              {isMatchOver
                ? `🏆 ${matchWinner ? pileLabel(matchWinner, state.players) : ""} pobjeđuje!`
                : `Ruka #${lastHandScore.handNumber} gotova`}
            </h2>

            <div className="rounded-token-md bg-surface p-3 mb-3">
              <p className="font-semibold mb-2 text-sm text-muted">
                Poeni iz ove ruke:
              </p>
              {Object.entries(lastHandScore.pointsByPile).map(([pileId, pts]) => (
                <div key={pileId} className="flex justify-between text-sm">
                  <span>{pileLabel(pileId, state.players)}</span>
                  <span
                    className={pts > 0 ? "text-accent font-bold" : "text-muted"}
                  >
                    +{pts}
                  </span>
                </div>
              ))}
            </div>

            <div className="rounded-token-md bg-surface p-3 mb-4">
              <p className="font-semibold mb-2 text-sm text-muted">
                Ukupni rezultat:
              </p>
              {Object.entries(state.matchScore).map(([pileId, score]) => (
                <div key={pileId} className="flex justify-between text-sm">
                  <span>{pileLabel(pileId, state.players)}</span>
                  <span className="font-bold tabular-nums">
                    {score} / {state.targetScore}
                  </span>
                </div>
              ))}
            </div>

            {isHost ? (
              <button
                type="button"
                onClick={() => runAction(isMatchOver ? onRematch : onNextHand)}
                disabled={pendingAction}
                className="w-full px-4 py-3 bg-accent text-accent-contrast rounded-token-md font-bold active:scale-95 disabled:opacity-50 transition-transform"
              >
                {pendingAction
                  ? "..."
                  : isMatchOver
                    ? "🔄 Reanš"
                    : "Sljedeća ruka →"}
              </button>
            ) : (
              <p className="text-center text-muted text-sm py-2">
                Čeka se da host{" "}
                {isMatchOver ? "pokrene reanš" : "pokrene sljedeću ruku"}…
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
  );
}
