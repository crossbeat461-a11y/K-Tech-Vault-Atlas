# HANDOFF — K-Tech Vault Atlas

<!-- updated: 2026-09-18 -->

## Product

| Field | Value |
| --- | --- |
| ID | `k-tech-vault-atlas` |
| Name | K-Tech Vault Atlas |
| Author | K-Tech Studio |
| Repo | `crossbeat461-a11y/K-Tech-Vault-Atlas`（private） |
| Version | 0.0.0（未リリース） |

## Privacy

- 100% ローカル。Vault スキャンは端末内のみ。ネットワーク送信なし。
- Vault Profile は `.obsidian/plugins/k-tech-vault-atlas/data.json` に保存。
- Buy Me a Coffee: `manifest.json` の `fundingUrl` + 設定 Support タブ + 初回/更新モーダル
- 審査 Warning 回避: `.cursor/rules/obsidian-plugin-review.mdc`

## Build

```bash
# Mac
cd /Users/kimurashigeru/Documents/github/K-Tech-Vault-Atlas
npm install
npm run build

# Windows（GitHub Desktop clone 先）
cd c:\Users\chuyo\Documents\GitHub\K-Tech-Vault-Atlas
npm install
npm run build
```

Deploy to test vault（この Mac）:

```
…/PV BOX/PV BOX/.obsidian/plugins/k-tech-vault-atlas/
  main.js, manifest.json, styles.css
```

`data.json` は触らない。

Enable: Settings → Community plugins → K-Tech Vault Atlas

## Architecture（予定）

```
src/main.ts           Plugin entry, commands, ribbon
src/settings.ts       Settings + tab UI
src/profile.ts        Vault Profile load/save
src/scan/vault-scan.ts   Folder walk, hub detection
src/scan/hub-detect.ts   type: hub, naming heuristics
src/scan/report.ts       Findings → markdown / view model
src/ui/report-view.ts    Sidebar report (Phase 1)
docs/diagnosis-rules.md  診断正本（コードと同期）
```

## Phase roadmap

| Phase | Version | Scope | Status |
| --- | --- | --- | --- |
| 0 | — | Repo, docs, build skeleton | **In progress** |
| 1 | 0.1.0 | Scan + report + profile | Waiting |
| 2 | 0.2.0 | Hub Keeper (create one hub) | Waiting |
| 3 | 0.3.0 | Home / parent link suggestions | Waiting |
| 4 | 0.4.0 | Folder Guide | Waiting |
| 5 | 1.0.0 | Stabilize, listing decision | Waiting |

Policy: `ROADMAP.md` が正本。

## Next（Phase 0 → 1）

- [ ] `hub-detect.ts` — frontmatter `type: hub` 解析
- [ ] `vault-scan.ts` — 除外フォルダ、フォルダ→HUB 対応表
- [ ] `report.ts` — 診断 Markdown 生成
- [ ] コマンド `Vault Atlas: Run scan` でレポート表示
- [ ] 設定: 除外フォルダ、入口ノートパス、HUB 判定プロパティ

## Test

最初のフィクスチャ Vault: 開発者自身の PV BOX（読み取りのみでスキャン。Phase 1 では書き込みなし）。

Checklist（Phase 1）:

- [ ] スキャンが `.obsidian` / `node_modules` をスキップする
- [ ] 既存 HUB（`Drafts.md`, `Published.md` 等）を検出する
- [ ] HUB なしフォルダ（例: `20 Published/Coffee/`）を「要判断」で出す
- [ ] レポートを Markdown ファイルにエクスポートできる
