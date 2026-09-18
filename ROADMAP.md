# K-Tech Vault Atlas — ロードマップ

<!-- updated: 2026-09-18 -->

正本はこのファイル。`HANDOFF.md` の Phase 表と同期する。

## このプラグインの仕事

既存 Vault を壊さず、**構造を診断してから** HUB とフォルダ整理を案内すること。

Vault Doctor / Vault Inspector が「メンテナンス全般」なら、Vault Atlas は **フォルダ・HUB・入口（Home）の地図** に特化する。

## 出し方

**Phase ごとに1版。** 診断 → 操作パネル → Home 連携 → 1.0 公開。

## Phase

| Phase | 版 | 内容 | 状態 |
| --- | --- | --- | --- |
| 0 | 0.0.0 | リポジトリ正本・設計 MD・ビルド骨格 | **完了** |
| 1 | 0.1–0.3 | スキャン、HUB 推奨、保留/再検討 | **完了** |
| 2 | 0.4–0.5 | 操作パネル、トグルで HUB 作成/削除 | **完了** |
| 3 | 0.6 | 足場固め、Profile マージ、誤検出修正 | **完了** |
| 4 | 0.7 | Home 未リンク HUB 検出・リンク追記、Homepage 連携 | **完了** |
| 5 | 0.8 | Deep Scan、HUB 保護、除外候補提案 | **完了** |
| 6 | 0.9 | Folder Guide、Markdown ファイル出力 | **完了** |
| 7 | 1.0.0 | 安定化、GitHub Release、掲載判断 | **完了** |

## 1.0.0 出荷

- GitHub Release（tag = manifest.version、個別 asset）
- LISTING.md（community 掲載文）
- コミュニティ pending: **確定済み**（1.0.4）

## 0.9.0 で足したこと

- **Folder Guide**（空フォルダ / サブフォルダのみ / 命名ゆれ — 報告のみ）
- レポートを Vault 内 Markdown ファイルとして保存
- 審査向け: 本番ビルドから console 除去

## 0.8.0 で足したこと

- **通常スキャン / Deep Scan** の二刀流（常時運用は再スキャン、見直しは Deep Scan）
- Deep Scan: 既存 HUB の保護選択、除外フォルダ候補、Profile 保存
- `hub-managed: external` / `atlas`、入口ノートの削除ロック

## 0.7.0 で足したこと

- **Homepage 連携トグル**（`entrySource`）。Homepage プラグインの起動ノートを入口として使う
- トップレベル HUB の **入口未リンク** 検出と一括追記（`## いま開く` 等）
- 手動モードで **Home.md 作成**（最小テンプレート）
- スキャン・HUB テンプレートは有効な入口パスを参照

## 0.6.0 で直したこと

- Vault Profile の **除外プレフィックスをデフォルトとマージ**（古い `data.json` でも `00 Inbox/` 等が効く）
- Vault ルートの `Hub.md` をパネル一覧から除外（警告のみ）
- 除外フォルダ内の HUB を既存一覧から除外
- ドキュメントを実装に同期

## 安全原則（全 Phase 共通）

1. **確認してから変更** — HUB 作成/削除は確認ダイアログ
2. **削除はゴミ箱** — Obsidian の trash。再スキャン + トグル ON で作り直し
3. **Vault Profile** — Vault ごとの除外・閾値
4. **フォルダ単位** — 一括よりトグル操作
