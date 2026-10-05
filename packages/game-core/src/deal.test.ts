import { describe, it, expect } from "vitest";
import type { Player } from "@zandar/shared-types";
import { createInitialGameState, dealCardsToPlayers } from "./deal";
import { createDeck } from "./deck";
import { createRulesConfig } from "./rules";
import { shuffle } from "./shuffle";

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

  it("inicijalizuje prazne captured piles", () => {
    const state = createInitialGameState({
      roomId: "r1",
      matchId: "m1",
      players: makePlayers(2),
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(2),
      shuffleSeed: 42,
    });

    expect(state.captured["p0"]).toEqual([]);
    expect(state.captured["p1"]).toEqual([]);

    expect(state.matchScore["p0"]).toBe(0);
    expect(state.matchScore["p1"]).toBe(0);
  });

  it("inicijalizuje prazne team captured piles za 4P", () => {
    const state = createInitialGameState({
      roomId: "r1",
      matchId: "m1",
      players: makePlayers(4),
      dealerPlayerId: "p0",
      rulesConfig: createRulesConfig(4),
      shuffleSeed: 42,
    });

    expect(state.captured["team-0"]).toEqual([]);
    expect(state.captured["team-1"]).toEqual([]);

    expect(state.matchScore["team-0"]).toBe(0);
    expect(state.matchScore["team-1"]).toBe(0);
  });

  it("J nikad ne stoji na pocetnom stolu (award_to_dealer pravilo)", () => {
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

  // Seed-ovi kod kojih J izadje medju pocetne karte stola: prva karta spila je J.
  function seedsWithJackOnTable(max: number): number[] {
    const seeds: number[] = [];
    for (let seed = 1; seed <= max; seed++) {
      const top = shuffle(createDeck(), seed).slice(0, 4);
      if (top.some((c) => c.rank === "J")) seeds.push(seed);
    }
    return seeds;
  }

  it("award_to_dealer: J sa pocetnog stola ide na dno spila, ne u pile", () => {
    const seeds = seedsWithJackOnTable(200);
    expect(seeds.length).toBeGreaterThan(10);

    for (const seed of seeds) {
      for (const count of [2, 3, 4] as const) {
        const state = createInitialGameState({
          roomId: "r1",
          matchId: "m1",
          players: makePlayers(count),
          dealerPlayerId: "p0",
          rulesConfig: createRulesConfig(count),
          shuffleSeed: seed,
        });

        expect(state.table.filter((c) => c.rank === "J")).toHaveLength(0);
        for (const pile of Object.values(state.captured)) {
          expect(pile).toEqual([]);
        }
        expect(state.deck[state.deck.length - 1]!.rank).toBe("J");
        // Spil ostaje djeljiv: 52 - 4 (sto) - 4 po igracu.
        expect(state.deck).toHaveLength(48 - 4 * count);
      }
    }
  });

  it("award_to_dealer: svako dijeljenje je ravnomjerno, a dealer dobija J sa dna u zadnjem", () => {
    for (const seed of seedsWithJackOnTable(200)) {
      for (const count of [2, 3, 4] as const) {
        const dealerId = `p${seed % count}`;
        const state = createInitialGameState({
          roomId: "r1",
          matchId: "m1",
          players: makePlayers(count),
          dealerPlayerId: dealerId,
          rulesConfig: createRulesConfig(count),
          shuffleSeed: seed,
        });
        const bottomJack = state.deck[state.deck.length - 1]!;

        // Isprazni ruke i dijeli do kraja spila, kao sto radi advanceTurnOrPhase.
        while (state.deck.length > 0) {
          for (const p of state.players) state.hands[p.id] = [];
          dealCardsToPlayers(state);
          for (const p of state.players) {
            expect(state.hands[p.id]).toHaveLength(4);
          }
        }

        expect(state.hands[dealerId]!.map((c) => c.id)).toContain(bottomJack.id);
      }
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