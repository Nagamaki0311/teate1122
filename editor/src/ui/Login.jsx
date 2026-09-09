import { useEffect, useState } from "react";
import { fetchConfig, beginLogin } from "../lib/auth.js";

// Shown whenever there is no valid session token: the "not logged in"
// screen, and the entry point for starting the OAuth flow.
export default function Login() {
  const [config, setConfig] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchConfig().then(setConfig);
  }, []);

  function handleLogin() {
    setError(null);
    try {
      const url = beginLogin(config, { origin: window.location.origin });
      window.location.assign(url);
    } catch (err) {
      setError(err.message);
    }
  }

  return (
    <div className="screen screen--centered">
      <div className="card">
        <h1>teate1122 編集アプリ</h1>
        <p className="muted">サイトの内容を編集するには、許可されたGitHubアカウントでログインしてください。</p>
        {config === null && <p className="muted">確認しています…</p>}
        {config !== null && !config.configured && (
          <p className="error" role="alert">
            ログイン機能が未設定です（GitHub OAuth Appの登録・Netlify環境変数の設定が必要です）。管理者に連絡してください。
          </p>
        )}
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        {config !== null && config.configured && (
          <button type="button" className="btn" onClick={handleLogin}>
            GitHubでログイン
          </button>
        )}
      </div>
    </div>
  );
}
