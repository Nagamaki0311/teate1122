# タスク管理

現在のタスク、優先順位、状態を管理する。

## 状態の定義

- `未着手`: まだ着手していない
- `計画中`: plannerによる計画作成中/完了
- `実装中`: developerによる実装中
- `レビュー中`: reviewerによる確認中
- `完了`: 完了条件（CLAUDE.md参照）を満たした

## タスク一覧

| ID | タスク | 優先度 | 状態 | 担当エージェント | 備考 |
|----|--------|--------|------|------------------|------|
| T-001 | 長期開発用AI開発環境の整備（tasks/progress/decisions） | 高 | 完了 | claude | docs配下に3ファイルを作成し、CLAUDE.mdに参照ルールを追加 |
| T-002 | project001を共通AI開発エージェント用テンプレートへ転換 | 高 | 完了 | claude | CLAUDE.mdに「プロジェクトの役割」「トークン効率化ルール」を追加。個別アプリの仕様・コードは保持しない方針を明記（D-002参照） |
| T-003 | ponytail（DietrichGebert/ponytail）のコード品質ルールを導入 | 中 | 完了 | claude | AGENTS.mdの内容をCLAUDE.mdに「コード品質ルール（Ponytail）」として統合（D-003参照） |
| T-004 | AI開発OS化: Manager導入とドキュメント/Agent構成の整理 | 高 | 完了 | claude | CLAUDE.mdを大幅簡潔化し、Manager役割（このセッション自身）を明記。docs/agents.mdを新設しAgent構成とPonytail原則を集約（D-003の内容を移設）（D-004参照） |
| T-005 | SessionStart/PreCompact Hookの導入 | 中 | 完了 | claude | .claude/settings.jsonを新設。tasks.md/progress.mdの自動表示と圧縮前リマインダーを1行shellコマンドで実装（D-005参照） |
| T-006 | AI開発OS全体レビュー（重複排除・Hook環境検証） | 高 | 完了 | claude | CLAUDE.mdのAgent説明重複を除去、Manager-Hook接続を明文化、Hook環境依存性を文書化（D-006参照） |
| T-007 | Agent別モデル最適化（Model Routing）の導入 | 中 | 完了 | claude | Planner=opus/Developer・Reviewer=sonnetに固定。軽量レビューはAgent呼び出し時のmodelパラメータ上書きで対応（D-007参照） |
| T-008 | キャンドルブランド個人ホームページの実装 | 高 | 完了 | developer/reviewer | Astro 5 + Tailwind CSS v4 + Netlify Forms構成で実装（コミット38e4919）。Netlifyへデプロイ済み（https://teate1122.netlify.app ）、表示確認済み。プレースホルダー差し替え等の残タスクはバックログ参照。D-008参照 |
| T-009 | ホームページ構成・ナビゲーション改善（SNS中段移動/ハンバーガーメニュー修正/商品紹介削除・作品紹介への拡張性/情報設計整理/アニメーション追加） | 高 | 完了 | developer/reviewer | 5構成（/about, /activities, /contact, /privacy, /）へ再編。Reviewer承認済み。Manager側でモバイル/デスクトップのスクリーンショット確認（ハンバーガーメニュー正常動作、SNS中段配置、活動セクション全項目表示）済み。D-009参照 |
| T-020 | トップページ集約（1ページサイト化） | 高 | 完了 | planner/developer/reviewer | /about・/activities・/contactの内容を/（トップページ）に統合し、アンカーで遷移する1ページ構成に再編。Reviewer承認済み（必須修正なし、推奨2点は今後のデプロイ後確認事項としてバックログへ）。詳細はD-020参照 |
| T-021a | Claude Designハンドオフ: Phase 0-2（Eleventy移行・新デザイン反映） | 高 | 完了 | planner/developer/reviewer | Reviewer承認済み（必須修正2点＝ワークショップバッジのコントラスト・nav loop.lastの脆弱性は対応・再レビューで解消確認済み）。PR作成・Manager push待ち。推奨事項6点はバックログへ。D-021参照 |
| T-021b | Claude Designハンドオフ: Phase 3（編集アプリ/editor土台） | 高 | 完了 | planner/developer/reviewer | Reviewer承認（必須修正なし）。PR #8をD-022に従いCIグリーン確認後Managerが自動マージ（マージコミット27606f1）。ドメイン切替・OAuth App登録・Netlify環境変数設定（U1〜U4）完了、User実機でログイン確認済み。D-023参照。 |
| T-021c | 編集アプリ Phase 4a: 画像の差し替え機能＋プレビュー精度向上 | 高 | 完了 | planner/developer/reviewer | Reviewer承認（必須修正なし）。書き込みパス制限・構造ガード・バイナリコミット・nunjucks autoescape（XSS対策）・プレビュー忠実性（Eleventy出力とbyte-identical）をReviewerが実機検証済み。D-024参照。マージ待ち。 |
| T-021d | バグ修正: 画像アップロード後、下書きに反映されない（updateDraftの状態更新バグ） | 高 | 完了 | planner/developer/reviewer | Reviewer承認（必須修正なし、Reviewer自身もPlaywrightで再現確認）。PR #14をD-022に従いCIグリーン確認後Managerが自動マージ（マージコミット4efe37e）。D-025参照。 |
| T-021e | バグ修正: 本番トップページのヒーローSCROLLインジケーターが右下端で見切れる | 中 | 完了 | planner/developer/reviewer | Reviewer承認（2回のレビューサイクル、Playwright実機確認）。PR #15をD-022に従いCIグリーン確認後Managerが自動マージ（マージコミットf5cbb74）。D-026参照。ただしUser実機確認の結果、モバイルでは窮屈な配置、デスクトップ相当（スマホの「PC版サイトを見る」モード）では既知の`.mobile-tabs`カスケードバグと絡んで再度崩れることが判明したため、T-021fで対応。 |
| T-021f | バグ修正: ヒーローSCROLL表示を削除（表示形式によらず再発するため） | 中 | 完了 | planner/developer/reviewer | Reviewer承認（必須修正なし、Playwright実機確認）。PR #16をD-022に従いCIグリーン確認後Managerが自動マージ（マージコミットcb87f16）。D-027参照。 |
| T-022 | トップエリア（ヒーロー）背景アニメーション実装（灯火の光の粒子） | 中 | 完了 | planner/developer/reviewer | Reviewer承認（必須修正なし、`npm test`91件・Playwright実機確認済み）。PR #18をD-022に従いCIグリーン確認後Managerが自動マージ（マージコミット8cff36d）。CSS `@keyframes`のみで実装（Canvas/ライブラリ不使用、新規依存なし）。粒子はデスクトップ14個/モバイル8個、`IntersectionObserver`でビューポート外停止、`prefers-reduced-motion`で完全非表示。色味・密度はManager判断で実装後にスクリーンショットをUserへ提示し確認依頼中。D-028参照。 |

