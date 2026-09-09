import { test } from "node:test";
import assert from "node:assert/strict";
import handler from "../../netlify/functions/github-oauth.mjs";

const ENV_KEYS = ["GITHUB_OAUTH_CLIENT_ID", "GITHUB_OAUTH_CLIENT_SECRET", "EDITOR_ALLOWED_LOGIN"];

function withEnv(vars, fn) {
  const saved = Object.fromEntries(ENV_KEYS.map((k) => [k, process.env[k]]));
  for (const k of ENV_KEYS) delete process.env[k];
  Object.assign(process.env, vars);
  const savedFetch = globalThis.fetch;
  return Promise.resolve()
    .then(fn)
    .finally(() => {
      for (const k of ENV_KEYS) {
        if (saved[k] === undefined) delete process.env[k];
        else process.env[k] = saved[k];
      }
      globalThis.fetch = savedFetch;
    });
}

function stubFetch({ tokenOk = true, accessToken = "gho_test_token", userOk = true, login = "Nagamaki0311" } = {}) {
  globalThis.fetch = async (url) => {
    const href = String(url);
    if (href.includes("github.com/login/oauth/access_token")) {
      return {
        ok: tokenOk,
        json: async () => (tokenOk ? { access_token: accessToken } : {}),
      };
    }
    if (href.includes("api.github.com/user")) {
      return {
        ok: userOk,
        json: async () => (userOk ? { login } : {}),
      };
    }
    throw new Error(`unexpected fetch url: ${href}`);
  };
}

function req(method, body) {
  return new Request("http://localhost/.netlify/functions/github-oauth", {
    method,
    ...(body !== undefined ? { body: JSON.stringify(body) } : {}),
  });
}

test("GET returns configured:false when Client ID is not set", () =>
  withEnv({}, async () => {
    const res = await handler(req("GET"));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { configured: false });
    assert.equal(res.headers.get("cache-control"), "no-store");
  }));

test("GET returns clientId and scope when configured", () =>
  withEnv({ GITHUB_OAUTH_CLIENT_ID: "abc123" }, async () => {
    const res = await handler(req("GET"));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { configured: true, clientId: "abc123", scope: "public_repo" });
  }));

test("methods other than GET/POST return 405", () =>
  withEnv({}, async () => {
    const res = await handler(req("PUT"));
    assert.equal(res.status, 405);
  }));

test("POST without a code returns 400", () =>
  withEnv({ GITHUB_OAUTH_CLIENT_ID: "id", GITHUB_OAUTH_CLIENT_SECRET: "secret" }, async () => {
    const res = await handler(req("POST", {}));
    assert.equal(res.status, 400);
  }));

test("POST returns configured:false (not 500) when env vars are missing", () =>
  withEnv({}, async () => {
    const res = await handler(req("POST", { code: "somecode" }));
    assert.equal(res.status, 200);
    assert.deepEqual(await res.json(), { configured: false });
  }));

test("POST with a mismatched login is rejected with 403 and no token is returned", () =>
  withEnv({ GITHUB_OAUTH_CLIENT_ID: "id", GITHUB_OAUTH_CLIENT_SECRET: "topsecret" }, async () => {
    stubFetch({ login: "someone-else" });
    const res = await handler(req("POST", { code: "somecode" }));
    assert.equal(res.status, 403);
    const bodyText = JSON.stringify(await res.json());
    assert.ok(!bodyText.includes("gho_test_token"));
    assert.ok(!bodyText.includes("topsecret"));
  }));

test("POST with the allowed login succeeds and returns {token, login}", () =>
  withEnv(
    { GITHUB_OAUTH_CLIENT_ID: "id", GITHUB_OAUTH_CLIENT_SECRET: "topsecret", EDITOR_ALLOWED_LOGIN: "Nagamaki0311" },
    async () => {
      stubFetch({ login: "Nagamaki0311", accessToken: "gho_ok" });
      const res = await handler(req("POST", { code: "somecode" }));
      assert.equal(res.status, 200);
      const body = await res.json();
      assert.deepEqual(body, { token: "gho_ok", login: "Nagamaki0311" });
      // The Client Secret must never leak into any response.
      assert.ok(!JSON.stringify(body).includes("topsecret"));
    },
  ));

test("a failed upstream token exchange returns 400, not a crash", () =>
  withEnv({ GITHUB_OAUTH_CLIENT_ID: "id", GITHUB_OAUTH_CLIENT_SECRET: "secret" }, async () => {
    stubFetch({ tokenOk: false });
    const res = await handler(req("POST", { code: "bad-code" }));
    assert.equal(res.status, 400);
  }));
