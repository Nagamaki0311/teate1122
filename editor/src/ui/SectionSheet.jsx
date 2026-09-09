import { useEffect, useRef, useState } from "react";
import {
  fieldsFor,
  headingToText,
  textToHeading,
  paragraphsToText,
  textToParagraphs,
  readField,
  writeField,
} from "../lib/schema.js";

const FIELD_LABELS = {
  kicker: "小見出し（キッカー）",
  heading: "見出し",
  body: "本文",
  paragraphs: "本文（段落、空行区切り）",
  subheading: "サブ見出し",
  note: "補足",
  instagramLabel: "Instagramラベル",
  instagramNote: "Instagram補足",
};

const TEXTAREA_FIELDS = new Set(["heading", "body", "paragraphs"]);

function toTextValues(section) {
  const values = {};
  for (const field of fieldsFor(section.type)) {
    const raw = readField(section, field);
    if (field === "heading") values[field] = headingToText(raw);
    else if (field === "paragraphs") values[field] = paragraphsToText(raw);
    else values[field] = raw || "";
  }
  return values;
}

function applyTextValues(section, values) {
  let updated = section;
  for (const [field, text] of Object.entries(values)) {
    let value = text;
    if (field === "heading") value = textToHeading(text, section.type);
    else if (field === "paragraphs") value = textToParagraphs(text);
    updated = writeField(updated, field, value);
  }
  return updated;
}

// A bottom-sheet editor for one section's props, backed by a native
// <dialog>: showModal() gives us focus trapping and Escape-to-close for
// free, so none of that is reimplemented here.
export default function SectionSheet({ section, onSave, onClose }) {
  const dialogRef = useRef(null);
  const [values, setValues] = useState(() => toTextValues(section));

  useEffect(() => {
    dialogRef.current?.showModal();
    // Mounted fresh each time a section is opened (see EditTab), so this
    // only needs to run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleSubmit(e) {
    // No preventDefault: this is a method="dialog" form, so submitting also
    // closes the dialog natively, which fires the onClose handler below.
    onSave(applyTextValues(section, values));
    void e;
  }

  const fields = fieldsFor(section.type);

  return (
    <dialog ref={dialogRef} className="sheet" onClose={onClose} aria-label={`${section.id} を編集`}>
      <form method="dialog" className="sheet__form" onSubmit={handleSubmit}>
        <header className="sheet__header">
          <h2>{section.id} を編集</h2>
          <button type="button" className="sheet__close" onClick={() => dialogRef.current?.close()} aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="sheet__body">
          {fields.map((field) => (
            <label className="field" key={field}>
              <span>{FIELD_LABELS[field] || field}</span>
              {TEXTAREA_FIELDS.has(field) ? (
                <textarea
                  rows={field === "paragraphs" ? 6 : field === "heading" ? 2 : 4}
                  value={values[field]}
                  onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                />
              ) : (
                <input
                  type="text"
                  value={values[field]}
                  onChange={(e) => setValues((v) => ({ ...v, [field]: e.target.value }))}
                />
              )}
            </label>
          ))}
        </div>
        <footer className="sheet__footer">
          <button type="button" className="btn btn--ghost" onClick={() => dialogRef.current?.close()}>
            キャンセル
          </button>
          <button type="submit" className="btn">
            この内容を反映
          </button>
        </footer>
      </form>
    </dialog>
  );
}
