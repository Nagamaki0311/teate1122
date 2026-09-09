// Pure function that splits a flat events[] list into { upcoming, past },
// each sorted and labeled for display. Shared by Eleventy (src/_data/events.js)
// and the editor's in-browser preview (editor/src/lib/render.js) so the two
// stay in sync by construction rather than by convention (Ponytail: avoid
// duplicating this logic in two places).
const KIND_LABEL = { event: "イベント出店", workshop: "ワークショップ" };
const WEEKDAY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

function dateDisplay(iso) {
  const [y, m, d] = iso.split("-").map(Number);
  const weekday = WEEKDAY[new Date(Date.UTC(y, m - 1, d)).getUTCDay()];
  return `${m}.${String(d).padStart(2, "0")} ${weekday}`;
}

function archiveDateDisplay(iso) {
  return iso.replaceAll("-", ".");
}

// isPast is not stored in events.json; it is derived here from `date` vs
// `todayIso` (defaults to today, but is injectable so this stays testable
// and reproducible).
export function deriveEvents(events, todayIso = new Date().toISOString().slice(0, 10)) {
  const upcoming = events
    .filter((e) => e.date >= todayIso)
    .sort((a, b) => a.date.localeCompare(b.date))
    .map((e) => ({ ...e, kindLabel: KIND_LABEL[e.kind] || e.kind, dateDisplay: dateDisplay(e.date) }));

  const past = events
    .filter((e) => e.date < todayIso)
    .sort((a, b) => b.date.localeCompare(a.date))
    .map((e) => ({ ...e, kindLabel: KIND_LABEL[e.kind] || e.kind, dateDisplay: archiveDateDisplay(e.date) }));

  return { upcoming, past };
}
