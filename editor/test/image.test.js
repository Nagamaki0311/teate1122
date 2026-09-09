import { test } from "node:test";
import assert from "node:assert/strict";
import { makeAssetFileName } from "../src/lib/image.js";
import { isAllowedPath, PHOTO_DIR } from "../src/lib/github.js";

test("makeAssetFileName builds <sectionId>-<YYYYMMDD>-<NN>.<ext>", () => {
  assert.equal(makeAssetFileName("hero", "20260909", [], "webp"), "hero-20260909-01.webp");
});

test("makeAssetFileName avoids colliding with existing assets[] files", () => {
  const name = makeAssetFileName("hero", "20260909", ["hero.svg", "photos/hero-20260909-01.webp"], "webp");
  assert.equal(name, "hero-20260909-02.webp");
});

test("makeAssetFileName avoids colliding with a pending (not-yet-committed) upload's path", () => {
  // Callers pass pending uploads' assetFile values ("photos/..." form) mixed
  // in with committed assets[].file values — both must be considered.
  const existing = ["photos/hero-20260909-01.webp", "photos/hero-20260909-02.webp"];
  assert.equal(makeAssetFileName("hero", "20260909", existing, "webp"), "hero-20260909-03.webp");
});

test("makeAssetFileName accepts a Date object and formats YYYYMMDD from it", () => {
  const date = new Date(Date.UTC(2026, 0, 5)); // Jan 5 2026 (month is 0-based)
  const name = makeAssetFileName("profile", date, [], "jpg");
  assert.match(name, /^profile-2026\d{4}-01\.jpg$/);
});

test("makeAssetFileName sanitizes a section id that would otherwise violate the filename pattern", () => {
  const name = makeAssetFileName("Candle_1!", "20260909", [], "webp");
  assert.equal(name, "candle-1-20260909-01.webp");
});

test("every name makeAssetFileName can produce satisfies github.js's isAllowedPath", () => {
  const sectionIds = ["hero", "profile", "candles", "gallery", "sc1", "Weird Id!!"];
  const exts = ["webp", "jpg"];
  for (const sectionId of sectionIds) {
    for (const ext of exts) {
      for (let n = 1; n <= 3; n++) {
        // Force N collisions so we exercise the 2nd/3rd generated name too.
        const used = Array.from({ length: n - 1 }, (_, i) =>
          makeAssetFileName(sectionId, "20260909", [], ext).replace(/-01\./, `-${String(i + 1).padStart(2, "0")}.`),
        );
        const name = makeAssetFileName(sectionId, "20260909", used, ext);
        const path = `${PHOTO_DIR}${name}`;
        assert.equal(isAllowedPath(path), true, `expected ${path} to be allowed`);
      }
    }
  }
});
