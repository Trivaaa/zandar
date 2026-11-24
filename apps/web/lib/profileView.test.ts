import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { GAMES, homeLayout, type GameConfig, type HomeHistory } from "./games";
import {
  gamePlayHint,
  gameSettingsShape,
  gameSettingsSummary,
  mostPlayedGame,
  profileGames,
  shortEmail,
} from "./profileView";

const NONE: HomeHistory = { pinned: null, played: {} };

/** Sve četiri prave igre žive, nezavisno od prekidača izdanja. */
const LIVE4: GameConfig[] = GAMES.map((g) =>
  ["zandar", "poker", "raub", "bela"].includes(g.slug)
    ? { ...g, status: "live" as const, releasedAt: g.releasedAt ?? "2026-10-01" }
    : g,
);
const slugs = (games: GameConfig[]) => games.map((g) => g.slug);

describe("profileGames — redom kao početna (D12)", () => {
  test("aplikacija: zadnja igrana prva, samo žive igre (bez lažnih vrata)", () => {
    const history: HomeHistory = { pinned: null, played: { raub: 200, poker: 100 } };
    const list = profileGames(homeLayout(LIVE4, history), history, true);
    assert.deepEqual(slugs(list), ["raub", "poker", "zandar", "bela"]);
  });

  test("web, novi igrač: stalni redoslijed web početne, bez Tablića i Remija", () => {
    const list = profileGames(homeLayout(LIVE4, NONE), NONE, false);
    assert.deepEqual(slugs(list), ["raub", "bela", "poker", "zandar"]);
  });

  test("zakačena igra je prva i u Profilu", () => {
    const history: HomeHistory = { pinned: "bela", played: { raub: 1 } };
    assert.equal(profileGames(homeLayout(LIVE4, history), history, true)[0]!.slug, "bela");
  });
});

describe("mostPlayedGame — pločica „najviše igraš\" (D8)", () => {
  test("najviše partija pobjeđuje", () => {
    assert.equal(mostPlayedGame({ zandar: 3, raub: 7 }, {}, LIVE4), "raub");
  });

  test("nerješeno → zadnja pokrenuta na ovom uređaju", () => {
    assert.equal(mostPlayedGame({ zandar: 4, poker: 4 }, { zandar: 10, poker: 20 }, LIVE4), "poker");
  });

  test("bez partija → null („—\"), i bez polja (stari server)", () => {
    assert.equal(mostPlayedGame({}, {}, LIVE4), null);
    assert.equal(mostPlayedGame(undefined, { zandar: 5 }, LIVE4), null);
    assert.equal(mostPlayedGame({ zandar: 0 }, {}, LIVE4), null);
  });

  test("igra koja nije živa se ne nudi", () => {
    const onlyZandar = GAMES.map((g) => (g.slug === "zandar" ? g : { ...g, status: "upcoming" as const }));
    assert.equal(mostPlayedGame({ poker: 9, zandar: 1 }, {}, onlyZandar), "zandar");
  });
});

describe("list igre — samo ono što server sluša (§5)", () => {
  test("Žandar: igrači + cilj; Raub: početak + karte; Poker i Bela: samo sto", () => {
    assert.deepEqual(gameSettingsShape("zandar"), { players: true, target: "to", deck: false });
    assert.deepEqual(gameSettingsShape("raub"), { players: false, target: "from", deck: true });
    assert.deepEqual(gameSettingsShape("poker"), { players: false, target: null, deck: false });
    assert.deepEqual(gameSettingsShape("bela"), { players: false, target: null, deck: false });
  });
});

describe("opis ispod igre — iz istog izbora koji ide serveru", () => {
  const prefs = { playerCount: 4 as const, targetScore: 21 as const };
  test("Žandar", () => {
    assert.equal(
      gameSettingsSummary("zandar", { prefs, tableTheme: "classic", deck: "hungarian" }),
      "4 igrača · do 21 · Klasik",
    );
  });
  test("Raub: od koliko se kreće, karte, sto", () => {
    assert.equal(
      gameSettingsSummary("raub", { prefs: { playerCount: 4, targetScore: 11 }, tableTheme: "wood", deck: "french" }),
      "Od 11 · francuske · Drvo",
    );
  });
  test("Bela i Poker: samo sto (fiksno 2 na 2 do 501 se ne piše)", () => {
    assert.equal(gameSettingsSummary("bela", { prefs, tableTheme: "cloth", deck: "hungarian" }), "Sto: Kafana");
    assert.equal(gameSettingsSummary("poker", { prefs, tableTheme: "wood", deck: "hungarian" }), "Sto: Drvo");
  });
  test("Igraj nosi izbor u sebi", () => {
    assert.equal(gamePlayHint("zandar", { playerCount: 2, targetScore: 11 }), "2 igrača · do 11");
    assert.equal(gamePlayHint("raub", prefs), "od 21");
    assert.equal(gamePlayHint("poker", prefs), null);
  });
});

describe("shortEmail", () => {
  test("adresa se skraćuje na ime naloga", () => {
    assert.equal(shortEmail("jaca@primjer.com"), "jaca@…");
    assert.equal(shortEmail("bez-majmuna"), "bez-majmuna");
  });
});
