// Authentication: GitHub OAuth (Authorization Code flow) via the
// netlify/functions/github-oauth.mjs function.
//
// Security notes (see docs/decisions.md D-023):
// - The access token lives in sessionStorage ONLY (cleared when the tab
//   closes). It is never written to localStorage. The draft auto-save
//   functions in App.jsx deliberately do not accept a token argument, so a
//   token cannot accidentally end up in a localStorage payload.
// - CSRF: `state` is generated with crypto.getRandomValues, stored in
//   sessionStorage, and checked (then deleted either way — one-time use) on
//   the /editor/callback screen before a code is ever sent to the Function.
// - The allowed-account check happens server-side (github-oauth.mjs); the
//   real security boundary is that account's push access to the repo.
//   ALLOWED_LOGIN here is only a client-side re-confirmation (defense in
//   depth), not the enforcement point.

const STATE_KEY = "teate1122-editor:oauth-state";
const TOKEN_KEY = "teate1122-editor:token";
const LOGIN_KEY = "teate1122-editor:login";
const FUNCTION_URL = "/.netlify/functions/github-oauth";
const GITHUB_AUTHORIZE_URL = "https://github.com/login/oauth/authorize";

export const ALLOWED_LOGIN = "Nagamaki0311";

export function isAllowedLogin(login) {
  return login === ALLOWED_LOGIN;
}

export async function fetchConfig(fetchImpl = fetch) {
  try {
    const res = await fetchImpl(FUNCTION_URL, { method: "GET" });
    if (!res.ok) return { configured: false };
    return await res.json();
  } catch {
    return { configured: false };
  }
}

function randomState() {
  const bytes = new Uint8Array(32);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");
}

function callbackRedirectUri(origin) {
  return `${origin}/editor/callback`;
}

// Starts the login flow: generates and stores a one-time CSRF state, then
// returns the GitHub authorize URL the caller should navigate to.
export function beginLogin(config, { storage = sessionStorage, origin } = {}) {
  if (!config || !config.configured) {
    throw new Error("GitHub OAuth is not configured");
  }
  const state = randomState();
  storage.setItem(STATE_KEY, state);
  const url = new URL(GITHUB_AUTHORIZE_URL);
  url.searchParams.set("client_id", config.clientId);
  url.searchParams.set("scope", config.scope);
  url.searchParams.set("state", state);
  url.searchParams.set("redirect_uri", callbackRedirectUri(origin));
  return url.toString();
}

// Validates the CSRF state from /editor/callback?code=...&state=... and
// extracts the authorization code. The stored state is removed either way,
// so it can only ever be consumed once.
export function consumeCallbackParams(searchParams, { storage = sessionStorage } = {}) {
  const savedState = storage.getItem(STATE_KEY);
  storage.removeItem(STATE_KEY);

  const providerError = searchParams.get("error");
  if (providerError) {
    return { ok: false, error: providerError };
  }

  const returnedState = searchParams.get("state");
  const code = searchParams.get("code");

  if (!savedState || !returnedState || returnedState !== savedState) {
    // Missing/mismatched state: never forward the code to the Function.
    return { ok: false, error: "state_mismatch" };
  }
  if (!code) {
    return { ok: false, error: "missing_code" };
  }
  return { ok: true, code };
}

export async function exchangeCode(code, fetchImpl = fetch) {
  let res;
  try {
    res = await fetchImpl(FUNCTION_URL, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code }),
    });
  } catch {
    return { ok: false, error: "network_error" };
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.token) {
    return { ok: false, error: data.error || `http_${res.status}` };
  }
  if (!isAllowedLogin(data.login)) {
    // Defense-in-depth: the Function should already have rejected this.
    return { ok: false, error: "forbidden" };
  }
  return { ok: true, token: data.token, login: data.login };
}

export function getToken(storage = sessionStorage) {
  try {
    return storage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

export function getLogin(storage = sessionStorage) {
  try {
    return storage.getItem(LOGIN_KEY);
  } catch {
    return null;
  }
}

export function setToken(token, login, storage = sessionStorage) {
  storage.setItem(TOKEN_KEY, token);
  storage.setItem(LOGIN_KEY, login);
}

export function clearToken(storage = sessionStorage) {
  storage.removeItem(TOKEN_KEY);
  storage.removeItem(LOGIN_KEY);
}
