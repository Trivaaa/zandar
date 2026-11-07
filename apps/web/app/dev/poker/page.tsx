"use client";

import { useMemo, useState } from "react";
import {
  parseTableTheme,
  type Card,
  type PokerGamePayload,
  type PokerSeatView,
  type PublicPlayer,
} from "@zandar/shared-types";

import { PokerScreen } from "@/components/poker/PokerScreen";
import { useQueryParam } from "@/lib/useQuery";

/**
 * Dev pregled poker stola — stanja sa table „UI · Poker NL" (A–K) bez servera.
 * /dev/* je 404 u produkciji.
 *
 *   /dev/poker?s=A&n=4        A preflop, ti na potezu (n = 2 | 3 | 4)
 *   /dev/poker?s=B            flop, čeka se protivnik
 *   /dev/poker?s=D            all-in dvojice, karte otkrivene
 *   /dev/poker?s=E            side pot, ti na potezu (Check · Bet)
 *   /dev/poker?s=F | F2 | F3  showdown · podijeljen pot · svi foldali
 *   /dev/poker?s=G            tvoj fold, ruka teče dalje
 *   /dev/poker?s=H            protivnik bez veze i protivnik otišao
 *   /dev/poker?s=I            ti bez žetona
 *   /dev/poker?s=K&quick=0    kraj meča (privatni sto: Revanš)
 *   /dev/poker?table=wood|cloth
 *
 * URL je osnova (headless Chrome ne klikće); akcije samo pišu u konzolu.
 */

const SUIT = { s: "spades", h: "hearts", d: "diamonds", c: "clubs" } as const;
const c = (code: string): Card => ({
  id: code,
  rank: code.slice(0, -1) as Card["rank"],
  suit: SUIT[code.slice(-1) as keyof typeof SUIT],
});

const NAMES = ["Zvonko", "Marko", "Milica.K", "Goga"];

function players(n: number): PublicPlayer[] {
  return NAMES.slice(0, n).map((name, i) => ({
    id: `p${i}`,
    displayName: name,
    seatIndex: i,
    isHost: i === 0,
    connectionStatus: "connected",
    avatar: (["sova", null, "lisica", null] as const)[i] ?? null,
    profileId: null,
  })) as PublicPlayer[];
}

function seat(i: number, over: Partial<PokerSeatView> = {}): PokerSeatView {
  return {
    playerId: `p${i}`,
    seatNo: i,
    stack: 96,
    status: "active",
    inHand: true,
    folded: false,
    allIn: false,
    streetBet: 0,
    totalBet: 4,
    lastAction: null,
    hasCards: true,
    place: null,
    ...over,
  };
}

function base(n: number, now: number): PokerGamePayload {
  return {
    game: "poker",
    roomId: "dev",
    matchId: "dev",
    phase: "betting",
    stateVersion: 1,
    startStack: 100,
    handNo: 3,
    blindLevel: 1,
    smallBlind: 1,
    bigBlind: 2,
    handsUntilNextLevel: 3,
    nextSmallBlind: 2,
    nextBigBlind: 4,
    buttonSeat: 1 % n,
    smallBlindSeat: n === 2 ? 1 : 2 % n,
    bigBlindSeat: n === 2 ? 0 : 3 % n,
    street: "preflop",
    board: [],
    currentPlayerId: "p0",
    currentBet: 12,
    minRaise: 10,
    potTotal: 30,
    seats: Array.from({ length: n }, (_, i) => seat(i)),
    myPlayerId: "p0",
    myCards: [c("Qs"), c("As")],
    legal: null,
    lastHandResult: null,
    placements: [],
    players: players(n),
    turnDeadline: now + 14_000,
  };
}

