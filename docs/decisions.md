# 設計判断記録 (ADR)

設計判断、採用理由、変更履歴を記録する。新しいエントリは末尾に追加する（古い順）。

## 記録フォーマット

```
## D-XXX: タイトル

- 日付: YYYY-MM-DD
- 状態: 採用 / 却下 / 廃止（廃止の場合は後継のDを記載）

### 背景
- なぜこの判断が必要になったか

### 決定
- 何を決定したか

### 理由
- なぜその選択をしたか（検討した代替案があれば併記）

### 影響
- この決定が及ぼす影響、制約
```

---

## D-001: タスク管理をdocs配下のMarkdownファイルで一元管理する

- 日付: 2026-08-03
- 状態: 採用

### 背景
- 長期開発を前提としたAI開発環境として、タスクの状態・作業履歴・設計判断をセッションを跨いで引き継げる仕組みが必要だった。

### 決定
- `docs/tasks.md`（タスク管理）、`docs/progress.md`（作業履歴）、`docs/decisions.md`（設計判断）の3ファイルに役割を分離して記録する。
- `CLAUDE.md` からこれらを参照するルールを明記し、開発フロー（計画・実装・レビュー）の各段階で参照/更新することを必須とする。

### 理由
- 単一ファイルに全情報を詰め込むと肥大化し、目的別の検索性が落ちるため、関心事ごとに分離した。
- 外部のIssue管理ツールを使わず、リポジトリ内のMarkdownで完結させることで、AIエージェントが直接読み書きできるようにした。

### 影響
- 今後のタスク着手時は `tasks.md` の確認・更新が前提となる。
- 作業完了時は `progress.md` への追記が必須となる。
- 設計判断が発生した場合は、都度 `decisions.md` に追記する運用とする。

---

## D-002: project001を個別アプリ開発から共通AI開発エージェント用テンプレートへ転換する

- 日付: 2026-08-02
- 状態: 採用

### 背景
- project001を特定アプリの開発リポジトリとして運用していたが、今後は新規プロジェクトを立ち上げるたびに同じ開発ルール・ドキュメント運用の仕組みを再構築する必要が出てくることが見込まれた。
- 個別アプリの仕様やコードとテンプレートとしての基盤ルールが混在すると、テンプレートとしての再利用性が下がる。

### 決定
- project001の役割を「共通AI開発エージェント用テンプレートリポジトリ」と定義する。
- 個別アプリケーションの仕様・実装コードはこのリポジトリに保持しない。
- 新規プロジェクト作成時は、本リポジトリ（CLAUDE.md + docs/配下の3ファイル）を雛形としてコピーして初期状態とする。
- planner/developer/reviewerによる開発ループ、および `docs/tasks.md` / `docs/progress.md` / `docs/decisions.md` の運用ルールはそのまま維持する。
- あわせて、CLAUDE.mdに「トークン効率化ルール」を新設し、サブエージェントへの調査委任、実装前の方針確認、タスク切替時のコンテキストリセットなど、コンテキストを小さく保つための運用ルールを明記する。

### 理由
- 開発ルール・ドキュメント運用の仕組みは汎用性が高く、個別アプリの実装から切り離すことで、新規プロジェクトの立ち上げコストを下げられる。
- 既存の開発フロー（planner/developer/reviewer）とドキュメント運用（tasks/progress/decisions）は、アプリの種類に依存しない仕組みであるため、そのまま基盤として流用できる。
- トークン効率化ルールは、外部記事（Claude Codeのトークン節約に関する運用術）の知見を踏まえ、テンプレートとして今後利用されるすべてのプロジェクトに恩恵があるため、この段階で組み込むことにした。

### 影響
- 今後、本リポジトリに個別アプリの仕様やコードを追加する作業は行わない。
- 新規プロジェクトを開始する際は、本リポジトリをコピーして雛形として利用する運用に変わる。
- 既存の開発フロー・完了条件・ドキュメント運用ルールには変更がないため、運用面での移行コストは小さい。

---

## D-003: ponytail（DietrichGebert/ponytail）のコード品質ルールをCLAUDE.mdへ統合する

- 日付: 2026-08-03
- 状態: 採用

