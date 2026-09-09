// Field metadata + value conversions for home.json sections, and small
// helpers shared by the editor UI. Keeps the round-trip rule from
// docs/decisions.md D-023 in one place: `heading` is an array of lines for
// hero/text sections, and a plain string everywhere else — the editor must
// write back the same shape it read, per section type.

// The 7 section types the templates (src/_includes/sections/*.njk) know how
// to render. Anything else is rejected by validate.js.
export const KNOWN_SECTION_TYPES = [
  "hero",
  "text",
  "image-text",
  "candle-grid",
  "events",
  "gallery",
  "contact-social",
];

// Section types whose `props.heading` is an array of lines (joined with <br>
// by the template's `| lines` filter / for-loop). All other types use a
// plain string heading.
const MULTILINE_HEADING_TYPES = new Set(["hero", "text"]);

export function headingIsMultiline(sectionType) {
  return MULTILINE_HEADING_TYPES.has(sectionType);
}

// Which props fields the edit sheet shows for a given section type, and in
// what order. Every type gets at least heading; body/paragraphs vary.
export const SECTION_FIELDS = {
  hero: ["kicker", "heading", "body"],
  text: ["kicker", "heading", "paragraphs"],
  "image-text": ["kicker", "heading", "subheading", "paragraphs"],
  "candle-grid": ["kicker", "heading", "body", "note"],
  events: ["kicker", "heading", "body"],
  gallery: ["kicker", "heading"],
  "contact-social": ["kicker", "heading", "body", "instagramLabel", "instagramNote"],
};

export function fieldsFor(sectionType) {
  return SECTION_FIELDS[sectionType] || [];
}

// --- heading <-> textarea text -------------------------------------------

// Array-of-lines heading -> a textarea string (one line per array entry).
// Plain-string heading -> returned as-is (single line).
export function headingToText(heading) {
  if (Array.isArray(heading)) return heading.join("\n");
  return heading || "";
}

// Inverse of headingToText: splits on newlines only when the section type
// uses an array heading; otherwise keeps it a single string. Blank trailing
// lines from the textarea are dropped, but at least one line is kept.
export function textToHeading(text, sectionType) {
  const lines = (text || "").split("\n").map((l) => l.trim());
  if (!headingIsMultiline(sectionType)) {
    return lines.join(" ").replace(/\s+/g, " ").trim();
  }
  while (lines.length > 1 && lines[lines.length - 1] === "") lines.pop();
  return lines.length > 0 ? lines : [""];
}

// --- paragraphs <-> textarea text ----------------------------------------

// paragraphs[] -> a textarea string, one paragraph per blank-line-separated
// block (so a single <textarea> can edit a list of paragraphs).
export function paragraphsToText(paragraphs) {
  return (paragraphs || []).join("\n\n");
}

// Inverse of paragraphsToText: splits on one-or-more blank lines, trims each
// paragraph, and drops empty ones.
export function textToParagraphs(text) {
  return (text || "")
    .split(/\n\s*\n/)
    .map((p) => p.trim())
    .filter(Boolean);
}

// --- generic props field read/write ---------------------------------------

export function readField(section, field) {
  return section.props ? section.props[field] : undefined;
}

// Returns a new section with props[field] replaced by value (does not
// mutate the input — callers hold the previous draft in React state).
export function writeField(section, field, value) {
  return { ...section, props: { ...section.props, [field]: value } };
}

// --- image fields (D-024 §2) ------------------------------------------------

// Which section types carry an editable photo, how (a single props.image vs
// a list of props.items[]), and the display aspect ratio ImageField frames
// the current photo in (matching each type's actual CSS — see src/style.css
// .hero-section__img/.image-text__img/.gallery__item/.candle-grid__media —
// except hero, which is full-bleed at a viewport-dependent ratio; 16/9 is a
// representative approximation for the edit frame only, not the real site).
export const IMAGE_FIELDS = {
  hero: { kind: "single", aspect: "16 / 9", altEditable: true },
  "image-text": { kind: "single", aspect: "3 / 4", altEditable: true },
  gallery: { kind: "list", altEditable: true }, // aspect comes from each item's own `ratio`
  "candle-grid": { kind: "candles", altEditable: false }, // alt is the candle name, not user-edited
};

export function imageFieldsFor(sectionType) {
  return IMAGE_FIELDS[sectionType] || null;
}

export function findAsset(site, assetId) {
  return (site?.assets || []).find((a) => a.id === assetId);
}

// Returns a new site with one assets[] entry's fields replaced (does not
// mutate the input).
export function updateAsset(site, assetId, patch) {
  return {
    ...site,
    assets: (site.assets || []).map((a) => (a.id === assetId ? { ...a, ...patch } : a)),
  };
}

