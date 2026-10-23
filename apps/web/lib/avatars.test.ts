import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, test } from "node:test";

import { PROFILE_AVATARS } from "@zandar/shared-types";

// Pokreće se iz `apps/web` (`pnpm --filter web test`).
const DIR = join(process.cwd(), "public", "avatars");

describe("avatari naloga (public/avatars)", () => {
  test("svaki id ima svoj crtež, i nema crteža bez id-ja", () => {
    const files = readdirSync(DIR).filter((f) => f.endsWith(".svg")).sort();
    assert.deepEqual(files, PROFILE_AVATARS.map((id) => `${id}.svg`).sort());
  });

  // `<img>` ne izvršava skripte, ali crtež mora ostati samo crtež: bez
  // vanjskih referenci (na Capacitoru pucaju, na webu cure zahtjev) i sa
  // `viewBox`, da se skalira na 40/52/56/64/120.
  test("crteži su samostalni i skalabilni", () => {
    for (const id of PROFILE_AVATARS) {
      const svg = readFileSync(join(DIR, `${id}.svg`), "utf8");
      assert.match(svg, /viewBox="0 0 120 120"/, id);
      assert.doesNotMatch(svg, /<script|href=|url\((?!#)/i, id);
    }
  });
});
