import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { renderContentHtml, renderPreviewHtml, TEMPLATE_KEYS } from "../src/lib/render.js";

const repoRoot = fileURLToPath(new URL("../../", import.meta.url));

function readRepoFile(relPath) {
  return readFileSync(new URL(relPath, `file://${repoRoot}`), "utf8");
}

// Loads the *real* templates/data/CSS/JS from disk — the same files
// eleventy.config.js and src/_includes point at — so these tests exercise
// render.js against the actual site, not a stand-in fixture.
function loadRealTemplates() {
  const templates = {};
  for (const key of TEMPLATE_KEYS) {
    templates[key] = readRepoFile(`src/_includes/${key}`);
  }
  return templates;
}

function loadRealData() {
  return {
    home: JSON.parse(readRepoFile("site-data/pages/home.json")),
    site: JSON.parse(readRepoFile("site-data/site.json")),
    candles: JSON.parse(readRepoFile("site-data/candles.json")),
    events: JSON.parse(readRepoFile("site-data/events.json")),
  };
}

// Collapses all whitespace runs to a single space — the completion
// criteria for this feature explicitly allow whitespace-only differences
// between the editor's preview and Eleventy's own build output (see
// docs/decisions.md D-024 §3, "プレビュー忠実性の実測").
function normalizeWhitespace(html) {
  return html.replace(/\s+/g, " ").trim();
}

test("renderContentHtml includes every visible section's id", () => {
  const { home, site, candles, events } = loadRealData();
  const html = renderContentHtml({ home, site, candles, events, templates: loadRealTemplates() });
  for (const section of home.sections.filter((s) => s.visible)) {
    assert.match(html, new RegExp(`id="${section.id}"`), `expected id="${section.id}" in the rendered output`);
  }
});

test("renderContentHtml renders the hero focal point as the same NN.N% string as eleventy.config.js's `pct` filter", () => {
  const { home, site, candles, events } = loadRealData();
  const hero = home.sections.find((s) => s.type === "hero");
  const html = renderContentHtml({ home, site, candles, events, templates: loadRealTemplates() });
  const [fx, fy] = hero.props.image.focal;
  assert.match(html, new RegExp(`--focal-x:${(fx * 100).toFixed(1)}%`));
  assert.match(html, new RegExp(`--focal-y:${(fy * 100).toFixed(1)}%`));
  assert.match(html, new RegExp(`--zoom:${hero.props.image.zoom}`));
});

test("renderContentHtml matches Eleventy's own _site/index.html for the same data, modulo whitespace", () => {
  const { home, site, candles, events } = loadRealData();
  const ours = renderContentHtml({ home, site, candles, events, templates: loadRealTemplates() });

  let built;
  try {
    built = readRepoFile("_site/index.html");
  } catch {
    // `npm run build` (or `npx eleventy`) hasn't been run in this checkout —
    // skip rather than fail, since this test's purpose is a cross-check
    // against that build output, not to trigger the build itself.
    return;
  }
  const mainMatch = /<main id="top">([\s\S]*?)<\/main>/.exec(built);
  assert.ok(mainMatch, "expected _site/index.html to contain <main id=\"top\">...</main>");
  assert.equal(normalizeWhitespace(ours), normalizeWhitespace(mainMatch[1]));
});

test("renderPreviewHtml escapes draft text that looks like HTML/script injection", () => {
  const { site, candles, events } = loadRealData();
  const home = {
    sections: [
      {
        id: "hero",
        type: "hero",
        visible: true,
        props: {
          kicker: "K",
          heading: ['<script>alert("x")</script>'],
          body: "b",
          image: { assetId: "hero1", focal: [0.5, 0.5], zoom: 1, alt: "a" },
        },
      },
    ],
  };
  const html = renderPreviewHtml({ home, site, candles, events, templates: loadRealTemplates(), css: "", siteJs: "" });
  assert.equal(html.includes("<script>alert"), false, "raw <script> must not appear unescaped");
  assert.match(html, /&lt;script&gt;alert/);
});

test("renderPreviewHtml adds <base href> and inlines the given CSS/JS instead of linking style.css/site.js", () => {
  const { home, site, candles, events } = loadRealData();
  const html = renderPreviewHtml({
    home,
    site,
    candles,
    events,
    templates: loadRealTemplates(),
    css: "/* preview css */",
    siteJs: "/* preview js */",
  });
  assert.match(html, new RegExp(`<base href="${site.site.baseUrl}/">`));
  assert.match(html, /<style>\/\* preview css \*\/<\/style>/);
  assert.match(html, /<script>\/\* preview js \*\/<\/script>/);
  assert.equal(html.includes('<link rel="stylesheet" href="style.css">'), false);
  assert.equal(html.includes('<script src="site.js" defer></script>'), false);
});

test("renderPreviewHtml replaces a pending upload's assets/ path with its blob: URL", () => {
  const { home, site, candles, events } = loadRealData();
  const hero = home.sections.find((s) => s.type === "hero");
  const heroAsset = site.assets.find((a) => a.id === hero.props.image.assetId);
  const html = renderPreviewHtml({
    home,
    site,
    candles,
    events,
    templates: loadRealTemplates(),
    css: "",
    siteJs: "",
    objectUrls: { [heroAsset.file]: "blob:fake-url-123" },
  });
  assert.match(html, /src="blob:fake-url-123"/);
  assert.equal(html.includes(`src="assets/${heroAsset.file}"`), false);
});
