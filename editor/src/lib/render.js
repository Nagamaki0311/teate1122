// Renders a full preview page by running the site's *real* .njk templates,
// style.css and site.js through an in-browser nunjucks environment — not a
// second re-creation of the markup. See docs/decisions.md D-024 §3: this
// keeps the markup's single source of truth in src/_includes (Ponytail: no
// duplicated rendering logic) and reflects layout/CSS/reveal-animation/
// gallery-tab behavior exactly, since it's the same CSS and JS the deployed
// site uses.
//
// `templates`/`css`/`siteJs` are injected (same pattern as github.js's
// requestImpl) so this one function runs unchanged in the browser (Vite
// `?raw` imports, see ui/Preview.jsx) and in Node (fs reads, see
// test/render.test.js).
import nunjucks from "nunjucks";
import { deriveEvents } from "../../../src/_data/derive-events.js";

// The 7 section types' templates, keyed exactly as index.njk's dynamic
// include ("sections/" + section.type + ".njk") resolves them, plus the
// shared layout.
export const TEMPLATE_KEYS = [
  "base.njk",
  "sections/hero.njk",
  "sections/text.njk",
  "sections/image-text.njk",
  "sections/candle-grid.njk",
  "sections/events.njk",
  "sections/gallery.njk",
  "sections/contact-social.njk",
];

// Same three filters as eleventy.config.js. Duplicated rather than shared
// (each is a one-line pure function) rather than factored into a shared
// module both Eleventy's Node config and this browser-facing file would
// need to import identically — see docs/decisions.md D-024.
function findAsset(assets, id) {
  return (assets || []).find((a) => a.id === id);
}
function pct(n) {
  return (Number(n) * 100).toFixed(1);
}
function lines(v) {
  return Array.isArray(v) ? v : [v];
}

function makeEnv(templates) {
  const loader = {
    getSource(name) {
      const src = templates[name];
      if (src == null) throw new Error(`template not found: ${name}`);
      return { src, path: name, noCache: true };
    },
  };
  // autoescape: true is a security requirement, not just a default — draft
  // text (potentially containing "<script>") is rendered straight into a
  // same-origin srcDoc iframe.
  const env = new nunjucks.Environment(loader, { autoescape: true });
  env.addFilter("findAsset", findAsset);
  env.addFilter("pct", pct);
  env.addFilter("lines", lines);
  return env;
}

// Rewrites `assets/<file>` src attributes to a local blob: URL for photos
// that have been staged in the editor but not yet committed, so the preview
// shows the pending upload immediately. objectUrls: { "photos/x.webp":
// "blob:..." }. Purely textual (no DOM here) since this also has to run in
// Node for render.test.js.
function applyObjectUrls(html, objectUrls) {
  let out = html;
  for (const [assetFile, blobUrl] of Object.entries(objectUrls || {})) {
    out = out.split(`assets/${assetFile}`).join(blobUrl);
  }
  return out;
}

// Inlines the real style.css/site.js and adds a <base> tag so the
// template's page-relative paths (assets/..., style.css, site.js) resolve
// against the deployed site rather than the iframe's about:srcdoc origin.
function assemblePage(baseHtml, { css, siteJs, baseUrl }) {
  const base = baseUrl ? `${baseUrl.replace(/\/$/, "")}/` : "/";
  return baseHtml
    .replace("<head>", `<head>\n<base href="${base}">`)
    .replace('<link rel="stylesheet" href="style.css">', `<style>${css}</style>`)
    .replace('<script src="site.js" defer></script>', `<script>${siteJs}</script>`);
}

// Renders just the section loop — i.e. what src/index.njk's `{{ content |
// safe }}` receives (that file is Eleventy front-matter + a loop, not
// renderable by nunjucks alone, so this reimplements the loop itself, not
// the markup each section produces). Exported separately from
// renderPreviewHtml so tests can compare it directly against Eleventy's own
// output for the same data (see test/render.test.js) without also diffing
// the <base>/inlined-CSS/inlined-JS post-processing that only makes sense
// inside a preview iframe.
export function renderContentHtml({ home, site, candles, events, templates }) {
  const env = makeEnv(templates);
  const derivedEvents = deriveEvents(events || []);
  // `showId: true` matches index.njk's `{% set showId = true %}`, which
  // text.njk reads to decide whether to emit its `id`.
  return (home?.sections || [])
    .filter((section) => section.visible)
    .map((section) =>
      env.render(`sections/${section.type}.njk`, {
        section,
        site,
        candles,
        events: derivedEvents,
        showId: true,
      }),
    )
    .join("\n");
}

// home/site/candles/events: the parsed draft JSON (same shape as the *.json
// files). templates: { [key in TEMPLATE_KEYS]: rawSource }. css/siteJs: raw
// file contents. objectUrls: see applyObjectUrls above.
export function renderPreviewHtml({ home, site, candles, events, templates, css, siteJs, objectUrls }) {
  const env = makeEnv(templates);
  const sectionsHtml = renderContentHtml({ home, site, candles, events, templates });
  const pageHtml = env.render("base.njk", { content: sectionsHtml, site, ogPath: "/" });

  return applyObjectUrls(
    assemblePage(pageHtml, { css, siteJs, baseUrl: site?.site?.baseUrl }),
    objectUrls,
  );
}
