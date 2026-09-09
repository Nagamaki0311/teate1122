import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteData, commitChanges, ALLOWED_PATHS, isAllowedPath, PHOTO_DIR } from "../src/lib/github.js";

function mockRequest(handlers) {
  const calls = [];
  const queue = [...handlers];
  const fn = async (url, opts = {}) => {
    const record = {
      url: String(url),
      method: opts.method || "GET",
      headers: opts.headers || {},
      body: opts.body ? JSON.parse(opts.body) : undefined,
    };
    calls.push(record);
    const next = queue.shift();
    if (!next) throw new Error(`unexpected extra request: ${record.method} ${record.url}`);
    return next(record);
  };
  return { fn, calls };
}

const ref = (sha) => () => ({ ok: true, json: async () => ({ object: { sha } }) });
const raw = (text) => () => ({ ok: true, text: async () => text });
const withSha = (sha) => () => ({ ok: true, json: async () => ({ sha }) });
const refPatchOk = () => ({ ok: true, json: async () => ({}) });
const failing = (status) => () => ({ ok: false, status, json: async () => ({}) });

test("loadSiteData reads HEAD then all four site-data files raw, at that ref", async () => {
  const { fn, calls } = mockRequest([
    ref("sha-head-1"),
    raw('{"sections":[]}'),
    raw("[]"),
    raw('{"assets":[]}'),
    raw("[]"),
  ]);
  const result = await loadSiteData({ token: "tok", requestImpl: fn });
  assert.equal(result.headSha, "sha-head-1");
  assert.deepEqual(result.home, { sections: [] });
  assert.deepEqual(result.events, []);
  assert.deepEqual(result.site, { assets: [] });
  assert.deepEqual(result.candles, []);
  assert.equal(result.rawText["site-data/pages/home.json"], '{"sections":[]}');
  assert.equal(result.rawText["site-data/events.json"], "[]");
  assert.equal(result.rawText["site-data/site.json"], '{"assets":[]}');
  assert.equal(result.rawText["site-data/candles.json"], "[]");

  assert.equal(calls[0].url.includes("/git/ref/heads/main"), true);
  assert.equal(calls[1].url.includes("site-data/pages/home.json"), true);
  assert.equal(calls[1].url.includes("ref=sha-head-1"), true);
  assert.equal(calls[1].headers.accept, "application/vnd.github.raw");
  assert.equal(calls[2].url.includes("site-data/events.json"), true);
  assert.equal(calls[3].url.includes("site-data/site.json"), true);
  assert.equal(calls[4].url.includes("site-data/candles.json"), true);
});

test("loadSiteData works unauthenticated (no token) for this public repo", async () => {
  const { fn, calls } = mockRequest([ref("s1"), raw("{}"), raw("[]"), raw("{}"), raw("[]")]);
  await loadSiteData({ requestImpl: fn });
  assert.equal("authorization" in calls[0].headers, false);
});

// --- isAllowedPath ----------------------------------------------------------

test("isAllowedPath allows the fixed JSON files and well-formed photo paths", () => {
  for (const p of ALLOWED_PATHS) assert.equal(isAllowedPath(p), true, p);
  assert.equal(isAllowedPath(`${PHOTO_DIR}a.webp`), true);
  assert.equal(isAllowedPath(`${PHOTO_DIR}hero-20260909-01.webp`), true);
  assert.equal(isAllowedPath(`${PHOTO_DIR}hero-20260909-01.jpg`), true);
});

test("isAllowedPath rejects path traversal out of the photo directory", () => {
  assert.equal(isAllowedPath(`${PHOTO_DIR}../../netlify.toml`), false);
  assert.equal(isAllowedPath(`${PHOTO_DIR}../../../etc/passwd`), false);
});

test("isAllowedPath rejects a subdirectory under the photo directory", () => {
  assert.equal(isAllowedPath(`${PHOTO_DIR}sub/a.webp`), false);
});

test("isAllowedPath rejects extensions other than webp/jpg", () => {
  assert.equal(isAllowedPath(`${PHOTO_DIR}a.svg`), false);
  assert.equal(isAllowedPath(`${PHOTO_DIR}a.png`), false);
  assert.equal(isAllowedPath(`${PHOTO_DIR}a.jpeg`), false);
});

test("isAllowedPath rejects uppercase letters", () => {
  assert.equal(isAllowedPath(`${PHOTO_DIR}Hero.webp`), false);
  assert.equal(isAllowedPath(`${PHOTO_DIR}hero-A.webp`), false);
});

