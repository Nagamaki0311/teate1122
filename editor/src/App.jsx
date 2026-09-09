import { useEffect, useState } from "react";
import Login from "./ui/Login.jsx";
import Callback from "./ui/Callback.jsx";
import TabBar from "./ui/TabBar.jsx";
import Preview from "./ui/Preview.jsx";
import EditTab from "./ui/EditTab.jsx";
import DatesTab from "./ui/DatesTab.jsx";
import PublishTab from "./ui/PublishTab.jsx";
import { getToken, getLogin, clearToken } from "./lib/auth.js";
import { loadSiteData } from "./lib/github.js";

const DRAFT_KEY = "teate1122-editor:draft";

// Draft persistence deliberately takes only the JSON trees ({home, events,
// site, candles}) — never a token, and never a pending photo's binary data
// (see docs/decisions.md D-024 §2-9: a Blob can't be serialized, and
// base64-in-localStorage risks a quota error on a normal-sized photo). A
// draft restored after an upload was staged but not published will
// therefore reference a photo that no longer exists locally — the
// pre-publish "reference check" in lib/validate.js is what catches that
// case and blocks publishing until the photo is re-uploaded, rather than
// silently committing a broken path.
function saveDraft(draft) {
  try {
    localStorage.setItem(
      DRAFT_KEY,
      JSON.stringify({ home: draft.home, events: draft.events, site: draft.site, candles: draft.candles }),
    );
  } catch {
    // best-effort only (private browsing / storage quota / disabled storage)
  }
}