function scenario(s: string, n: number, now: number): PokerGamePayload {
  const v = base(n, now);
  const meTurn = { canFold: true, canCheck: false, canCall: true, callAmount: 10, canBet: false, canRaise: true, minTo: 22, maxTo: 98 };
  switch (s) {
    case "B":
      v.street = "flop";
      v.board = [c("9h"), c("Kd"), c("4c")];
      v.currentPlayerId = n > 2 ? "p2" : "p1";
      v.currentBet = 0;
      v.potTotal = 36;
      v.seats = v.seats.map((x, i) => ({ ...x, totalBet: 9, lastAction: i === 3 ? { type: "check", amount: 0 } : null }));
      v.turnDeadline = now + 8_000;
      return v;
    case "D":
      v.phase = "hand_complete";
      v.street = "river";
      v.board = [c("9h"), c("Kd"), c("4c"), c("Kh"), c("2s")];
      v.currentPlayerId = null;
      v.seats = v.seats.map((x, i) => (i > 1 ? { ...x, folded: true, hasCards: false } : { ...x, allIn: true, stack: 0, totalBet: 98 }));
      v.potTotal = 200;
      v.lastHandResult = {
        handNo: 3,
        uncontested: false,
        allInRunout: true,
        pots: [{ amount: 200, eligiblePlayerIds: ["p0", "p1"] }],
        awards: [{ potIndex: 0, playerId: "p1", amount: 200 }],
        showdown: [
          { playerId: "p0", holeCards: [c("Qs"), c("As")], category: "pair", bestCards: [c("Kd"), c("Kh"), c("As"), c("Qs"), c("9h")] },
          { playerId: "p1", holeCards: [c("Ks"), c("9c")], category: "full_house", bestCards: [c("Kd"), c("Kh"), c("Ks"), c("9h"), c("9c")] },
        ],
      };
      return v;
    case "E":
      v.street = "turn";
      v.board = [c("9h"), c("Kd"), c("4c"), c("7s")];
      v.currentBet = 0;
      v.potTotal = 150;
      v.seats = v.seats.map((x, i) =>
        i === n - 1 ? { ...x, allIn: true, stack: 0, totalBet: 30 } : { ...x, totalBet: i < 2 ? 60 : 0, folded: i >= 2, hasCards: i < 2 || i === n - 1 },
      );
      v.legal = { canFold: true, canCheck: true, canCall: false, callAmount: 0, canBet: true, canRaise: false, minTo: 4, maxTo: 40 };
      return v;
    case "F":
    case "F2":
    case "F3": {
      v.phase = "hand_complete";
      v.street = "river";
      v.currentPlayerId = null;
      v.board = s === "F3" ? [c("9h"), c("Kd"), c("4c")] : [c("5h"), c("6d"), c("7c"), c("8s"), c("9d")];
      v.potTotal = 48;
      if (s === "F3") {
        v.seats = v.seats.map((x, i) => ({ ...x, folded: i !== 1, hasCards: i === 1 }));
        v.lastHandResult = { handNo: 3, uncontested: true, allInRunout: false, pots: [{ amount: 18, eligiblePlayerIds: ["p1"] }], awards: [{ potIndex: 0, playerId: "p1", amount: 18 }], showdown: [] };
        return v;
      }
      const split = s === "F2";
      v.lastHandResult = {
        handNo: 3,
        uncontested: false,
        allInRunout: false,
        pots: [{ amount: 48, eligiblePlayerIds: ["p0", "p1"] }],
        awards: split
          ? [{ potIndex: 0, playerId: "p0", amount: 24 }, { potIndex: 0, playerId: "p1", amount: 24 }]
          : [{ potIndex: 0, playerId: "p1", amount: 48 }],
        showdown: [
          { playerId: "p0", holeCards: [c("Qs"), c("As")], category: "straight", bestCards: [c("5h"), c("6d"), c("7c"), c("8s"), c("9d")] },
          { playerId: "p1", holeCards: [c("10s"), c("Jc")], category: "straight", bestCards: split ? [c("5h"), c("6d"), c("7c"), c("8s"), c("9d")] : [c("7c"), c("8s"), c("9d"), c("10s"), c("Jc")] },
        ],
      };
      if (!split) v.lastHandResult.showdown[0]!.bestCards = [c("5h"), c("6d"), c("7c"), c("8s"), c("9d")];
      v.seats = v.seats.map((x, i) => (i > 1 ? { ...x, folded: true, hasCards: false } : x));
      return v;
    }
    case "F3w":
    case "F4": {
      // 3 ili 4 igrača na showdownu (ploča u dva reda); F3w ima i side pot.
      const four = s === "F4";
      v.phase = "hand_complete";
      v.street = "river";
      v.currentPlayerId = null;
      v.board = [c("9h"), c("Kd"), c("4c"), c("Kh"), c("2s")];
      v.potTotal = four ? 160 : 150;
      const hands = [
        { playerId: "p0", holeCards: [c("Qs"), c("As")], category: "pair" as const, bestCards: [c("Kd"), c("Kh"), c("As"), c("Qs"), c("9h")] },
        { playerId: "p1", holeCards: [c("Ks"), c("9c")], category: "full_house" as const, bestCards: [c("Kd"), c("Kh"), c("Ks"), c("9h"), c("9c")] },
        { playerId: "p2", holeCards: [c("4h"), c("4d")], category: "full_house" as const, bestCards: [c("4h"), c("4d"), c("4c"), c("Kd"), c("Kh")] },
        { playerId: "p3", holeCards: [c("Jc"), c("10c")], category: "pair" as const, bestCards: [c("Kd"), c("Kh"), c("Jc"), c("10c"), c("9h")] },
      ].slice(0, four ? 4 : 3);
      v.lastHandResult = {
        handNo: 3,
        uncontested: false,
        allInRunout: false,
        pots: four
          ? [{ amount: 160, eligiblePlayerIds: ["p0", "p1", "p2", "p3"] }]
          : [
              { amount: 90, eligiblePlayerIds: ["p0", "p1", "p2"] },
              { amount: 60, eligiblePlayerIds: ["p0", "p1"] },
            ],
        awards: four
          ? [{ potIndex: 0, playerId: "p1", amount: 160 }]
          : [
              { potIndex: 0, playerId: "p1", amount: 90 },
              { potIndex: 1, playerId: "p1", amount: 60 },
            ],
        showdown: hands,
      };
      v.seats = v.seats.map((x, i) => (i >= hands.length ? { ...x, folded: true, hasCards: false } : x));
      return v;
    }
    case "G":
      v.street = "flop";
      v.board = [c("9h"), c("Kd"), c("4c")];
      v.currentPlayerId = "p1";
      v.seats = v.seats.map((x, i) => (i === 0 ? { ...x, folded: true, hasCards: false, lastAction: { type: "fold", amount: 0 } } : x));
      return v;
    case "H":
      v.street = "flop";
      v.board = [c("9h"), c("Kd"), c("4c")];
      v.currentPlayerId = "p1";
      v.players = v.players.map((p, i) => (i === 1 ? { ...p, connectionStatus: "reconnecting" } : i === 3 ? { ...p, left: true, connectionStatus: "abandoned" } : p));
      v.seats = v.seats.map((x, i) => (i === 1 ? { ...x, status: "sitting_out" } : i === 3 ? { ...x, status: "left", place: 4, hasCards: false } : x));
      v.turnDeadline = now + 4_000;
      return v;
    case "I":
      v.street = "turn";
      v.board = [c("9h"), c("Kd"), c("4c"), c("2d")];
      v.currentPlayerId = "p1";
      v.myCards = [];
      v.seats = v.seats.map((x, i) => (i === 0 ? { ...x, status: "bankrupt", stack: 0, place: 4, hasCards: false, inHand: false } : x));
      return v;
    case "K":
      v.phase = "match_finished";
      v.currentPlayerId = null;
      v.placements = v.seats.map((x, i) => ({ playerId: x.playerId, place: [2, 1, 3, 4][i]! }));
      v.seats = v.seats.map((x, i) => ({ ...x, stack: i === 1 ? 100 * n : 0, status: i === 1 ? "active" : "bankrupt" }));
      return v;
    default:
      // A: Milica raise 12, Marko call, ti si SB.
      v.legal = n === 2 ? { ...meTurn, callAmount: 1, minTo: 4, maxTo: 98 } : meTurn;
      v.seats = v.seats.map((x, i) => {
        if (i === 0) return { ...x, streetBet: 2, stack: 98 };
        if (n === 2) return { ...x, streetBet: 2, totalBet: 2, stack: 98 };
        if (i === 1) return { ...x, streetBet: 12, totalBet: 12, stack: 88, lastAction: { type: "call", amount: 12 } };
        if (i === 2) return { ...x, streetBet: 12, totalBet: 12, stack: 88, lastAction: { type: "raise", amount: 12 } };
        return { ...x, streetBet: 4, totalBet: 4, stack: 96 };
      });
      v.potTotal = v.seats.reduce((a, x) => a + x.streetBet, 0);
      return v;
  }
}

export default function PokerDevPage() {
  const s = useQueryParam("s") ?? "A";
  const n = Math.max(2, Math.min(4, Number(useQueryParam("n") ?? 4) || 4));
  const quick = useQueryParam("quick") !== "0";
  const table = parseTableTheme(useQueryParam("table"));
  // Rok poteza od trenutka otvaranja stranice (render mora biti čist).
  const [now] = useState(() => Date.now());
  const view = useMemo(() => scenario(s, n, now), [s, n, now]);
  const log = (label: string) => async (...args: unknown[]) => console.info(`[poker dev] ${label}`, ...args);
  return (
    // Ključ po scenariju: pregled prikazuje stanje, ne priču prelaza iz A (URL se čita poslije hidracije).
    <PokerScreen
      key={`${s}-${n}`}
      state={view}
      tableTheme={table}
      isQuickPlay={quick}
      onAction={log("action")}
      onRematch={log("rematch")}
      onNewTable={log("newTable")}
      onReact={log("react")}
      onLeave={() => console.info("[poker dev] leave")}
      activeReactions={[]}
    />
  );
}
