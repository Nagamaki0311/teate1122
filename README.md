# project001

Claude CodeによるAI開発OS。新規アプリ開発に共通する開発ルール・タスク管理・レビュー手順をテンプレートとして提供する。

## 構成

- CLAUDE.md
  - Claude Codeの開発ルール（Manager = このセッション自身の役割を含む）

- .claude/agents
  - planner
  - developer
  - reviewer

- .claude/settings.json
  - SessionStart / PreCompact Hook（セッション継続性の補助。詳細はdocs/agents.md）

- docs
  - tasks.md: タスクと状態管理
  - progress.md: 作業履歴
  - decisions.md: 設計判断の記録
  - agents.md: Agent構成・オーケストレーションルール・Ponytail原則

## 開発フロー

User → Manager → Planner → Developer → Reviewer → Manager → Complete

詳細は CLAUDE.md と docs/agents.md を参照。
