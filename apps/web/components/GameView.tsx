"use client";

import { useEffect, useState } from "react";
import { getCaptureOptions } from "@zandar/game-core";
import type {
  Card as CardType,
  CaptureOption,
  PrivateGameStateView,
} from "@zandar/shared-types";
import { Card } from "@/components/Card";
import { CardBack } from "@/components/CardBack";
import { RulesModal } from "@/components/RulesModal";

const REACTIONS = [
  { type: "laugh", emoji: "😂" },
  { type: "wow", emoji: "😮" },
  { type: "fire", emoji: "🔥" },
  { type: "clap", emoji: "👏" },
  { type: "cry", emoji: "😭" },
  { type: "angry", emoji: "😠" },
  { type: "thinking", emoji: "🤔" },
  { type: "respect", emoji: "🙌" },
] as const;

function getPileDisplayName(
  pileId: string,
  players: PrivateGameStateView["players"],
): string {
  const player = players.find((p) => p.id === pileId);
  if (player) return player.displayName;
  if (pileId === "team-0") return "Tim A";
  if (pileId === "team-1") return "Tim B";
  return pileId;
}

function getReactionEmoji(type: string): string {
  return REACTIONS.find((r) => r.type === type)?.emoji ?? "?";
}

type PendingMove = {
  card: CardType;
  options: CaptureOption[];
};

export type ActiveReaction = {
  id: string;
  playerId: string;
  type: string;
};

type GameViewState = PrivateGameStateView & {
  turnDeadline?: number;
};

type GameViewProps = {
  state: GameViewState;
  onPlayCard: (
    cardId: string,
    selectedCaptureCardIds: string[],
  ) => Promise<void>;
  onNextHand: () => Promise<void>;
  onRematch: () => Promise<void>;
  onReact: (type: string) => Promise<void>;
  activeReactions: ActiveReaction[];
};

function TurnCountdown({ deadline }: { deadline: number }) {
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    const interval = setInterval(() => setNow(Date.now()), 250);
    return () => clearInterval(interval);
  }, []);

  const remainingMs = Math.max(0, deadline - now);
  const seconds = Math.ceil(remainingMs / 1000);
  const totalMs = 30000;
  const ratio = Math.max(0, Math.min(1, remainingMs / totalMs));

  let color = "text-green-400";
  let bgColor = "bg-green-500";
  if (ratio < 0.33) {
    color = "text-red-400";
    bgColor = "bg-red-500";
  } else if (ratio < 0.66) {
    color = "text-yellow-400";
    bgColor = "bg-yellow-500";
  }

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      <span className={`text-xs sm:text-sm font-mono font-bold ${color}`}>
        ⏱ {seconds}s
      </span>
      <div className="w-12 sm:w-16 h-1.5 bg-zinc-700 rounded overflow-hidden">
        <div
          className={`h-full ${bgColor} transition-all duration-300`}
          style={{ width: `${ratio * 100}%` }}
        />
      </div>
    </div>
  );
}

