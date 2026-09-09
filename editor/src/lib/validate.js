// Minimum pre-publish validation. Runs entirely client-side before
// commitChanges (lib/github.js) is ever called — a single failure here
// means no API call is made at all.

import { KNOWN_SECTION_TYPES, headingIsMultiline } from "./schema.js";

const EVENT_KINDS = new Set(["event", "workshop"]);

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

export function validateHome(home) {
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

// Combined check the Publish tab runs right before commitChanges.
export function validateAll(home, events) {
  const h = validateHome(home);
  const e = validateEvents(events);
  return { ok: h.ok && e.ok, errors: [...h.errors, ...e.errors] };
}