function inRange01(n) {
  return typeof n === "number" && n >= 0 && n <= 1;
}

export function isValidFocal(focal) {
  return Array.isArray(focal) && focal.length === 2 && inRange01(focal[0]) && inRange01(focal[1]);
}

// Applies a freshly processed upload (see lib/image.js processImage +
// makeAssetFileName) to the draft. Always updates the matching site.assets[]
// entry (file/w/h/alt) and resets that image's focal point to center + zoom
// to 1, since a new photo's old framing rarely still applies — the user can
// re-aim it immediately via the same ImageField. `target` says which prop
// tree in home.json/candles.json also needs updating.
//
// target:
//   { type: "section-image", sectionId, assetId, alt }
//   { type: "gallery-item", sectionId, index, assetId, alt }
//   { type: "candle-image", candleId, assetId, alt }
// uploaded: { assetFile, width, height } (see lib/image.js stageImageUpload)
export function applyUploadedImage({ home, site, candles }, target, uploaded) {
  const nextSite = updateAsset(site, target.assetId, {
    file: uploaded.assetFile,
    w: uploaded.width,
    h: uploaded.height,
    alt: target.alt,
  });

  let nextHome = home;
  let nextCandles = candles;

  if (target.type === "section-image") {
    nextHome = {
      ...home,
      sections: home.sections.map((s) =>
        s.id === target.sectionId
          ? writeField(s, "image", { ...s.props.image, focal: [0.5, 0.5], zoom: 1, alt: target.alt })
          : s,
      ),
    };
  } else if (target.type === "gallery-item") {
    nextHome = {
      ...home,
      sections: home.sections.map((s) => {
        if (s.id !== target.sectionId) return s;
        const items = s.props.items.map((item, i) =>
          i === target.index ? { ...item, focal: [0.5, 0.5], zoom: 1, alt: target.alt } : item,
        );
        return writeField(s, "items", items);
      }),
    };
  } else if (target.type === "candle-image") {
    nextCandles = (candles || []).map((c) =>
      c.id === target.candleId ? { ...c, image: { ...c.image, focal: [0.5, 0.5], zoom: 1 } } : c,
    );
  }

  return { home: nextHome, site: nextSite, candles: nextCandles };
}

// Updates only the focal point / zoom for one image reference (drag/tap or
// the range-input equivalents in ImageField) — does not touch site.assets,
// since focal/zoom live only alongside the assetId reference.
export function updateFocalZoom({ home, candles }, target, patch) {
  let nextHome = home;
  let nextCandles = candles;

  if (target.type === "section-image") {
    nextHome = {
      ...home,
      sections: home.sections.map((s) =>
        s.id === target.sectionId ? writeField(s, "image", { ...s.props.image, ...patch }) : s,
      ),
    };
  } else if (target.type === "gallery-item") {
    nextHome = {
      ...home,
      sections: home.sections.map((s) => {
        if (s.id !== target.sectionId) return s;
        const items = s.props.items.map((item, i) => (i === target.index ? { ...item, ...patch } : item));
        return writeField(s, "items", items);
      }),
    };
  } else if (target.type === "candle-image") {
    nextCandles = (candles || []).map((c) =>
      c.id === target.candleId ? { ...c, image: { ...c.image, ...patch } } : c,
    );
  }

  return { home: nextHome, candles: nextCandles };
}

// Updates an image's alt text in both places it's stored (D-024 §2-4):
// the section prop (or gallery item) and the matching site.assets[] entry.
// Not used for candle-grid, which has no alt input (see IMAGE_FIELDS).
export function updateImageAlt({ home, site }, target, alt) {
  const nextSite = updateAsset(site, target.assetId, { alt });

  let nextHome = home;
  if (target.type === "section-image") {
    nextHome = {
      ...home,
      sections: home.sections.map((s) =>
        s.id === target.sectionId ? writeField(s, "image", { ...s.props.image, alt }) : s,
      ),
    };
  } else if (target.type === "gallery-item") {
    nextHome = {
      ...home,
      sections: home.sections.map((s) => {
        if (s.id !== target.sectionId) return s;
        const items = s.props.items.map((item, i) => (i === target.index ? { ...item, alt } : item));
        return writeField(s, "items", items);
      }),
    };
  }

  return { home: nextHome, site: nextSite };
}

// --- events.json helpers ---------------------------------------------------

// "e12" -> 13, robust to non-numeric/gappy ids; always returns an id not
// already present in `events`.
export function nextEventId(events) {
  let max = 0;
  for (const e of events || []) {
    const m = /^e(\d+)$/.exec(e.id || "");
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `e${max + 1}`;
}