export function GameView({
  state,
  onPlayCard,
  onNextHand,
  onRematch,
  onReact,
  activeReactions,
}: GameViewProps) {
  const [rulesOpen, setRulesOpen] = useState(false);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);
  const [reactionDisabled, setReactionDisabled] = useState(false);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(null), 4000);
    return () => clearTimeout(t);
  }, [error]);

  const me = state.players.find((p) => p.id === state.myPlayerId);
  const others = state.players.filter((p) => p.id !== state.myPlayerId);
  const myTurn = state.currentPlayerId === state.myPlayerId;
  const iAmHost = me?.isHost ?? false;
  const isHandOver = state.phase === "hand_finished";
  const isMatchOver = state.phase === "match_finished";
  const isPlaying = state.phase === "playing";
  const lastHandScore =
    state.handScores.length > 0
      ? state.handScores[state.handScores.length - 1]
      : null;

  const matchWinner = isMatchOver
    ? Object.entries(state.matchScore).sort(
        ([, a], [, b]) => b - a,
      )[0]?.[0]
    : null;

  async function clickCard(card: CardType) {
    if (!myTurn || playing || isHandOver || isMatchOver) return;
    setError(null);
    const options = getCaptureOptions(card, state.table);

    if (options.length <= 1) {
      await playMove(card.id, options[0]?.cardIds ?? []);
    } else {
      setPendingMove({ card, options });
    }
  }

  async function playMove(cardId: string, selectedCaptureCardIds: string[]) {
    setPlaying(true);
    try {
      await onPlayCard(cardId, selectedCaptureCardIds);
      setPendingMove(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setPlaying(false);
    }
  }

  async function selectOption(option: CaptureOption) {
    if (!pendingMove) return;
    await playMove(pendingMove.card.id, option.cardIds);
  }

  async function handleNextHand() {
    setPendingAction(true);
    try {
      await onNextHand();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setPendingAction(false);
    }
  }

  async function handleRematch() {
    setPendingAction(true);
    try {
      await onRematch();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Greška");
    } finally {
      setPendingAction(false);
    }
  }

  async function handleReact(type: string) {
    if (reactionDisabled) return;
    setReactionDisabled(true);
    setTimeout(() => setReactionDisabled(false), 2000);
    try {
      await onReact(type);
    } catch {
      // tihi fail
    }
  }

  return (
    <main className="min-h-screen bg-green-900 text-white p-3 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-3 sm:space-y-6 pb-24 sm:pb-24">
        <div className="flex justify-between items-center gap-2">
          <h1 className="text-base sm:text-xl font-bold flex items-center gap-2">
            Žandar · Ruka #{state.handNumber}
            <button
              onClick={() => setRulesOpen(true)}
              className="text-xs bg-zinc-800 hover:bg-zinc-700 px-2 py-1 rounded font-normal"
              type="button"
            >
              ? Pravila
            </button>
          </h1>
          <div className="text-xs sm:text-sm text-green-300 whitespace-nowrap">
            Špil: {state.deckCount} · Cilj: {state.targetScore}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3">
          {others.map((p) => {
            const opponentTurn = state.currentPlayerId === p.id && isPlaying;
            return (
              <div
                key={p.id}
                className={`bg-zinc-900 rounded p-2 sm:p-3 ${
                  opponentTurn ? "ring-2 ring-yellow-500" : "opacity-70"
                }`}
              >
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-7 h-7 sm:w-8 sm:h-8 bg-zinc-700 rounded-full flex items-center justify-center font-bold text-xs sm:text-sm shrink-0">
                    {p.displayName.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-xs sm:text-sm truncate">
                      {p.displayName}
                      {opponentTurn && (
                        <span className="ml-1.5 text-yellow-400 text-xs">
                          NA POTEZU
                        </span>
                      )}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {state.handCounts[p.id] ?? 0} karata
                    </p>
                  </div>
                </div>
                {opponentTurn && state.turnDeadline && (
                  <div className="mb-2">
                    <TurnCountdown deadline={state.turnDeadline} />
                  </div>
                )}
                <div className="flex gap-0.5 sm:gap-1">
                  {Array.from({ length: state.handCounts[p.id] ?? 0 }).map(
                    (_, i) => (
                      <div key={i} className="scale-[0.4] sm:scale-50 -mx-3 sm:-mx-3">
                        <CardBack />
                      </div>
                    ),
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="bg-green-800 rounded-lg p-3 sm:p-6">
          <p className="text-xs sm:text-sm text-green-300 mb-2 sm:mb-3 text-center">
            Sto ({state.table.length}{" "}
            {state.table.length === 1 ? "karta" : "karata"})
          </p>
          <div className="flex flex-wrap justify-center gap-1.5 sm:gap-2 min-h-[5rem] sm:min-h-[7rem]">
            {state.table.length === 0 ? (
              <p className="text-green-400 italic self-center text-sm">
                Sto je prazan
              </p>
            ) : (
              state.table.map((card) => <Card key={card.id} card={card} />)
            )}
          </div>
        </div>

        <div
          className={`bg-zinc-900 rounded-lg p-3 sm:p-4 ${
            myTurn && isPlaying ? "ring-2 ring-yellow-500" : ""
          }`}
        >
          <div className="flex justify-between items-center mb-2 sm:mb-3 gap-2 flex-wrap">
            <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
              <p className="font-semibold text-sm sm:text-base">
                {me?.displayName} (ti)
                {myTurn && isPlaying && (
                  <span className="ml-1.5 px-1.5 py-0.5 bg-yellow-500 text-zinc-900 text-xs font-bold rounded">
                    NA POTEZU
                  </span>
                )}
              </p>
              {myTurn && isPlaying && state.turnDeadline && (
                <TurnCountdown deadline={state.turnDeadline} />
              )}
            </div>
            <p className="text-xs sm:text-sm text-zinc-400 whitespace-nowrap">
              {state.matchScore[state.myPlayerId] ?? 0} / {state.targetScore}
            </p>
          </div>
          <div className="flex justify-center gap-1.5 sm:gap-2 flex-wrap min-h-[5rem] sm:min-h-[7rem]">
            {state.myHand.length === 0 ? (
              <p className="text-zinc-500 italic self-center text-sm">
                Ruka prazna
              </p>
            ) : (
              state.myHand.map((card) => (
                <Card
                  key={card.id}
                  card={card}
                  onClick={
                    myTurn && !playing && !isHandOver && !isMatchOver
                      ? () => clickCard(card)
                      : undefined
                  }
                />
              ))
            )}
          </div>
        </div>

        <div className="bg-zinc-900 rounded p-2 sm:p-3">
          <p className="text-xs sm:text-sm font-semibold mb-1 sm:mb-2">
            Ukupni score:
          </p>
          <div className="space-y-1 text-xs sm:text-sm">
            {Object.entries(state.matchScore).map(([pileId, score]) => (
              <div key={pileId} className="flex justify-between">
                <span className="truncate mr-2">
                  {getPileDisplayName(pileId, state.players)}
                </span>
                <span className="font-bold whitespace-nowrap">
                  {score} / {state.targetScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reactions panel — kompaktnije na mobi */}
      <div className="fixed bottom-2 sm:bottom-4 left-1/2 -translate-x-1/2 flex gap-0.5 sm:gap-1 bg-zinc-900/95 rounded-full px-2 sm:px-3 py-1.5 sm:py-2 shadow-lg z-30 max-w-[95vw]">
        {REACTIONS.map((r) => (
          <button
            key={r.type}
            onClick={() => handleReact(r.type)}
            disabled={reactionDisabled}
            className="text-xl sm:text-2xl hover:scale-125 active:scale-110 transition-transform p-1 disabled:opacity-40 disabled:cursor-not-allowed"
            type="button"
            title={r.type}
          >
            {r.emoji}
          </button>
        ))}
      </div>

      <div className="fixed top-4 right-2 sm:right-4 space-y-2 z-30 pointer-events-none max-w-[45vw]">
        {activeReactions.map((r) => {
          const sender = state.players.find((p) => p.id === r.playerId);
          return (
            <div
              key={r.id}
              className="bg-zinc-900/95 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 shadow-lg flex items-center gap-1.5 sm:gap-2 animate-bounce"
            >
              <span className="text-2xl sm:text-3xl">
                {getReactionEmoji(r.type)}
              </span>
              <span className="text-xs sm:text-sm font-semibold truncate">
                {sender?.displayName ?? "?"}
              </span>
            </div>
          );
        })}
      </div>

      {/* Capture selection modal */}
      {pendingMove && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-3 sm:p-4">
          <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg sm:text-xl font-bold mb-3">
              Šta želiš da kupiš?
            </h2>
            <div className="mb-3 sm:mb-4">
              <p className="text-sm text-green-300 mb-2">Igraš:</p>
              <Card card={pendingMove.card} />
            </div>
            <p className="text-sm text-green-300 mb-2">Opcije:</p>
            <div className="space-y-2 sm:space-y-3">
              {pendingMove.options.map((option) => (
                <button
                  key={option.optionId}
                  onClick={() => selectOption(option)}
                  disabled={playing}
                  className="w-full p-3 sm:p-4 bg-green-800 hover:bg-green-700 active:bg-green-700 rounded-lg text-left transition-colors disabled:opacity-50"
                  type="button"
                >
                  <p className="text-xs sm:text-sm text-green-300 mb-2">
                    {option.reason === "rank_match"
                      ? "Istog ranka"
                      : option.reason === "sum_match"
                        ? "Zbir vrijednosti"
                        : "Žandar kupi sve"}
                  </p>
                  <div className="flex gap-1.5 sm:gap-2 flex-wrap">
                    {option.cardIds.map((id) => {
                      const card = state.table.find((c) => c.id === id);
                      if (!card) return null;
                      return <Card key={id} card={card} />;
                    })}
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setPendingMove(null)}
              disabled={playing}
              className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded disabled:opacity-50 w-full sm:w-auto"
              type="button"
            >
              Otkaži
            </button>
          </div>
        </div>
      )}

      {/* End-of-hand / End-of-match modal */}
      {(isHandOver || isMatchOver) && lastHandScore && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-3 sm:p-4">
          <div className="bg-zinc-900 rounded-lg p-4 sm:p-6 max-w-md w-full max-h-[90vh] overflow-y-auto">
            <h2 className="text-xl sm:text-2xl font-bold mb-3 sm:mb-4 text-center">
              {isMatchOver
                ? `🏆 ${matchWinner ? getPileDisplayName(matchWinner, state.players) : ""} pobjeđuje!`
                : `Ruka #${lastHandScore.handNumber} gotova`}
            </h2>

            <div className="bg-green-800 rounded p-3 mb-3">
              <p className="font-semibold mb-2 text-sm">
                Poeni iz ove ruke:
              </p>
              {Object.entries(lastHandScore.pointsByPile).map(
                ([pileId, points]) => (
                  <div
                    key={pileId}
                    className="flex justify-between text-sm"
                  >
                    <span>{getPileDisplayName(pileId, state.players)}</span>
                    <span
                      className={
                        points > 0
                          ? "text-yellow-400 font-bold"
                          : "text-zinc-500"
                      }
                    >
                      +{points}
                    </span>
                  </div>
                ),
              )}
            </div>

            <div className="bg-zinc-800 rounded p-3 mb-3 text-sm space-y-1">
              <p className="font-semibold mb-2 text-zinc-400">Detalji:</p>
              <div className="flex justify-between">
                <span>Najviše karata (2)</span>
                <span>
                  {lastHandScore.breakdown.mostCards?.winnerPileId
                    ? getPileDisplayName(
                        lastHandScore.breakdown.mostCards.winnerPileId,
                        state.players,
                      )
                    : "Neriješeno"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Najviše trefova (1)</span>
                <span>
                  {lastHandScore.breakdown.mostClubs?.winnerPileId
                    ? getPileDisplayName(
                        lastHandScore.breakdown.mostClubs.winnerPileId,
                        state.players,
                      )
                    : "Neriješeno"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>2 tref (1)</span>
                <span>
                  {lastHandScore.breakdown.twoOfClubs?.winnerPileId
                    ? getPileDisplayName(
                        lastHandScore.breakdown.twoOfClubs.winnerPileId,
                        state.players,
                      )
                    : "—"}
                </span>
              </div>
              <div className="flex justify-between">
                <span>10 karo (1)</span>
                <span>
                  {lastHandScore.breakdown.tenOfDiamonds?.winnerPileId
                    ? getPileDisplayName(
                        lastHandScore.breakdown.tenOfDiamonds.winnerPileId,
                        state.players,
                      )
                    : "—"}
                </span>
              </div>
            </div>

            <div className="bg-green-800 rounded p-3 mb-4">
              <p className="font-semibold mb-2 text-sm">Ukupni score:</p>
              {Object.entries(state.matchScore).map(([pileId, score]) => (
                <div
                  key={pileId}
                  className="flex justify-between text-sm"
                >
                  <span>{getPileDisplayName(pileId, state.players)}</span>
                  <span className="font-bold">
                    {score} / {state.targetScore}
                  </span>
                </div>
              ))}
            </div>

            {iAmHost ? (
              isMatchOver ? (
                <button
                  onClick={handleRematch}
                  disabled={pendingAction}
                  className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-50"
                  type="button"
                >
                  {pendingAction ? "..." : "🔄 Reanš"}
                </button>
              ) : (
                <button
                  onClick={handleNextHand}
                  disabled={pendingAction}
                  className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 active:bg-yellow-600 disabled:opacity-50"
                  type="button"
                >
                  {pendingAction ? "..." : "Sljedeća ruka →"}
                </button>
              )
            ) : (
              <p className="text-center text-zinc-400 text-sm py-2">
                Čeka se da host{" "}
                {isMatchOver
                  ? "pokrene reanš"
                  : "pokrene sljedeću ruku"}
                ...
              </p>
            )}
          </div>
        </div>
      )}

      {error && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-red-700 rounded px-4 py-2 z-50 max-w-md shadow-lg text-sm">
          ⚠️ {error}
        </div>
      )}
      <RulesModal isOpen={rulesOpen} onClose={() => setRulesOpen(false)} />
    </main>
  );
}
