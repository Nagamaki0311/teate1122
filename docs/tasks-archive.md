# タスク アーカイブ

`docs/tasks.md` から移した完了済みタスク（T-001〜T-023）。経緯は [progress.md](./progress.md)、判断は [decisions.md](./decisions.md) を参照。

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
| T-023 | バグ修正: ヒーロー本文テキストが中央配置されず左寄りになる | 中 | 完了 | planner/developer/reviewer | Reviewer承認（必須修正なし、`npm test`91件・Playwright実機確認済み、他セクションへの影響もReviewer独自に再スキャンし問題なしを確認）。PR #20をD-022に従いCIグリーン確認後Managerが自動マージ（マージコミット04d2e5e）。原因は`.hero-section__body`（`max-width:24em`）に左右autoマージンがなく、中央配置される親コンテナ内でブロック自体が左端に寄っていたこと。`margin:30px 0 0`→`margin:30px auto 0`の1行修正。D-029参照。 |
