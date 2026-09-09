import { test } from "node:test";
import assert from "node:assert/strict";
import { validateHome, validateEvents, validateSite, validateCandles, validateAll } from "../src/lib/validate.js";

function baseSection(overrides = {}) {
  return {
    id: "s1",
    type: "text",
    visible: true,
    props: { heading: ["見出し"] },
    ...overrides,
  };
}

const baseSite = { assets: [{ id: "hero1", file: "hero.svg", w: 100, h: 100, alt: "x" }] };
const goodImage = { assetId: "hero1", focal: [0.5, 0.5], zoom: 1, alt: "写真の説明" };

test("validateHome accepts a minimal well-formed home", () => {
  const result = validateHome({ sections: [baseSection()] });
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateHome rejects a non-array sections", () => {
  assert.equal(validateHome({ sections: "nope" }).ok, false);
  assert.equal(validateHome(null).ok, false);
});

test("validateHome flags duplicate ids", () => {
  const result = validateHome({ sections: [baseSection(), baseSection()] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("重複")));
});

test("validateHome flags an unknown type", () => {
  const result = validateHome({ sections: [baseSection({ type: "made-up" })] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("type")));
});

test("validateHome flags a non-boolean visible", () => {
  const result = validateHome({ sections: [baseSection({ visible: "true" })] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("visible")));
});

test("validateHome flags an empty array heading (hero/text) and empty string heading (others)", () => {
  const emptyArray = validateHome({ sections: [baseSection({ props: { heading: [""] } })] });
  assert.equal(emptyArray.ok, false);

  const emptyString = validateHome({
    sections: [baseSection({ id: "s2", type: "image-text", props: { heading: "  ", image: goodImage } })],
  });
  assert.equal(emptyString.ok, false);

  const nonEmptyString = validateHome({
    sections: [baseSection({ id: "s3", type: "image-text", props: { heading: "つくる人", image: goodImage } })],
  });
  assert.equal(nonEmptyString.ok, true);
});

// --- image reference checks (D-024 §2-5) ------------------------------------

test("validateHome is skipped for image refs when no site is passed (existing shape-only callers)", () => {
  const result = validateHome({ sections: [baseSection({ type: "hero", props: { heading: ["x"] } })] });
  assert.equal(result.ok, true, "no site => image checks are skipped, not failed");
});

test("validateHome flags an unknown assetId on hero/image-text", () => {
  const result = validateHome(
    { sections: [baseSection({ type: "hero", props: { heading: ["x"], image: { ...goodImage, assetId: "nope" } } })] },
    baseSite,
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("assets に存在しません")));
});

test("validateHome flags an out-of-range focal point", () => {
  const result = validateHome(
    { sections: [baseSection({ type: "hero", props: { heading: ["x"], image: { ...goodImage, focal: [1.5, 0.5] } } })] },
    baseSite,
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("focal")));
});

test("validateHome flags a zoom outside 1-3", () => {
  const result = validateHome(
    { sections: [baseSection({ type: "hero", props: { heading: ["x"], image: { ...goodImage, zoom: 0.5 } } })] },
    baseSite,
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("zoom")));
});

test("validateHome flags an empty alt on hero/image-text/gallery images", () => {
  const result = validateHome(
    { sections: [baseSection({ type: "hero", props: { heading: ["x"], image: { ...goodImage, alt: "  " } } })] },
    baseSite,
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("alt")));
});

test("validateHome checks every gallery item's image ref", () => {
  const result = validateHome(
    {
      sections: [
        baseSection({
          type: "gallery",
          props: { heading: "x", items: [goodImage, { ...goodImage, assetId: "missing" }] },
        }),
      ],
    },
    baseSite,
  );
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("items[1]")));
});

