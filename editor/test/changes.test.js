import { test } from "node:test";
import assert from "node:assert/strict";
import { serializeJson, computeChanges } from "../src/lib/changes.js";

test("serializeJson matches the on-disk site-data formatting (2-space indent + trailing newline)", () => {
  assert.equal(serializeJson({ a: 1 }), '{\n  "a": 1\n}\n');
  assert.equal(serializeJson([]), "[]\n");
});

test("computeChanges returns nothing when the draft matches the original text exactly", () => {
  const home = { sections: [] };
  const events = [];
  const rawText = {
    "site-data/pages/home.json": serializeJson(home),
    "site-data/events.json": serializeJson(events),
  };
  assert.deepEqual(computeChanges({ home, events }, rawText), []);
});

test("computeChanges reports only the file(s) that actually changed", () => {
  const originalHome = { sections: [{ id: "s1" }] };
  const originalEvents = [{ id: "e1" }];
  const rawText = {
    "site-data/pages/home.json": serializeJson(originalHome),
    "site-data/events.json": serializeJson(originalEvents),
  };

  const editedHome = { sections: [{ id: "s1", visible: false }] };
  const changes = computeChanges({ home: editedHome, events: originalEvents }, rawText);

  assert.equal(changes.length, 1);
  assert.equal(changes[0].path, "site-data/pages/home.json");
  assert.equal(changes[0].content, serializeJson(editedHome));
  assert.equal(changes[0].before, rawText["site-data/pages/home.json"]);
});

test("computeChanges reports both files when both changed", () => {
  const rawText = {
    "site-data/pages/home.json": serializeJson({ sections: [] }),
    "site-data/events.json": serializeJson([]),
  };
  const changes = computeChanges({ home: { sections: [{ id: "new" }] }, events: [{ id: "e1" }] }, rawText);
  const paths = changes.map((c) => c.path).sort();
  assert.deepEqual(paths, ["site-data/events.json", "site-data/pages/home.json"]);
});
