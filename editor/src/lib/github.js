// GitHub data layer: reads site-data JSON from the repo and commits changes
// back to main via the Git Data API, using a single low-level API — one
// HEAD commit sha rather than per-file blob shas (see docs/decisions.md
// D-023 "sha management").
//
// `requestImpl` is always injectable (defaults to global fetch) so tests can
// run without any network access and assert exact call order.

const REPO_OWNER = "Nagamaki0311";
const REPO_NAME = "teate1122";
const API_BASE = "https://api.github.com";

// The JSON files this editor is allowed to write to wholesale. Photo uploads
// are checked separately below (isAllowedPath) since their paths are
// generated, not fixed. Anything else — even a path an attacker-controlled
// draft object might carry — is refused before any network call is made.
export const ALLOWED_PATHS = [
  "site-data/pages/home.json",
  "site-data/events.json",
  "site-data/site.json", // assets[] only — enforced by changes.js's structural guard
  "site-data/candles.json", // image fields only — enforced by changes.js's structural guard
];

// Where uploaded photos are written. Kept separate from ALLOWED_PATHS (a
// fixed list) because photo filenames are generated per-upload.
export const PHOTO_DIR = "src/assets/photos/";

// Deliberately excludes "/", "." and ".." and any uppercase letter, so a
// crafted filename can never traverse out of PHOTO_DIR or reach a different
// extension than the two this editor ever writes (see lib/image.js).
const PHOTO_NAME = /^[a-z0-9][a-z0-9-]*\.(webp|jpg)$/;

export function isAllowedPath(path) {
  if (ALLOWED_PATHS.includes(path)) return true;
  if (!path.startsWith(PHOTO_DIR)) return false;
  return PHOTO_NAME.test(path.slice(PHOTO_DIR.length));
}

function authHeaders(token) {
  return token ? { authorization: `Bearer ${token}` } : {};
}

export async function getHeadSha(requestImpl, token) {
  const res = await requestImpl(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/git/ref/heads/main`, {
    headers: { accept: "application/vnd.github+json", ...authHeaders(token) },
  });
  if (!res.ok) throw new Error(`failed to load HEAD ref (${res.status})`);
  const data = await res.json();
  return data.object.sha;
}

async function readRawFile(path, headSha, requestImpl, token) {
  const res = await requestImpl(
    `${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/contents/${path}?ref=${headSha}`,
    { headers: { accept: "application/vnd.github.raw", ...authHeaders(token) } },
  );
  if (!res.ok) throw new Error(`failed to load ${path} (${res.status})`);
  return res.text();
}

// Loads the current home.json + events.json + site.json + candles.json from
// main, together with the HEAD commit sha they were read at (used later to
// detect conflicts on commit). token may be omitted — this repo is public,
// so an unauthenticated read still works (subject to GitHub's lower rate
// limit for anonymous requests).
export async function loadSiteData({ token, requestImpl = fetch } = {}) {
  const headSha = await getHeadSha(requestImpl, token);
  const paths = ["site-data/pages/home.json", "site-data/events.json", "site-data/site.json", "site-data/candles.json"];
  const [homeText, eventsText, siteText, candlesText] = await Promise.all(
    paths.map((p) => readRawFile(p, headSha, requestImpl, token)),
  );
  return {
    headSha,
    home: JSON.parse(homeText),
    events: JSON.parse(eventsText),
    site: JSON.parse(siteText),
    candles: JSON.parse(candlesText),
    // Raw text as stored in the repo, kept so changes.js can diff against
    // the exact original bytes rather than a re-serialized approximation.
    rawText: {
      "site-data/pages/home.json": homeText,
      "site-data/events.json": eventsText,
      "site-data/site.json": siteText,
      "site-data/candles.json": candlesText,
    },
  };
}

// Commits one or more file changes directly to main in a single commit via
// the Git Data API (blob -> tree -> commit -> ref update).
//
// files: [{ path, content, encoding? }] — content is the complete new
// text/base64 for that file (already serialized; see lib/changes.js
// serializeJson for JSON files, lib/image.js blobToBase64 for photos).
// encoding defaults to "utf-8"; pass "base64" for binary (photo) content.
// baseSha: the headSha the draft was loaded at (from loadSiteData), used for
// conflict detection (see below).
export async function commitChanges({ token, baseSha, files, message, requestImpl = fetch }) {
  if (!token) throw new Error("missing token");
  if (!files || files.length === 0) throw new Error("no changes to commit");
  for (const f of files) {
    if (!isAllowedPath(f.path)) {
      throw new Error(`path not allowed: ${f.path}`);
    }
  }

  const headers = {
    accept: "application/vnd.github+json",
    authorization: `Bearer ${token}`,
    "content-type": "application/json",
  };

  // Conflict check #1: re-read HEAD right before writing, so a commit made
  // by someone else (or another editor tab) between load and publish is
  // caught here rather than silently overwritten.
  const currentSha = await getHeadSha(requestImpl, token);
  if (baseSha && currentSha !== baseSha) {
    const err = new Error("main has moved since this draft was loaded");
    err.code = "conflict";
    throw err;
  }

  const blobs = [];
  for (const f of files) {
    const res = await requestImpl(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/git/blobs`, {
      method: "POST",
      headers,
      // encoding "utf-8" (default): the JSON string is sent as-is, no
      // base64 step. Photo uploads pass encoding:"base64" with f.content
      // already base64-encoded (see lib/image.js blobToBase64).
      body: JSON.stringify({ content: f.content, encoding: f.encoding || "utf-8" }),
    });
    if (!res.ok) throw new Error(`failed to create blob for ${f.path} (${res.status})`);
    const data = await res.json();
    blobs.push({ path: f.path, mode: "100644", type: "blob", sha: data.sha });
  }

  // base_tree accepts the base commit's sha directly (GitHub resolves it to
  // that commit's tree) — this is why only one sha needs to be tracked.
  const treeRes = await requestImpl(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/git/trees`, {
    method: "POST",
    headers,
    body: JSON.stringify({ base_tree: currentSha, tree: blobs }),
  });
  if (!treeRes.ok) throw new Error(`failed to create tree (${treeRes.status})`);
  const tree = await treeRes.json();

  const commitRes = await requestImpl(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/git/commits`, {
    method: "POST",
    headers,
    body: JSON.stringify({ message, tree: tree.sha, parents: [currentSha] }),
  });
  if (!commitRes.ok) throw new Error(`failed to create commit (${commitRes.status})`);
  const commit = await commitRes.json();

  // Conflict check #2: force:false means GitHub itself rejects this update
  // if the ref moved again during blob/tree/commit creation above.
  const refRes = await requestImpl(`${API_BASE}/repos/${REPO_OWNER}/${REPO_NAME}/git/refs/heads/main`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ sha: commit.sha, force: false }),
  });
  if (!refRes.ok) {
    const err = new Error(`failed to update main (${refRes.status})`);
    err.code = refRes.status === 422 || refRes.status === 409 ? "conflict" : "error";
    throw err;
  }

  return { sha: commit.sha };
}
