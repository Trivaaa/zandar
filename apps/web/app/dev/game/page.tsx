"use client";

import { useState } from "react";
import type { GamePhase, PrivateGameStateView } from "@zandar/shared-types";
import { GameScreen } from "@/components/GameScreen";

/**
 * Dev preview za GameScreen (Faza B integracija). Mock 4P state; prebacuj fazu
 * (playing / hand_finished / abandoned). onPlayCard je no-op. Nije produkcijski.
 */

const card = (suit: "clubs" | "diamonds" | "hearts" | "spades", rank: string) => ({
  id: `${suit}-${rank}`,
  suit,
  rank: rank as never,
});

function mockState(phase: GamePhase, turnDeadline: number): PrivateGameStateView & {
  turnDeadline?: number;
} {
  return {
    roomId: "dev",
    matchId: "dev",
    phase,
    players: [
      { id: "me", displayName: "Ti", seatIndex: 0, isHost: true, teamId: 0, connectionStatus: "connected" },
      { id: "p1", displayName: "Marko", seatIndex: 1, isHost: false, teamId: 1, connectionStatus: "connected" },
      { id: "p2", displayName: "Jovana", seatIndex: 2, isHost: false, teamId: 0, connectionStatus: "connected" },
      { id: "p3", displayName: "Stefan", seatIndex: 3, isHost: false, teamId: 1, connectionStatus: "connected" },
    ],
    table: [card("diamonds", "7"), card("spades", "3"), card("hearts", "4"), card("spades", "A")],
    currentPlayerId: "me",
    dealerPlayerId: "p3",
    deckCount: 28,
    handCounts: { me: 4, p1: 4, p2: 3, p3: 4 },
    capturedCounts: { "team-0": 6, "team-1": 4 },
    matchScore: { "team-0": 14, "team-1": 9 },
    targetScore: 21,
    stateVersion: 1,
    handNumber: 3,
    handScores: [
      {
        handNumber: 3,
        pointsByPile: { "team-0": 3, "team-1": 2 },
        breakdown: {
          mostCards: { winnerPileId: "team-0", cardCountByPile: {}, points: 2 },
          mostClubs: { winnerPileId: "team-1", clubCountByPile: {}, points: 1 },
          twoOfClubs: { winnerPileId: "team-0", points: 1 },
          tenOfDiamonds: { winnerPileId: "team-1", points: 1 },
        },
      },
    ],
    myPlayerId: "me",
    myHand: [card("clubs", "7"), card("spades", "J"), card("hearts", "A"), card("diamonds", "9")],
    turnDeadline,
  };
}

const PHASES: GamePhase[] = ["playing", "hand_finished", "match_finished", "abandoned"];
const noop = async () => {};

export default function DevGamePage() {
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [deadline] = useState(() => Date.now() + 25_000);

  return (
    <div className="relative">
      <GameScreen
        state={mockState(phase, deadline)}
        onPlayCard={noop}
        onNextHand={noop}
        onRematch={noop}
        onReact={noop}
        onLeave={() => setPhase("playing")}
        activeReactions={[]}
      />
      <div className="fixed top-1/2 left-2 -translate-y-1/2 z-[60] flex flex-col gap-1">
        {PHASES.map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => setPhase(p)}
            className={`px-2 py-1 rounded-token-sm text-[10px] font-bold transition-colors ${
              phase === p
                ? "bg-accent text-accent-contrast"
                : "bg-surface-raised/90 text-muted active:bg-surface"
            }`}
          >
            {p}
          </button>
        ))}
      </div>
    </div>
  );
}