### 背景
- [DietrichGebert/ponytail](https://github.com/DietrichGebert/ponytail)（MIT License）は、AIコーディングエージェント向けに「不要なコードを書かせない」ための判断ラダーとルールセットを提供するプロジェクトである。
- project001は共通AI開発エージェント用テンプレート（D-002）であり、developer/reviewerが実装・レビュー時に従うコード品質の基準がこれまで明文化されていなかった。

### 決定
- ponytailが提供する `AGENTS.md` のルール（実装前の7段階判断ラダー、削除優先・抽象化最小化などの原則、入力検証やセキュリティ等で手を抜かない対象、`ponytail:` コメントによる意図的な簡略化の明示）を日本語化し、CLAUDE.mdに「コード品質ルール（Ponytail）」として統合する。
- Claude Codeのプラグインマーケットプレイス経由（`/plugin marketplace add` 等）でのインストールは行わない。対話型CLIコマンドでありエージェントから実行できないため、ルール本文をCLAUDE.mdに直接組み込む方式を採用した。
- 導入範囲はproject001リポジトリ自体とする。テンプレートの一部となるため、今後本リポジトリを雛形としてコピーする新規プロジェクトにも自動的に引き継がれる。
- ponytailの `skills/` `commands/` `hooks/` 等のディレクトリ一式はコピーしない。ルール文書の統合のみを行う。

### 理由
- project001は「開発ルールの提供」がリポジトリの目的（Project Role参照）であり、実装フェーズの品質基準としてponytailの思想は既存の開発フロー（planner/developer/reviewer）や完了条件と矛盾しない。
- プラグイン形式でのインストールは対話操作が必須でありエージェントセッションから完結できないため、CLAUDE.mdへのルール統合という確実な方法を選んだ。
- skills/commands等のインフラ一式を持ち込むと、テンプレートの複雑性が増し「トークン効率化ルール」（CLAUDE.mdを簡潔に保つ）と矛盾するため、ルール本文の統合のみに留めた。

### 影響
- developer/reviewerは今後、実装前に判断ラダーを適用し、レビュー時にもこの基準を確認する。
- 本リポジトリを雛形として作成される新規プロジェクトすべてに、このコード品質ルールが引き継がれる。
- `/ponytail-review` 等のponytail提供コマンドは未導入のため、必要になった場合は別途検討する。

---

## D-004: Manager導入とドキュメント/Agent構成をAI開発OSとして整理する

- 日付: 2026-08-03
- 状態: 採用

### 背景
- project001はテンプレートとして長期・複数Agent運用を前提とするが、これまで「誰がタスク状態を管理し、いつ完了と判断するか」が曖昧だった（User→Planner→Developer→Reviewerの間に調整役が不在）。
- CLAUDE.mdは毎セッション自動でロードされるにもかかわらず、D-003で追加したPonytail全文（約80行）を含め273行まで肥大化しており、見出しの`\#`エスケープや行ごとの余分な空行で更に水増しされていた。トークン効率化ルール自体が形骸化していた。
- docsをagents.md等へ拡張する提案があったが、ファイル数を増やすこと自体が目的ではない。

### 決定
- **Manager導入**: `.claude/agents/manager.md`という独立ファイルは作らず、Managerを「このセッション（ルート会話）自身の役割」としてCLAUDE.mdに定義する。責務はタスク管理・Agent割当・優先順位判断・レビュー依頼・完了判定のみとし、コードは直接書かない。
- **開発フロー変更**: User → Manager → Planner → Developer → Reviewer → Manager → Complete。修正ループ（Reviewer検出時はManager経由でDeveloperへ差し戻し）もこのフローに統合。
- **CLAUDE.mdの縮小**: `\#`エスケープと冗長な空行を除去し、Ponytail原則の全文（D-003でCLAUDE.mdに置いていたもの）をdocs/agents.mdへ移設。CLAUDE.mdにはAgent一覧・フロー・参照先のみを残す（273行→約45行）。
- **docs/agents.mdを新設**: Agent構成表、オーケストレーションルール（Manager以外は互いを起動しない等）、Ponytail原則、不採用としたAgent（research/UI）の理由を1ファイルに集約する。architecture.md/project-map.md/known-issues.md/changelog.mdは作成しない。
- **developer.md/reviewer.mdを微修正**: Ponytail原則の参照先をdocs/agents.mdに統一し、reviewerには過剰実装チェックの観点を1行追加。planner.mdは役割に変更がないため無変更。
- **Hookは未実装**: セッション開始時にtasks.md/progress.mdを自動表示するSessionStart Hookを将来の検討事項としてdocs/agents.mdに記録するに留め、今回は追加しない。

### 理由（検討した代替案）
- **Managerを独立subagentにする案は不採用**: Claude Code公式の推奨構成は「ルートセッションがオーケストレーターとして専門subagentに委任する」形であり、subagentが他のsubagentを起動する構成は非公式かつ、tools設定・コンテキスト分離の面で不安定になりやすい。またManagerをsubagent化すると毎回コールドスタートし、会話の文脈（タスク履歴）を失うため、長期運用・トークン効率の両方に反する。ルート会話をManagerとすることで、「Managerだけが起動する」制約が構造的に（技術的に）保証される。
- **research Agentは不採用**: planner.mdのtools（Read/Glob/Grep/WebFetch/WebSearch）が既に現状分析・外部調査を兼ねており、分離すると役割が重複する。
- **UI Agentは不採用**: project001自体にアプリケーションコードがなく、UIレビュー対象が存在しない。必要になるのは個別アプリ側のリポジトリであり、テンプレート側で先取りして追加するのはYAGNIに反する。
- **architecture.md/project-map.md/known-issues.md/changelog.mdは不採用**: architecture.mdやproject-map.mdはアプリ固有の構造を記述するものでproject001自体には対象がなく、空のボイラープレートになる。known-issues.mdはtasks.mdの「レビュー中」状態と、changelog.mdはprogress.mdの作業履歴と役割が重複するため、既存ファイルに統合し新設しない。
- **Hookは提案のみに留めた**: SessionStart Hookは有用だが、設定ファイル(.claude/settings.json)への変更は実行環境に影響するため、必要性が具体的に確認できるまでは追加しない。

### 影響
- 今後、CLAUDE.mdを読むだけでAgent一覧とフローが把握でき、Ponytail原則の詳細やAgent構成の背景はdocs/agents.mdを開いた時だけコストが発生する（毎セッションのトークン消費を削減）。
- develop/reviewerはPonytail原則を単一ファイル（docs/agents.md）からのみ参照するため、今後ponytail側の更新を反映する際も更新箇所が1箇所で済む。
- 本リポジトリを雛形として作成される新規プロジェクトすべてに、この構成（Manager運用・docs/agents.md）が引き継がれる。
- D-003で「CLAUDE.mdに統合」と決定したPonytail原則の格納場所は、本決定によりdocs/agents.mdへ変更された（D-003の決定自体は履歴として維持し、上書きしない）。

---

## D-005: SessionStart/PreCompact HookをPonytail方式で実装する

- 日付: 2026-08-03
- 状態: 採用

### 背景
- D-004で「SessionStart Hookは有用だが確定的な必要性がないため未実装」としていたが、大規模なClaude Code構成リポジトリ（affaan-m/ECC）の実運用調査により、同種のHook（セッション開始時の状態表示、コンテキスト圧縮前の状態保存）が長期運用で有効であることが裏付けられた。
- project001はCLAUDE.mdの運用ルールで「セッション開始時にdocs/progress.md・docs/tasks.mdを確認する」を求めているが、これまで手動確認に依存しており、確認漏れのリスクがあった。

### 決定
- `.claude/settings.json`を新設し、以下2つのHookを追加する。
  - **SessionStart**: `docs/tasks.md`のタスク一覧テーブルと`docs/progress.md`の最新エントリを表示する。
  - **PreCompact**: コンテキスト圧縮前にdocs/progress.md・docs/tasks.mdへの記録を促すリマインダーを表示する。
- 実装はPonytailの判定ラダーに従い、以下を確認した上で採用した。
  1. 必要性: ECCでの実運用による裏付けあり（YAGNIを満たす）。
  2. 既存コードでの代替: なし（初導入）。
  3. 標準ライブラリ: grep/awk/echoという標準shellコマンドのみで実現可能と判断。
  4. ネイティブ機能: Claude Code純正のHook機構（SessionStart/PreCompact）をそのまま利用。
  5. 既存依存関係: 新規依存関係なし。
  6. 1行で書けるか: 両Hookとも`command`フィールド1行（複数コマンドを`;`で連結）で完結させ、専用スクリプトファイルは追加しなかった。
- update-configスキルの手順（既存設定の確認→スキーマ確認→pipe-testによる動作確認→jqによるJSON検証）に従って追加した。

### 理由（検討した代替案）
- **専用スクリプトファイル（`.claude/hooks/*.sh`）は不採用**: 各Hookの処理はgrep/awk 1個ずつの単純な抽出であり、JSON文字列内に直接書いても可読性を大きく損なわない（ダブルクォートを使わずシングルクォートと`[|]`のブラケット表現でエスケープ地獄を回避した）。ファイルを増やすとD-004の「ファイル数を最小限にする」方針と矛盾する。
- **PreCompactでの自動記録（progress.mdへの自動追記）は不採用**: 圧縮前に何を記録すべきかはLLMの判断が必要であり、shellだけでは意味のある要約を生成できない。無理に自動化すると不正確な記録が残るリスクの方が大きいため、人間（Manager）へのリマインダー表示に留めた。
- **PreToolUse/PostToolUse（lint・ビルド連携等）は不採用**: project001自体にアプリケーションコードがなく対象が存在しない。個別アプリのリポジトリ側で必要になった場合はそちらで追加する（docs/agents.md参照）。

### 影響
- セッション開始時の状態確認がHookにより自動化され、「確認し忘れ」による手戻りリスクが下がる。
- `.claude/settings.json`は新規ファイルで、`.claude/`の監視対象が変わるため、初回のみ`/hooks`を開くかセッション再起動でHookが有効化される（Claude Code側の既知の挙動）。
- 本リポジトリを雛形として作成される新規プロジェクトすべてに、このHook構成が引き継がれる。
- docs/agents.mdの「将来の検討事項（未実装）」は本決定により解消され、「Hook構成」として実装済みの内容に置き換えた。

---

## D-006: 全体レビュー（重複排除・Hook環境検証・Manager-Hook接続の明文化）

- 日付: 2026-08-03
- 状態: 採用

### 背景
- project001をAI開発OSとして完成度を高めるため、CLAUDE.md/Agent設計/Hook設計/docs構成/Ponytail適用/トークン効率をユーザー指示に沿って一つずつ再レビューした。
- レビュー中に、CLAUDE.mdのPlanner/Developer/Reviewer各1行説明が、(a) docs/agents.mdのAgent構成表、(b) 各`.claude/agents/*.md`自身のfrontmatter descriptionと三重に重複していることが判明した。これはCLAUDE.md自身に書いた「同じ情報を複数箇所に保存しない」というトークン効率化ルールに反する具体的な違反であり、根本原因（docs/agents.md新設時にCLAUDE.md側の対応する記述を削除し忘れたこと）に対処する必要があった。
- ユーザーから、このセッション（Claude Code on the web）で`/hooks`コマンドが利用できないという報告があり、D-005で導入したHookが実際に機能する環境かどうかの確認が必要になった。

### 決定
- **CLAUDE.mdの重複除去**: Planner/Developer/Reviewerの個別1行説明を削除し、「Agent構成の詳細はdocs/agents.mdを参照」という参照のみに一本化した。Manager自身の責務（コードを書かない等）は、CLAUDE.md＝ルートセッション自身の指示という性質上、参照ではなくこのファイルに残す（自己参照的な行動制約のため）。
- **Manager-Hook接続の明文化**: docs/agents.mdに、SessionStart/PreCompact Hookの出力は常にManager（ルートセッション）のコンテキストにのみ注入され、subagent化されたPlanner/Developer/Reviewerには届かないことを明記した。これはD-004でManagerを独立subagentにしなかった判断を補強する2つ目の技術的根拠である。
- **PreCompactの発火タイミングの訂正**: PreCompact Hookは「Reviewerの後」等の固定ステップではなく、コンテキストサイズに応じて任意のタイミングで発火するイベントであることを明記した（ユーザー提案の直列フロー図をそのまま採用せず、より正確な表現に修正した）。
- **Hook環境依存性の文書化**: `session-start-hook`スキルの情報をもとに、`/hooks`コマンドの不在はUIコマンドの制約であり、Hook実行機構自体（`.claude/settings.json`）はリモート環境（`$CLAUDE_CODE_REMOTE`）でも動作することをdocs/agents.mdに明記した。新規セッションでは自動的に有効化され、既存settings.jsonがない状態で開始した実行中セッションのみ再読み込みが必要という区別を明確化した。
- **CLAUDE.mdへ/compact運用の1文を追加**: 「長時間セッションでは能動的に/compactを使い、PreCompact Hookの案内に従って圧縮前にdocsへ記録する」という運用ルールを追記し、既存のHookと既存のトークン効率化ルールを実際の運用としてつなげた。
- **Agent構成・Hook構成・docs構成は変更なし**: Planner/Developer/Reviewerの3Agent構成、SessionStart/PreCompact 2Hook構成、tasks/progress/decisions/agentsの4docs構成は、いずれも再検証の結果、現状維持が最適と判断した（詳細は理由を参照）。

### 理由（検討した代替案）
- **Manager Agentの独立subagent化は再度不採用**: 今回新たに「Hook出力がsubagentには届かない」という技術的根拠が加わり、D-004の判断がより強く裏付けられた。
- **Stop Hookの追加は不採用**: 応答終了ごとに発火するため、docs更新を促すリマインダーとしては頻度が高すぎ、毎ターンのトークン消費の方が確認漏れ防止のメリットを上回ると判断した。
- **PostToolUse（lint/ビルド連携）は不採用**: project001自体にアプリケーションコードがなく対象が存在しない（D-005から変更なし）。
- **architecture.md/project-map.md/known-issues.md/changelog.mdの追加は再度不採用**: D-004の判断（対象の不在、既存ファイルとの役割重複）から状況の変化がないため据え置いた。
- **progress.mdの分割（アーカイブ化）は今回は不採用**: 現時点でファイルサイズは小さく、必要性が確認できないため実施を見送った。将来ファイルが肥大化した場合の選択肢として認識はしている（docs/tasks.mdのメモ参照）。

### 影響
- CLAUDE.mdはさらに簡潔になり、Agent情報の更新はdocs/agents.mdの1箇所で完結するようになった（今後同種の重複が再発しにくい）。
- Hookの環境依存性が文書化されたことで、他の実行環境（CLI/IDE拡張等）でproject001を使う場合の期待値のズレを防げる。
- 本リポジトリを雛形として作成される新規プロジェクトすべてに、今回の修正が引き継がれる。

---

## D-007: Agent別モデル最適化（Model Routing）を導入する

- 日付: 2026-08-03
- 状態: 採用

### 背景
- Planner/Developer/Reviewerは全て`model: inherit`のままであり、Managerのセッションモデルにそのまま追従していた。Managerが何のモデルで対話しているかによってPlanner等の品質・コストが意図せず変動しうる状態だった。
- 常に最高性能モデルを使うのではなく、役割ごとに必要十分なモデルを割り当てることで、品質を維持しながらコスト・速度を最適化したいという要望があった。

### 決定
- `inherit`をやめ、Agentごとに`model`を固定する。
  - Planner: `opus`（設計品質を最優先。安易な軽量化はしない）
  - Developer: `sonnet`（コーディング用途の標準モデル。品質優先だが常時opusは不要）
  - Reviewer: `sonnet`（既定はコード品質・セキュリティレビューを想定し下げすぎない）
  - Manager: 変更なし（ルートセッション自身のモデルをそのまま使用。`.claude/settings.json`での上書きは行わない）
- Markdown/README/docsの体裁確認など軽量なレビューについては、専用の軽量Agentを新設せず、ManagerがReviewerを起動する際にAgent呼び出しの`model`パラメータで`haiku`等へ一時的に上書きする運用とする。reviewer.md自体（既定モデル）は変更しない。

### 理由（検討した代替案とPonytail判定ラダーの適用）
- **Managerのモデルを`.claude/settings.json`で強制する案は不採用**: ルートセッションはUser自身が選んだ対話モデルであり、project001が上書きすると、このリポジトリでの作業全体（Manager業務に限らない、Userとの雑談的なやり取りも含む）に影響する。Managerの業務内容（判断・割当・状態管理）自体は既存の推論力で十分であり、上書きの必要性が確認できないため見送った。
- **軽量レビュー専用Agent（例: docs-reviewer）の新設は不採用**: Ponytailの判定ラダー（3〜4段目: 標準ライブラリ／ネイティブ機能で足りるか）を適用すると、Claude Code側に既に「Agent呼び出し時のmodelパラメータ上書き」という機能があり、これで要件を満たせる。新規Agentファイルを追加すると、Reviewerとの役割重複（レビューという同じ機能を担うAgentが2つになる）を招くため、既存機能の活用を優先した。
- **Reviewerの既定モデルをhaikuに下げる案は不採用**: project001は不特定多数の個別アプリのテンプレートであり、コピー先では実際のアプリケーションコードに対するセキュリティ・正確性レビューが行われる。テンプレートの既定を下げすぎると、それを継承した個別プロジェクトの品質が下がるリスクがある（「品質が低下すると判断したAgentは現状維持を選択する」という方針に従った）。
- **Developerをopusに引き上げる案は不採用**: Developerの作業は基本的にPlannerが決めた方針に沿った実装であり、Planner ほどの開放的な設計判断は求められない。Sonnetはコーディング用途の標準モデルとして十分な理解力を持つと判断した。
- **Developerの一部処理だけ軽量モデルに分離する案は不採用**: 単一のAgent定義内でタスクの種類ごとにモデルを動的に切り替える仕組みはなく、無理に分離すると新規Agent追加と同じ複雑化を招く。トークン最適化は「軽量モデルへの分割」ではなく「不要なAgent起動を避ける」（Managerの招集判断）で対応する方針とした。

### 影響
- Planner/Developer/Reviewerの品質・コストは、Managerが使用する対話モデルに左右されず安定する。
- 軽量レビューが必要な場面では、Managerが呼び出し時に`model`パラメータを指定するだけで対応でき、Agent定義ファイルやsettings.jsonの追加変更は不要。
- 本リポジトリを雛形として作成される新規プロジェクトすべてに、このモデル構成が引き継がれる。個別プロジェクトでコーディング言語やドメインの複雑さが分かった時点で、Developer/Reviewerのモデルを調整することは妨げない。

---

## D-008: teate1122リポジトリ自体に個別アプリ（キャンドルブランド個人ホームページ）を実装する

- 日付: 2026-08-04
- 状態: 採用

### 背景
- D-002で「本リポジトリ（project001改めteate1122）は共通AI開発エージェント用テンプレートであり、個別アプリの仕様・実装コードは保持しない」と決定していた。
- 今回のIssueは、このteate1122リポジトリ自体に指定ブランチ（`claude/teate1122-homepage-9jsx1l`）でキャンドルブランドの個人ホームページを実装するよう明示的に指示しており、D-002の運用方針と直接衝突する。

### 決定
- teate1122リポジトリは、本Issue以降「テンプレートとしての開発ルール一式」と「個別アプリ（キャンドルブランド個人ホームページ）の実装コード」を同一リポジトリ内に共存させる運用に変更する。
- CLAUDE.md/docs配下の開発ルール・フロー（Manager-Planner-Developer-Reviewer、tasks/progress/decisions運用、Ponytail原則、Model Routing）はそのまま維持し、アプリの実装はsrc/等の新規ディレクトリに追加する。
- 今後別の新規プロジェクトを立ち上げる際は、本リポジトリではなく、D-002が想定していた「雛形としてコピーする」運用を別リポジトリで行う（本リポジトリはteate1122アプリ専用として扱う）。

### 理由
- User（Issue発行者）からの明示的な指示であり、Managerが独断で仕様を変更しない原則（CLAUDE.md「Project Role」）に基づき、Issueの指示を優先する。
- テンプレートとしての価値（開発ルール・ドキュメント運用・Agent構成）はコード実装を追加しても損なわれず、既存の仕組みをそのまま個別アプリ開発に適用できることを承認プロセスで確認済み。

### 影響
- D-002の「個別アプリの仕様・コードは保持しない」という方針は、本リポジトリに関しては本決定により上書きされる（D-002自体は経緯として履歴に残す）。
- 今後本リポジトリを新規プロジェクトの雛形として再利用する場合は、docs/配下の運用ファイルとCLAUDE.mdのみをコピーし、アプリ実装ディレクトリ（src/等）は対象外とする必要がある。

### 追記（2026-08-04）: GitHub Pages自動ビルド失敗への対応
- PR #1マージ後、リポジトリのGitHub Pages機能（Settings > Pages、Jekyllによる自動ビルド）がAstroの`.astro`ファイルのfrontmatter（`---`区切り）をYAML front matterと誤認識し、ビルド失敗（赤いX）が発生した。
- ホスティングはNetlify（本D-008で決定済み）を使用する方針のため、GitHub Pagesは不要と判断。User承認のもとGitHub Pages機能自体を無効化する方針とした（Settings > PagesのSourceを「None」に変更。利用可能なGitHub MCPツールにリポジトリ設定変更手段がなかったため、User本人による手動操作が必要）。

---

## D-009: サイト構成をプロフィール/理念/活動/SNS/お問い合わせの5構成へ再編し、商品紹介を将来の作品紹介向けに再設計する

- 日付: 2026-08-04
- 状態: 採用

### 背景
- 公開後、情報設計・ナビゲーションの改善を求めるIssueが来た。現状7ページ（`/`, `/about`, `/candles`, `/events`, `/gallery`, `/contact`, `/privacy`）は活動内容（キャンドル制作・イベント出店・ワークショップ）を横断的に紹介する構造になっておらず、SNSリンクもFooter/contact.astroに二重定義されていた。
- ハンバーガーメニューに文字重なり等の表示崩れがあり、Reviewer（T-008時点）からも指摘済みだった。原因は`Header.astro`でモバイルメニューが`<header>`の子要素になっており、親の`backdrop-filter`が`fixed`要素の包含ブロックを狭めていたこと。

### 決定
- サイトを5ページ構成（`/`, `/about`（プロフィール+理念）, `/activities`（活動：キャンドル制作/イベント出店/ワークショップ）, `/contact`（フォーム+SNS）, `/privacy`）に再編する。
- `/gallery`は独立ページを廃止し、`/activities`内の「キャンドル制作」セクションに統合する。
- `/candles`（商品紹介）と`candles`コレクションは削除する。将来「作品紹介」を追加する際に流用できるよう、`works`コレクション（`src/content/works/`, `/works`）の命名・想定スキーマ（price等の販売属性を持たない`{title, description, order, image?, year?, tags?}`）だけを設計として確定し、今回は実装しない（YAGNI）。
- SNSは`src/data/social.ts`に一元化し、Footer・SNSセクション・モバイルドロワーが同じデータソースを参照する構造にする。ヘッダーナビ項目には出さず、トップページの「活動」〜「お問い合わせ」間（中段）セクションとドロワー下部にのみ配置する。Instagram（https://www.instagram.com/teate1122）のみを掲載し、将来のSNS追加は配列への追記のみで対応できるようにする。
- ハンバーガーメニューは`<header>`要素の外に移し、`<dialog>` + `showModal()`で実装し直す（ブラウザ標準のフォーカストラップ・Escape対応を活用し、自前実装を避ける）。
- ヒーロー領域にCSSのみのパーティクル（灯りの粒）とゆらぐグロウのアニメーションを追加する。JS/canvasライブラリは使わず、`prefers-reduced-motion`で無効化する。

### 理由（検討した代替案）
- `/gallery`独立維持案も検討したが、Issueの5構成方針とUser承認により統合を採用。将来的に作品紹介が独立ページに育つ場合は`/works`として切り出せるため、情報の二重化を避けられる。
- SNSをヘッダーナビ項目にする案も検討したが、SNSは外部リンク集でありページではないため、中段セクション＋フッターで十分と判断（User承認）。
- パーティクルをtsParticles等のライブラリで実装する案は、バンドルサイズ増とCPU負荷が見た目の効果に見合わないため不採用。CSS `transform`/`opacity`のみのアニメーションで軽量に実現する。

### 影響
- `/candles`, `/events`, `/gallery`への既存リンク・ブックマークは`netlify.toml`のリダイレクト設定で`/activities`の該当セクションへ転送する。
- Content Collectionsは`events`のみとなり、`type: "event" | "workshop"`で種別を区別する（`isPast`は`date`比較による導出に置き換え、手動更新の運用負債を解消）。
- 本リポジトリを雛形として再利用する場合、`src/data/social.ts`のようなデータ駆動パターンは他プロジェクトにも応用可能な設計として参考にできる。

---

## D-020: トップページ集約（1ページサイト化）

- 日付: 2026-08-05
- 状態: 採用

### 背景
- T-009で5ページ構成（`/`, `/about`, `/activities`, `/contact`, `/privacy`）に再編したが、コンテンツ量が少なく複数ページに分割する必要性が薄いというIssueが来た。`/about`・`/activities`・`/contact`の内容を`/`に統合し、アンカーリンクで遷移する1ページサイト（`/privacy`のみ別ページとして残す）へ再編するようUser承認済み。

### 決定
- `site-data/pages/home.json`を12セクション構成（`hero`, `profile`, `philosophy`, `activities`, `candle-making`, `events`, `events-upcoming`, `events-past`, `workshop`, `workshop-upcoming`, `workshop-past`, `contact`）に再編し、about/activities/contactページの詳細版セクションをそのまま統合する。トップページ旧来の概要カード（`activity-cards`による3件要約）は削除する。
- `workshop-past`（過去のワークショップ、`items: []`）は`visible: false`とし、HTML側でも該当`<section>`を出力しない（空見出しを表示しない）。
- `about.html`/`activities.html`/`contact.html`とそれぞれ対応する`site-data/pages/*.json`を削除する。フォーム（`name="contact"`、`id="contact-name"`等）は`index.html`側の1つのみ残し、id重複を避ける。
- `site-data/site.json`の`nav.items`を`pageId`方式から`href`方式（`/#profile`, `/#activities`, `/#contact`）に変更し、`pages`配列を`["home", "privacy"]`に縮小する。
- `netlify.toml`のリダイレクトを`/about`→`/#profile`、`/activities`→`/#activities`、`/contact`→`/#contact`、`/candles`→`/#candle-making`、`/events`→`/#events`、`/gallery`→`/#activities`（301）に統一する。`/gallery`は独立セクションを持たないため活動セクション全体へ誘導する。
- ページタイトル（`<title>`/`og:title`）は`site-data/site.json`の`site.meta.title`（"teate1122 | 心をほどく、灯りのある暮らし"）に統一する（旧来のページ別タイトルを廃止）。

### 理由
- コンテンツ量に対してページ遷移を挟む構成は情報の分断を招くため、1ページ内でスムーズスクロール（既存の`html { scroll-behavior: smooth }`）により全体を把握できる構成の方が閲覧体験に適する。
- `workshop-past`を`visible: false`にする方式は、将来過去実績が増えた際に`true`へ戻すだけで再表示できるため、セクション自体の削除より運用しやすい。

### 影響
- HTML生成スクリプトが存在せず`index.html`はJSONの内容を手動反映した静的ファイルであるため、今後`home.json`を更新する際は`index.html`も手動で追従させる必要がある（既存の運用パターンを踏襲）。
- 外部からの`/about`・`/activities`・`/contact`への既存リンク・ブックマークはNetlifyリダイレクトでアンカー付き`/`へ転送されるため、リンク切れは発生しない。
- ヘッダーナビ（`index.html`・`privacy.html`）のリンク先が`/about`等のパスから`/#profile`等のアンカーに変わるため、`privacy.html`からトップページ内アンカーへ遷移する際は一度`/`への遷移を挟む。

---

## D-021: Claude Designハンドオフの取り込み — Eleventy導入・新デザイン反映・編集アプリ土台の方針確定

- 日付: 2026-09-08
- 状態: 採用

### 背景
- Claude Design（claude.ai/design）でUserが作成したデザインハンドオフバンドル（新ホームページデザイン一式＋編集アプリ「実装仕様書」）を、本リポジトリに反映するIssueが発行された（T-021）。
- Plannerが現状分析を行った結果、以下2点の重要な事実が判明した。
  1. `index.html`/`style.css`は既に`data-section-id`/`data-type`/`data-padding-y`等の属性でJSON駆動を前提とした構造になっており、`site-data/pages/home.json`の`sections[]`と1対1対応している。生成器（テンプレートエンジン）だけが欠けている状態。
  2. Astro 5 + Tailwind v4（T-008で導入）から現在の静的HTML手動同期構成への移行判断が、`docs/decisions.md`（D-009の次がD-020でD-010〜D-019が欠番）にも`docs/progress.md`（最新エントリがT-009で止まっている）にも記録がなく、git履歴もshallow cloneで追跡不能だった。移行理由は不明のまま。

### 決定
1. **Eleventy（`@11ty/eleventy`）を導入し、JSON→HTML自動生成に移行する。** 編集アプリの前提（アプリがJSONをコミット→自動デプロイ→サイトに反映）を満たすには生成器が必須であり（YAGNI判定で「必要」と判断）、Astro復帰（`legacy-astro/`）は現状の1ページ・素CSS構成との乖離が大きく、かつ離脱理由が不明なため不採用とした。依存はEleventy1つのみ。
2. **Astro→静的HTML移行の経緯が不明であるリスクを認識した上で導入を進める。** 緩和策として、Phase 1（Eleventy移行）は「生成結果が現行`index.html`と実質同一（空白差のみ）」を合格条件とし、PRのDeploy Previewでビルド成功・表示確認を経てからmainにマージする運用とする。
3. **データファイルは現行構成（`site-data/site.json` + `site-data/pages/home.json`）を維持し、実装仕様書が指定する`sections.json`/`theme.json`へのリネームは行わない。** 機能上の差がなく、リネームは無駄な差分になるため（Ponytail: 既存実装の再利用優先）。仕様書が新設を求める日程・キャンドルデータは`site-data/events.json`・`site-data/candles.json`として新規追加する。
4. **`legacy-astro/`ディレクトリを削除する**（User承認済み）。現状`netlify.toml`の`publish = "."`によりNetlify上でソースが露出しており、Eleventy移行（`publish = "_site"`）後もリポジトリの整理として削除する。git履歴には残る。
5. **ホームページの新デザイン（配色・7セクション構成・丸みのあるビジュアル言語・Zen Old Mincho/Noto Sans JP・ギャラリー/キャンドル紹介の新設）を反映する。** ヒーローレイアウトは3案（静謐・二段組・帯）のうち**「静謐（全面写真）」をUser承認により採用**。本文コピーはデザインプロトタイプの文言（すべて［仮文］表記）を仮採用する（User承認済み。現行の「心をほどく、灯りのある暮らし」から変更）。
6. **ドメインを`teate1122-candle.nk-pr.com`に今回のフェーズで切り替える**（User承認済み）。CloudflareのDNS（CNAME）設定とNetlifyのカスタムドメイン登録はUser側の手動作業として別途依頼する。GitHub OAuth App登録・Netlify環境変数設定も同様にUser側の手動作業とする（Client Secretはコード・チャット双方に一切含めない）。
7. **編集アプリ（`/editor`）はReact + Vite + GitHub OAuth（Netlify Functionsでトークン交換のみ）+ Git Data APIで構築する。** 今回のセッションでは土台（認証フロー・編集/日程タブ）まで実装し、見た目/受信タブ・写真圧縮・PWA化・履歴復元は後続フェーズ（Phase 4）とする。

### 理由（検討した代替案）
- 自前Nodeスクリプトによる生成（Eleventy不使用）も検討したが、レイアウト継承・パーシャル・複数ページ出力を自作することになり複雑化するため不採用。
- データファイルのリネーム（`sections.json`等への統一）も検討したが、既存の`site-data/site.json`/`home.json`への参照箇所（netlify.toml、docs等）を無駄に書き換えることになるため不採用。

### 影響
- `netlify.toml`の`publish`が`.`から`_site`に変わり、ビルドコマンドが必須になる（ビルド失敗時はサイト更新が止まる）。`.nvmrc`でNodeバージョンを固定し事故を防ぐ。
- 本リポジトリの構造がテンプレート雛形の一部ではなく個別アプリ実装として更に深化する（D-008の延長）。
- OAuthのClient Secret等の機密情報は本リポジトリ・docsのいずれにも記録されず、Netlifyの環境変数としてUserが直接管理する。
- Phase 4（見た目/受信タブ、写真圧縮、PWA化、履歴復元）は本決定の対象外であり、着手時に改めてPlannerによる詳細計画が必要。

---

## D-022: T-021b以降、Reviewer承認＋CIグリーンを条件にManagerがPRを自動マージする

- 日付: 2026-09-09
- 状態: 採用

### 背景
- T-021aのPR #6で、Managerがdraft PR作成後、マージはUserの手動操作（ready for review→即マージ）に頼っていた。
- Userから「出来る限り私が介入しなくても済むように進めて」と明示的な指示があった。

### 決定
- T-021b（編集アプリ土台）以降、以下の条件をすべて満たした場合、**Managerが自らPRをマージする**（Userの手動マージ操作を待たない）。
  1. Reviewerが「mainにコミット・pushしてよい」と明示的に承認していること
  2. 対象PRのCI（Netlifyビルド・チェック）がすべてグリーンであること
  3. マージコンフリクトがないこと
- 破壊的操作（force push、履歴書き換え等）や、GitHub OAuth App登録・Netlify環境変数設定・DNS変更等User本人のアカウント操作が必須な作業は、引き続きUserに依頼する（Managerの権限では代行不可能なため）。
- セキュリティに関わる実装（OAuthフロー、トークンの扱い等）は、Reviewerが特に重点的に確認したうえで承認する運用とする。

### 理由
- CLAUDE.mdの「不明点はUserに確認する」原則は維持しつつ、Userが既に確立された Manager→Planner→Developer→Reviewer のフローを信頼し、マージという最終ステップのみ自動化を求めたため。
- 本リポジトリは個人ブランドサイトであり影響範囲が限定的、かつT-021aで確認した通りReviewerが実際に問題を検出・是正できていることから、マージ自動化のリスクは許容範囲と判断した。

### 影響
- 以降のPRは、Reviewer承認後Managerが即座にマージし、Userへは完了報告のみ行う。
- Userが望めば、この方針はいつでも見直せる（decisions.mdへの追記で対応）。

---

## D-023: 編集アプリ（/editor）土台の実装方針

- 日付: 2026-09-09
- 状態: 採用

### 背景
- T-021b（D-021の7番）として、`/editor`にReact + Vite + GitHub OAuth + Git Data APIによる編集アプリの土台を実装するにあたり、Plannerが確認不要と判断した実装方針を確定した上でDeveloperが実装した。

### 決定
1. **依存管理はnpm workspaces**: root `package.json`に`"workspaces": ["editor"]`を追加し、`npm run build`は`npm run build --workspace=editor && eleventy`の1本にまとめた（Netlifyの`build.command`を変更せずに済む）。`editor/`はreact/react-dom/vite/@vitejs/plugin-reactのみを依存に持つ独立ワークスペースとする。
2. **言語はプレーンJS+JSX**: TypeScriptは導入しない（YAGNI、既存リポジトリもプレーンJS）。
3. **ルーティングはライブラリなし**: `location.pathname.endsWith('/callback')`の1分岐のみで`/editor/callback`とそれ以外を区別する。
4. **状態管理はAppに`useState`1つ**: propsのバケツリレーのみで配下に渡す。Context/Reduxは導入しない。
5. **sha管理はHEADコミットのsha1本のみ**: 各ファイルのshaを個別に保持する（Contents API方式）のではなく、Git Data APIの`base_tree`パラメータにHEADコミットのshaをそのまま渡す（GitHub側がコミットshaをtreeへ解決する挙動を利用）。追跡対象のshaが常に1つで済み、実装・競合検知の両方が単純になる。
6. **読み込みは`Accept: application/vnd.github.raw`でraw取得**: `GET /repos/{o}/{r}/contents/{path}?ref={headSha}`にこのヘッダーを付け、base64デコードなしで生テキストを取得する。
7. **書き込みは`encoding:"utf-8"`でblob作成**: base64エンコードを介さずJSON文字列をそのまま渡す。
8. **OAuthスコープは`public_repo`**: 対象リポジトリがpublicであることを確認済みのため、`repo`より狭い最小権限を採用。
9. **許可アカウント検証は多層防御**: Netlify Function（`netlify/functions/github-oauth.mjs`）がトークン交換後に`GET /user`を呼び、`EDITOR_ALLOWED_LOGIN`環境変数（デフォルト`Nagamaki0311`）と不一致なら403でトークン自体を返さない。クライアント側（`editor/src/lib/auth.js`の`isAllowedLogin`/`exchangeCode`）でも同じ値で再確認する。**ただし実効的なセキュリティ境界はリポジトリへのpush権限であり、この判定はあくまで多層防御である**旨をコード内コメントと本項目に明記する。
10. **Client IDの配布はFunctionのGETレスポンス経由**: `VITE_`環境変数によるビルド時焼き込みは行わない。焼き込み方式だとNetlifyで環境変数を設定した後にサイトの再デプロイが必要になり、User作業が余計に増えるため、実行時にFunctionから取得する方式を採用した。
11. **ライブプレビューはReactによる簡易再現**（`editor/src/ui/Preview.jsx`）: 実サイトのiframeは使わない。iframeは公開済みの内容を表示してしまい下書きの確認にならないため。表示/非表示・並び順・見出し・本文のみを反映する簡易表示とし、iPhone枠等の端末フレームは再現しない。「上半分プレビュー・下半分編集面」という比率のみ`editor/src/App.jsx`のレイアウトで踏襲する。
12. **ローカル開発時のみ認証をスキップする分岐を`App.jsx`に置く**: `import.meta.env.DEV`が真の場合に限り、未ログインでも`loadSiteData`を無トークンで呼び出し読み取り専用モードで表示する（対象リポジトリがpublicなため無認証読み取りが可能）。書き込み（`commitChanges`）は常にトークン必須のままとし、この分岐の対象にしない。Viteの本番ビルドでは`import.meta.env.DEV`が静的に`false`へ置き換わり、esbuildのdead code eliminationにより分岐ごと本番バンドルから消えることを、ビルド後の`grep`で実際に確認した（本文言「開発モード・読み取り専用」が本番バンドルに含まれないことを確認済み）。
13. **書き込み可能パスはハードコードされた許可リスト**: `editor/src/lib/github.js`の`ALLOWED_PATHS`定数（`site-data/pages/home.json`, `site-data/events.json`の2つのみ）に無いパスへの書き込みは、ネットワーク呼び出しを一切行わずに例外を投げて拒否する。`site-data/site.json`・`site-data/candles.json`（見た目/キャンドルタブ、Phase 4）は今回書き込み対象に含めない。
14. **許可GitHubアカウントは`Nagamaki0311`をデフォルト値とする**: `EDITOR_ALLOWED_LOGIN`環境変数で後から変更可能。
15. **mainへの直接pushを採用**: 仕様書通りPRを挟まない。コンフリクト検知（下記16）・公開前バリデーション・書き込みパス制限の3つで安全性を担保する。
16. **競合検知は二重**: (a) `commitChanges`内でコミット直前に`GET .../git/ref/heads/main`を再取得し、`loadSiteData`時のHEAD shaと比較（不一致なら即座に`err.code = "conflict"`で中断し、blob作成前に止める）。(b) `PATCH .../git/refs/heads/main`は`force: false`で送信し、(a)からの間に競合した場合はGitHub自身に拒否させる。
17. **トークンは`sessionStorage`のみに保存**: `localStorage`には保存しない。下書き自動保存関数（`App.jsx`の`saveDraft`/`loadSavedDraft`）は`{home, events}`のみを引数に取る構造にし、トークンを渡す経路自体を作らないことで、実装ミスによる混入を構造的に防ぐ。ビルド後の本番バンドルを`grep`し、`localStorage`呼び出しがトークンに触れていないこと、トークンのstorageキー文字列が`sessionStorage`呼び出し内にのみ現れることを確認済み。
18. **CSRF対策**: `crypto.getRandomValues`で生成したstateを`sessionStorage`に保存し、認可URLの`state`パラメータへ付与。`/editor/callback`で照合し、一致・不一致・欠落いずれの場合も直後に削除する（ワンタイム）。不一致・欠落時はcodeをFunctionへ送信せずエラー表示のみ行う。
19. **公開前バリデーション**（`editor/src/lib/validate.js`）: sections配列であること、id重複なし、type既知7種（hero/text/image-text/candle-grid/events/gallery/contact-social、`src/_includes/sections/*.njk`と1対1）のいずれか、visibleがboolean、見出し非空（hero/textは配列全体が空でないこと、他は文字列が空でないこと）。events側はid重複なし、kind∈{event,workshop}、date形式＋実在日（`Date.UTC`で正規化後に構成要素を突き合わせ、2月30日等を検出）、title非空。1件でも失敗した場合は`commitChanges`（コミットAPI呼び出し）を一切行わない構造とした（`PublishTab.jsx`の`canPublish`条件）。
20. **heading型の揺れをそのまま維持**: `site-data/pages/home.json`の`heading`は現状hero/textのみ配列（複数行）、他の5タイプは文字列という型の混在を編集アプリ側でも踏襲する（`schema.js`の`MULTILINE_HEADING_TYPES`）。統一（全て配列化・全て文字列化）は行わない。既存テンプレート（`.njk`）側の`| lines`フィルタ・素の`{{ heading }}`出力を変更しない前提のため。

### 理由（検討した代替案）
- Contents APIで各ファイルのshaを個別管理する方式も検討したが、ファイルが増えるたびに管理対象のshaが増え、コンフリクト判定も複雑化する。Git Data APIでHEADコミットのsha1本に集約する方が、今回の対象ファイル数（2ファイル）に対してシンプルで、将来ファイルが増えても変わらない。
- `VITE_GITHUB_CLIENT_ID`のようなビルド時環境変数での配布も検討したが、Client ID変更のたびに再デプロイが必要になりUser作業が増えるため、実行時配布（Function経由）を優先した。
- 実サイトのiframeをライブプレビューにする案は、下書き（未コミット）の内容を確認する目的に合わないため不採用。

### 影響
- `editor/`ディレクトリ、`netlify/functions/github-oauth.mjs`が新規リポジトリ構成に加わる。`netlify.toml`に`[functions]`設定と`/editor/*`のSPAフォールバック（status 200、force未指定）を追加した。
- `robots.txt`（`src/robots.txt`、passthrough copy）と`editor/index.html`の`<meta name="robots" content="noindex, nofollow">`により`/editor`を検索エンジンから除外する。
- 実際に機能させるには、GitHub OAuth App登録・Netlify環境変数（`GITHUB_OAUTH_CLIENT_ID`, `GITHUB_OAUTH_CLIENT_SECRET`, 任意で`EDITOR_ALLOWED_LOGIN`）設定というUser側の手動作業が別途必要（`docs/tasks.md`のU1〜U4参照）。
- 見た目タブ（`site-data/site.json`編集）・受信タブ・写真の圧縮/トリミング・PWA化・履歴からの復元・`site-data/candles.json`編集はPhase 4として今回のスコープから明示的に除外した。着手時はPlannerによる詳細計画が別途必要。

---

## D-025: バグ修正 — 編集アプリでdraft更新がstale closureにより一部消える問題（T-021d）

- 日付: 2026-09-09
- 状態: 採用

### 背景
- Userから「編集アプリで写真をアップロードしても、『未公開の写真』バッジは増えるのに、プレビューにも実データにも反映されない」との報告があった。ManagerがPlaywrightヘッドレスブラウザで実際にファイル選択→アップロードを行い再現・特定した。

### 根本原因
- `editor/src/App.jsx`の`updateDraft(partial)`が`patch({ draft: { ...state.draft, ...partial } })`という実装になっていた。`patch`自体は`setState`の関数形（`setState((s) => ({...s, ...partial}))`）を使っているが、`updateDraft`に渡す`partial`（`{draft: {...}}`という値）は、`updateDraft`が呼ばれた瞬間に、その関数が閉じ込めているレンダー時点の`state.draft`（stale closure）を基に**既に確定した値**として組み立てられてしまっていた。
- `editor/src/ui/SectionSheet.jsx`の複数のハンドラ（`handleUpload`: `onHomeChange`→`onSiteChange`→`onCandlesChange`、`handleFocalZoom`: `onHomeChange`→`onCandlesChange`、`handleAlt`: `onHomeChange`→`onSiteChange`）は、1回のユーザー操作に対して`updateDraft`相当の呼び出しを同一の同期処理内で複数回連続して行う。これらはいずれも同じ古い`state.draft`を基準に新しいdraft全体を組み立てて`patch`に渡すため、Reactが順番にそれらを適用しても、後から適用される呼び出しほど、それより前の呼び出しによる変更を（同じ古いdraftをベースにしているため）打ち消してしまう。結果として、最後に呼ばれたハンドラの変更だけが残り、それより前の呼び出しの変更は消えていた。
- 画像アップロードの場合は`onHomeChange`（画像参照更新）と`onSiteChange`（`assets[]`更新）が`onCandlesChange`（多くの場合実質的な変更なし）に上書きされて消えるため、「バッジは増えるがプレビュー・実データには反映されない」という症状として現れていた。

### 決定
- `updateDraft`を`setState`の関数形に変更し、常に直前の（in-flightの）draftを基準に合成するようにした: `setState((s) => ({ ...s, draft: composeDraft(s.draft, partial) }))`。これにより、呼び出し元がどんな順序・タイミングで連続呼び出しをしても、Reactが各更新を正しく順番に合成できる。1箇所の修正で、画像アップロード・フォーカル/ズームドラッグ・代替テキスト編集の全ての連続呼び出しパターンが同時に直る。
- 合成ロジック自体（`{ ...prevDraft, ...partial }`の1行）を`editor/src/lib/draft.js`という素の`.js`モジュールに`composeDraft`として切り出した。理由: `App.jsx`はJSXファイルであり、このリポジトリの`node --test`ベースのテストインフラ（トランスパイル未設定）から直接importできない（`Unknown file extension ".jsx"`）。既存の`editor/lib/*.js`と同じ構成に合わせ、新規テストフレームワーク（React Testing Library等）を導入せずに回帰テストを追加するため、ロジック部分だけを素のJSへ切り出した。
- 回帰テストは`editor/test/draft.test.js`に追加した（既存の`node --test`インフラのみを使用、新規依存なし）。`composeDraft`は1行の純粋関数のため、それ単体のテストではReactの`setState`関数形という性質そのものは検証できない。そのため、(1) 単発の合成が正しいこと、(2) 複数のpartialを直前の結果へ順に折り畳んだ場合に全フィールドが保持されること（修正後の`updateDraft`が実際に行う処理と同型）、(3) 逆に全てのpartialを同一の古いdraftに対して合成した場合に最後の呼び出し以外が消えること（修正前の`updateDraft`が実際に起こしていたバグの再現）、の3点を検証している。
- 実機確認: `npm run dev --workspace editor`でdevサーバーを起動し、Playwrightで`/editor/`のhero画像アップロードを実施。修正前（`editor/src/App.jsx`のみ一時的に`git stash`で退避）は「未公開の写真 1件」のバッジは表示されるが、ImageFieldプレビュー・メインプレビューiframeとも`<img src>`が`assets/hero.svg`のまま10秒待っても変化せずタイムアウト（バグ再現）。修正後（`git stash pop`で復元）は両方の`<img src>`が新しいアップロード画像のblob URL（同一URL）に変化することを確認した。

### 影響
- `editor/src/App.jsx`の`updateDraft`のみ変更（呼び出し元のシグネチャ・インターフェースは変更なし）。
- `editor/src/lib/draft.js`（新規、`composeDraft`のみ）・`editor/test/draft.test.js`（新規、3件）を追加。
- `editor/src/ui/SectionSheet.jsx`・`EditTab.jsx`他は変更していない。呼び出し元パターン自体（複数フィールドを連続して更新すること）は変更せず、共有関数（`updateDraft`）側を一度だけ直す方針とした（Ponytail: バグ修正は根本原因に対して、同じ関数の全呼び出し元を確認した上で共有関数側を一度だけ直す）。

### 教訓（同種のバグを防ぐための一般的な注意）
- Reactで複数の`setState`相当の更新を同一の同期ハンドラ内で連続して呼び出す場合、更新関数が「呼び出し時点でクロージャに閉じ込めたstateの値」から新しい値を組み立てて渡すパターン（`fn(partial)` → `partial`が呼び出し時点で確定済みの値）は、たとえ内部で`setState`の関数形を使っていても、外側の`partial`自体が古いstateを基に組み立てられていればstale closure問題を再現する。安全にするには、更新関数自身が`setState`の関数形の**内側**で最新state（コールバック引数）を基準に合成を行う必要がある（`patch(partial)`のような汎用マージ関数に頼らず、`updateDraft`のように専用の関数形を書く）。

---

## D-024: 編集アプリ（/editor）への画像差し替え機能＋ライブプレビュー精度向上の実装方針

- 日付: 2026-09-09
- 状態: 採用

### 背景
- T-021c（D-021の7番の続き、D-023 Phase 4の一部）として、Plannerが調査・設計した詳細計画に基づきDeveloperが実装した。トリミング方式（フォーカルポイント+ズーム、矩形クロップなし）・画像配置（`src/assets/photos/`）・書き込み許可の拡張・ライブプレビュー刷新（ブラウザ内nunjucks）はPlanner側で確認不要と判断し決定済みだった（計画書1章）。本項目はその決定内容をそのまま採用した記録である。

### 決定（Planner確定分。1-1〜1-10として計画書に記載されたもの）
1. トリミングUIはフォーカルポイント＋ズームのみ。矩形クロップツールは作らない（`src/style.css`が`object-position`/`transform:scale`しか解釈しないため）。
2. 画像は`src/assets/photos/`に格納。ファイル名は`<セクションid>-<YYYYMMDD>-<連番>.webp`（WebP不可環境は`.jpg`）。
3. `site.json`の`assets[]`は新規エントリを追加せず、既存エントリの`file`/`w`/`h`/`alt`をin-place更新する。
4. 差し替え前の古い画像ファイルは削除しない（データ損失リスク回避を優先）。手動整理が必要になった場合はUserが別途GitHub上で削除する。
5. `site-data/candles.json`を書き込み対象に追加する。画像フィールド（`image`）のみ編集可能とし、文言編集タブは作らない。
6. ギャラリー8枚にも`focal`/`zoom`を導入する（`src/_includes/sections/gallery.njk`・`src/style.css`・`site-data/pages/home.json`に追加、画像編集UIは1コンポーネント`ImageField.jsx`に統一）。
7. WebP非対応環境（Safari等）ではJPEGへ自動フォールバックする。許可ファイル名の正規表現は`.webp|.jpg`の2種のみ。
8. ドラッグ＆ドロップを実装する（`<input type="file">`と同じ処理経路を共有）。
9. 画像（Blob）はlocalStorageの下書きに保存しない。代わりに公開前バリデーションで「参照切れ検出」（`assets[].file`が既知の既存ファイルにも保留中アップロードにも一致しない場合はエラー）を行い、再読み込みで消えた未公開画像を参照したままの公開をブロックする。
10. プレビューは実`.njk`＋実`style.css`＋実`site.js`をブラウザ内nunjucksで描画してsrcDoc iframeに流し込む方式にする（Reactによる簡易再現の拡張でも、Netlify Function経由のEleventy実行でもない）。

### 決定（実装時にDeveloperが判断した事項）
11. **書き込み許可パスの構造**: `editor/src/lib/github.js`の`ALLOWED_PATHS`（固定4ファイル: home.json/events.json/site.json/candles.json）に加え、`isAllowedPath(path)`関数を新設し、`src/assets/photos/`配下は正規表現`/^[a-z0-9][a-z0-9-]*\.(webp|jpg)$/`でファイル名のみを許可する（`/`・`.`・`..`・大文字を構造的に排除）。`commitChanges`は`ALLOWED_PATHS.includes`ではなく`isAllowedPath`を呼ぶよう変更した。D-023の意図（アプリのバグや細工されたdraftが任意ファイルを壊すのを防ぐ）は、固定パスに加えて「生成されるパスの形」を正規表現で縛ることで維持している。
12. **site.json/candles.jsonの構造ガードは`changes.js`（`computeChanges`）に実装し、例外を投げる方式にした**。`site.json`は`assets`以外のキーが元と一致すること、`candles.json`は各エントリの`image`以外のフィールド（および配列の長さ・id順）が元と一致することを`JSON.stringify`の差分比較で検証する。違反時は`computeChanges`が例外を投げ、`PublishTab.jsx`がそれをキャッチして公開不可の状態として表示する（ネットワーク呼び出しは一切発生しない）。これは`isAllowedPath`（ファイルパス単位の防御）とは別の層で、「許可されたファイルの中でも許可されたフィールドしか書けない」という第2の防御線になる。
13. **バイナリのコミットは`files[]`要素に`encoding`フィールドを追加するだけの最小変更**にした（`encoding`省略時は従来通り`"utf-8"`）。tree/commit/ref更新の既存フローは無変更。
14. **base64化は`Blob.arrayBuffer()` + チャンク分割`btoa()`を採用し、計画書が明示した`FileReader.readAsDataURL`は採用しなかった**。理由: `FileReader`はブラウザ専用APIで、Node（`editor/test/changes.test.js`）から`blobToBase64`を直接テストできない。`Blob.arrayBuffer()`と`btoa`はNode 18+にも標準搭載されており（本リポジトリの`.nvmrc`はNode 22）、ブラウザ・Node両方で同一実装が動く。計画が懸念していた「`btoa`+配列スプレッドによるスタック上限リスク」は素の`btoa(String.fromCharCode(...bytes))`を避け、32KBチャンクに分割して`String.fromCharCode.apply`することで同様に回避しており、当初の意図は損なっていない。
15. **ライブプレビューのnunjucks読み込みは、計画書が想定した「ブラウザビルドのバンドル失敗時はNode版フォールバック」の判断分岐が不要だった**。`node_modules/nunjucks/package.json`に`"browser": "./browser/nunjucks.js"`フィールドが存在し、Viteはクライアントビルド時にこれを自動的に解決するため、`import nunjucks from "nunjucks"`という素のインポートだけで、Node実行時（`editor/test/render.test.js`）は`fs`/`path`を使うNode版（`index.js`）が、Viteビルド時（`editor/src/ui/Preview.jsx`）はブラウザ版（`browser/nunjucks.js`、自己完結ビルドで`fs`/`path`を参照しない）が、それぞれ自動的に選択されることを確認した（`npm run build`が成功し、`editor/dist`のJSバンドルにnunjucksが同梱されることを確認済み）。計画書§3-2の「重要な判断ポイント」（縮退案＝Reactの簡易再現拡張）を検討する必要はなかった。`editor/package.json`の依存は素の`"nunjucks": "^3.2.4"`のみで、明示的な`nunjucks/browser/nunjucks.min.js`直接指定は不要だった。
16. **プレビューはbase.njk/セクション`.njk`をそのままレンダリングし、`src/index.njk`自体はレンダリングしない**。`index.njk`はEleventyのYAML front matter（`layout: base.njk`）を含みnunjucks単体では解釈できないため、`editor/src/lib/render.js`の`renderContentHtml`が`index.njk`の`{% for section in home.sections %}...{% include %}`ループをJSで再実装し、結果を`content`として`base.njk`に渡す。ループ本体（テンプレート選択・`showId`変数・フィルタ）は複製しているが、各セクションの見た目を生成する`.njk`ファイル自体は一切複製していない（Ponytail: マークアップの単一情報源はテンプレート側に残す）。
17. **`findAsset`/`pct`/`lines`の3フィルタは`eleventy.config.js`と`editor/src/lib/render.js`の両方に1行ずつ重複定義した**。共有モジュール化も検討したが、Eleventy設定（Node専用、`eleventyConfig.addFilter`前提）と本ファイル（Node/ブラウザ両対応が必要）を1つの抽象化にまとめるコストが、3行のコード重複を正当化しないと判断した（Ponytail: 些細なコードの重複を避けるための抽象化を追加しない）。
18. **`src/_data/derive-events.js`への切り出し**は計画通り実施し、`src/_data/events.js`（Eleventy）と`editor/src/lib/render.js`（プレビュー、`editor/src/lib`から`../../../src/_data/derive-events.js`への相対importでリポジトリ横断参照）の両方が同一実装を参照する。
19. **画像アップロード確定時、フォーカルポイントは`[0.5, 0.5]`・ズームは`1`にリセットする**（`schema.js`の`applyUploadedImage`）。計画書に明記はなかったが、「差し替え前の画像に対して調整していたフォーカルポイントが、差し替え後の別構図の写真にそのまま適用される」方が実害が大きいと判断し、常識的な既定値として採用した。ユーザーは同じ`ImageField`でその場から再調整できる。
20. **ImageFieldの表示比率（アスペクト比）は近似値**を採用した。hero（実サイトはビューポート依存の全面写真、`min-height: clamp(560px, 90svh, 900px)`）は編集枠として`16 / 9`を代表値とする（実際の表示比率を厳密に再現するものではない）。image-text（`3 / 4`）・candle-grid（`1 / 1`）・gallery（各itemの`ratio`）は`src/style.css`の実際のCSSと一致させた。
21. **プレビュー忠実性の実測結果**: `editor/src/lib/render.js`の`renderContentHtml`が生成するHTMLと、`npx eleventy`が生成した`_site/index.html`の`<main id="top">...</main>`内側を、空白正規化（連続空白を1つに圧縮＋前後trim）した上で比較したところ、**完全一致**（正規化後の文字数: 両者とも11532文字）を確認した（`editor/test/render.test.js`の自動テストに加え、手動でも同内容のnodeワンライナーを実行して確認）。

### 理由（検討した代替案）
- 矩形クロップUI（クライアント側でクロップ座標を計算しCSS `object-fit: cover`以外の方式で描画する）も検討したが、実サイトのCSSがフォーカルポイント方式のみに対応しており、対応するには`src/style.css`と全`.njk`テンプレートの変更が必要になり影響範囲が過大なため不採用（計画書決定1）。
- 画像バイナリをGitHub Contents API（単一ファイルPUT）で都度コミットする案も検討したが、D-023で確立したGit Data API単一コミット方式（HEAD sha 1本を追跡）にJSON変更と画像変更をまとめて載せる方が、コミット粒度・競合検知の一貫性の面で優れるため、既存の`commitChanges`を拡張する方式を維持した。

### 影響
- `editor/package.json`に依存関係`nunjucks`が追加され、`editor/dist`のJSバンドルサイズが約108KB（gzip）増加した（プレビューの精度と引き換えの妥当なコストと判断）。
- `site-data/pages/home.json`のgallery `items[]`各要素に`focal`/`zoom`が追加され、`src/_includes/sections/gallery.njk`・`src/style.css`が変更された。ビルド後の`_site/index.html`の差分はgalleryの`<img>`要素への`style`属性追加のみであることを確認済み（既存ページの見た目には影響しない、`--focal-x:50.0%;--focal-y:50.0%;--zoom:1`が全画像のデフォルト値のため）。
- `editor/src/lib/github.js`の`ALLOWED_PATHS`が2件から4件に拡張され、加えて`isAllowedPath`により`src/assets/photos/`配下への書き込みが新たに可能になった。これによりD-023時点の「書き込み可能パスはハードコードされた許可リストのみ」という前提は「固定リスト＋正規表現で縛られた1ディレクトリ」に更新された（D-023の項目13を本項目11・12で上書きする）。
- `editor/src/lib/changes.js`の`computeChanges`が例外を投げるようになったため、`PublishTab.jsx`は`useMemo`内で`try/catch`する構造に変更されている（呼び出し側が変更を意識する必要がある）。
- Phase 4の残り（見た目タブ・受信タブ・PWA化・履歴からの復元・candles.jsonの文言編集）は引き続き対象外。着手時は改めてPlannerによる詳細計画が必要（D-023の記載を維持）。

---

## D-026: T-021e、ヒーローSCROLLインジケーターが右下端で見切れる原因と修正

- 日付: 2026-09-10
- 状態: 採用

### 背景
- User実機報告（スマホでトップページを見た際、「hero image placeholder　SCROLL」が横に並び、SCROLLインジケーターが画面右下端付近で見切れている）を受け、DeveloperがPlaywright（Chromium、`--ignore-certificate-errors`）でモバイル相当ビューポート（390×844 / 375×667 / 412×915 / 360×640）に対し`npm run build`後の`_site`をローカル配信して再現検証を行った。

### 原因（実測で特定。2つが重なって発生していた）
1. **主因（"見切れる"の直接原因）**: `.hero-section__scroll`は`position:absolute; bottom:26px`で、ヒーロー自身の下端を基準に配置される。一方`.mobile-tabs`（画面下部固定のモバイルナビ、`max-width:819px`で表示、実測高さ約71.5px）は`position:fixed; bottom:0`でビューポート下端に常時重なる。ヒーローの高さは`min-height:clamp(560px, 90svh, 900px)`とビューポート高さのほぼ全体を占めるよう設計されているため、ヒーロー下端（＝SCROLLインジケーターの位置）が`.mobile-tabs`の高さの範囲内でビューポート下端に接近し、SCROLLの縦線（`.hero-section__scroll-line`、高さ40px）の下側約30〜40pxが`.mobile-tabs`の背景（半透明+blur）の下に隠れて見えなくなっていた。`main`要素には`padding-bottom: calc(56px + env(safe-area-inset-bottom))`で`.mobile-tabs`分のクリアランスが既に確保されていたが、ヒーロー内の絶対配置要素にはこのクリアランスが及んでいなかった。
2. **副因（視覚的な違和感を増幅）**: プレースホルダー画像`src/assets/hero.svg`に焼き込まれた"hero image placeholder"の文字（旧`y="1300"`＝1440四方の90.3%の高さ、画像下端付近）が、`object-fit:cover`・`object-position:50% 40%`の下でSCROLLインジケーターとほぼ同じ高さの帯に表示され、「hero image placeholder　SCROLL」が横に並んで見える状態になっていた。Userのスクリーンショットで見えていた文字列はこの2つの独立した要素が同じ帯域に来ていたことによる。

### 決定・修正内容
1. `src/style.css`の`.hero-section`に`@media (max-width: 819px)`（`.mobile-tabs`の表示条件と同一）を追加し、`min-height`を`calc(clamp(560px, 90svh, 900px) - 56px - env(safe-area-inset-bottom))`に変更した。`main`が既に使っている「56px + セーフエリア」という数値をヒーロー側でも再利用しているだけであり、`main`の`padding-bottom`とヒーローの`min-height`調整の間に機能的な結びつき（例えばヒーロー直後の要素の配置に`main`の`padding-bottom`が効いている、といった関係）は無い。ヒーロー自身がこの値の分だけ単独でビューポート下端から後退する設計であり、後退した結果としてヒーロー内部の相対位置関係を保ったまま本文テキスト・SCROLLインジケーターが一括して`.mobile-tabs`の高さの外へ押し上げられる。
2. `src/assets/hero.svg`の`<text>`要素の`y`座標を最終的に`1300`→`250`に変更し、プレースホルダー文字を円形グラデーション（`cy=620 r=260`、上端`y=360`）および見出しテキストが表示される帯（後述の実測で判明）のいずれとも重ならない、画像上部の余白（`y=200〜300`付近）に配置した。この過程で一度`y=720`（画像の垂直中央、円の中心と同じ高さ）を採用したが、Reviewerが`npm run build`後の`_site`をPlaywrightで複数ビューポート実機確認したところ、`y=720`は全ビューポート（1440×900のデスクトップ含む）で見出し「灯りは、手当て。」・「CANDLE . WORKSHOP . MARKET」と直接重なるという新規バグを生んでいることが判明し、必須修正として`y=250`へ再調整した（詳細は下記「プレースホルダーSVG再修正（レビュー指摘対応）」参照）。

### 検討した代替案とその却下理由
- 当初、`.hero-section__scroll`単体に`bottom: calc(80px + env(safe-area-inset-bottom))`を追加する案を先に実装したが、Playwrightで375×667（iPhone SE相当）を検証したところ、SCROLLインジケーターの縦線のバウンディングボックスが本文段落（`.hero-section__body`）最終行のバウンディングボックスと1〜5px（line-heightの空白部分のみ）重なることを確認した。ただし、この境界ボックス上の微小な重なりは本diffの修正前（ベースライン）から変化しておらず、視覚的な隙間も保たれている（元々存在していたものであり、この却下した代替案によって新たに生じたものではない）。この代替案を却下した実際の理由は、`.hero-section`自体の高さを縮める方式（採用案）の方が、ヒーロー内の全要素の相対位置関係を変えずに済み、シンプルで副作用の見通しが立てやすいためである。

### プレースホルダーSVG再修正（レビュー指摘対応）
- Reviewerが`npm run build`後の`_site`をローカル配信し、Playwright（Chromium、`--ignore-certificate-errors`）で390×844 / 375×667 / 412×915 / 1440×900の各ビューポートをスクリーンショット確認した結果、上記`y=720`案が全ビューポートで見出しテキストと重なる新規バグを指摘した。
- Developerが同じ4ビューポートで`.hero-section__img`・`.hero-section__heading`・`.hero-section__body`・`.hero-section__scroll`のバウンディングボックスをPlaywrightで実測し、`object-fit:cover; object-position:50% 40%`の変換式（`naturalWidth=naturalHeight=1440`の正方形画像）を用いて画面座標をSVG側の画像空間座標（0〜1440）へ逆算した。
  - モバイル（縦長）幅では画像は常に高さ方向にクロップされず全体（y=0〜1440）が表示される。最も条件が厳しい375×667でも見出し上端は画像空間でy≈641から始まる。
  - デスクトップ1440×900（横長）では画像は横方向基準でスケールされ、`object-position-y:40%`により可視範囲は画像空間でy≈252〜1062に限られる（それ以外は表示されない）。可視範囲内で見出し上端はy≈619から始まる。
  - 円形グラデーションは画像空間でy=360〜880を占める。
  - 以上より、y<360（円の上端より上）かつデスクトップ可視範囲の開始点y≈252より上（＝デスクトップでは表示されず、モバイルでも見出しよりはるか上）であるy=200〜300の帯であれば、いずれのビューポートでも見出し・SCROLLと重ならないと判断し、中間値`y=250`を採用した。
- `y=250`変更後、`npm run build`→ローカル配信→Playwrightで同4ビューポートのスクリーンショットを再取得し、「hero image placeholder」の文字が見出しテキスト（「灯りは、手当て。」「CANDLE . WORKSHOP . MARKET」）ともSCROLLインジケーターとも重ならないことを目視で確認した（円形グラデーションとも重ならない）。

### 検証方法
- Playwright（Chromium、モバイルcontext）で390×844・375×667・412×915・360×640の4ビューポートについて、修正前後で`.hero-section__scroll`と`.mobile-tabs`のバウンディングボックスが重ならないこと（`overlapTabs: false`）をスクリーンショットで目視確認した。`.hero-section__body`との境界ボックス上の微小な重なり（1〜5px、line-heightの空白のみ）は前述のとおり修正前後で変化のないベースラインの挙動であり、スクリーンショット上は本文とSCROLLの間に明確な隙間があることも確認した。
- `.mobile-tabs`のCSSには`@media (min-width: 820px) { .mobile-tabs { display: none; } }`という非表示指定があるが、これがソース上でより後に書かれた無条件の`.mobile-tabs { display: flex; }`より前に登場するため、CSSカスケードにより実際には1440px幅等のデスクトップでも`.mobile-tabs`は非表示になっていない（既存の別バグ、本diffの変更起因ではない。バックログに追加済み、下記「影響」も参照）。ただし本diffで新設した`.hero-section`側の`max-width:819px`メディアクエリ自体はこの幅（1440px）には適用されないため、ヒーロー高さは修正前と同じ（`clamp(560px, 90svh, 900px)`どおり810px）であり、この既存バグの影響は受けない。
- プレースホルダーSVGの位置については上記「プレースホルダーSVG再修正（レビュー指摘対応）」のとおりPlaywrightで実測・スクリーンショット確認した。
- `npm run build`が成功することを確認済み。

### 影響
- モバイル幅（`max-width:819px`）でのみヒーローの実効高さが最大56px（+セーフエリア分）縮む。デスクトップ幅（`min-width:820px`）では本diffが新設したメディアクエリ自体は適用されないため、ヒーロー高さへの影響はない。なお、デスクトップ幅で`.mobile-tabs`が画面下部に表示され続けるのは前述の既存バグ（カスケード順序）によるものであり、本diffとは無関係（バックログ参照）。
- プレースホルダーSVGの文字位置変更は視覚的な仮表示にのみ影響し、実写真差し替え（T-008、バックログ）で最終的に上書きされる。恒久対応ではなく、実写真アップロードまでの応急的な調整である。
