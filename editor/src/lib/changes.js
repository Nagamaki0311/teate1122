// Serialization + diff computation shared by the Publish tab.
import { blobToBase64 } from "./image.js";

const PATHS = {
  home: "site-data/pages/home.json",
  events: "site-data/events.json",
  site: "site-data/site.json",
  candles: "site-data/candles.json",
};

// Matches the on-disk formatting of site-data/*.json exactly (verified by
// Developer during T-021b: after JSON.stringify(JSON.parse(raw), null, 2) +
// "\n" normalization of home.json/site.json/candles.json, a rebuilt _site/
// is byte-identical to the pre-normalization build — see docs/decisions.md
// D-023). Re-serializing an untouched draft therefore never produces a
// spurious diff.
export function serializeJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

// Structural guard (D-024 §2-1): the editor's UI only ever writes
// site.json's `assets[]` and candles.json's per-entry `image`. This is a
// second line of defense on top of github.js's ALLOWED_PATHS/isAllowedPath
// — even if a bug (or a crafted draft) changed theme/nav/copy in memory,
// publish refuses to commit it rather than silently widening what this app
// can touch, preserving the intent of D-023's write-allowlist.
function assertOnlyAssetsChanged(originalSite, draftSite) {
  const before = JSON.stringify({ ...originalSite, assets: undefined });
  const after = JSON.stringify({ ...draftSite, assets: undefined });
  if (before !== after) {
    throw new Error("site.json: assets 以外のフィールドが変更されています（この編集アプリでは変更できません）");
  }
}

function assertOnlyCandleImagesChanged(originalCandles, draftCandles) {
  if (
    !Array.isArray(originalCandles) ||
    !Array.isArray(draftCandles) ||
    originalCandles.length !== draftCandles.length
  ) {
    throw new Error("candles.json: キャンドルの追加・削除・並べ替えはこの編集アプリではできません");
  }
  for (let i = 0; i < originalCandles.length; i++) {
    const a = originalCandles[i];
    const b = draftCandles[i];
    const before = JSON.stringify({ ...a, image: undefined });
    const after = JSON.stringify({ ...b, image: undefined });
    if (a.id !== b.id || before !== after) {
      throw new Error(`candles.json: image 以外のフィールドが変更されています ("${a.id ?? i}")`);
    }
  }
}

// draft: { home, events, site, candles } — the in-memory edited objects.
// rawText: { [path]: originalFileText } — from github.js loadSiteData(),
// i.e. the exact bytes last read from the repo (before any local edits).
// Returns the list of files that actually differ, ready for commitChanges.
// Throws if site.json/candles.json were changed outside their allowed
// fields (see the guards above) — callers must not swallow this silently.
export function computeChanges(draft, rawText) {
  const original = {
    site: JSON.parse(rawText[PATHS.site]),
    candles: JSON.parse(rawText[PATHS.candles]),
  };
  assertOnlyAssetsChanged(original.site, draft.site);
  assertOnlyCandleImagesChanged(original.candles, draft.candles);

  const candidates = [
    { path: PATHS.home, value: draft.home },
    { path: PATHS.events, value: draft.events },
    { path: PATHS.site, value: draft.site },
    { path: PATHS.candles, value: draft.candles },
  ];
  const changes = [];
  for (const { path, value } of candidates) {
    const content = serializeJson(value);
    const before = rawText[path];
    if (content !== before) {
      changes.push({ path, content, before });
    }
  }
  return changes;
}

// Converts staged-but-uncommitted photo uploads (App.jsx's pendingImages,
// keyed by repo path -> { blob, assetFile, width, height }) into commit-
// ready file entries. Only images the current draft's site.assets[] still
// references are included — an upload later replaced by another upload to
// the same field would otherwise commit a now-unused file for no reason.
export async function pendingImageFiles(pendingImages, site) {
  const usedFiles = new Set((site.assets || []).map((a) => a.file));
  const entries = [];
  for (const [path, entry] of Object.entries(pendingImages || {})) {
    if (!usedFiles.has(entry.assetFile)) continue;
    const content = await blobToBase64(entry.blob);
    entries.push({ path, content, encoding: "base64" });
  }
  return entries;
}
