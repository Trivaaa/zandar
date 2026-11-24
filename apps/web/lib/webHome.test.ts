import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { TABLE_THEMES } from "@zandar/shared-types";

import { guestName, randomTableTheme, webCreateCounts, webCreatePath, webQuickPlayChoice } from "./webHome";

describe("web početna — Igraj pravo za sto (W1)", () => {
  test("Žandar: 4 igrača, do 11", () => {
    const choice = webQuickPlayChoice(() => 0);
    assert.deepEqual(choice.prefs, { playerCount: 4, targetScore: 11 });
  });

  test("Raub: od 21 (odluka 35)", () => {
    assert.equal(webQuickPlayChoice(() => 0, "raub").prefs.targetScore, 21);
  });

  test("izbor se ne pamti kao zadnji", () => {
    assert.equal(webQuickPlayChoice().remember, false);
  });

  test("D10: zapamćen izbor iz Profila pobjeđuje stalni (Raub od 11, sto Drvo)", () => {
    const choice = webQuickPlayChoice(() => 0, "raub", {
      prefs: { playerCount: 4, targetScore: 11 },
      tableTheme: "wood",
    });
    assert.equal(choice.prefs.targetScore, 11);
    assert.equal(choice.tableTheme, "wood");
    assert.equal(choice.remember, false);
  });

  test("D10: samo sto zapamćen — cilj ostaje stalni", () => {
    const choice = webQuickPlayChoice(() => 0, "zandar", { prefs: null, tableTheme: "cloth" });
    assert.deepEqual(choice.prefs, { playerCount: 4, targetScore: 11 });
    assert.equal(choice.tableTheme, "cloth");
  });

  test("izgled stola: svaka podloga je moguća, uvijek ponuđena", () => {
    const seen = new Set<string>();
    for (let i = 0; i < TABLE_THEMES.length; i++) {
      seen.add(randomTableTheme(() => (i + 0.5) / TABLE_THEMES.length));
    }
    assert.deepEqual([...seen].sort(), [...TABLE_THEMES].sort());
    // rng() na samoj granici (1) ili izvan nje ne smije dati nepostojeću podlogu.
    for (const r of [0, 0.999999, 1, -0.1]) {
      assert.ok((TABLE_THEMES as readonly string[]).includes(randomTableTheme(() => r)), `rng=${r}`);
    }
  });
});

describe("web početna — Igraj s prijateljima (W4)", () => {
  test("igra uvijek ide u adresu, i Žandar", () => {
    assert.equal(webCreatePath("zandar"), "/create?game=zandar");
    assert.equal(webCreatePath("raub"), "/create?game=raub");
  });

  test("Žandar nudi samo 2 ili 4; Poker i Raub 2–4", () => {
    assert.deepEqual(webCreateCounts("zandar"), [2, 4]);
    assert.deepEqual(webCreateCounts("poker"), [2, 3, 4]);
    assert.deepEqual(webCreateCounts("raub"), [2, 3, 4]);
  });
});

describe("ime gosta (I5)", () => {
  test("Gost i dvocifren broj, i na granicama rng-a", () => {
    for (const r of [0, 0.5, 0.999999, 1, -0.1]) {
      assert.match(guestName(() => r), /^Gost [1-9]\d$/, `rng=${r}`);
    }
    assert.equal(guestName(() => 0), "Gost 10");
    assert.equal(guestName(() => 0.999999), "Gost 99");
  });
});
