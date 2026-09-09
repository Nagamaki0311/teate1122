import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeJson, computeChanges, pendingImageFiles } from "../src/lib/changes.js";

function baseFixtures() {
  const home = { sections: [{ id: "s1" }] };
  const events = [{ id: "e1" }];
  const site = { assets: [{ id: "a1", file: "hero.svg" }], nav: { items: [] } };
  const candles = [{ id: "c1", name: "白木蓮", image: { assetId: "a1", focal: [0.5, 0.5], zoom: 1 } }];
  const rawText = {
    "site-data/pages/home.json": serializeJson(home),
    "site-data/events.json": serializeJson(events),
    "site-data/site.json": serializeJson(site),
    "site-data/candles.json": serializeJson(candles),
  };
  return { home, events, site, candles, rawText };
}

test("serializeJson matches the on-disk site-data formatting (2-space indent + trailing newline)", () => {
  assert.equal(serializeJson({ a: 1 }), '{\n  "a": 1\n}\n');
  assert.equal(serializeJson([]), "[]\n");
});

test("computeChanges returns nothing when the draft matches the original text exactly", () => {
  const { home, events, site, candles, rawText } = baseFixtures();
  assert.deepEqual(computeChanges({ home, events, site, candles }, rawText), []);
});

test("computeChanges reports only the file(s) that actually changed", () => {
  const { home, events, site, candles, rawText } = baseFixtures();
  const editedHome = { sections: [{ id: "s1", visible: false }] };
  const changes = computeChanges({ home: editedHome, events, site, candles }, rawText);

  assert.equal(changes.length, 1);
  assert.equal(changes[0].path, "site-data/pages/home.json");
  assert.equal(changes[0].content, serializeJson(editedHome));
  assert.equal(changes[0].before, rawText["site-data/pages/home.json"]);
});

test("computeChanges detects all four files changing at once", () => {
  const { home, events, site, candles, rawText } = baseFixtures();
  const editedSite = { ...site, assets: [{ ...site.assets[0], file: "photos/a1-20260909-01.webp" }] };
  const editedCandles = [{ ...candles[0], image: { ...candles[0].image, zoom: 1.5 } }];
  const changes = computeChanges(
    { home: { sections: [{ id: "s2" }] }, events: [{ id: "e2" }], site: editedSite, candles: editedCandles },
    rawText,
  );
  const paths = changes.map((c) => c.path).sort();
  assert.deepEqual(paths, [
    "site-data/candles.json",
    "site-data/events.json",
    "site-data/pages/home.json",
    "site-data/site.json",
  ]);
});

test("computeChanges throws if site.json changed a field other than assets (structural guard)", () => {
  const { home, events, site, candles, rawText } = baseFixtures();
  const tampered = { ...site, nav: { items: [{ href: "/x" }] } };
  assert.throws(() => computeChanges({ home, events, site: tampered, candles }, rawText), /assets 以外/);
});

test("computeChanges allows site.json's assets to change freely", () => {
  const { home, events, site, candles, rawText } = baseFixtures();
  const edited = { ...site, assets: [{ id: "a1", file: "photos/a1-20260909-01.webp", w: 10, h: 10, alt: "x" }] };
  assert.doesNotThrow(() => computeChanges({ home, events, site: edited, candles }, rawText));
});

test("computeChanges throws if candles.json changed a field other than image (structural guard)", () => {
  const { home, events, site, candles, rawText } = baseFixtures();
  const tampered = [{ ...candles[0], note: "書き換え" }];
  assert.throws(() => computeChanges({ home, events, site, candles: tampered }, rawText), /image 以外/);
});

test("computeChanges throws if candles.json entries were added, removed, or reordered", () => {
  const { home, events, site, candles, rawText } = baseFixtures();
  assert.throws(
    () => computeChanges({ home, events, site, candles: [...candles, { id: "c2" }] }, rawText),
    /追加・削除・並べ替え/,
  );
});

test("computeChanges allows a candle's image field to change freely", () => {
  const { home, events, site, candles, rawText } = baseFixtures();
  const edited = [{ ...candles[0], image: { assetId: "a1", focal: [0.2, 0.8], zoom: 2 } }];
  assert.doesNotThrow(() => computeChanges({ home, events, site, candles: edited }, rawText));
});

// --- pendingImageFiles -------------------------------------------------------

test("pendingImageFiles base64-encodes only uploads still referenced by site.assets[]", async () => {
  const site = {
    assets: [
      { id: "a1", file: "photos/used.webp" },
      { id: "a2", file: "hero.svg" },
    ],
  };
  const blob = new Blob([new Uint8Array([1, 2, 3])], { type: "image/webp" });
  const pendingImages = {
    "src/assets/photos/used.webp": { blob, assetFile: "photos/used.webp" },
    "src/assets/photos/stale.webp": { blob, assetFile: "photos/stale.webp" }, // no longer referenced
  };
  const files = await pendingImageFiles(pendingImages, site);
  assert.equal(files.length, 1);
  assert.equal(files[0].path, "src/assets/photos/used.webp");
  assert.equal(files[0].encoding, "base64");
  assert.equal(Buffer.from(files[0].content, "base64").toString(), "\x01\x02\x03");
});
