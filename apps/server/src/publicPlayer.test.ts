import { test } from "node:test";
import assert from "node:assert/strict";

import type { Player } from "@zandar/shared-types";

import { accountIdentityFor, applyAccountIdentity } from "./profile/accountIdentity";
import { createMemoryProfileStore, type ProfileStore } from "./profile/store";
import { toPublicPlayer } from "./publicPlayer";

const base: Player = {
  id: "p1",
  displayName: "Marko",
  seatIndex: 0,
  connectionStatus: "connected",
  isHost: true,
  consecutiveAutoPlays: 0,
};

test("javni igrač: tačno whitelist polja — nikad uid, guestId, isBot, botProfile", () => {
  const pub = toPublicPlayer({ ...base, uid: "u-tajna", guestId: "g-tajna", platform: "web", teamId: 0 });
  assert.deepEqual(Object.keys(pub).sort(), [
    "avatar",
    "connectionStatus",
    "displayName",
    "id",
    "isHost",
    "profileId",
    "seatIndex",
    "teamId",
  ]);
  assert.doesNotMatch(JSON.stringify(pub), /tajna|isBot|botProfile/);
});

test("gost i bot izgledaju ISTO: avatar i profileId su null — i bot kojem bi neko upisao profil", () => {
  const guest = toPublicPlayer(base);
  const bot = toPublicPlayer({ ...base, isBot: true, profileId: "marko", avatar: "a4" });
  assert.equal(guest.avatar, null);
  assert.equal(guest.profileId, null);
  assert.deepEqual(bot, guest);
});

test("nalog: nadimak, avatar i javni ID iz profila", async () => {
  const store = createMemoryProfileStore();
  await store.setNickname("u1", "Zvonko_Novi", "zvonko_novi");
  await store.setAvatar("u1", "a6");
  const player: Player = { ...base, displayName: "upisano ime", uid: "u1" };
  applyAccountIdentity(player, await accountIdentityFor(store, "u1"));
  assert.deepEqual(toPublicPlayer(player), {
    ...toPublicPlayer(base),
    displayName: "Zvonko_Novi",
    avatar: "a6",
    profileId: "zvonko_novi",
  });
});

test("identitet naloga: gost, nalog bez nadimka, greška i spor odgovor → sjedi kao gost", async () => {
  const store = createMemoryProfileStore();
  await store.recordCompletedMatch("m1", "gost");
  assert.equal(await accountIdentityFor(store, undefined), null);
  assert.equal(await accountIdentityFor(store, "gost"), null);

  const broken: ProfileStore = { ...store, getProfile: async () => { throw new Error("Firestore 503"); } };
  assert.equal(await accountIdentityFor(broken, "u1"), null);

  const slow: ProfileStore = { ...store, getProfile: () => new Promise(() => {}) };
  assert.equal(await accountIdentityFor(slow, "u1", 20), null);
});

test("bot se nikad ne dira", () => {
  const bot: Player = { ...base, isBot: true };
  applyAccountIdentity(bot, { displayName: "Neko", profileId: "neko", avatar: "a1" });
  assert.equal(bot.displayName, "Marko");
  assert.equal(bot.profileId, undefined);
});
