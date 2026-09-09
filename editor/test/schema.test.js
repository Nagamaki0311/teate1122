import { test } from "node:test";
import assert from "node:assert/strict";
import {
  headingIsMultiline,
  headingToText,
  textToHeading,
  paragraphsToText,
  textToParagraphs,
  readField,
  writeField,
  nextEventId,
  fieldsFor,
  KNOWN_SECTION_TYPES,
} from "../src/lib/schema.js";

test("only hero and text sections use an array (multiline) heading", () => {
  assert.equal(headingIsMultiline("hero"), true);
  assert.equal(headingIsMultiline("text"), true);
  assert.equal(headingIsMultiline("image-text"), false);
  assert.equal(headingIsMultiline("candle-grid"), false);
  assert.equal(headingIsMultiline("events"), false);
  assert.equal(headingIsMultiline("gallery"), false);
  assert.equal(headingIsMultiline("contact-social"), false);
});

test("headingToText / textToHeading round-trip for array headings", () => {
  const heading = ["灯りは、", "手当て。"];
  const text = headingToText(heading);
  assert.equal(text, "灯りは、\n手当て。");
  assert.deepEqual(textToHeading(text, "hero"), heading);
});

test("headingToText / textToHeading round-trip for string headings", () => {
  const heading = "つくる人";
  const text = headingToText(heading);
  assert.equal(text, "つくる人");
  assert.equal(textToHeading(text, "image-text"), "つくる人");
});

test("textToHeading collapses a multi-line textarea to one string for non-multiline types", () => {
  assert.equal(textToHeading("つくる\n人", "image-text"), "つくる 人");
});

test("textToHeading drops a trailing blank line but keeps at least one line", () => {
  assert.deepEqual(textToHeading("見出し\n", "text"), ["見出し"]);
  assert.deepEqual(textToHeading("", "hero"), [""]);
});

test("paragraphsToText / textToParagraphs round-trip", () => {
  const paragraphs = ["ひとつめの段落。", "ふたつめの段落。"];
  const text = paragraphsToText(paragraphs);
  assert.equal(text, "ひとつめの段落。\n\nふたつめの段落。");
  assert.deepEqual(textToParagraphs(text), paragraphs);
});

test("textToParagraphs drops empty paragraphs and tolerates extra blank lines", () => {
  assert.deepEqual(textToParagraphs("a\n\n\n\nb\n\n"), ["a", "b"]);
  assert.deepEqual(textToParagraphs(""), []);
});

test("readField / writeField do not mutate the input section", () => {
  const section = { id: "s1", props: { heading: "h", body: "b" } };
  const before = JSON.stringify(section);
  assert.equal(readField(section, "body"), "b");
  const updated = writeField(section, "body", "new body");
  assert.equal(JSON.stringify(section), before, "original section must not be mutated");
  assert.equal(updated.props.body, "new body");
  assert.equal(updated.props.heading, "h");
  assert.notEqual(updated, section);
});

test("nextEventId finds the next unused eN id", () => {
  assert.equal(nextEventId([]), "e1");
  assert.equal(nextEventId([{ id: "e1" }, { id: "e2" }]), "e3");
  assert.equal(nextEventId([{ id: "e1" }, { id: "e5" }]), "e6");
});

test("fieldsFor returns [] for an unknown type and a field list for known types", () => {
  assert.deepEqual(fieldsFor("unknown-type"), []);
  for (const type of KNOWN_SECTION_TYPES) {
    assert.ok(fieldsFor(type).includes("heading"), `${type} should expose a heading field`);
  }
});
