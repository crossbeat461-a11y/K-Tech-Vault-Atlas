# Changelog

## [Unreleased]

## [0.9.0] — 2026-09-18

### Added

- **Folder Guide** — 空フォルダ、サブフォルダのみの整理候補、命名ゆれ（報告のみ）
- **レポート保存** — Vault 内 Markdown ファイルへ出力（Settings → Scan で保存先）
- 0.7: Homepage 連携、入口未リンク HUB、Home.md 作成
- 0.8: 通常スキャン / Deep Scan、hub-managed ロック、hubProtected

### Changed

- 本番ビルドで `console` / `debugger` を除去（審査対応）

## [0.8.0] — 2026-09-18

### Added

- **スキャン二刀流**: 通常スキャン（再スキャン）と **Deep Scan** を分離
- Deep Scan: 既存 HUB の「触らない / Atlas で管理」、除外フォルダ候補の見直し
- `hub-managed: external` で HUB 削除ロック、Atlas 作成 HUB は `hub-managed: atlas`
- `hubProtected[]` を data.json に保存（Deep Scan の保護リスト）
- 入口ノートは常時ロック
- コマンド **Run Deep Scan**

### Changed

- 初回（`confirmedAt` 未設定）は Deep Scan を案内
- ロック付き HUB はトグル OFF（削除）不可

## [0.7.0] — 2026-09-18

### Added

- **Homepage 連携トグル**（Settings → Profile）。Homepage プラグインの起動ノートを入口として使う
- 入口から未リンクのトップレベル HUB を検出（`entryUnlinkedHubs`）
- パネル / 設定から **入口にリンクを追記**（`## いま開く` 等のセクションへ）
- 手動モードで **Home.md を作成**（最小テンプレート）
- Profile に `entrySource: "manual" | "homepage"` を追加

### Changed

- スキャン・HUB 作成・親解決は **有効な入口パス**（Homepage 連携時は Homepage のノート）を使用

## [0.6.0] — 2026-09-18

### Fixed

- Vault Profile: 除外プレフィックス/セグメントをデフォルトとマージ（古い data.json 対応）
- 起動時にマージ結果を自動保存
- Vault ルート `Hub.md` をパネル一覧から除外（`Home.md` 入口時は警告）
- 除外フォルダ内 HUB を既存一覧から除外

### Changed

- ROADMAP / HANDOFF / README を実装状態に同期

## [0.5.0] — 2026-09-18

### Changed

- トグル OFF → 確認ダイアログ後に HUB ファイルを削除（Obsidian ゴミ箱）
- トグル ON（HUB なし）→ 確認後にテンプレートから再作成
- HUB 構成を1リストに統合（既存 / 推奨 / 保留を同じトグルで操作）

## [0.4.0] — 2026-09-18

### Changed

- リボン / コマンド → Atlas 操作パネル（スキャン → トグル → 再スキャンのループ）
- **再スキャン** ボタンをヘッダーに常時表示（パネルを閉じない）
- トグル ON/OFF で即 HUB 作成 / 保留（既存 HUB は削除しない）

## [0.3.0] — 2026-09-18

### Added

- HUB 保留（トグル OFF →「オフを保留」で次回スキャンまで非表示）
- 保留からの再検討（ノート増加で「HUB 再検討」に復帰）
- 設定 Scan: 再検討の増加件数（deferReconsiderDelta）

## [0.2.0] — 2026-09-18

### Added

- 親・子 HUB ネットワーク認識（親 HUB 本文の表・ウィキリンク解析）
- 推奨理由の具体化（「親 Published に記載あり・子 HUB 未作成」等）
- 既存 HUB 一覧・リンク不足セクション
- HUB 作成時・一括で親 HUB へリンク追記

## [0.1.0] — 2026-09-18

### Added

- HUB 推奨判定（ノイズ削減: node_modules セグメント、tools/Inbox 除外）
- レポート UI から選択した HUB をテンプレート生成で作成
- 設定 Scan タブ（最小ノート数、除外セグメント）

## [0.0.0] — 2026-09-18

### Added

- リポジトリ正本（README, ROADMAP, HANDOFF, ARCHITECTURE）
- 診断ルール・Vault Profile 仕様（`docs/`）
- Obsidian プラグイン骨格（ビルド可能なスタブ）