test("validateEvents accepts a minimal well-formed event list", () => {
  const result = validateEvents([
    { id: "e1", kind: "event", date: "2026-10-18", title: "秋の手作り市" },
    { id: "e2", kind: "workshop", date: "2026-11-09", title: "ワークショップ" },
  ]);
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateEvents flags duplicate ids, unknown kind, empty title", () => {
  const result = validateEvents([
    { id: "e1", kind: "event", date: "2026-10-18", title: "A" },
    { id: "e1", kind: "party", date: "2026-10-19", title: "" },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 3, result.errors.join("; "));
});

test("validateEvents rejects malformed and non-existent dates", () => {
  assert.equal(validateEvents([{ id: "e1", kind: "event", date: "2026/10/18", title: "t" }]).ok, false);
  assert.equal(validateEvents([{ id: "e1", kind: "event", date: "2026-02-30", title: "t" }]).ok, false, "Feb 30 does not exist");
  assert.equal(validateEvents([{ id: "e1", kind: "event", date: "2024-02-29", title: "t" }]).ok, true, "2024 is a leap year");
});

test("validateEvents rejects a non-array", () => {
  assert.equal(validateEvents({}).ok, false);
});

// --- validateSite ------------------------------------------------------------

test("validateSite accepts hero.svg placeholders and known committed/pending photo files", () => {
  const site = {
    assets: [
      { id: "a1", file: "hero.svg", w: 10, h: 10, alt: "x" },
      { id: "a2", file: "photos/committed.webp", w: 10, h: 10, alt: "x" },
      { id: "a3", file: "photos/pending.webp", w: 10, h: 10, alt: "x" },
    ],
  };
  const result = validateSite(site, {
    originalAssetFiles: new Set(["hero.svg", "photos/committed.webp"]),
    pendingAssetFiles: new Set(["photos/pending.webp"]),
  });
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateSite flags a broken reference: a photo neither committed nor pending", () => {
  const site = { assets: [{ id: "a1", file: "photos/gone.webp", w: 10, h: 10, alt: "x" }] };
  const result = validateSite(site, {
    originalAssetFiles: new Set(["hero.svg"]),
    pendingAssetFiles: new Set(),
  });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("見つかりません")));
});

test("validateSite flags a malformed file value and non-positive w/h", () => {
  const site = { assets: [{ id: "a1", file: "../escape.webp", w: 0, h: -1, alt: "x" }] };
  const result = validateSite(site, { originalAssetFiles: new Set(), pendingAssetFiles: new Set() });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("file の形式")));
  assert.ok(result.errors.some((e) => e.includes("w/h")));
});

test("validateSite flags duplicate asset ids", () => {
  const site = {
    assets: [
      { id: "a1", file: "hero.svg", w: 1, h: 1 },
      { id: "a1", file: "hero.svg", w: 1, h: 1 },
    ],
  };
  assert.equal(validateSite(site, {}).ok, false);
});

// --- validateCandles -----------------------------------------------------------

test("validateCandles checks each candle's image ref but does not require alt", () => {
  const good = validateCandles([{ id: "c1", image: { assetId: "hero1", focal: [0.5, 0.5], zoom: 1 } }], baseSite);
  assert.deepEqual(good, { ok: true, errors: [] });

  const bad = validateCandles([{ id: "c1", image: { assetId: "missing", focal: [0.5, 0.5], zoom: 1 } }], baseSite);
  assert.equal(bad.ok, false);
});

test("validateAll merges home/events/site/candles errors and threads the reference-check context through", () => {
  const draft = {
    home: { sections: [baseSection()] },
    events: [{ id: "e1", kind: "event", date: "2026-10-18", title: "t" }],
    site: { assets: [{ id: "a1", file: "photos/gone.webp", w: 1, h: 1, alt: "x" }] },
    candles: [{ id: "c1", image: { assetId: "a1", focal: [0.5, 0.5], zoom: 1 } }],
  };
  const result = validateAll(draft, { originalAssetFiles: new Set(), pendingAssetFiles: new Set() });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("見つかりません")));
});
