import { useRef, useState } from "react";

function clamp01(n) {
  return Math.min(1, Math.max(0, n));
}
function round2(n) {
  return Math.round(n * 100) / 100;
}

// Shared photo-replacement control used for hero/image-text's single image,
// each gallery item, and each candle-grid photo (D-024 §2-4: one component,
// wired differently by SectionSheet depending on section type). Shows the
// current photo at its real on-site aspect ratio/focal-point/zoom, offers a
// file picker + drag-and-drop, and exposes focal point + zoom as both a
// direct-manipulation frame (pointer drag) and equivalent range inputs
// (keyboard/screen reader — "手を抜かない対象: アクセシビリティ").
export default function ImageField({
  label,
  previewSrc,
  previewAlt,
  focal,
  zoom,
  aspect,
  altEditable,
  altValue,
  busy,
  errorMessage,
  onPickFile,
  onFocalChange,
  onZoomChange,
  onAltChange,
}) {
  const inputRef = useRef(null);
  const [dragOver, setDragOver] = useState(false);

  function focalFromPointer(e) {
    const rect = e.currentTarget.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const x = clamp01((e.clientX - rect.left) / rect.width);
    const y = clamp01((e.clientY - rect.top) / rect.height);
    onFocalChange([round2(x), round2(y)]);
  }

  function handlePointerDown(e) {
    e.currentTarget.setPointerCapture(e.pointerId);
    focalFromPointer(e);
  }

  function handlePointerMove(e) {
    if (e.buttons !== 1) return;
    focalFromPointer(e);
  }

  function pickFiles(fileList) {
    const file = fileList && fileList[0];
    if (file) onPickFile(file);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    pickFiles(e.dataTransfer.files);
  }

  return (
    <div className="image-field">
      {label && <p className="image-field__label">{label}</p>}
      <div
        className={`image-field__frame${dragOver ? " image-field__frame--drag" : ""}`}
        style={{ aspectRatio: aspect || "1 / 1" }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={handleDrop}
        role="button"
        tabIndex={-1}
        aria-hidden="true"
      >
        {previewSrc && (
          <img
            className="image-field__img"
            src={previewSrc}
            alt={previewAlt || ""}
            style={{ "--focal-x": `${(focal?.[0] ?? 0.5) * 100}%`, "--focal-y": `${(focal?.[1] ?? 0.5) * 100}%`, "--zoom": zoom ?? 1 }}
          />
        )}
        <div className="image-field__focal-dot" style={{ left: `${(focal?.[0] ?? 0.5) * 100}%`, top: `${(focal?.[1] ?? 0.5) * 100}%` }} />
        {busy && <p className="image-field__busy">処理しています…</p>}
      </div>

      <div className="image-field__controls">
        <button type="button" className="btn btn--small" onClick={() => inputRef.current?.click()} disabled={busy}>
          写真を選ぶ・ドラッグ＆ドロップ
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          hidden
          onChange={(e) => {
            pickFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {errorMessage && (
        <p className="error" role="alert">
          {errorMessage}
        </p>
      )}

      <label className="field field--range">
        <span>横位置</span>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round((focal?.[0] ?? 0.5) * 100)}
          onChange={(e) => onFocalChange([Number(e.target.value) / 100, focal?.[1] ?? 0.5])}
          aria-label={`${label || "写真"}の横位置`}
        />
      </label>
      <label className="field field--range">
        <span>縦位置</span>
        <input
          type="range"
          min="0"
          max="100"
          value={Math.round((focal?.[1] ?? 0.5) * 100)}
          onChange={(e) => onFocalChange([focal?.[0] ?? 0.5, Number(e.target.value) / 100])}
          aria-label={`${label || "写真"}の縦位置`}
        />
      </label>
      <label className="field field--range">
        <span>ズーム</span>
        <input
          type="range"
          min="1"
          max="2"
          step="0.05"
          value={zoom ?? 1}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          aria-label={`${label || "写真"}のズーム`}
        />
      </label>

      {altEditable && (
        <label className="field">
          <span>代替テキスト（写真の説明）</span>
          <input type="text" value={altValue || ""} onChange={(e) => onAltChange(e.target.value)} />
        </label>
      )}
    </div>
  );
}
