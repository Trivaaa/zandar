import { test } from "node:test";
import assert from "node:assert/strict";

import { AccountError, accountErrorCode, looksLikeEmail } from "./accountErrors";

test("Firebase kodovi → stanja ekrana; R4 ne razlikuje pogrešan e-mail od lozinke", () => {
  const cases: [string, string][] = [
    ["auth/invalid-credential", "wrong_credentials"],
    ["auth/user-not-found", "wrong_credentials"],
    ["auth/wrong-password", "wrong_credentials"],
    ["auth/email-already-in-use", "email_in_use"],
    ["auth/credential-already-in-use", "credential_in_use"],
    ["auth/weak-password", "weak_password"],
    ["auth/invalid-email", "invalid_email"],
    ["auth/popup-closed-by-user", "cancelled"],
    ["auth/network-request-failed", "network"],
    ["auth/nesto-novo", "unknown"],
  ];
  for (const [code, expected] of cases) {
    assert.equal(accountErrorCode({ code }), expected, code);
  }
  assert.equal(accountErrorCode(new Error("x")), "unknown");
  assert.equal(accountErrorCode(null), "unknown");
  assert.equal(accountErrorCode(new AccountError("unavailable")), "unavailable");
});

test("e-mail: gruba provjera prije slanja", () => {
  for (const ok of ["zvonko@gmail.com", " a.b@c.co ", "x+y@mail.example.ba"]) {
    assert.equal(looksLikeEmail(ok), true, ok);
  }
  for (const bad of ["", "zvonko", "zvonko@", "@gmail.com", "zv onko@gmail.com", "a@b.c"]) {
    assert.equal(looksLikeEmail(bad), false, bad);
  }
});
