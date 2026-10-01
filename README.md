# teate1122

手作りキャンドルブランド teate1122 のホームページと、その更新用の編集アプリ。

- 公開サイト: https://teate1122-candle.nk-pr.com
- 編集アプリ: https://teate1122-candle.nk-pr.com/editor/ （GitHubでログイン。リポジトリへの書き込み権限が必要）

## 構成

- `src/` — サイト本体。Eleventy（Nunjucks）＋素のCSS（`style.css`）＋素のJS（`site.js`）。新規の依存は追加しない方針。
- `site-data/` — サイトの内容（JSON）。`pages/home.json`（セクション構成と文言）、`site.json`（メタ情報・画像一覧・ナビ）、`candles.json`、`events.json`。編集アプリはこのJSONをGitHub経由でコミットし、Netlifyが自動で再ビルドする。
- `editor/` — 編集アプリ（React＋Vite）。サイトと同じテンプレート・CSS・JSをブラウザ内で描画してライブプレビューする。
- `netlify/functions/` — GitHub OAuthのトークン交換（Client Secretはブラウザに出さない）。
- `scripts/` — ローカル専用の補助（`design-check.mjs`: デザインの機械チェック、`og-image.html`: 共有用画像の生成手順）。CIでは実行しない。
- `docs/` — 開発の記録（下記）。

## コマンド

```
npm ci
npm run dev          # サイト（Eleventy）
npm run dev:editor   # 編集アプリ
npm run build        # editor → eleventy の順にビルド（出力: _site/）
npm test             # 編集アプリのテスト（先に build しておく。プレビューと本番出力の一致テストが _site を使う）
```

## 開発の進め方（AI開発OS）

User → Manager → Planner → Developer → Reviewer → Manager → 完了。詳細は `CLAUDE.md` と `docs/agents.md`。

- `docs/tasks.md` — タスクと状態、バックログ（完了した古いものは `tasks-archive.md`）
- `docs/progress.md` — 作業履歴
- `docs/decisions.md` — 設計判断（D-001〜）
- `docs/agents.md` — Agent構成・コード品質ルール（Ponytail）
- `docs/design/anti-slop.md` — AI-slop（既定の型に寄ったデザイン・文章）の監査基準

## 注意

- 問い合わせフォームはNetlify Forms。`contact-social.njk`のform属性（name/data-netlify/netlify-honeypot/form-name）を変えると届かなくなる。
- 画像は`/editor`から差し替える。ファイル名は`placeholder-*.svg`・`og-image.jpg`（同梱）または`photos/*.webp|jpg`（アップロード）のみ許可（`editor/src/lib/validate.js`）。
