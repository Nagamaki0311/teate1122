import { PHOTO_DIR } from "./github.js";

// Browser-side photo processing for the image-replacement feature: resize,
// re-encode to WebP (falling back to JPEG on browsers without WebP
// encoding, e.g. Safari < 14), and generate a filename that satisfies
// lib/github.js's isAllowedPath. Standard Web APIs only — no new
// dependency (Ponytail: platform-native first).
//
// See docs/decisions.md D-024 for the numbers below (max input size, min/max
// output size, resize edge).

const MAX_INPUT_BYTES = 25 * 1024 * 1024; // 25MB
const MIN_OUTPUT_EDGE = 600; // px, long edge
const MAX_OUTPUT_BYTES = 1.5 * 1024 * 1024; // 1.5MB

export class ImageProcessingError extends Error {}

// Decodes `file` into something drawable to a canvas. createImageBitmap
// applies EXIF rotation via imageOrientation:"from-image" and is preferred;
// browsers without it fall back to an <img> + object URL (revoked after
// drawing, in the caller's finally block).
async function loadDrawable(file) {
  if (typeof createImageBitmap === "function") {
    try {
      return { drawable: await createImageBitmap(file, { imageOrientation: "from-image" }), revoke: null };
    } catch {
      // Some browsers' createImageBitmap rejects formats <img> can still
      // decode — fall through rather than failing outright.
    }
  }
  const url = URL.createObjectURL(file);
  try {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = () => reject(new Error("decode failed"));
      img.src = url;
    });
    return { drawable: img, revoke: url };
  } catch (err) {
    URL.revokeObjectURL(url);
    throw err;
  }
}

function canvasToBlob(canvas, type, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode failed"))), type, quality);
  });
}

// file: a File (from <input type="file"> or drag-and-drop).
// Returns { blob, width, height, ext, objectUrl }. Throws ImageProcessingError
// with a message safe to show the user directly.
export async function processImage(file, { maxEdge = 1600, quality = 0.8 } = {}) {
  if (!file || !file.type || !file.type.startsWith("image/")) {
    throw new ImageProcessingError("この形式の写真は読み込めません。JPEG/PNGでお試しください。");
  }
  if (file.size > MAX_INPUT_BYTES) {
    throw new ImageProcessingError("ファイルサイズが大きすぎます（25MBまで）。");
  }

  let loaded;
  try {
    loaded = await loadDrawable(file);
  } catch {
    throw new ImageProcessingError("この形式の写真は読み込めません。JPEG/PNGでお試しください。");
  }

  const { drawable, revoke } = loaded;
  try {
    const srcW = drawable.width ?? drawable.naturalWidth;
    const srcH = drawable.height ?? drawable.naturalHeight;
    const scale = Math.min(1, maxEdge / Math.max(srcW, srcH));
    const width = Math.max(1, Math.round(srcW * scale));
    const height = Math.max(1, Math.round(srcH * scale));

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    canvas.getContext("2d").drawImage(drawable, 0, 0, width, height);

    let blob = await canvasToBlob(canvas, "image/webp", quality);
    let ext = "webp";
    if (blob.type !== "image/webp") {
      // WebP encoding not supported (e.g. older Safari) — canvas silently
      // returns a PNG instead in that case, so re-encode explicitly as JPEG.
      blob = await canvasToBlob(canvas, "image/jpeg", 0.82);
      ext = "jpg";
    }

    if (Math.max(width, height) < MIN_OUTPUT_EDGE) {
      throw new ImageProcessingError("画像が小さすぎます（長辺600px以上の写真をお使いください）。");
    }
    if (blob.size > MAX_OUTPUT_BYTES) {
      throw new ImageProcessingError("書き出し後のファイルサイズが大きすぎます。別の写真でお試しください。");
    }

    return { blob, width, height, ext, objectUrl: URL.createObjectURL(blob) };
  } finally {
    if (revoke) URL.revokeObjectURL(revoke);
    if (typeof drawable.close === "function") drawable.close();
  }
}

// blob -> base64 string (no "data:...;base64," prefix), for commitChanges'
// encoding:"base64" blobs. Built from Blob.arrayBuffer() + chunked btoa()
// rather than btoa(String.fromCharCode(...bytes)) in one call (which risks
// exceeding the call stack on large images, spreading the whole byte array
// as call arguments) or FileReader (browser-only — arrayBuffer()/btoa() are
// both available in Node too, which is what lets changes.test.js exercise
// this function directly, without a DOM).
export async function blobToBase64(blob) {
  const bytes = new Uint8Array(await blob.arrayBuffer());
  const CHUNK = 0x8000;
  let binary = "";
  for (let i = 0; i < bytes.length; i += CHUNK) {
    binary += String.fromCharCode.apply(null, bytes.subarray(i, i + CHUNK));
  }
  return btoa(binary);
}

// Sanitizes a section/candle id into the leading component of a filename,
// so the result always satisfies github.js's PHOTO_NAME pattern regardless
// of what the id looks like.
function sanitizeNamePart(id) {
  const cleaned = String(id || "")
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "photo";
}

function pad2(n) {
  return String(n).padStart(2, "0");
}

// Pure function: "<sectionId>-<YYYYMMDD>-<NN>.<ext>", picking the smallest
// NN not already used by an existing asset file or a staged (not-yet-
// committed) upload. `date` is a Date or a pre-formatted "YYYYMMDD" string
// (kept injectable so tests are deterministic).
// `existingFiles`: an iterable of site.assets[].file-style values (e.g.
// "hero.svg", "photos/hero-20260909-01.webp") — both already-committed
// files and the paths of any pending uploads should be included.
export function makeAssetFileName(sectionId, date, existingFiles, ext) {
  const stamp =
    typeof date === "string"
      ? date
      : `${date.getFullYear()}${pad2(date.getMonth() + 1)}${pad2(date.getDate())}`;
  const prefix = `${sanitizeNamePart(sectionId)}-${stamp}-`;
  const used = new Set(
    Array.from(existingFiles || [], (f) => (f.startsWith("photos/") ? f.slice("photos/".length) : f)),
  );
  let n = 1;
  let name;
  do {
    name = `${prefix}${pad2(n)}.${ext}`;
    n += 1;
  } while (used.has(name));
  return name;
}

// Orchestrates a single upload end to end: decode/resize/re-encode
// (processImage) then pick a filename (makeAssetFileName) that doesn't
// collide with `existingFiles` (see that function for the expected shape).
// Returns everything the caller needs to both stage the upload (in-memory,
// keyed by `path`) and update the draft (schema.js applyUploadedImage).
export async function stageImageUpload(file, { sectionId, existingFiles, maxEdge, quality } = {}) {
  const { blob, width, height, ext, objectUrl } = await processImage(file, { maxEdge, quality });
  const name = makeAssetFileName(sectionId, new Date(), existingFiles, ext);
  const assetFile = `photos/${name}`;
  return { path: `${PHOTO_DIR}${name}`, assetFile, blob, width, height, objectUrl };
}
