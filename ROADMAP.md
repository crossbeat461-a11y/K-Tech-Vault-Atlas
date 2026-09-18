# K-Tech Vault Atlas — ロードマップ

<!-- updated: 2026-09-18 -->

正本はこのファイル。実装前に `HANDOFF.md` の Phase 表も同じ内容に揃える。

## このプラグインの仕事

既存 Vault を壊さず、**構造を診断してから** HUB とフォルダ整理を案内すること。

Vault Doctor / Vault Inspector が「メンテナンス全般」なら、Vault Atlas は **フォルダ・HUB・入口（Home）の地図** に特化する。

## 出し方

**Phase ごとに1版。** 診断だけ動く版を先に出し、自動修正は後から足す。

## Phase

| Phase | 版の目安 | 内容 | 状態 |
| --- | --- | --- | --- |
| 0 | — | リポジトリ正本・設計 MD・ビルド可能な骨格 | **進行中** |
| 1 | 0.1.0 | Vault スキャン、診断レポート（サイドパネル or Markdown 出力）、Vault Profile の読み書き | 待ち |
| 2 | 0.2.0 | HUB 不足検出の精度向上、HUB テンプレから1件作成（dry-run → 実行） | 待ち |
| 3 | 0.3.0 | Home / 親 HUB へのリンク提案、Dataview ブロック提案 | 待ち |
| 4 | 0.4.0 | Folder Guide（空フォルダ、命名ゆれ、除外ルール） | 待ち |
| 5 | 1.0.0 | 安定化、コミュニティ掲載判断 | 待ち |

## Phase 1 で直すこと / 直さないこと

**直す（検出して報告）:**

- 入口ノート（`Home.md` 等）の有無
- `type: hub` 等、HUB とみなす frontmatter の検出
- フォルダごとの HUB あり/なし
- Home からリンクされていない HUB
- 除外候補フォルダ（Daily、`.obsidian`、`node_modules` 等）

**直さない（Phase 1）:**

- ファイルの自動作成・削除・移動
- 既存 HUB 本文の上書き
- iCloud 同期中の一括変更

## 安全原則（全 Phase 共通）

1. **Non-destructive first** — 最初はレポートだけ
2. **Dry-run** — 修正前にプレビュー
3. **Vault Profile** — 推定ルールはユーザー確認後に保存
4. **フォルダ単位** — 一括より段階導入
