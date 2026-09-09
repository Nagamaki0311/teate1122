// Serialization + diff computation shared by the Publish tab.

// Matches the on-disk formatting of site-data/*.json exactly (verified by
// Developer during T-021b: after JSON.stringify(JSON.parse(raw), null, 2) +
// "\n" normalization of home.json/site.json/candles.json, a rebuilt _site/
// is byte-identical to the pre-normalization build — see docs/decisions.md
// D-023). Re-serializing an untouched draft therefore never produces a
// spurious diff.
export function serializeJson(value) {
  return JSON.stringify(value, null, 2) + "\n";
}

// draft: { home, events } — the in-memory edited objects.
// rawText: { [path]: originalFileText } — from github.js loadSiteData(),
// i.e. the exact bytes last read from the repo (before any local edits).
// Returns the list of files that actually differ, ready for commitChanges.
export function computeChanges(draft, rawText) {
  const candidates = [
    { path: "site-data/pages/home.json", value: draft.home },
    { path: "site-data/events.json", value: draft.events },
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
