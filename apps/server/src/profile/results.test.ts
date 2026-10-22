import { test } from "node:test";
import assert from "node:assert/strict";

import { completedMatchUids, recordCompletedMatch } from "./results";
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
  await recordCompletedMatch(store, "m1", players);
  await recordCompletedMatch(store, "m1", players);
  assert.deepEqual(await store.getProfile("u1"), { completedMatches: 1 });
  assert.deepEqual(await store.getProfile("u2"), { completedMatches: 1 });
});

test("upis: greška skladišta se loguje, ne baca", async () => {
  const broken: ProfileStore = {
    ...createMemoryProfileStore(),
    recordCompletedMatch: async () => {
      throw new Error("Firestore commit 503");
    },
  };
  const logged: string[] = [];
  await recordCompletedMatch(broken, "m1", [{ uid: "u1" }], (m) => logged.push(m));
  assert.equal(logged.length, 1);
  assert.match(logged[0] ?? "", /m1.*503/);
});
