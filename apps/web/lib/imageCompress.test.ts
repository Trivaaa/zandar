import assert from "node:assert/strict";
import { describe, test } from "node:test";

import { dataUrlBytes, fitWithin, IMAGE_MAX_SIDE } from "./imageCompress";

describe("fitWithin", () => {
  test("veliku sliku smanjuje po dužoj strani, odnos ostaje", () => {
    assert.deepEqual(fitWithin(4000, 3000), { width: IMAGE_MAX_SIDE, height: 1200 });
    assert.deepEqual(fitWithin(1080, 2340), { width: 738, height: IMAGE_MAX_SIDE });
  });
  test("malu ne uvećava", () => {
    assert.deepEqual(fitWithin(800, 600), { width: 800, height: 600 });
  });
});

describe("dataUrlBytes", () => {
  test("broji samo base64 dio", () => {
    const bytes = Buffer.alloc(300);
    assert.equal(dataUrlBytes(`data:image/jpeg;base64,${bytes.toString("base64")}`), 300);
  });
});
