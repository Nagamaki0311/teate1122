import { test } from "node:test";
import assert from "node:assert/strict";
import { loadSiteData, commitChanges, ALLOWED_PATHS } from "../src/lib/github.js";

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

test("loadSiteData reads HEAD then both files raw, at that ref", async () => {
  const { fn, calls } = mockRequest([
    ref("sha-head-1"),
    raw('{"sections":[]}'),
    raw("[]"),
  ]);
  const result = await loadSiteData({ token: "tok", requestImpl: fn });
  assert.equal(result.headSha, "sha-head-1");
  assert.deepEqual(result.home, { sections: [] });
  assert.deepEqual(result.events, []);
  assert.equal(result.rawText["site-data/pages/home.json"], '{"sections":[]}');
  assert.equal(result.rawText["site-data/events.json"], "[]");

  assert.equal(calls[0].url.includes("/git/ref/heads/main"), true);
  assert.equal(calls[1].url.includes("site-data/pages/home.json"), true);
  assert.equal(calls[1].url.includes("ref=sha-head-1"), true);
  assert.equal(calls[1].headers.accept, "application/vnd.github.raw");
  assert.equal(calls[2].url.includes("site-data/events.json"), true);
});

test("loadSiteData works unauthenticated (no token) for this public repo", async () => {
  const { fn, calls } = mockRequest([ref("s1"), raw("{}"), raw("[]")]);
  await loadSiteData({ requestImpl: fn });
  assert.equal("authorization" in calls[0].headers, false);
});

test("commitChanges refuses a path outside ALLOWED_PATHS without any network call", async () => {
  const { fn, calls } = mockRequest([]);
  await assert.rejects(
    () =>
      commitChanges({
        token: "tok",
        baseSha: "s1",
        files: [{ path: "site-data/site.json", content: "{}" }],
        message: "test",
        requestImpl: fn,
      }),
    /not allowed/,
  );
  assert.equal(calls.length, 0);
  assert.equal(ALLOWED_PATHS.includes("site-data/site.json"), false);
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

test("commitChanges: happy path creates blob(s), a tree on base_tree=HEAD, a commit, then updates the ref (force:false)", async () => {
  const { fn, calls } = mockRequest([
    ref("head-1"), // conflict re-check
    withSha("blob-home"), // blob for home.json
    withSha("blob-events"), // blob for events.json
    withSha("tree-1"), // tree
    withSha("commit-1"), // commit
    refPatchOk, // ref update
  ]);

  const result = await commitChanges({
    token: "tok",
    baseSha: "head-1",
    files: [
      { path: "site-data/pages/home.json", content: '{"a":1}' },
      { path: "site-data/events.json", content: "[]" },
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
  assert.deepEqual(blob2.body, { content: "[]", encoding: "utf-8" });

  assert.equal(tree.url.endsWith("/git/trees"), true);
  assert.equal(tree.body.base_tree, "head-1");
  assert.deepEqual(tree.body.tree, [
    { path: "site-data/pages/home.json", mode: "100644", type: "blob", sha: "blob-home" },
    { path: "site-data/events.json", mode: "100644", type: "blob", sha: "blob-events" },
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
