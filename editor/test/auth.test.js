import { test } from "node:test";
import assert from "node:assert/strict";
import {
  fetchConfig,
  beginLogin,
  consumeCallbackParams,
  exchangeCode,
  getToken,
  getLogin,
  setToken,
  clearToken,
  isAllowedLogin,
  ALLOWED_LOGIN,
} from "../src/lib/auth.js";

class FakeStorage {
  constructor() {
    this.map = new Map();
  }
  getItem(key) {
    return this.map.has(key) ? this.map.get(key) : null;
  }
  setItem(key, value) {
    this.map.set(key, String(value));
  }
  removeItem(key) {
    this.map.delete(key);
  }
}

test("isAllowedLogin only accepts the configured account", () => {
  assert.equal(isAllowedLogin(ALLOWED_LOGIN), true);
  assert.equal(isAllowedLogin("someone-else"), false);
});

test("fetchConfig returns configured:false when the request fails", async () => {
  const result = await fetchConfig(async () => {
    throw new Error("network down");
  });
  assert.deepEqual(result, { configured: false });
});

test("fetchConfig returns the parsed body on success", async () => {
  const result = await fetchConfig(async () => ({
    ok: true,
    json: async () => ({ configured: true, clientId: "abc", scope: "public_repo" }),
  }));
  assert.deepEqual(result, { configured: true, clientId: "abc", scope: "public_repo" });
});

test("beginLogin throws when the config says OAuth is not configured", () => {
  const storage = new FakeStorage();
  assert.throws(() => beginLogin({ configured: false }, { storage, origin: "https://example.test" }));
});

test("beginLogin stores a one-time CSRF state and returns a matching authorize URL", () => {
  const storage = new FakeStorage();
  const url = beginLogin(
    { configured: true, clientId: "abc123", scope: "public_repo" },
    { storage, origin: "https://example.test" },
  );
  const parsed = new URL(url);
  assert.equal(parsed.origin, "https://github.com");
  assert.equal(parsed.searchParams.get("client_id"), "abc123");
  assert.equal(parsed.searchParams.get("scope"), "public_repo");
  assert.equal(parsed.searchParams.get("redirect_uri"), "https://example.test/editor/callback");
  const state = parsed.searchParams.get("state");
  assert.ok(state && state.length >= 32);
  assert.equal(storage.getItem("teate1122-editor:oauth-state"), state);
});

test("consumeCallbackParams accepts a matching state+code and clears it (one-time)", () => {
  const storage = new FakeStorage();
  storage.setItem("teate1122-editor:oauth-state", "s1");
  const result = consumeCallbackParams(new URLSearchParams("state=s1&code=abc"), { storage });
  assert.deepEqual(result, { ok: true, code: "abc" });
  assert.equal(storage.getItem("teate1122-editor:oauth-state"), null);
});

test("consumeCallbackParams rejects a mismatched state and never leaks the code", () => {
  const storage = new FakeStorage();
  storage.setItem("teate1122-editor:oauth-state", "s1");
  const result = consumeCallbackParams(new URLSearchParams("state=WRONG&code=abc"), { storage });
  assert.equal(result.ok, false);
  assert.equal(result.error, "state_mismatch");
  assert.equal("code" in result, false);
  assert.equal(storage.getItem("teate1122-editor:oauth-state"), null);
});

test("consumeCallbackParams rejects a missing state (e.g. replay after reload)", () => {
  const storage = new FakeStorage();
  const result = consumeCallbackParams(new URLSearchParams("state=s1&code=abc"), { storage });
  assert.equal(result.ok, false);
  assert.equal(result.error, "state_mismatch");
});

test("consumeCallbackParams surfaces a provider error without state comparison", () => {
  const storage = new FakeStorage();
  storage.setItem("teate1122-editor:oauth-state", "s1");
  const result = consumeCallbackParams(new URLSearchParams("error=access_denied"), { storage });
  assert.deepEqual(result, { ok: false, error: "access_denied" });
  assert.equal(storage.getItem("teate1122-editor:oauth-state"), null);
});

test("exchangeCode returns the token on success", async () => {
  const result = await exchangeCode("codeabc", async () => ({
    ok: true,
    json: async () => ({ token: "gho_xyz", login: ALLOWED_LOGIN }),
  }));
  assert.deepEqual(result, { ok: true, token: "gho_xyz", login: ALLOWED_LOGIN });
});

test("exchangeCode rejects a login other than the allowed account, even if the Function returned one", async () => {
  const result = await exchangeCode("codeabc", async () => ({
    ok: true,
    json: async () => ({ token: "gho_xyz", login: "someone-else" }),
  }));
  assert.equal(result.ok, false);
  assert.equal(result.error, "forbidden");
});

test("exchangeCode surfaces a non-ok response as a failure", async () => {
  const result = await exchangeCode("bad", async () => ({
    ok: false,
    status: 403,
    json: async () => ({ error: "forbidden" }),
  }));
  assert.deepEqual(result, { ok: false, error: "forbidden" });
});

test("token storage round-trips through the injected storage only", () => {
  const storage = new FakeStorage();
  assert.equal(getToken(storage), null);
  setToken("gho_xyz", "someone", storage);
  assert.equal(getToken(storage), "gho_xyz");
  assert.equal(getLogin(storage), "someone");
  clearToken(storage);
  assert.equal(getToken(storage), null);
  assert.equal(getLogin(storage), null);
});
