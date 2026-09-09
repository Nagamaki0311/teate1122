import { useMemo, useState } from "react";
import { computeChanges } from "../lib/changes.js";
import { validateAll } from "../lib/validate.js";
import { commitChanges } from "../lib/github.js";

export default function PublishTab({ draft, rawText, headSha, token, onPublished, onReloadRequested }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState({ state: "idle" });

  const changes = useMemo(() => computeChanges(draft, rawText), [draft, rawText]);
  const validation = useMemo(() => validateAll(draft.home, draft.events), [draft]);

  const canPublish = Boolean(token) && changes.length > 0 && validation.ok && status.state !== "publishing";

  async function handlePublish() {
    if (!canPublish) return;
    setStatus({ state: "publishing" });
    try {
      const message = note.trim() ? `編集アプリからの更新: ${note.trim()}` : "編集アプリからの更新";
      const result = await commitChanges({ token, baseSha: headSha, files: changes, message });
      setStatus({ state: "done" });
      onPublished(result.sha);
    } catch (err) {
      if (err.code === "conflict") {
        setStatus({ state: "conflict" });
      } else {
        setStatus({ state: "error", message: err.message });
      }
    }
  }

  return (
    <div className="publish-tab">
      <h2>変更内容</h2>
      {!token && (
        <p className="muted">
          読み取り専用モードのため公開できません。GitHubでログインすると公開できます。
        </p>
      )}
      {changes.length === 0 ? (
        <p className="muted">未公開の変更はありません。</p>
      ) : (
        <ul className="diff-list">
          {changes.map((c) => (
            <li key={c.path} className="diff-list__item">
              {c.path}
            </li>
          ))}
        </ul>
      )}

      {!validation.ok && changes.length > 0 && (
        <div className="validation-errors" role="alert">
          <p>公開前チェックでエラーが見つかりました。修正してから公開してください。</p>
          <ul>
            {validation.errors.map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      <label className="field">
        <span>変更メモ（任意）</span>
        <textarea rows={3} value={note} onChange={(e) => setNote(e.target.value)} placeholder="例: プロフィール文言を更新" />
      </label>

      <button type="button" className="btn" disabled={!canPublish} onClick={handlePublish}>
        {status.state === "publishing" ? "公開しています…" : "公開する"}
      </button>

      {status.state === "done" && <p className="success">公開しました。サイトへの反映まで数分かかる場合があります。</p>}
      {status.state === "conflict" && (
        <div className="error" role="alert">
          <p>他の変更でこのファイルが更新されています。再読み込みしてから編集内容を確認してください。</p>
          <button type="button" className="btn" onClick={onReloadRequested}>
            再読み込みする
          </button>
        </div>
      )}
      {status.state === "error" && (
        <p className="error" role="alert">
          {status.message || "公開に失敗しました。もう一度お試しください。"}
        </p>
      )}
    </div>
  );
}
