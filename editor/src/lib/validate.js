// Minimum pre-publish validation. Runs entirely client-side before
// commitChanges (lib/github.js) is ever called — a single failure here
// means no API call is made at all.

import { KNOWN_SECTION_TYPES, headingIsMultiline, isValidFocal } from "./schema.js";

const EVENT_KINDS = new Set(["event", "workshop"]);
const ASSET_FILE = /^(hero\.svg|photos\/[a-z0-9][a-z0-9-]*\.(webp|jpg))$/;

function isRealDate(iso) {
  const m = typeof iso === "string" ? /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso) : null;
  if (!m) return false;
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  const date = new Date(Date.UTC(y, mo - 1, d));
  // Date normalizes out-of-range values (e.g. 2026-02-30 -> 2026-03-02);
  // comparing the parts back out catches that.
  return date.getUTCFullYear() === y && date.getUTCMonth() === mo - 1 && date.getUTCDate() === d;
}

function headingIsEmpty(heading, multiline) {
  if (multiline) {
    return !Array.isArray(heading) || heading.every((line) => !String(line ?? "").trim());
  }
  return !String(heading ?? "").trim();
}

// Shared by hero/image-text `props.image` and gallery `props.items[]`
// entries, and candles.json entries' `image` — everything that carries an
// { assetId, focal, zoom[, alt] } image reference.
function validateImageRef(image, site, label, errors, { altRequired }) {
  if (!image || typeof image !== "object") {
    errors.push(`${label}: image がありません`);
    return;
  }
  const asset = (site?.assets || []).find((a) => a.id === image.assetId);
  if (!asset) {
    errors.push(`${label}: assetId が site.assets に存在しません ("${image.assetId}")`);
  }
  if (!isValidFocal(image.focal)) {
    errors.push(`${label}: focal の値が不正です（0〜1の[x, y]である必要があります）`);
  }
  if (!(Number(image.zoom) >= 1 && Number(image.zoom) <= 3)) {
    errors.push(`${label}: zoom は1〜3の範囲で指定してください`);
  }
  if (altRequired && !String(image.alt ?? "").trim()) {
    errors.push(`${label}: alt（代替テキスト）が空です`);
  }
}

// home: parsed home.json. site: parsed site.json (needed to check assetId
// references — pass undefined to skip image validation, e.g. from existing
// callers that only care about section shape).
export function validateHome(home, site) {
  if (!home || !Array.isArray(home.sections)) {
    return { ok: false, errors: ["home.sections が配列ではありません"] };
  }
  const errors = [];
  const seenIds = new Set();
  home.sections.forEach((section, i) => {
    const tag = `sections[${i}]`;
    if (!section || typeof section !== "object") {
      errors.push(`${tag}: セクションがオブジェクトではありません`);
      return;
    }
    const label = section.id ? `${tag} (${section.id})` : tag;
    if (!section.id) {
      errors.push(`${tag}: id がありません`);
    } else if (seenIds.has(section.id)) {
      errors.push(`${label}: id が重複しています`);
    } else {
      seenIds.add(section.id);
    }
    if (!KNOWN_SECTION_TYPES.includes(section.type)) {
      errors.push(`${label}: type が不明です ("${section.type}")`);
    }
    if (typeof section.visible !== "boolean") {
      errors.push(`${label}: visible が true/false ではありません`);
    }
    const heading = section.props ? section.props.heading : undefined;
    if (headingIsEmpty(heading, headingIsMultiline(section.type))) {
      errors.push(`${label}: 見出しが空です`);
    }

    if (site) {
      if (section.type === "hero" || section.type === "image-text") {
        validateImageRef(section.props?.image, site, label, errors, { altRequired: true });
      }
      if (section.type === "gallery") {
        (section.props?.items || []).forEach((item, gi) => {
          validateImageRef(item, site, `${label} items[${gi}]`, errors, { altRequired: true });
        });
      }
    }
  });
  return { ok: errors.length === 0, errors };
}

