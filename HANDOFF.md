# HANDOFF — K-Tech Vault Atlas

<!-- updated: 2026-09-18 -->

## Product

| Field | Value |
| --- | --- |
| ID | `k-tech-vault-atlas` |
| Name | K-Tech Vault Atlas |
| Author | K-Tech Studio |
| Repo | `crossbeat461-a11y/K-Tech-Vault-Atlas`（private） |
| Version | **1.0.0** |

## Privacy

- 100% ローカル。Vault スキャンは端末内のみ。ネットワーク送信なし。
- Vault Profile / 保留リストは `data.json` に保存。
- Buy Me a Coffee: `manifest.json` の `fundingUrl` + 設定 Support タブ + 初回/更新モーダル
- 審査: `.cursor/rules/obsidian-plugin-review.mdc`

## Build

```bash
cd /Users/kimurashigeru/Documents/github/K-Tech-Vault-Atlas
npm install
npm run build
```

Deploy（この Mac）:

```
…/PV BOX/PV BOX/.obsidian/plugins/k-tech-vault-atlas/
  main.js, manifest.json, styles.css
```

`data.json` は触らない（除外マージはプラグイン起動時に自動）。

## Architecture

```
src/main.ts              Plugin entry, Atlas パネル
src/ui/atlas-panel.ts    操作パネル（再スキャン + トグル）
src/ui/atlas-rows.ts     パネル行の組み立て
src/ui/confirm-modal.ts  作成/削除確認
src/scan/vault-scan.ts   フォルダ walk、HUB 検出
src/scan/hub-network.ts  親 HUB 本文解析
src/scan/hub-recommend.ts HUB 推奨/heuristic
src/hub/hub-create.ts    HUB テンプレ作成
src/hub/hub-delete.ts    HUB ゴミ箱へ
src/hub-defer.ts         保留/再検討
src/profile.ts           Vault Profile
docs/diagnosis-rules.md  診断正本
```

## Phase roadmap

| Version | Scope | Status |
| --- | --- | --- |
| 0.6.0 | 足場・Profile マージ・誤検出修正 | **Done** |
| 0.7.0 | Home 未リンク HUB、Homepage 連携 | **Done** |
| 0.8.0 | Deep Scan、HUB 保護、除外候補 | **Done** |
| 0.9.0 | Folder Guide、Markdown 出力 | **Done** |
| 1.0.0 | Release、掲載判断 | **Done** |

Policy: `ROADMAP.md` が正本。

## Test checklist（PV BOX）

- [x] `.obsidian` / `node_modules` / `90 System/tools` をスキップ
- [x] 既存 HUB（`Published.md` 等）を検出
- [x] HUB 不足フォルダを推奨（Coffee 等）
- [x] 操作パネル：再スキャン常時、トグル左配置
- [x] トグル OFF → 削除（ゴミ箱）/ ON → 作成
- [x] 古い `data.json` でも除外デフォルトがマージされる
- [x] Home 未リンク HUB（0.7.0）
- [x] Homepage 連携トグル（0.7.0）

- [x] 通常スキャン / Deep Scan 二刀流（0.8.0）
- [x] hub-managed ロック、hubProtected（0.8.0）

- [x] Folder Guide（0.9.0）
- [x] Markdown レポートのファイル出力（0.9.0）

## Ship（1.0.0）

- GitHub Release: tag `1.0.0` → Actions が asset 公開
- community.obsidian.md: `LISTING.md` を Edit listing に貼る
- pending 確定は Obsidian 本体で人が行う
