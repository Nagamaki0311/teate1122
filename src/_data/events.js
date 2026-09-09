import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const path = fileURLToPath(new URL("../../site-data/events.json", import.meta.url));
const events = JSON.parse(readFileSync(path, "utf8"));

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

// isPast is not stored in events.json; it is derived here from `date` vs "today" at build time.
const today = new Date().toISOString().slice(0, 10);

const upcoming = events
  .filter((e) => e.date >= today)
  .sort((a, b) => a.date.localeCompare(b.date))
  .map((e) => ({ ...e, kindLabel: KIND_LABEL[e.kind] || e.kind, dateDisplay: dateDisplay(e.date) }));

const past = events
  .filter((e) => e.date < today)
  .sort((a, b) => b.date.localeCompare(a.date))
  .map((e) => ({ ...e, kindLabel: KIND_LABEL[e.kind] || e.kind, dateDisplay: archiveDateDisplay(e.date) }));

export default { upcoming, past };
