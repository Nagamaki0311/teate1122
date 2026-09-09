// Netlify Function (Functions v2, Node runtime): distributes the GitHub
// OAuth App's public Client ID and exchanges an authorization code for an
// access token. This is the ONLY place the Client Secret is ever read or
// used — it must never appear in a response body, a log line, or a commit.
//
// Security note: the EDITOR_ALLOWED_LOGIN check below is defense-in-depth
// only (mirrored again client-side in editor/src/lib/auth.js). The real
// security boundary is GitHub repository push access — a token minted for
// any other account simply cannot write to this repo, regardless of what
// this check does. See docs/decisions.md D-023.

const DEFAULT_ALLOWED_LOGIN = "Nagamaki0311";
const SCOPE = "public_repo";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      "content-type": "application/json",
      // Token responses must never be cached (by the browser or an
      // intermediary), and config responses can change when env vars change.
      "cache-control": "no-store",
    },
  });
}

export default async function handler(req) {
  const clientId = process.env.GITHUB_OAUTH_CLIENT_ID;
  const clientSecret = process.env.GITHUB_OAUTH_CLIENT_SECRET;
  const allowedLogin = process.env.EDITOR_ALLOWED_LOGIN || DEFAULT_ALLOWED_LOGIN;

  if (req.method === "GET") {
    if (!clientId) return json({ configured: false });
    return json({ configured: true, clientId, scope: SCOPE });
  }

  if (req.method !== "POST") {
    return json({ error: "method_not_allowed" }, 405);
  }

  if (!clientId || !clientSecret) {
    return json({ configured: false });
  }

  let body;
  try {
    body = await req.json();
  } catch {
    return json({ error: "invalid_request" }, 400);
  }

  const code = body && typeof body.code === "string" ? body.code : null;
  if (!code) {
    return json({ error: "invalid_request" }, 400);
  }

  const tokenRes = await globalThis.fetch("https://github.com/login/oauth/access_token", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      accept: "application/json",
    },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, code }),
  });

  if (!tokenRes.ok) {
    return json({ error: "invalid_request" }, 400);
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData && tokenData.access_token;
  if (!accessToken) {
    return json({ error: "invalid_request" }, 400);
  }

  const userRes = await globalThis.fetch("https://api.github.com/user", {
    headers: {
      authorization: `Bearer ${accessToken}`,
      accept: "application/vnd.github+json",
      "user-agent": "teate1122-editor",
    },
  });

  if (!userRes.ok) {
    return json({ error: "invalid_request" }, 400);
  }

  const userData = await userRes.json();
  const login = userData && userData.login;

  if (login !== allowedLogin) {
    // Deliberately do not return the token here — an unauthorized account
    // must never receive a usable credential, even transiently.
    return json({ error: "forbidden" }, 403);
  }

  return json({ token: accessToken, login });
}
