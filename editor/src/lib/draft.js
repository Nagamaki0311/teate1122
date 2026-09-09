// Pure composition step behind App.jsx's updateDraft, pulled out to a plain
// .js module so it can be unit-tested with node:test without JSX (see
// docs/decisions.md D-025 and editor/test/draft.test.js).
//
// The merge itself is a one-liner; what actually matters is *what* App.jsx
// folds `partial` onto each call — the previous in-flight draft (via
// setState's functional form), never a value captured once in a render-time
// closure. Several SectionSheet.jsx handlers (handleUpload,
// handleFocalZoom, handleAlt) call onHomeChange/onSiteChange/onCandlesChange
// back-to-back within the same synchronous handler; each call must build on
// the draft the call before it just produced, or the later call clobbers
// the earlier one.
export function composeDraft(prevDraft, partial) {
  return { ...prevDraft, ...partial };
}