test("isAllowedPath rejects any path outside the fixed list and the photo directory", () => {
  assert.equal(isAllowedPath("eleventy.config.js"), false);
  assert.equal(isAllowedPath("netlify.toml"), false);
  assert.equal(isAllowedPath(".github/workflows/ci.yml"), false);
  assert.equal(isAllowedPath("editor/src/App.jsx"), false);
  assert.equal(isAllowedPath("src/style.css"), false);
  assert.equal(isAllowedPath("src/_includes/base.njk"), false);
  assert.equal(isAllowedPath("package.json"), false);
  assert.equal(isAllowedPath("site-data/pages/privacy.json"), false);
});

// --- commitChanges -----------------------------------------------------------

test("commitChanges refuses a path outside the allowlist without any network call", async () => {
  const { fn, calls } = mockRequest([]);
  await assert.rejects(
    () =>
      commitChanges({
        token: "tok",
        baseSha: "s1",
        files: [{ path: "netlify.toml", content: "{}" }],
        message: "test",
        requestImpl: fn,
      }),
    /not allowed/,
  );
  assert.equal(calls.length, 0);
});

test("commitChanges requires a token before doing anything", async () => {
  const { fn, calls } = mockRequest([]);
  await assert.rejects(() =>
    commitChanges({ baseSha: "s1", files: [{ path: ALLOWED_PATHS[0], content: "{}" }], requestImpl: fn }),
  );
  assert.equal(calls.length, 0);
});

test("commitChanges detects a sha conflict and stops before creating any blobs", async () => {
  const { fn, calls } = mockRequest([ref("current-sha")]);
  await assert.rejects(
    () =>
      commitChanges({
        token: "tok",
        baseSha: "stale-sha",
        files: [{ path: ALLOWED_PATHS[0], content: "{}" }],
        message: "test",
        requestImpl: fn,
      }),
    (err) => err.code === "conflict",
  );
  assert.equal(calls.length, 1, "should stop after the HEAD re-check, before any writes");
});

test("commitChanges: happy path creates blob(s) with the right encoding, a tree on base_tree=HEAD, a commit, then updates the ref (force:false)", async () => {
  const { fn, calls } = mockRequest([
    ref("head-1"), // conflict re-check
    withSha("blob-home"), // blob for home.json (utf-8)
    withSha("blob-photo"), // blob for a photo (base64)
    withSha("tree-1"), // tree
    withSha("commit-1"), // commit
    refPatchOk, // ref update
  ]);

  const result = await commitChanges({
    token: "tok",
    baseSha: "head-1",
    files: [
      { path: "site-data/pages/home.json", content: '{"a":1}' },
      { path: `${PHOTO_DIR}hero-20260909-01.webp`, content: "aGVsbG8=", encoding: "base64" },
    ],
    message: "編集アプリからの公開",
    requestImpl: fn,
  });

  assert.deepEqual(result, { sha: "commit-1" });
  assert.equal(calls.length, 6);

  const [refCheck, blob1, blob2, tree, commit, refPatch] = calls;
  assert.equal(refCheck.method, "GET");

  assert.equal(blob1.method, "POST");
  assert.equal(blob1.url.endsWith("/git/blobs"), true);
  assert.deepEqual(blob1.body, { content: '{"a":1}', encoding: "utf-8" });
  assert.deepEqual(blob2.body, { content: "aGVsbG8=", encoding: "base64" });

  assert.equal(tree.url.endsWith("/git/trees"), true);
  assert.equal(tree.body.base_tree, "head-1");
  assert.deepEqual(tree.body.tree, [
    { path: "site-data/pages/home.json", mode: "100644", type: "blob", sha: "blob-home" },
    { path: `${PHOTO_DIR}hero-20260909-01.webp`, mode: "100644", type: "blob", sha: "blob-photo" },
  ]);

  assert.equal(commit.url.endsWith("/git/commits"), true);
  assert.equal(commit.body.tree, "tree-1");
  assert.deepEqual(commit.body.parents, ["head-1"]);
  assert.equal(commit.body.message, "編集アプリからの公開");

  assert.equal(refPatch.method, "PATCH");
  assert.equal(refPatch.url.endsWith("/git/refs/heads/main"), true);
  assert.equal(refPatch.body.sha, "commit-1");
  assert.equal(refPatch.body.force, false);
});

test("commitChanges treats a rejected ref update (race after the first check) as a conflict", async () => {
  const { fn } = mockRequest([
    ref("head-1"),
    withSha("blob-1"),
    withSha("tree-1"),
    withSha("commit-1"),
    failing(409),
  ]);
  await assert.rejects(
    () =>
      commitChanges({
        token: "tok",
        baseSha: "head-1",
        files: [{ path: ALLOWED_PATHS[0], content: "{}" }],
        message: "test",
        requestImpl: fn,
      }),
    (err) => err.code === "conflict",
  );
});
