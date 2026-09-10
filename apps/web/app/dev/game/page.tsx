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

/**
 * Realan gornji rep stola. Force-capture drzi sto oko 4-8 karata, a 12 je rijedak
 * rep (dugi niz Q/K, koje ne ulaze u zbirove) — pojas play-zone mora da ih primi
 * bez diranja sjedista i ruke.
 */
const TABLE_POOL = [
  card("diamonds", "7"),
  card("spades", "3"),
  card("hearts", "4"),
  card("spades", "A"),
  card("clubs", "K"),
  card("diamonds", "Q"),
  card("hearts", "K"),
  card("clubs", "Q"),
  card("spades", "K"),
  card("hearts", "Q"),
  card("diamonds", "8"),
  card("clubs", "6"),
];

function mockState(
  phase: GamePhase,
  turnDeadline: number,
  tableCount: number,
): PrivateGameStateView & {
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
    table: TABLE_POOL.slice(0, tableCount),
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
    // Da se move-reveal panel uopste moze pogledati u pregledniku.
    lastMove: {
      moveId: "dev-move",
      playerId: "p1",
      playedCard: card("hearts", "9"),
      capturedCards: [card("clubs", "4"), card("spades", "5")],
      isAutoPlay: false,
    },
    turnDeadline,
  };
}

const PHASES: GamePhase[] = ["playing", "hand_finished", "match_finished", "abandoned"];
const TABLE_COUNTS = [0, 4, 8, 12];
const noop = async () => {};

export default function DevGamePage() {
  const [phase, setPhase] = useState<GamePhase>("playing");
  const [tableCount, setTableCount] = useState(4);
  const [deadline] = useState(() => Date.now() + 25_000);

  return (
    <div className="relative">
      <GameScreen
        state={mockState(phase, deadline, tableCount)}
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
        <span className="mt-2 text-[10px] text-muted">sto</span>
        {TABLE_COUNTS.map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setTableCount(n)}
            className={`px-2 py-1 rounded-token-sm text-[10px] font-bold transition-colors ${
              tableCount === n
                ? "bg-accent text-accent-contrast"
                : "bg-surface-raised/90 text-muted active:bg-surface"
            }`}
          >
            {n}
          </button>
        ))}
      </div>
    </div>
  );
}
