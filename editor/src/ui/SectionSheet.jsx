import { useEffect, useRef, useState } from "react";
import {
  fieldsFor,
  headingToText,
  textToHeading,
  paragraphsToText,
  textToParagraphs,
  readField,
  writeField,
  imageFieldsFor,
  findAsset,
  applyUploadedImage,
  updateFocalZoom,
  updateImageAlt,
} from "../lib/schema.js";
import { stageImageUpload, ImageProcessingError } from "../lib/image.js";
import ImageField from "./ImageField.jsx";

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

// A bottom-sheet editor for one section's props (text) and photos, backed by
// a native <dialog>: showModal() gives us focus trapping and Escape-to-close
// for free, so none of that is reimplemented here.
//
// Text fields keep the existing "edit in a local buffer, apply on submit"
// flow. Photo fields (ImageField) apply immediately on interaction — a
// focal-point drag or an upload is direct manipulation with instant visual
// feedback, not a form to fill in and submit.
export default function SectionSheet({
  section,
  home,
  site,
  candles,
  pendingImages,
  onSave,
  onHomeChange,
  onSiteChange,
  onCandlesChange,
  onImageStaged,
  onClose,
}) {
  const dialogRef = useRef(null);
  const [values, setValues] = useState(() => toTextValues(section));
  // Per-field (keyed) busy/error state for photo uploads — a section can
  // have several photo fields (gallery/candle-grid) uploading independently.
  const [uploadState, setUploadState] = useState({});

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

  function previewSrcFor(assetId) {
    const asset = findAsset(site, assetId);
    if (!asset) return null;
    const pending = Object.values(pendingImages || {}).find((p) => p.assetFile === asset.file);
    return pending ? pending.objectUrl : `/assets/${asset.file}`;
  }

  function existingFiles() {
    return [
      ...(site.assets || []).map((a) => a.file),
      ...Object.values(pendingImages || {}).map((p) => p.assetFile),
    ];
  }

  async function handleUpload(key, target, currentAlt, file) {
    setUploadState((s) => ({ ...s, [key]: { busy: true, error: null } }));
    try {
      const staged = await stageImageUpload(file, { sectionId: section.id, existingFiles: existingFiles() });
      const result = applyUploadedImage(
        { home, site, candles },
        { ...target, alt: currentAlt || "" },
        staged,
      );
      onHomeChange(result.home);
      onSiteChange(result.site);
      onCandlesChange(result.candles);
      onImageStaged(staged.path, {
        blob: staged.blob,
        assetFile: staged.assetFile,
        objectUrl: staged.objectUrl,
        width: staged.width,
        height: staged.height,
      });
      setUploadState((s) => ({ ...s, [key]: { busy: false, error: null } }));
    } catch (err) {
      const message = err instanceof ImageProcessingError ? err.message : "写真の処理に失敗しました。もう一度お試しください。";
      setUploadState((s) => ({ ...s, [key]: { busy: false, error: message } }));
    }
  }

  function handleFocalZoom(target, patch) {
    const result = updateFocalZoom({ home, candles }, target, patch);
    onHomeChange(result.home);
    onCandlesChange(result.candles);
  }

  function handleAlt(target, alt) {
    const result = updateImageAlt({ home, site }, target, alt);
    onHomeChange(result.home);
    onSiteChange(result.site);
  }

  const fields = fieldsFor(section.type);
  const imageMeta = imageFieldsFor(section.type);
  const pendingCount = Object.keys(pendingImages || {}).length;

  return (
    <dialog ref={dialogRef} className="sheet" onClose={onClose} aria-label={`${section.id} を編集`}>
      <form method="dialog" className="sheet__form" onSubmit={handleSubmit}>
        <header className="sheet__header">
          <h2>{section.id} を編集</h2>
          {pendingCount > 0 && <span className="badge">未公開の写真 {pendingCount}件</span>}
          <button type="button" className="sheet__close" onClick={() => dialogRef.current?.close()} aria-label="閉じる">
            ×
          </button>
        </header>
        <div className="sheet__body">
          {imageMeta?.kind === "single" && (
            <ImageField
              label="写真"
              previewSrc={previewSrcFor(section.props.image?.assetId)}
              previewAlt={section.props.image?.alt}
              focal={section.props.image?.focal}
              zoom={section.props.image?.zoom}
              aspect={imageMeta.aspect}
              altEditable={imageMeta.altEditable}
              altValue={section.props.image?.alt}
              busy={uploadState["image"]?.busy}
              errorMessage={uploadState["image"]?.error}
              onPickFile={(file) =>
                handleUpload(
                  "image",
                  { type: "section-image", sectionId: section.id, assetId: section.props.image?.assetId },
                  section.props.image?.alt,
                  file,
                )
              }
              onFocalChange={(focal) => handleFocalZoom({ type: "section-image", sectionId: section.id }, { focal })}
              onZoomChange={(zoom) => handleFocalZoom({ type: "section-image", sectionId: section.id }, { zoom })}
              onAltChange={(alt) => handleAlt({ type: "section-image", sectionId: section.id, assetId: section.props.image?.assetId }, alt)}
            />
          )}

          {imageMeta?.kind === "list" &&
            (section.props.items || []).map((item, i) => (
              <ImageField
                key={i}
                label={`写真 ${i + 1}`}
                previewSrc={previewSrcFor(item.assetId)}
                previewAlt={item.alt}
                focal={item.focal}
                zoom={item.zoom}
                aspect={(item.ratio || "1/1").replace("/", " / ")}
                altEditable={imageMeta.altEditable}
                altValue={item.alt}
                busy={uploadState[`item-${i}`]?.busy}
                errorMessage={uploadState[`item-${i}`]?.error}
                onPickFile={(file) =>
                  handleUpload(`item-${i}`, { type: "gallery-item", sectionId: section.id, index: i, assetId: item.assetId }, item.alt, file)
                }
                onFocalChange={(focal) => handleFocalZoom({ type: "gallery-item", sectionId: section.id, index: i }, { focal })}
                onZoomChange={(zoom) => handleFocalZoom({ type: "gallery-item", sectionId: section.id, index: i }, { zoom })}
                onAltChange={(alt) => handleAlt({ type: "gallery-item", sectionId: section.id, index: i, assetId: item.assetId }, alt)}
              />
            ))}

          {imageMeta?.kind === "candles" &&
            (candles || []).map((c) => (
              <ImageField
                key={c.id}
                label={c.name}
                previewSrc={previewSrcFor(c.image?.assetId)}
                previewAlt={c.name}
                focal={c.image?.focal}
                zoom={c.image?.zoom}
                aspect="1 / 1"
                altEditable={false}
                busy={uploadState[`candle-${c.id}`]?.busy}
                errorMessage={uploadState[`candle-${c.id}`]?.error}
                onPickFile={(file) => handleUpload(`candle-${c.id}`, { type: "candle-image", candleId: c.id, assetId: c.image?.assetId }, c.name, file)}
                onFocalChange={(focal) => handleFocalZoom({ type: "candle-image", candleId: c.id }, { focal })}
                onZoomChange={(zoom) => handleFocalZoom({ type: "candle-image", candleId: c.id }, { zoom })}
              />
            ))}

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
