"use client";

import { useState } from "react";
import {
  applyMove,
  createInitialGameState,
  createRulesConfig,
  getCaptureOptions,
} from "@zandar/game-core";
import type {
  CaptureOption,
  Card as CardType,
  GameState,
  HandScore,
  Player,
} from "@zandar/shared-types";
import { Card } from "@/components/Card";

const players: Player[] = [
  {
    id: "p0",
    displayName: "Igrač 1",
    seatIndex: 0,
    connectionStatus: "connected",
    isHost: true,
    consecutiveAutoPlays: 0,
  },
  {
    id: "p1",
    displayName: "Igrač 2",
    seatIndex: 1,
    connectionStatus: "connected",
    isHost: false,
    consecutiveAutoPlays: 0,
  },
];

function createNewGame(seed?: number): GameState {
  return createInitialGameState({
    roomId: "demo",
    matchId: "demo",
    players,
    dealerPlayerId: "p0",
    rulesConfig: createRulesConfig(2),
    shuffleSeed: seed,
  });
}

function getPileDisplayName(pileId: string): string {
  if (pileId === "p0") return "Igrač 1";
  if (pileId === "p1") return "Igrač 2";
  if (pileId === "team-0") return "Tim A";
  if (pileId === "team-1") return "Tim B";
  return pileId;
}

type PendingMove = {
  playerId: string;
  card: CardType;
  options: CaptureOption[];
};

