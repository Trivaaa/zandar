import { test } from "node:test";
import assert from "node:assert/strict";

import {
  activeInvites,
  addInvites,
  INVITE_TTL_MS,
  inviteFor,
  publicInvites,
  removeInvite,
  type InviteRoom,
  type RoomInvite,
} from "./invites";

const inv = (uid: string, createdAt = 0): RoomInvite => ({
  uid,
  profileId: uid.replace("u", "nick"),
  nickname: uid.toUpperCase(),
  fromUid: "host",
  createdAt,
});

function room(): InviteRoom {
  return { status: "waiting", players: [{ uid: "host" }], rulesConfig: { playerCount: 4, targetScore: 21 } };
}

test("poziv važi dok soba čeka, ima mjesta i nije prošlo 30 minuta", () => {
  const r = room();
  addInvites(r, [inv("u1"), inv("u2")]);
  assert.deepEqual(activeInvites(r, 1).map((i) => i.uid), ["u1", "u2"]);
  assert.equal(inviteFor(r, "u1", INVITE_TTL_MS - 1)?.uid, "u1");
  assert.equal(inviteFor(r, "u1", INVITE_TTL_MS), null, "rok od 30 minuta (Q1)");

  r.status = "playing";
  assert.deepEqual(activeInvites(r, 1), [], "partija je počela");
});

test("puna soba gasi pozive — ali bot-sjedište se računa kao slobodno", () => {
  const r = room();
  addInvites(r, [inv("u1")]);
  r.players.push({ uid: "a" }, { uid: "b" }, { isBot: true });
  assert.equal(inviteFor(r, "u1", 1)?.uid, "u1", "bot ustupa mjesto čovjeku");
  r.players[3] = { uid: "c" };
  assert.equal(inviteFor(r, "u1", 1), null);
});

test("pozvani koji već sjedi nema poziv; ponovljen poziv obnavlja rok; uklanjanje", () => {
  const r = room();
  addInvites(r, [inv("u1", 0)]);
  addInvites(r, [inv("u1", INVITE_TTL_MS)]);
  assert.equal(r.invites?.length, 1, "bez duplikata");
  assert.equal(inviteFor(r, "u1", INVITE_TTL_MS + 5)?.createdAt, INVITE_TTL_MS);
  r.players.push({ uid: "u1" });
  assert.equal(inviteFor(r, "u1", INVITE_TTL_MS + 5), null);
  removeInvite(r, "u1");
  assert.deepEqual(r.invites, []);
});

test("javni prikaz poziva: bez uid-a", () => {
  const r = room();
  addInvites(r, [inv("u1")]);
  const pub = publicInvites(r, 1);
  assert.deepEqual(pub, [{ profileId: "nick1", nickname: "U1", avatar: null }]);
  assert.doesNotMatch(JSON.stringify(pub), /"u1"|uid|host/);
});
