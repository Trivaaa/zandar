import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GAMES, homeLayout, isNewGame, type GameConfig, type HomeHistory } from "./games";

const NONE: HomeHistory = { pinned: null, played: {} };
const DAY = 24 * 60 * 60 * 1000;

/** Konfiguracija sa izabranim živim igrama (ostale ostaju najavljene). */
function withLive(...live: string[]): GameConfig[] {
  return GAMES.map((g) =>
    live.includes(g.slug) ? { ...g, status: "live" as const, releasedAt: g.releasedAt ?? "2026-10-01" } : g,
  );
}
const slugs = (games: GameConfig[]) => games.map((g) => g.slug);

describe("homeLayout (SPEC_POCETNA §3, §5)", () => {
  test("danas (H1): Žandar glavna, nema „Još igara\", Poker i Raub uskoro", () => {
    const l = homeLayout(GAMES, NONE);
    assert.equal(l.main.slug, "zandar");
    assert.deepEqual(slugs(l.more), []);
    assert.deepEqual(slugs(l.upcoming), ["poker", "raub"]);
  });

  test("dvije igre (H2): novi igrač dobija Žandar, Poker je red, Raub uskoro", () => {
    const l = homeLayout(withLive("zandar", "poker"), NONE);
    assert.equal(l.main.slug, "zandar");
    assert.deepEqual(slugs(l.more), ["poker"]);
    assert.deepEqual(slugs(l.upcoming), ["raub"]);
  });

  test("tri igre (H3): bez reda „Uskoro\"", () => {
    const l = homeLayout(withLive("zandar", "poker", "raub"), NONE);
    assert.deepEqual(slugs(l.more), ["poker", "raub"]);
    assert.deepEqual(slugs(l.upcoming), []);
  });

  test("zadnja igrana postaje glavna; ostale po zadnjoj igri, pa neigrane", () => {
    const games = withLive("zandar", "poker", "raub");
    const l = homeLayout(games, { pinned: null, played: { zandar: 100, raub: 300 } });
    assert.equal(l.main.slug, "raub");
    assert.deepEqual(slugs(l.more), ["zandar", "poker"]);
  });

  test("zakačena (H5) pobjeđuje zadnju igranu i ne stoji u listi", () => {
    const games = withLive("zandar", "poker", "raub");
    const l = homeLayout(games, { pinned: "poker", played: { zandar: 500 } });
    assert.equal(l.main.slug, "poker");
    assert.deepEqual(slugs(l.more), ["zandar", "raub"]);
  });

  test("zakačena ili igrana igra koja nije živa se ignoriše", () => {
    const l = homeLayout(GAMES, { pinned: "poker", played: { raub: 900 } });
    assert.equal(l.main.slug, "zandar");
  });
});

describe("isNewGame (NOVO)", () => {
  const poker: GameConfig = { ...GAMES.find((g) => g.slug === "poker")!, status: "live", releasedAt: "2026-10-20" };
  const released = Date.parse("2026-10-20");

  test("7 dana od objave", () => {
    assert.equal(isNewGame(poker, NONE, released), true);
    assert.equal(isNewGame(poker, NONE, released + 7 * DAY - 1), true);
    assert.equal(isNewGame(poker, NONE, released + 7 * DAY), false);
  });

  test("ne prije objave", () => {
    assert.equal(isNewGame(poker, NONE, released - 1), false);
  });

  test("nestaje čim je igrač pokrene", () => {
    assert.equal(isNewGame(poker, { pinned: null, played: { poker: released + DAY } }, released + DAY), false);
  });

  test("najavljena igra i igra bez datuma nisu NOVO", () => {
    assert.equal(isNewGame(GAMES.find((g) => g.slug === "raub")!, NONE, Date.now()), false);
    assert.equal(isNewGame({ ...poker, releasedAt: null }, NONE, released), false);
  });
});