export default function Home() {
  const [state, setState] = useState<GameState>(() => createNewGame(42));
  const [error, setError] = useState<string | null>(null);
  const [pendingMove, setPendingMove] = useState<PendingMove | null>(null);

  function clickCard(playerId: string, card: CardType) {
    setError(null);
    const options = getCaptureOptions(card, state.table);

    if (options.length <= 1) {
      executeMove(playerId, card.id, options[0]?.cardIds ?? []);
    } else {
      setPendingMove({ playerId, card, options });
    }
  }

  function executeMove(
    playerId: string,
    cardId: string,
    selectedCaptureCardIds: string[],
  ) {
    try {
      const newState = structuredClone(state);
      applyMove(newState, {
        roomId: state.roomId,
        playerId,
        cardId,
        selectedCaptureCardIds,
        clientMoveId: `move-${state.stateVersion}-${Date.now()}`,
        clientKnownStateVersion: state.stateVersion,
      });
      setState(newState);
      setPendingMove(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Unknown error");
    }
  }

  function selectOption(option: CaptureOption) {
    if (!pendingMove) return;
    executeMove(pendingMove.playerId, pendingMove.card.id, option.cardIds);
  }

  function nextHand() {
    if (state.phase !== "hand_finished") return;

    // Rotiraj dealera (clockwise)
    const dealerIndex = state.players.findIndex(
      (p) => p.id === state.dealerPlayerId,
    );
    const nextDealerIndex = (dealerIndex + 1) % state.players.length;
    const nextDealerId = state.players[nextDealerIndex]!.id;

    const newState = createInitialGameState({
      roomId: state.roomId,
      matchId: state.matchId,
      players: state.players,
      dealerPlayerId: nextDealerId,
      rulesConfig: state.rulesConfig,
      shuffleSeed: Math.floor(Math.random() * 100000),
    });

    // Sačuvaj match progress
    newState.matchScore = { ...state.matchScore };
    newState.handNumber = state.handNumber + 1;
    newState.handScores = [...state.handScores];

    setState(newState);
  }

  function resetGame() {
    setState(createNewGame(Math.floor(Math.random() * 100000)));
    setError(null);
    setPendingMove(null);
  }

  const isCurrentP0 = state.currentPlayerId === "p0";
  const isCurrentP1 = state.currentPlayerId === "p1";
  const isMatchOver = state.phase === "match_finished";
  const isHandOver = state.phase === "hand_finished";
  const lastHandScore = state.handScores[state.handScores.length - 1];

  return (
    <main className="min-h-screen bg-green-900 text-white flex flex-col relative">
      <button
        onClick={resetGame}
        className="absolute top-4 right-4 px-3 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded text-sm z-10"
      >
        Nova partija
      </button>

      {/* IGRAČ 2 (gore) */}
      <div
        className={`p-4 border-b border-green-700 ${
          !isCurrentP1 ? "opacity-60" : ""
        }`}
      >
        <div className="text-center mb-3">
          <span className="font-semibold">Igrač 2</span>
          {isCurrentP1 && !isHandOver && !isMatchOver && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-zinc-900 text-xs font-bold rounded">
              NA POTEZU
            </span>
          )}
          <span className="ml-3 text-sm text-green-300">
            {state.matchScore["p1"] ?? 0} poena •{" "}
            {state.captured["p1"]?.length ?? 0} pokupljenih
          </span>
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {(state.hands["p1"] ?? []).map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={
                isCurrentP1 && !isMatchOver && !isHandOver
                  ? () => clickCard("p1", card)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* STO */}
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <p className="text-sm text-green-300 mb-3">
          Sto • Špil: {state.deck.length} • Ruka: {state.handNumber} • Dealer:{" "}
          {getPileDisplayName(state.dealerPlayerId)}
        </p>
        <div className="flex flex-wrap justify-center gap-2 max-w-2xl min-h-[7rem]">
          {state.table.length === 0 ? (
            <p className="text-green-400 italic self-center">Sto je prazan</p>
          ) : (
            state.table.map((card) => <Card key={card.id} card={card} />)
          )}
        </div>

        {error && (
          <div className="mt-4 px-4 py-2 bg-red-700 rounded text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* IGRAČ 1 (dole) */}
      <div
        className={`p-4 border-t border-green-700 bg-green-950/30 ${
          !isCurrentP0 ? "opacity-60" : ""
        }`}
      >
        <div className="text-center mb-3">
          <span className="font-semibold">Igrač 1</span>
          {isCurrentP0 && !isHandOver && !isMatchOver && (
            <span className="ml-2 px-2 py-0.5 bg-yellow-500 text-zinc-900 text-xs font-bold rounded">
              NA POTEZU
            </span>
          )}
          <span className="ml-3 text-sm text-green-300">
            {state.matchScore["p0"] ?? 0} poena •{" "}
            {state.captured["p0"]?.length ?? 0} pokupljenih
          </span>
        </div>
        <div className="flex justify-center gap-2 flex-wrap">
          {(state.hands["p0"] ?? []).map((card) => (
            <Card
              key={card.id}
              card={card}
              onClick={
                isCurrentP0 && !isMatchOver && !isHandOver
                  ? () => clickCard("p0", card)
                  : undefined
              }
            />
          ))}
        </div>
      </div>

      {/* CAPTURE SELECTION MODAL */}
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
                  className="w-full p-4 bg-green-800 hover:bg-green-700 rounded-lg text-left transition-colors"
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
              className="mt-4 px-4 py-2 bg-zinc-700 hover:bg-zinc-600 rounded"
              type="button"
            >
              Otkaži
            </button>
          </div>
        </div>
      )}

      {/* END-OF-HAND / END-OF-MATCH MODAL */}
      {(isHandOver || isMatchOver) && lastHandScore && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-40 p-4">
          <div className="bg-zinc-900 rounded-lg p-6 max-w-md w-full">
            <h2 className="text-2xl font-bold mb-4 text-center">
              {isMatchOver
                ? "🏆 Kraj meča!"
                : `Ruka #${lastHandScore.handNumber} gotova`}
            </h2>

            {/* Poeni iz ove ruke */}
            <div className="bg-green-800 rounded p-3 mb-3">
              <p className="font-semibold mb-2">Poeni iz ove ruke:</p>
              {Object.entries(lastHandScore.pointsByPile).map(
                ([pileId, points]) => (
                  <div key={pileId} className="flex justify-between text-sm">
                    <span>{getPileDisplayName(pileId)}</span>
                    <span
                      className={
                        points > 0 ? "text-yellow-400 font-bold" : "text-zinc-500"
                      }
                    >
                      +{points}
                    </span>
                  </div>
                ),
              )}
            </div>

            {/* Breakdown */}
            <div className="bg-zinc-800 rounded p-3 mb-3 text-sm space-y-1">
              <p className="font-semibold mb-2 text-zinc-400">Detalji:</p>
              <div className="flex justify-between">
                <span>Najviše karata (2)</span>
                <span>
                  {lastHandScore.breakdown.mostCards?.winnerPileId
                    ? getPileDisplayName(
                        lastHandScore.breakdown.mostCards.winnerPileId,
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
                      )
                    : "—"}
                </span>
              </div>
            </div>

            {/* Ukupni score */}
            <div className="bg-green-800 rounded p-3 mb-4">
              <p className="font-semibold mb-2">Ukupni score:</p>
              {Object.entries(state.matchScore).map(([pileId, score]) => (
                <div key={pileId} className="flex justify-between text-sm">
                  <span>{getPileDisplayName(pileId)}</span>
                  <span className="font-bold">
                    {score} / {state.targetScore}
                  </span>
                </div>
              ))}
            </div>

            {isMatchOver ? (
              <button
                onClick={resetGame}
                className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400"
              >
                Nova partija
              </button>
            ) : (
              <button
                onClick={nextHand}
                className="w-full px-4 py-3 bg-yellow-500 text-zinc-900 rounded font-bold hover:bg-yellow-400"
              >
                Sljedeća ruka →
              </button>
            )}
          </div>
        </div>
      )}
    </main>
  );
}