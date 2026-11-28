import { test } from "node:test";
import assert from "node:assert/strict";

import { completedMatchUids, recordCompletedMatch, recordMatchResults } from "./results";
import { createMemoryProfileStore, type ProfileStore } from "./store";

test("broje se samo ljudi sa uid-om — bot i čovjek bez uid-a ne", () => {
  assert.deepEqual(
    completedMatchUids([
      { uid: "u1" },
      { isBot: true, uid: "nikad" },
      {},
      { uid: "" },
      { uid: "u2" },
      { uid: "u1" },
    ]),
    ["u1", "u2"],
  );
});

test("upis: svaki igrač jednom, ponovljen kraj iste partije se ne broji", async () => {
  const store = createMemoryProfileStore();
  const players = [{ uid: "u1" }, { uid: "u2" }, { isBot: true }];
  await recordCompletedMatch(store, "m1", players, "raub");
  await recordCompletedMatch(store, "m1", players, "raub");
  const one = { completedMatches: 1, completedMatchesByGame: { raub: 1 } };
  assert.deepEqual(await store.getProfile("u1"), one);
  assert.deepEqual(await store.getProfile("u2"), one);
});

test("upis: greška skladišta se loguje, ne baca", async () => {
  const broken: ProfileStore = {
    ...createMemoryProfileStore(),
    recordCompletedMatch: async () => {
      throw new Error("Firestore commit 503");
    },
  };
  const logged: string[] = [];
  await recordCompletedMatch(broken, "m1", [{ uid: "u1" }], "zandar", (m) => logged.push(m));
  assert.equal(logged.length, 1);
  assert.match(logged[0] ?? "", /m1.*503/);
});

test("upis ishoda: greška skladišta se loguje, ne baca; ostali igrači se upišu", async () => {
  const mem = createMemoryProfileStore();
  const store: ProfileStore = {
    ...mem,
    recordMatchResult: async (matchId, uid, game, result, now) => {
      if (uid === "u1") throw new Error("Firestore commit 503");
      return mem.recordMatchResult(matchId, uid, game, result, now);
    },
  };
  const logged: string[] = [];
  const result = { outcome: "win" as const, place: 1, players: 2, mode: "quick_play" as const, opponents: ["u2"], hands: 3 };
  await recordMatchResults(store, "m1", "raub", [
    { uid: "u1", result },
    { uid: "u2", result: { ...result, outcome: "loss", place: 2, opponents: ["u1"] } },
  ], (m) => logged.push(m));
  assert.equal(logged.length, 1);
  assert.equal((await mem.getProfile("u2"))?.stats?.byGame.raub?.lost, 1);
});
