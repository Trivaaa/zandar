import assert from "node:assert/strict";
import { afterEach, test } from "node:test";

import { BELA_BETA_KEY, markBelaBetaSeen, readBelaBetaSeen, resetBelaBetaMemory } from "./belaBeta";

function memoryStore() {
  const m = new Map<string, string>();
  return { getItem: (k: string) => m.get(k) ?? null, setItem: (k: string, v: string) => void m.set(k, v), m };
}

afterEach(() => resetBelaBetaMemory());

test("beta prozor: prvi put nije viđen, poslije „Razumijem” jeste (i ostaje u skladištu)", () => {
  const store = memoryStore();
  assert.equal(readBelaBetaSeen(store), false);
  markBelaBetaSeen(store);
  assert.equal(readBelaBetaSeen(store), true);
  assert.equal(store.m.get(BELA_BETA_KEY), "1");
  resetBelaBetaMemory();
  assert.equal(readBelaBetaSeen(store), true);
});

test("skladište koje baca: prozor se pokaže, a „Razumijem” ga zatvori bar za sesiju", () => {
  const broken = {
    getItem: () => {
      throw new Error("SecurityError");
    },
    setItem: () => {
      throw new Error("QuotaExceeded");
    },
  };
  assert.equal(readBelaBetaSeen(broken), false);
  markBelaBetaSeen(broken);
  assert.equal(readBelaBetaSeen(broken), true);
  assert.equal(readBelaBetaSeen(null), true);
});