export function validateEvents(events) {
  if (!Array.isArray(events)) {
    return { ok: false, errors: ["events が配列ではありません"] };
  }
  const errors = [];
  const seenIds = new Set();
  events.forEach((e, i) => {
    const tag = `events[${i}]`;
    if (!e || typeof e !== "object") {
      errors.push(`${tag}: イベントがオブジェクトではありません`);
      return;
    }
    const label = e.id ? `${tag} (${e.id})` : tag;
    if (!e.id) {
      errors.push(`${tag}: id がありません`);
    } else if (seenIds.has(e.id)) {
      errors.push(`${label}: id が重複しています`);
    } else {
      seenIds.add(e.id);
    }
    if (!EVENT_KINDS.has(e.kind)) {
      errors.push(`${label}: kind が不明です ("${e.kind}")`);
    }
    if (!isRealDate(e.date)) {
      errors.push(`${label}: date の形式が不正です ("${e.date}")`);
    }
    if (!String(e.title ?? "").trim()) {
      errors.push(`${label}: title が空です`);
    }
  });
  return { ok: errors.length === 0, errors };
}

// site: parsed site.json. context.originalAssetFiles: Set of `file` values
// that already existed in site.json as loaded (committed). context.
// pendingAssetFiles: Set of `file` values for uploads staged this session
// but not yet published. An assets[] entry whose file is in neither set is
// a broken reference — e.g. the page was reloaded after an upload was
// staged but before it was published (D-024 §2-9: images are never kept in
// the localStorage draft, precisely so this check is meaningful).
export function validateSite(site, context = {}) {
  if (!site || !Array.isArray(site.assets)) {
    return { ok: false, errors: ["site.assets が配列ではありません"] };
  }
  const { originalAssetFiles, pendingAssetFiles } = context;
  const errors = [];
  const seenIds = new Set();
  site.assets.forEach((a, i) => {
    const tag = `assets[${i}]`;
    const label = a.id ? `${tag} (${a.id})` : tag;
    if (!a.id) {
      errors.push(`${tag}: id がありません`);
    } else if (seenIds.has(a.id)) {
      errors.push(`${label}: id が重複しています`);
    } else {
      seenIds.add(a.id);
    }
    if (!ASSET_FILE.test(a.file || "")) {
      errors.push(`${label}: file の形式が不正です ("${a.file}")`);
    } else if (a.file !== "hero.svg") {
      const known = (originalAssetFiles && originalAssetFiles.has(a.file)) || (pendingAssetFiles && pendingAssetFiles.has(a.file));
      if (!known) {
        errors.push(`${label}: 参照先の画像が見つかりません（アップロードが未公開のまま再読み込みされた可能性があります）`);
      }
    }
    if (!(Number(a.w) > 0) || !(Number(a.h) > 0)) {
      errors.push(`${label}: w/h が正の数ではありません`);
    }
  });
  return { ok: errors.length === 0, errors };
}

export function validateCandles(candles, site) {
  if (!Array.isArray(candles)) {
    return { ok: false, errors: ["candles が配列ではありません"] };
  }
  const errors = [];
  candles.forEach((c, i) => {
    const label = c.id ? `candles[${i}] (${c.id})` : `candles[${i}]`;
    if (site) validateImageRef(c.image, site, label, errors, { altRequired: false });
  });
  return { ok: errors.length === 0, errors };
}

// Combined check the Publish tab runs right before commitChanges.
// draft: { home, events, site, candles }. context: passed through to
// validateSite (originalAssetFiles/pendingAssetFiles).
export function validateAll(draft, context = {}) {
  const h = validateHome(draft.home, draft.site);
  const e = validateEvents(draft.events);
  const s = validateSite(draft.site, context);
  const c = validateCandles(draft.candles, draft.site);
  return { ok: h.ok && e.ok && s.ok && c.ok, errors: [...h.errors, ...e.errors, ...s.errors, ...c.errors] };
}
