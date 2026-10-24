import assert from "node:assert/strict";
import { test } from "node:test";

import { firebaseConfigFor } from "./firebaseConfig";

/**
 * Koje okruženje gađa koji Firebase projekat. Uzak test, ali čuva jedinu stvar
 * koja ne smije da se desi: da build koji nije produkcijski pravi naloge u
 * produkcijskom projektu, ili da produkcija tiho ode na staging.
 */

test("staging i lokalni dev idu na staging projekat", () => {
  for (const env of ["staging", "development", undefined, ""]) {
    assert.equal(firebaseConfigFor(env)?.projectId, "kartaonica---staging");
  }
});

test("produkcija nikad ne dobija staging projekat", () => {
  const config = firebaseConfigFor("production");
  assert.equal(config?.projectId, "kartaonica---production");
  assert.match(config?.appId ?? "", /^1:652209876577:web:/);
  assert.equal(config?.authDomain, "kartaonica---production.firebaseapp.com");
});
