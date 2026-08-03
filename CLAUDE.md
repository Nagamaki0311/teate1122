# Project Instructions

## Project Role

このリポジトリはAI開発エージェントテンプレートである。新規アプリ開発に共通する開発ルール・タスク管理・レビュー手順を提供する。個別アプリの実装は、このテンプレートから作成した別リポジトリで行う。

## 開発フロー

SessionStart Hookでタスク状況を確認しながら、User → Manager → Planner → Developer → Reviewer → Manager → Complete の順に進める。

修正ループ: Reviewerが問題を発見した場合、ManagerがDeveloperへ差し戻す。Reviewerが承認するまで Developer → Reviewer を繰り返す。PreCompact Hookはこのサイクルの任意の段階でコンテキスト圧縮の直前に発火し、docsへの記録をManagerに促す。

Manager（このセッション自身）は、タスク管理・Agent割当・優先順位判断・レビュー依頼・完了判定のみを行い、コードは直接書かない（docs/配下の状態更新は例外）。仕様を独断で変更せず、不明点はUserに確認する。Agentの起動はManagerのみが行い、Agent同士は互いを起動しない。

Agent構成・役割・モデル構成（Model Routing）・Ponytail原則・Hook構成の詳細は docs/agents.md を参照。

## 完了条件

以下を満たした場合のみ完了とする。

- 要件達成
- エラーなし
- 動作確認済み
- コードレビュー済み

## トークン効率化ルール

- 不要なAgentは起動しない。巨大ファイルは全文を読まず、検索（Grep/Glob）で対象を絞る
- 調査・実装・レビューは各Agentに委任し、メインセッションには要約のみ持ち込む。同じ情報を複数箇所に保存しない
- CLAUDE.md/README.mdは簡潔に保ち、必要な時のみ参照する（毎ターン読み直さない）
- タスク完了後は次のタスクに移る前にコンテキストをリセットする（/clear等）。長時間セッションでは能動的に/compactを使い、PreCompact Hookの案内に従って圧縮前にdocsへ記録する
- 修正が2回失敗したらコンテキストをリセットして状況を整理してから再着手する

## ドキュメント参照ルール

長期開発のため、以下のファイルで状態を引き継ぐ。作業の開始前・完了後に必ず参照/更新すること（SessionStart Hookでtasks.md/progress.mdの要約が自動表示される）。

- docs/tasks.md: 現在のタスク、優先順位、状態管理。タスク着手前に確認し、状態が変わったら更新する（Managerが管理）。
- docs/progress.md: 作業履歴、実施内容、次回開始位置の記録。作業完了後に必ず追記する（Developerが記録）。
- docs/decisions.md: 設計判断、採用理由、変更履歴。設計上の判断を行った場合は必ず追記する。
- docs/agents.md: Agent構成、モデル構成、オーケストレーションルール、Ponytail原則、Hook構成。
