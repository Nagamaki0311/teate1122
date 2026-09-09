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
