import { test } from "node:test";
import assert from "node:assert/strict";

import { placeNear } from "../components/profile/GuestCard";

const rect = (left: number, top: number, width: number, height: number) =>
  ({ left, top, width, height, right: left + width, bottom: top + height }) as DOMRect;

test("oblačić gosta: pored uskog sjedišta, ispod/iznad širokog reda, uvijek na ekranu", () => {
  // Lijevo sjedište za stolom (360 px ekran): desno ima mjesta.
  assert.deepEqual(placeNear(rect(4, 250, 56, 56), 360, 740), { top: "250px", left: "66px" });
  // Desno sjedište: lijevo od njega.
  assert.deepEqual(placeNear(rect(300, 250, 56, 56), 360, 740), { top: "250px", left: "70px" });
  // Red u sobi preko cijele širine: ispod reda, poravnat sa njim.
  assert.deepEqual(placeNear(rect(16, 270, 328, 52), 360, 740), { top: "328px", left: "16px" });
  // Isti red na dnu ekrana: iznad.
  assert.deepEqual(placeNear(rect(16, 690, 328, 44), 360, 740), { top: "628px", left: "16px" });
});