function loadSavedDraft() {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function clearSavedDraft() {
  try {
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // ignore
  }
}

function draftEqual(a, b) {
  return (
    JSON.stringify(a.home) === JSON.stringify(b.home) &&
    JSON.stringify(a.events) === JSON.stringify(b.events) &&
    JSON.stringify(a.site) === JSON.stringify(b.site) &&
    JSON.stringify(a.candles) === JSON.stringify(b.candles)
  );
}

// No router library: the only two "routes" are /editor/callback (the OAuth
// redirect target) and everything else (the app shell).
export default function App() {
  const isCallback = window.location.pathname.endsWith("/callback");
  // Vite statically replaces import.meta.env.DEV at build time and the
  // production build's minifier drops the resulting dead branches, so none
  // of this DEV-only code reaches the deployed bundle.
  const isDev = import.meta.env.DEV;

  const [state, setState] = useState(() => ({
    token: getToken(),
    login: getLogin(),
    loading: false,
    error: null,
    data: null, // { headSha, home, events, site, candles, rawText }
    draft: null, // { home, events, site, candles } — the editable copy
    activeTab: "edit",
  }));
  // Staged-but-uncommitted photo uploads: { [repoPath]: { blob, assetFile,
  // objectUrl, width, height } }. Kept out of `state`/localStorage — see
  // saveDraft's comment above.
  const [pendingImages, setPendingImages] = useState({});
  const [scrollToSectionId, setScrollToSectionId] = useState(null);
  const [fullscreenPreview, setFullscreenPreview] = useState(false);

  function patch(partial) {
    setState((s) => ({ ...s, ...partial }));
  }

  function revokePendingImages(images) {
    for (const entry of Object.values(images || {})) {
      try {
        URL.revokeObjectURL(entry.objectUrl);
      } catch {
        // ignore
      }
    }
  }

  async function loadAndPrepareDraft() {
    const data = await loadSiteData({ token: state.token || undefined });
    let draft = { home: data.home, events: data.events, site: data.site, candles: data.candles };
    const saved = loadSavedDraft();
    if (saved && !draftEqual(saved, draft)) {
      const restore = window.confirm(
        "保存されていた下書きがあります。復元しますか？\n（キャンセルすると破棄して最新の内容から始めます）",
      );
      if (restore) draft = saved;
      else clearSavedDraft();
    }
    return { data, draft };
  }

  // Load site data once there is a session — or in local dev, even without
  // one (read-only, unauthenticated GitHub API access to this public repo).
  useEffect(() => {
    if (isCallback) return;
    if (!state.token && !isDev) return;
    let cancelled = false;
    patch({ loading: true, error: null });
    loadAndPrepareDraft()
      .then(({ data, draft }) => {
        if (!cancelled) patch({ loading: false, data, draft });
      })
      .catch((err) => {
        if (!cancelled) patch({ loading: false, error: err.message });
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state.token]);

  // Auto-save the draft (never the token, never pending photo bytes)
  // whenever it changes.
  useEffect(() => {
    if (state.draft) saveDraft(state.draft);
  }, [state.draft]);

  function handleAuthenticated(token, login) {
    patch({ token, login });
  }

  function handleLogout() {
    clearToken();
    clearSavedDraft();
    revokePendingImages(pendingImages);
    setPendingImages({});
    patch({ token: null, login: null, data: null, draft: null });
  }

  async function handleReload() {
    clearSavedDraft();
    revokePendingImages(pendingImages);
    setPendingImages({});
    patch({ loading: true, error: null, draft: null });
    try {
      const data = await loadSiteData({ token: state.token || undefined });
      patch({
        loading: false,
        data,
        draft: { home: data.home, events: data.events, site: data.site, candles: data.candles },
      });
    } catch (err) {
      patch({ loading: false, error: err.message });
    }
  }

  function updateDraft(partial) {
    patch({ draft: { ...state.draft, ...partial } });
  }

  function handleImageStaged(path, entry) {
    setPendingImages((prev) => ({ ...prev, [path]: entry }));
  }

  if (isCallback) {
    return <Callback onAuthenticated={handleAuthenticated} />;
  }

  if (!state.token && !isDev) {
    return <Login />;
  }

  if (state.error) {
    return (
      <div className="screen screen--centered">
        <div className="card">
          <p className="error" role="alert">
            読み込みに失敗しました: {state.error}
          </p>
          <button type="button" className="btn" onClick={handleReload}>
            再読み込み
          </button>
        </div>
      </div>
    );
  }

  if (state.loading || !state.draft) {
    return (
      <div className="screen screen--centered">
        <p>読み込んでいます…</p>
      </div>
    );
  }

  return (
    <div className={`editor-shell${fullscreenPreview ? " editor-shell--fullscreen-preview" : ""}`}>
      <header className="editor-shell__topbar">
        <p className="editor-shell__brand">teate1122 編集</p>
        {isDev && !state.token && <span className="badge">開発モード・読み取り専用</span>}
        <button
          type="button"
          className="btn btn--ghost btn--small"
          onClick={() => setFullscreenPreview((v) => !v)}
          aria-pressed={fullscreenPreview}
        >
          {fullscreenPreview ? "編集画面に戻る" : "全画面プレビュー"}
        </button>
        {state.login && (
          <button type="button" className="btn btn--ghost btn--small" onClick={handleLogout}>
            ログアウト（{state.login}）
          </button>
        )}
      </header>

      <div className="editor-shell__preview">
        <Preview
          home={state.draft.home}
          site={state.draft.site}
          candles={state.draft.candles}
          events={state.draft.events}
          pendingImages={pendingImages}
          scrollToSectionId={scrollToSectionId}
        />
      </div>

      {!fullscreenPreview && (
        <div className="editor-shell__panel">
          {state.activeTab === "edit" && (
            <EditTab
              home={state.draft.home}
              site={state.draft.site}
              candles={state.draft.candles}
              pendingImages={pendingImages}
              onChange={(home) => updateDraft({ home })}
              onSiteChange={(site) => updateDraft({ site })}
              onCandlesChange={(candles) => updateDraft({ candles })}
              onImageStaged={handleImageStaged}
              onSectionOpen={setScrollToSectionId}
            />
          )}
          {state.activeTab === "dates" && (
            <DatesTab events={state.draft.events} onChange={(events) => updateDraft({ events })} />
          )}
          {state.activeTab === "publish" && (
            <PublishTab
              draft={state.draft}
              rawText={state.data.rawText}
              headSha={state.data.headSha}
              token={state.token}
              pendingImages={pendingImages}
              onPublished={handleReload}
              onReloadRequested={handleReload}
            />
          )}
        </div>
      )}

      {!fullscreenPreview && <TabBar active={state.activeTab} onChange={(activeTab) => patch({ activeTab })} />}
    </div>
  );
}