## バックログ（未着手・優先度未確定）

- progress.mdが将来肥大化した場合、docs/progress-archive.md等への分割を検討する（D-006時点では未実施・優先度未確定）
- T-008のプレースホルダー差し替え（ブランド名・ロゴ・プロフィール文・写真素材・SNSリンクURL・お問い合わせフォーム送信先メール・astro.config.mjsのsite URL）: 実素材確定後に対応
- Reviewer指摘の推奨事項（Header.astroのモバイルメニュー閉じるボタン・フォーカストラップ）: 優先度低、必要に応じて対応
- T-020 Reviewer推奨事項: netlify.tomlのフラグメント付きリダイレクト（`/about`等→`/#profile`等）の実機（Netlifyデプロイ後）動作確認: 優先度低
- T-020 Reviewer推奨事項: home.jsonのcontact-socialセクション本文がスコープ外の文言変更を含む点の是非確認: 優先度低
- T-021a Reviewer推奨事項（優先度低、マージ非ブロック）: (1) ヒーローの`ttdrift`ゆらぎアニメーション未実装、(2) プロフィール画像等の角丸がHomepage.dc.htmlと2〜4pxずれ、(3) ギャラリータブのARIA構造が不完全（`role=tablist`だが`role=tab`未使用）、(4) `.gitignore`の`.astro/`エントリが不要、(5) イベントのUPCOMING/ARCHIVE振り分けがビルド時刻固定でNetlifyの定期リビルドが別途必要、(6) `a:hover`の`ember`色がAAコントラスト未達（3.3:1、hover状態のため許容範囲内と判断したが記録として残す）
- 実素材（実文章・実写真・香りのラインナップ）差し替え: T-021aでは［仮文］のまま実装。実素材確定後に対応（T-008バックログと同様の扱い）
- **Phase 4b（編集アプリの残り未実装範囲、次回タスクとして着手時にPlannerによる詳細計画が別途必要）**: 見た目タブ（`site-data/site.json`のtheme/nav編集）、受信タブ（お問い合わせフォーム送信内容の閲覧）、PWA化、公開履歴からの復元、`site-data/candles.json`の文言編集（香りの名前・説明文等、画像フィールドはT-021cで編集可能になった）。T-021cで写真差し替え・ライブプレビュー精度向上は実装済み。D-021・D-023・D-024参照。
- **ドメイン切替（teate1122-candle.nk-pr.com）**: 完了。Cloudflareに所有権確認用TXTレコードとCNAME（`teate1122-candle` → `teate1122.netlify.app`、DNS only）を追加し、NetlifyのDomain managementでPrimary domainとして登録、Let's Encrypt証明書を発行済み（2026-09-09）。User側で`https://teate1122-candle.nk-pr.com`の表示を確認済み。
- **T-021b User側作業**: U1〜U4すべて完了済み（OAuth App登録、Netlify環境変数設定、実機ログイン確認）。
- T-021c Reviewer推奨事項（優先度低、マージ非ブロック）: (1) `render.js`の`applyObjectUrls`が`assets/<file>`という文字列を本文中の偶然の一致でも置換しうる（実害は極めて低い、プレビュー表示のみ・コミットデータに影響なし）、(2) プレビューiframeに`sandbox`属性がない（`site.js`実行のため意図的、多層防御として`sandbox="allow-scripts"`を検討の余地）、(3) `ImageField.jsx`のズームrange上限(2)と`validate.js`のバリデーション上限(3)が不一致、(4) `blobToBase64`の大容量入力（チャンク境界をまたぐサイズ）の専用ユニットテストがない（Reviewerが実機で動作確認済みだが回帰防止のテスト追加が望ましい）
- T-021c User側実機確認（推奨、次回`/editor`使用時に）: 写真アップロード→フォーカル/ズーム調整→プレビュー確認→公開の一連の流れ
- T-021e Reviewer発見の既存バグ（本タスクのdiffとは無関係、修正不要・優先度未確定）: `src/style.css:224-228`の`@media (min-width: 820px) { .mobile-tabs { display: none; } }`が、ソース上でより後に書かれた無条件の`.mobile-tabs { display: flex; }`（:250-252）より前に登場するため、CSSカスケードにより1440px幅等のデスクトップでも`.mobile-tabs`が実際には非表示にならず`display:flex`のまま表示され続けている（Reviewerが`getComputedStyle`で実測確認済み）。修正時は非表示指定を`.mobile-tabs`ルールより後ろに移動する、または`.mobile-tabs`のデフォルトを`display:none`にして`max-width:819px`側で`flex`にする等、カスケード順序の入れ替えで対応可能とみられる。
- T-021f Developer発見の既存バグ（本タスクのdiffとは無関係、修正不要・優先度未確定）: 320×568（旧世代の極小ビューポート、例: 初代iPhone SE）で、ヒーロー本文（`.hero-section__body`）と`.mobile-tabs`が約22px重なる。Playwright実測で、T-021f着手前のコード（D-026マージ後の状態）でも同じ重なりが再現することを確認済みのため、SCROLL削除やT-021eの修正とは無関係の既存問題。対応する場合はヒーローの`min-height`計算（`clamp(560px, 90svh, 900px)`の下限560pxが極小ビューポートで効いてしまう点）の見直しが必要とみられる。

## メモ

- 新しいタスクを追加したら、必ず優先度と状態を設定すること。
- タスクの状態が変わったら都度このファイルを更新する（作業完了後にまとめて更新しない）。
- 詳細な作業内容や経緯は [progress.md](./progress.md) を参照。
- 設計上の判断が必要になった場合は [decisions.md](./decisions.md) に記録する。
