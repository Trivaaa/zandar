import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { PUBLIC_WAITING_WARN_MS, silentTableReason } from "./tableWatch";

const NOW = 1_000_000;

describe("silentTableReason", () => {
  test("Žandar soba: nikad (stanje ide drugim putem)", () => {
    assert.equal(silentTableReason({ status: "playing", createdAt: 0 }, NOW), null);
  });

  test("poker playing sa stanjem: u redu", () => {
    assert.equal(
      silentTableReason({ game: "poker", status: "playing", createdAt: 0, poker: {} }, NOW),
      null,
    );
  });

  test("poker playing bez stanja: javi", () => {
    assert.match(
      silentTableReason({ game: "poker", status: "playing", createdAt: 0 }, NOW) ?? "",
      /poker soba je playing bez stanja/,
    );
  });

  test("raub gleda svoje stanje, ne poker", () => {
    assert.match(
      silentTableReason({ game: "raub", status: "playing", createdAt: 0, poker: {} }, NOW) ?? "",
      /raub soba/,
    );
  });

  test("bela gleda svoje stanje", () => {
    assert.equal(
      silentTableReason({ game: "bela", status: "playing", createdAt: 0, bela: {} }, NOW),
      null,
    );
    assert.match(
      silentTableReason({ game: "bela", status: "playing", createdAt: 0, raub: {} }, NOW) ?? "",
      /bela soba je playing bez stanja/,
    );
  });

  test("javni sto u prozoru za upare: u redu", () => {
    const createdAt = NOW - 2_000;
    assert.equal(
      silentTableReason({ game: "poker", status: "waiting", isPublic: true, createdAt }, NOW),
      null,
    );
  });

  test("javni sto predugo u waiting: javi", () => {
    const createdAt = NOW - PUBLIC_WAITING_WARN_MS - 1;
    assert.match(
      silentTableReason({ game: "poker", status: "waiting", isPublic: true, createdAt }, NOW) ?? "",
      /javni poker sto čeka/,
    );
  });

  test("privatna soba u lobiju: čekanje je normalno", () => {
    assert.equal(
      silentTableReason({ game: "poker", status: "waiting", isPublic: false, createdAt: 0 }, NOW),
      null,
    );
  });
});
