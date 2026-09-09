import { useMemo, useState } from "react";
import { computeChanges, pendingImageFiles } from "../lib/changes.js";
import { validateAll } from "../lib/validate.js";
import { commitChanges } from "../lib/github.js";

const PATH_LABELS = {
  "site-data/pages/home.json": "ホームページの内容",
  "site-data/events.json": "日程",
  "site-data/site.json": "写真（assets）",
  "site-data/candles.json": "キャンドルの写真",
};

export default function PublishTab({ draft, rawText, headSha, token, pendingImages, onPublished, onReloadRequested }) {
  const [note, setNote] = useState("");
  const [status, setStatus] = useState({ state: "idle" });

  // computeChanges can throw (structural guard — D-024 §2-1): site.json/
  // candles.json changed outside the fields this editor's UI can write.
  // That should block publish like any other validation failure, not crash
  // the tab.
  const { changes, changesError } = useMemo(() => {
    try {
      return { changes: computeChanges(draft, rawText), changesError: null };
    } catch (err) {
      return { changes: [], changesError: err.message };
    }
  }, [draft, rawText]);

  const originalAssetFiles = useMemo(() => new Set(JSON.parse(rawText["site-data/site.json"]).assets.map((a) => a.file)), [rawText]);
  const pendingAssetFiles = useMemo(
    () => new Set(Object.values(pendingImages || {}).map((p) => p.assetFile)),
    [pendingImages],
  );
  const pendingCount = Object.keys(pendingImages || {}).length;

  const validation = useMemo(
    () => validateAll(draft, { originalAssetFiles, pendingAssetFiles }),
    [draft, originalAssetFiles, pendingAssetFiles],
  );

  const canPublish =
    Boolean(token) && !changesError && changes.length > 0 && validation.ok && status.state !== "publishing";

  async function handlePublish() {
    if (!canPublish) return;
    setStatus({ state: "publishing" });
    try {
      const imageFiles = await pendingImageFiles(pendingImages, draft.site);
      const message = note.trim() ? `編集アプリからの更新: ${note.trim()}` : "編集アプリからの更新";
      const result = await commitChanges({
        token,
        baseSha: headSha,
        files: [...changes, ...imageFiles],
        message,
      });
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
      {pendingCount > 0 && <p className="badge">未公開の写真 {pendingCount}件</p>}

      {changesError && (
        <div className="validation-errors" role="alert">
          <p>{changesError}</p>
        </div>
      )}

      {changes.length === 0 && pendingCount === 0 ? (
        <p className="muted">未公開の変更はありません。</p>
      ) : (
        <ul className="diff-list">
          {changes.map((c) => (
            <li key={c.path} className="diff-list__item">
              {PATH_LABELS[c.path] || c.path}
            </li>
          ))}
          {Object.keys(pendingImages || {}).map((path) => (
            <li key={path} className="diff-list__item">
              {path}
            </li>
          ))}
        </ul>
      )}

      {!validation.ok && (changes.length > 0 || pendingCount > 0) && (
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
