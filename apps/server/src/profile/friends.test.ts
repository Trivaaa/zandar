import { test } from "node:test";
import assert from "node:assert/strict";

import {
  acceptRequest,
  cancelRequest,
  declineRequest,
  relationOf,
  removeFriend,
  sendRequest,
  severOnBlock,
} from "./friends";
import { createMemoryProfileStore } from "./store";

test("zahtjev → prihvatanje: prijatelji kod oba; odnos iz ugla gledaoca", async () => {
  const s = createMemoryProfileStore();
  assert.equal(await sendRequest(s, "a", "b"), "outgoing");
  assert.equal(await relationOf(s, "a", "b"), "outgoing");
  assert.equal(await relationOf(s, "b", "a"), "incoming");
  assert.equal(await sendRequest(s, "a", "b"), "outgoing", "ponovljen zahtjev je bezopasan");
  assert.deepEqual(await s.incomingRequestUids("b"), ["a"]);

  assert.equal(await acceptRequest(s, "b", "a"), "friends");
  assert.equal(await relationOf(s, "a", "b"), "friends");
  assert.deepEqual(await s.friendUids("a"), ["b"]);
  assert.deepEqual(await s.incomingRequestUids("b"), [], "zahtjev nestaje sa prihvatanjem");
});

test("obostrani zahtjev = prijateljstvo odmah", async () => {
  const s = createMemoryProfileStore();
  await sendRequest(s, "a", "b");
  assert.equal(await sendRequest(s, "b", "a"), "friends");
  assert.equal(await s.hasRequest("a", "b"), false);
});

test("odbij, povuci, ukloni — tiho i bez ostataka", async () => {
  const s = createMemoryProfileStore();
  await sendRequest(s, "a", "b");
  assert.equal(await declineRequest(s, "b", "a"), "none");
  assert.equal(await relationOf(s, "a", "b"), "none");

  await sendRequest(s, "a", "b");
  assert.equal(await cancelRequest(s, "a", "b"), "none");
  assert.equal(await relationOf(s, "b", "a"), "none");

  await sendRequest(s, "a", "b");
  await acceptRequest(s, "b", "a");
  assert.equal(await removeFriend(s, "b", "a"), "none");
  assert.equal(await relationOf(s, "a", "b"), "none", "kod oba igrača");
  assert.equal(await acceptRequest(s, "b", "a"), "none", "bez zahtjeva nema prihvatanja");
});

test("blokada: briše vezu; blokirani ne saznaje — njegov zahtjev se „pošalje\" ali ne upiše", async () => {
  const s = createMemoryProfileStore();
  await sendRequest(s, "a", "b");
  await acceptRequest(s, "b", "a");
  await s.setBlock("b", "a", true);
  await severOnBlock(s, "b", "a");
  assert.equal(await relationOf(s, "b", "a"), "blocked");
  assert.equal(await relationOf(s, "a", "b"), "none", "blokirani vidi samo „nema odnosa\"");

  assert.equal(await sendRequest(s, "a", "b"), "outgoing");
  assert.deepEqual(await s.incomingRequestUids("b"), [], "ništa nije stiglo");
  assert.equal(await sendRequest(s, "b", "a"), "blocked", "ko blokira, zna da je blokirao");
  assert.equal(await relationOf(s, "a", "a"), "self");
});
