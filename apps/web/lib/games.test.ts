import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GAMES, gameBadge, homeLayout, isNewGame, type GameConfig, type HomeHistory } from "./games";

const NONE: HomeHistory = { pinned: null, played: {} };
const DAY = 24 * 60 * 60 * 1000;

/** Konfiguracija sa TAČNO izabranim živim igrama (ostale najavljene) — ne zavisi od `pokerLive`. */
function withLive(...live: string[]): GameConfig[] {
  return GAMES.map((g) =>
    live.includes(g.slug)
      ? { ...g, status: "live" as const, releasedAt: g.releasedAt ?? "2026-10-01" }
      : { ...g, status: "upcoming" as const, releasedAt: null },
  );
}
const slugs = (games: GameConfig[]) => games.map((g) => g.slug);

describe("homeLayout (SPEC_POCETNA §3, §5)", () => {
  test("samo Žandar (H1): Žandar glavna, nema „Još igara\", Poker i Raub uskoro", () => {
    const l = homeLayout(withLive("zandar"), NONE);
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
    const l = homeLayout(withLive("zandar"), { pinned: "poker", played: { raub: 900 } });
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

describe("izgled igre (SPEC_POCETNA_V3 §4)", () => {
  test("svaka igra ima svoju boju i dvije karte za pločicu", () => {
    const tints = GAMES.map((g) => g.tint);
    assert.equal(new Set(tints).size, GAMES.length, "dvije igre dijele boju");
    for (const g of GAMES) assert.equal(g.tileCards.length, 2, g.slug);
  });

  test("glavna igra bez motiva crta karte pločice, nikad prazan sto", () => {
    for (const g of GAMES) assert.ok((g.heroCards ?? g.tileCards).length >= 2, g.slug);
  });
});

describe("gameBadge (lista igara)", () => {
  const live = withLive("zandar", "poker");
  const zandar = live.find((g) => g.slug === "zandar")!;
  const poker = { ...live.find((g) => g.slug === "poker")!, releasedAt: "2026-11-06" };
  const now = Date.parse("2026-11-07");

  test("zakačena ima prednost, pa nova, pa zadnje igrana", () => {
    assert.equal(gameBadge(poker, { pinned: "poker", played: { zandar: 5 } }, now), "pinned");
    assert.equal(gameBadge(poker, { pinned: null, played: { zandar: 5 } }, now), "new");
    assert.equal(gameBadge(zandar, { pinned: null, played: { zandar: 5 } }, now), "last");
  });

  test("igra koja nije zadnja igrana nema oznaku", () => {
    assert.equal(gameBadge(zandar, { pinned: null, played: { zandar: 5, poker: 9 } }, now), null);
    assert.equal(gameBadge(zandar, NONE, now), null);
  });
});
