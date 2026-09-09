import { test } from "node:test";
import assert from "node:assert/strict";
import { validateHome, validateEvents, validateAll } from "../src/lib/validate.js";

function baseSection(overrides = {}) {
  return {
    id: "s1",
    type: "text",
    visible: true,
    props: { heading: ["見出し"] },
    ...overrides,
  };
}

test("validateHome accepts a minimal well-formed home", () => {
  const result = validateHome({ sections: [baseSection()] });
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateHome rejects a non-array sections", () => {
  assert.equal(validateHome({ sections: "nope" }).ok, false);
  assert.equal(validateHome(null).ok, false);
});

test("validateHome flags duplicate ids", () => {
  const result = validateHome({ sections: [baseSection(), baseSection()] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("重複")));
});

test("validateHome flags an unknown type", () => {
  const result = validateHome({ sections: [baseSection({ type: "made-up" })] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("type")));
});

test("validateHome flags a non-boolean visible", () => {
  const result = validateHome({ sections: [baseSection({ visible: "true" })] });
  assert.equal(result.ok, false);
  assert.ok(result.errors.some((e) => e.includes("visible")));
});

test("validateHome flags an empty array heading (hero/text) and empty string heading (others)", () => {
  const emptyArray = validateHome({ sections: [baseSection({ props: { heading: [""] } })] });
  assert.equal(emptyArray.ok, false);

  const emptyString = validateHome({
    sections: [baseSection({ id: "s2", type: "image-text", props: { heading: "  " } })],
  });
  assert.equal(emptyString.ok, false);

  const nonEmptyString = validateHome({
    sections: [baseSection({ id: "s3", type: "image-text", props: { heading: "つくる人" } })],
  });
  assert.equal(nonEmptyString.ok, true);
});

test("validateEvents accepts a minimal well-formed event list", () => {
  const result = validateEvents([
    { id: "e1", kind: "event", date: "2026-10-18", title: "秋の手作り市" },
    { id: "e2", kind: "workshop", date: "2026-11-09", title: "ワークショップ" },
  ]);
  assert.deepEqual(result, { ok: true, errors: [] });
});

test("validateEvents flags duplicate ids, unknown kind, empty title", () => {
  const result = validateEvents([
    { id: "e1", kind: "event", date: "2026-10-18", title: "A" },
    { id: "e1", kind: "party", date: "2026-10-19", title: "" },
  ]);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 3, result.errors.join("; "));
});

test("validateEvents rejects malformed and non-existent dates", () => {
  assert.equal(validateEvents([{ id: "e1", kind: "event", date: "2026/10/18", title: "t" }]).ok, false);
  assert.equal(validateEvents([{ id: "e1", kind: "event", date: "2026-02-30", title: "t" }]).ok, false, "Feb 30 does not exist");
  assert.equal(validateEvents([{ id: "e1", kind: "event", date: "2024-02-29", title: "t" }]).ok, true, "2024 is a leap year");
});

test("validateEvents rejects a non-array", () => {
  assert.equal(validateEvents({}).ok, false);
});

test("validateAll fails if either home or events fails, and merges errors", () => {
  const badHome = { sections: [baseSection({ type: "bogus" })] };
  const goodEvents = [{ id: "e1", kind: "event", date: "2026-10-18", title: "t" }];
  const result = validateAll(badHome, goodEvents);
  assert.equal(result.ok, false);
  assert.equal(result.errors.length, 1);

  const goodHome = { sections: [baseSection()] };
  const badEvents = [{ id: "e1", kind: "event", date: "bad-date", title: "" }];
  const result2 = validateAll(goodHome, badEvents);
  assert.equal(result2.ok, false);

  const result3 = validateAll(goodHome, goodEvents);
  assert.equal(result3.ok, true);
});
