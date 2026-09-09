import { test } from "node:test";
import assert from "node:assert/strict";
import { composeDraft } from "../src/lib/draft.js";

// Regression test for the T-021d bug (docs/decisions.md D-025): App.jsx's
// updateDraft used to build `{ ...state.draft, ...partial }` from the
// render-time closure's `state.draft`, so when SectionSheet.jsx's
// handleUpload called onHomeChange -> onSiteChange -> onCandlesChange
// back-to-back in one synchronous handler, each call started from the same
// stale draft and the later calls silently discarded the earlier ones'
// changes (only the last call's field survived).
//
// composeDraft itself is a one-line merge and can't exercise React's
// setState batching/functional-form behavior directly. What it *can* verify
// is the property that behavior depends on: applying several partials in
// sequence, each folded onto the result of the one before it (which is what
// `setState((s) => ({ ...s, draft: composeDraft(s.draft, partial) }))`
// does), must preserve every field — not just the last one.

test("composeDraft merges a single partial onto the previous draft", () => {
  const prev = { home: "old-home", site: "old-site", candles: "old-candles" };
  const next = composeDraft(prev, { home: "new-home" });
  assert.deepEqual(next, { home: "new-home", site: "old-site", candles: "old-candles" });
  // prev must not be mutated
  assert.deepEqual(prev, { home: "old-home", site: "old-site", candles: "old-candles" });
});

test("chaining composeDraft onto each prior result preserves every field (the fixed behavior)", () => {
  const initial = { home: "old-home", site: "old-site", candles: "old-candles" };

  // Mirrors what onHomeChange -> onSiteChange -> onCandlesChange produce for
  // a single image upload (D-024 §applyUploadedImage: home/site/candles all
  // updated together from one staged upload).
  let draft = initial;
  draft = composeDraft(draft, { home: "new-home" });
  draft = composeDraft(draft, { site: "new-site" });
  draft = composeDraft(draft, { candles: "new-candles" });

  assert.deepEqual(draft, { home: "new-home", site: "new-site", candles: "new-candles" });
});

test("composing every partial against the SAME stale draft reproduces the original bug", () => {
  // This is what the pre-fix `updateDraft(partial) { patch({ draft: {
  // ...state.draft, ...partial } }) }` effectively did: every call in the
  // synchronous handler read the same `state.draft` from its closure, so
  // only the last partial's field ends up applied.
  const stale = { home: "old-home", site: "old-site", candles: "old-candles" };

  const results = [
    composeDraft(stale, { home: "new-home" }),
    composeDraft(stale, { site: "new-site" }),
    composeDraft(stale, { candles: "new-candles" }),
  ];
  // Simulate React applying the three setState calls in order, each
  // *replacing* draft wholesale with its own partial's result (as `patch`
  // did) rather than folding onto the previous result.
  const finalBuggyDraft = results[results.length - 1];

  // The bug: home and site changes are gone, only candles survived.
  assert.equal(finalBuggyDraft.home, "old-home");
  assert.equal(finalBuggyDraft.site, "old-site");
  assert.equal(finalBuggyDraft.candles, "new-candles");
});
