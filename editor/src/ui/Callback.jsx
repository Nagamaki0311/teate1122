import { useEffect, useState } from "react";
import { consumeCallbackParams, exchangeCode, setToken } from "../lib/auth.js";

const ERROR_MESSAGES = {
  access_denied: "ログインがキャンセルされました。",
  state_mismatch: "セッションの確認に失敗しました。もう一度ログインしてください。",
  missing_code: "GitHubからの応答が不完全でした。もう一度ログインしてください。",
  forbidden: "このGitHubアカウントには編集権限がありません。",
};

function messageFor(code) {
  return ERROR_MESSAGES[code] || "ログインに失敗しました。もう一度お試しください。";
}

// /editor/callback: validates CSRF state, exchanges the code for a token,
// stores it (sessionStorage only), then hands control back to onAuthenticated.
export default function Callback({ onAuthenticated }) {
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const params = new URLSearchParams(window.location.search);
      const parsed = consumeCallbackParams(params);
      if (!parsed.ok) {
        if (!cancelled) setError(parsed.error);
        return;
      }
      const result = await exchangeCode(parsed.code);
      if (cancelled) return;
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setToken(result.token, result.login);
      window.history.replaceState(null, "", "/editor/");
      onAuthenticated(result.token, result.login);
    }

    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="screen screen--centered">
      <div className="card">
        {!error && <p>ログインを確認しています…</p>}
        {error && (
          <>
            <p className="error" role="alert">
              {messageFor(error)}
            </p>
            <a className="btn" href="/editor/">
              ログイン画面に戻る
            </a>
          </>
        )}
      </div>
    </div>
  );
}
