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

type PendingMove = {
  card: CardType;
  options: CaptureOption[];
};

type GameViewProps = {
  state: PrivateGameStateView;
  onPlayCard: (
    cardId: string,
    selectedCaptureCardIds: string[],
  ) => Promise<void>;
  onNextHand: () => Promise<void>;
  onRematch: () => Promise<void>;
};

export function GameView({
  state,
  onPlayCard,
  onNextHand,
  onRematch,
}: GameViewProps) {
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);
  const [pendingAction, setPendingAction] = useState(false);

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
  const lastHandScore =
    state.handScores.length > 0
      ? state.handScores[state.handScores.length - 1]
      : null;

  // Pobjednik meča (igrač/tim sa najviše poena)
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

  return (
    <main className="min-h-screen bg-green-900 text-white p-6">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-xl font-bold">
            Žandar · Ruka #{state.handNumber}
          </h1>
          <div className="text-sm text-green-300">
            Špil: {state.deckCount} · Cilj: {state.targetScore}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {others.map((p) => (
            <div
              key={p.id}
              className={`bg-zinc-900 rounded p-3 ${
                state.currentPlayerId === p.id && !isHandOver && !isMatchOver
                  ? "ring-2 ring-yellow-500"
                  : "opacity-70"
              }`}
            >
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-zinc-700 rounded-full flex items-center justify-center font-bold text-sm">
                  {p.displayName.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-sm">
                    {p.displayName}
                    {state.currentPlayerId === p.id &&
                      !isHandOver &&
                      !isMatchOver && (
                        <span className="ml-2 text-yellow-400 text-xs">
                          NA POTEZU
                        </span>
                      )}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {state.handCounts[p.id] ?? 0} karata u ruci
                  </p>
                </div>
              </div>
              <div className="flex gap-1">
                {Array.from({ length: state.handCounts[p.id] ?? 0 }).map(
                  (_, i) => (
                    <div key={i} className="scale-50 -mx-3">
                      <CardBack />
                    </div>
                  ),
                )}
              </div>
            </div>
          ))}
        </div>

        <div className="bg-green-800 rounded-lg p-6">
          <p className="text-sm text-green-300 mb-3 text-center">
            Sto ({state.table.length}{" "}
            {state.table.length === 1 ? "karta" : "karata"})
          </p>
          <div className="flex flex-wrap justify-center gap-2 min-h-[7rem]">
            {state.table.length === 0 ? (
              <p className="text-green-400 italic self-center">
                Sto je prazan
              </p>
            ) : (
              state.table.map((card) => <Card key={card.id} card={card} />)
            )}
          </div>
        </div>

        <div
          className={`bg-zinc-900 rounded-lg p-4 ${
            myTurn && !isHandOver && !isMatchOver
              ? "ring-2 ring-yellow-500"
              : ""
          }`}
        >
          <div className="flex justify-between items-center mb-3">
            <p className="font-semibold">
              {me?.displayName} (ti)
              {myTurn && !isHandOver && !isMatchOver && (
                <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-zinc-900 text-xs font-bold rounded">
                  NA POTEZU
                </span>
              )}
            </p>
            <p className="text-sm text-zinc-400">
              {state.matchScore[state.myPlayerId] ?? 0} / {state.targetScore}{" "}
              poena
            </p>
          </div>
          <div className="flex justify-center gap-2 flex-wrap min-h-[7rem]">
            {state.myHand.length === 0 ? (
              <p className="text-zinc-500 italic self-center">
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

        <div className="bg-zinc-900 rounded p-3">
          <p className="text-sm font-semibold mb-2">Ukupni score:</p>
          <div className="space-y-1 text-sm">
            {Object.entries(state.matchScore).map(([pileId, score]) => (
              <div key={pileId} className="flex justify-between">
                <span>{getPileDisplayName(pileId, state.players)}</span>
                <span className="font-bold">
                  {score} / {state.targetScore}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Capture selection modal */}
      {pendingMove && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-2xl w-full">
            <h2 className="text-xl font-bold mb-3">Šta želiš da kupiš?</h2>
            <div className="mb-4">
              <p className="text-sm text-green-300 mb-2">Igraš:</p>
              <Card card={pendingMove.card} />
            </div>
            <p className="text-sm text-green-300 mb-2">Opcije:</p>
            <div className="space-y-3">
              {pendingMove.options.map((option) => (
                <button
                  key={option.optionId}
                  onClick={() => selectOption(option)}
                  disabled={playing}
                  className="w-full p-4 bg-green-800 hover:bg-green-700 rounded-lg text-left transition-colors disabled:opacity-50"
                  type="button"
                >
                  <p className="text-sm text-green-300 mb-2">
                    {option.reason === "rank_match"
                      ? "Istog ranka"
                      : option.reason === "sum_match"
                        ? "Zbir vrijednosti"
                        : "Žandar kupi sve"}
                  </p>
                  <div className="flex gap-2 flex-wrap">
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
              className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded disabled:opacity-50"
              type="button"
            >
              Otkaži
            </button>
          </div>
        </div>
      )}

      {/* End-of-hand / End-of-match modal */}
      {(isHandOver || isMatchOver) && lastHandScore && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-center">
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
                  className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 disabled:opacity-50"
                  type="button"
                >
                  {pendingAction ? "..." : "🔄 Reanš"}
                </button>
              ) : (
                <button
                  onClick={handleNextHand}
                  disabled={pendingAction}
                  className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400 disabled:opacity-50"
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

      {/* Error toast */}
      {error && (
        <div className="fixed bottom-4 left-1/2 -translate-x-1/2 bg-red-700 rounded px-4 py-2 z-50 max-w-md shadow-lg">
          ⚠️ {error}
        </div>
      )}
    </main>
  );
}
