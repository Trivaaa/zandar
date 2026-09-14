import { test } from "node:test";
import assert from "node:assert/strict";

import {
  buildGameStartedPush,
  buildJoinApprovedPush,
  buildJoinRequestPush,
  cleanName,
  gameStartRecipients,
  MIN_USEFUL_TTL_MS,
  TABLE_CHANNEL_ID,
  withinMinutes,
} from "./messages";

test("join_request: TTL je ostatak roka zahtjeva, tekst imenuje gosta", () => {
  const msg = buildJoinRequestPush({
    roomId: "a1b2c3",
    guestName: "Marko",
    expiresAt: 120_000,
    now: 0,
  });
  assert.ok(msg);
  assert.equal(msg.ttlMs, 120_000);
  assert.equal(msg.title, "Neko kuca na tvoj sto");
  assert.equal(msg.body, "Marko želi da sjedne. Odgovori u naredne 2 minute.");
  assert.equal(msg.tag, "join:a1b2c3");
  assert.equal(msg.channelId, TABLE_CHANNEL_ID);
});

test("join_request: ne šalje se kad je rok praktično istekao", () => {
  const base = { roomId: "a1b2c3", guestName: "Marko", now: 0 };
  assert.equal(
    buildJoinRequestPush({ ...base, expiresAt: MIN_USEFUL_TTL_MS - 1 }),
    null,
  );
  assert.equal(buildJoinRequestPush({ ...base, expiresAt: -5_000 }), null);
  assert.ok(buildJoinRequestPush({ ...base, expiresAt: MIN_USEFUL_TTL_MS }));
});

test("rok se nikad ne precjenjuje, a množina prati broj", () => {
  assert.equal(withinMinutes(120_000), "u naredne 2 minute");
  assert.equal(withinMinutes(119_999), "u narednoj minuti");
  assert.equal(withinMinutes(30_000), "u narednoj minuti");
  assert.equal(withinMinutes(5 * 60_000), "u narednih 5 minuta");
  assert.equal(withinMinutes(12 * 60_000), "u narednih 12 minuta");
  assert.equal(withinMinutes(22 * 60_000), "u naredne 22 minute");
});

test("nadimak: kontrolni znakovi, razmaci, dužina i emoji", () => {
  assert.equal(cleanName("  Ana\n\tMaria "), "Ana Maria");
  assert.equal(cleanName(""), "Igrač");
  assert.equal(cleanName("\n\n"), "Igrač");

  const long = cleanName("a".repeat(30));
  assert.equal(Array.from(long).length, 24);
  assert.ok(long.endsWith("…"));

  // Emoji je dvije UTF-16 jedinice; rez po jedinicama bi ostavio pola znaka.
  const emoji = cleanName("😀".repeat(30));
  assert.equal(Array.from(emoji).length, 24);
  assert.ok(Array.from(emoji).slice(0, 23).every((c) => c === "😀"));
});

test("payload nosi samo vrstu i sobu — nikad token ni stanje igre", () => {
  const all = [
    buildJoinRequestPush({ roomId: "r1", guestName: "X", expiresAt: 60_000, now: 0 }),
    buildJoinApprovedPush({ roomId: "r1" }),
    buildGameStartedPush({ roomId: "r1" }),
  ];
  for (const msg of all) {
    assert.ok(msg);
    assert.deepEqual(Object.keys(msg.data).sort(), ["roomId", "type"]);
    assert.equal(msg.data.type, msg.type);
    assert.equal(msg.data.roomId, "r1");
  }
});

test("tekst ne pominje botove", () => {
  const all = [
    buildJoinRequestPush({ roomId: "r1", guestName: "X", expiresAt: 60_000, now: 0 }),
    buildJoinApprovedPush({ roomId: "r1" }),
    buildGameStartedPush({ roomId: "r1" }),
  ];
  for (const msg of all) {
    assert.ok(msg);
    assert.doesNotMatch(`${msg.title} ${msg.body}`, /bot|kompjuter|AI\b/i);
  }
});

test("odobren ulazak i početak partije dijele tag sobe", () => {
  assert.equal(
    buildJoinApprovedPush({ roomId: "r1" }).tag,
    buildGameStartedPush({ roomId: "r1" }).tag,
  );
});

test("primaoci početka: ljudi osim hosta, bez botova i bez duplikata", () => {
  const recipients = gameStartRecipients({
    hostPlayerId: "h",
    players: [
      { id: "h" },
      { id: "g1" },
      { id: "b1", isBot: true },
      { id: "g2" },
      { id: "g3" },
    ],
    // g2 je isti telefon kao g1, g3 nema uređaj, bot ima (ne bi smio) uređaj.
    pushIds: { h: "H", g1: "G1", b1: "B1", g2: "G1" },
  });
  assert.deepEqual(recipients, ["G1"]);
});

test("primaoci početka: hostov uređaj ne dobija push ni preko drugog sjedišta", () => {
  assert.deepEqual(
    gameStartRecipients({
      hostPlayerId: "h",
      players: [{ id: "h" }, { id: "g1" }],
      pushIds: { h: "H", g1: "H" },
    }),
    [],
  );
});

test("soba iz starog snapshota (bez pushIds) nema primaoce", () => {
  assert.deepEqual(
    gameStartRecipients({ hostPlayerId: "h", players: [{ id: "h" }, { id: "g1" }] }),
    [],
  );
});
