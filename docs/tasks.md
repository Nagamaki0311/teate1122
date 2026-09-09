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
| T-021b | Claude Designハンドオフ: Phase 3（編集アプリ/editor土台） | 高 | レビュー中 | developer | npm workspaces＋Vite、Netlify Function（`github-oauth.mjs`、トークン交換＋許可アカウント検証）、GitHub Data API（HEAD sha1本での競合検知、書き込みパス許可リスト`ALLOWED_PATHS`）、編集/日程/公開の3タブ、簡易ライブプレビュー、下書きのlocalStorage自動保存、`node --test`によるユニットテスト（lib配下53件、全件パス）で実装。許可アカウントはNagamaki0311、main直pushで進める（Planner判断、D-023参照）。`npm ci && npm run build`成功、Step1直後の`_site/`と最終ビルドの差分が`editor/`・`robots.txt`追加のみであることを確認済み。CI（`.github/workflows/ci.yml`）を新規追加。マージはD-022に従いReviewer承認＋CIグリーンでManagerが自動実施。実際に機能させるにはOAuth App登録・Netlify環境変数設定等User側作業が別途必要（バックログのU1〜U4参照、完了後にまとめて依頼）。 |

## バックログ（未着手・優先度未確定）

- progress.mdが将来肥大化した場合、docs/progress-archive.md等への分割を検討する（D-006時点では未実施・優先度未確定）
- T-008のプレースホルダー差し替え（ブランド名・ロゴ・プロフィール文・写真素材・SNSリンクURL・お問い合わせフォーム送信先メール・astro.config.mjsのsite URL）: 実素材確定後に対応
- Reviewer指摘の推奨事項（Header.astroのモバイルメニュー閉じるボタン・フォーカストラップ）: 優先度低、必要に応じて対応
- T-020 Reviewer推奨事項: netlify.tomlのフラグメント付きリダイレクト（`/about`等→`/#profile`等）の実機（Netlifyデプロイ後）動作確認: 優先度低
- T-020 Reviewer推奨事項: home.jsonのcontact-socialセクション本文がスコープ外の文言変更を含む点の是非確認: 優先度低
- T-021a Reviewer推奨事項（優先度低、マージ非ブロック）: (1) ヒーローの`ttdrift`ゆらぎアニメーション未実装、(2) プロフィール画像等の角丸がHomepage.dc.htmlと2〜4pxずれ、(3) ギャラリータブのARIA構造が不完全（`role=tablist`だが`role=tab`未使用）、(4) `.gitignore`の`.astro/`エントリが不要、(5) イベントのUPCOMING/ARCHIVE振り分けがビルド時刻固定でNetlifyの定期リビルドが別途必要、(6) `a:hover`の`ember`色がAAコントラスト未達（3.3:1、hover状態のため許容範囲内と判断したが記録として残す）
- 実素材（実文章・実写真・香りのラインナップ）差し替え: T-021aでは［仮文］のまま実装。実素材確定後に対応（T-008バックログと同様の扱い）
- **T-021b Phase 4（編集アプリの未実装範囲、次回タスクとして着手時にPlannerによる詳細計画が別途必要）**: 見た目タブ（`site-data/site.json`のtheme/nav/assets編集）、受信タブ（お問い合わせフォーム送信内容の閲覧）、写真の圧縮/トリミングアップロード、PWA化、公開履歴からの復元、`site-data/candles.json`（香りラインナップ）の編集。D-021・D-023参照。
- **T-021b User側作業（編集アプリを実際に機能させるために必要、実装完了後にまとめて依頼）**:
  - U1: GitHub OAuth Appの登録（Authorization callback URLを`https://<本番ドメイン>/editor/callback`に設定し、Client ID/Client Secretを取得）
  - U2: NetlifyのSite settings > Environment variablesに`GITHUB_OAUTH_CLIENT_ID`・`GITHUB_OAUTH_CLIENT_SECRET`を設定（`EDITOR_ALLOWED_LOGIN`はデフォルト値`Nagamaki0311`のままで良ければ設定不要）
  - U3: 許可アカウント（デフォルト`Nagamaki0311`、変更する場合はU2で`EDITOR_ALLOWED_LOGIN`を設定）が本リポジトリへのpush権限を持つGitHubアカウントであることの確認（実効的なセキュリティ境界であるため、D-023参照）
  - U4: 環境変数設定後の再デプロイ、および実機での動作確認（`/editor`へのアクセス→ログイン→編集→公開の一連のフロー）

## メモ

- 新しいタスクを追加したら、必ず優先度と状態を設定すること。
- タスクの状態が変わったら都度このファイルを更新する（作業完了後にまとめて更新しない）。
- 詳細な作業内容や経緯は [progress.md](./progress.md) を参照。
- 設計上の判断が必要になった場合は [decisions.md](./decisions.md) に記録する。
