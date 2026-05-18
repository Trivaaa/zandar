import { describe, it, expect } from "vitest";
import type { Player } from "@zandar/shared-types";
import { createInitialGameState } from "./deal";
import { createRulesConfig } from "./rules";

/** Pomocna funkcija za kreiranje igraca za testove. */
function makePlayers(count: 2 | 3 | 4): Player[] {
  const players: Player[] = [];
  for (let i = 0; i < count; i++) {
    players.push({
      id: `p${i}`,
      displayName: `Player ${i}`,
      seatIndex: i,
      teamId: count === 4 ? i % 2 : undefined,
      connectionStatus: "connected",
      isHost: i === 0,
      consecutiveAutoPlays: 0,
    });
  }
  return players;
}

describe("createInitialGameState", () => {
  it("kreira validan pocetni state za 2P", () => {
    const state = createInitialGameState({
      roomId: "r1",
      matchId: "m1",
      players: makePlayers(2),
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(2),
      shuffleSeed: 42,
    });

    expect(state.phase).toBe("playing");
    expect(state.handNumber).toBe(1);
    expect(state.stateVersion).toBe(0);
    expect(state.dealerPlayerId).toBe("p0");
  });

  it("postavlja currentPlayerId na igraca lijevo od dealera", () => {
    const state = createInitialGameState({
      roomId: "r1",
      matchId: "m1",
      players: makePlayers(4),
      dealerPlayerId: "p1",
      rulesConfig: createRulesConfig(4),
      shuffleSeed: 42,
    });

    // Lijevo od p1 je p2
    expect(state.currentPlayerId).toBe("p2");
  });

  it("dijeli 4 karte na sto i 4 karte svakom igracu (2P)", () => {
    const state = createInitialGameState({
      roomId: "r1",
      matchId: "m1",
      players: makePlayers(2),
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(2),
      shuffleSeed: 42,
    });

    expect(state.table).toHaveLength(4);
    expect(state.hands["p0"]).toHaveLength(4);
    expect(state.hands["p1"]).toHaveLength(4);
  });

  it("inicijalizuje captured piles (cutter moze imati J ako padne u pocetnih 4)", () => {
    const state = createInitialGameState({
      roomId: "r1",
      matchId: "m1",
      players: makePlayers(2),
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(2),
      shuffleSeed: 42,
    });

    // Cutter (p1) moze imati J zbog award_to_cutter pravila
    // Ostali igraci moraju imati prazan pile
    expect(state.captured["p0"]).toEqual([]);

    // p1 (cutter) - sve sto ima moraju biti samo J karte (ne nesto drugo)
    const p1Captured = state.captured["p1"] ?? [];
    for (const card of p1Captured) {
      expect(card.rank).toBe("J");
    }

    expect(state.matchScore["p0"]).toBe(0);
    expect(state.matchScore["p1"]).toBe(0);
  });

  it("inicijalizuje team captured piles za 4P (cutter tim moze imati J)", () => {
    const state = createInitialGameState({
      roomId: "r1",
      matchId: "m1",
      players: makePlayers(4),
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(4),
      shuffleSeed: 42,
    });

    // Oba tima postoje, ali sta god je u njima moraju biti samo J karte
    expect(state.captured["team-0"]).toBeDefined();
    expect(state.captured["team-1"]).toBeDefined();

    for (const teamId of ["team-0", "team-1"]) {
      const captured = state.captured[teamId] ?? [];
      for (const card of captured) {
        expect(card.rank).toBe("J");
      }
    }

    expect(state.matchScore["team-0"]).toBe(0);
    expect(state.matchScore["team-1"]).toBe(0);
  });

  it("J nikad ne stoji na pocetnom stolu (award_to_cutter pravilo)", () => {
    // Testiramo sa 100 razlicitih seed-ova
    for (let seed = 1; seed <= 100; seed++) {
      const state = createInitialGameState({
        roomId: "r1",
        matchId: "m1",
        players: makePlayers(2),
        dealerPlayerId: "p0",
        rulesConfig: createRulesConfig(2),
        shuffleSeed: seed,
      });

      const jacksOnTable = state.table.filter((c) => c.rank === "J");
      expect(jacksOnTable).toHaveLength(0);
    }
  });

  it("baca gresku kad players.length ne odgovara rulesConfig.playerCount", () => {
    expect(() => {
      createInitialGameState({
        roomId: "r1",
        matchId: "m1",
        players: makePlayers(2),
        dealerPlayerId: "p0",
        rulesConfig: createRulesConfig(4), // mismatch
        shuffleSeed: 42,
      });
    }).toThrow();
  });

  it("baca gresku kad dealerPlayerId nije medju igracima", () => {
    expect(() => {
      createInitialGameState({
        roomId: "r1",
        matchId: "m1",
        players: makePlayers(2),
        dealerPlayerId: "nepoznati-igrac",
        rulesConfig: createRulesConfig(2),
        shuffleSeed: 42,
      });
    }).toThrow();
  });

  it("nakon dijeljenja sve 52 karte su negde (sto + ruke + captured + deck)", () => {
    const state = createInitialGameState({
      roomId: "r1",
      matchId: "m1",
      players: makePlayers(2),
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(2),
      shuffleSeed: 42,
    });

    let totalCards = state.deck.length + state.table.length;
    for (const player of state.players) {
      totalCards += state.hands[player.id]?.length ?? 0;
    }
    for (const pile of Object.values(state.captured)) {
      totalCards += pile.length;
    }

    // 52 karte uvijek moraju biti rasporedjenje negde
    expect(totalCards).toBe(52);
  });
});