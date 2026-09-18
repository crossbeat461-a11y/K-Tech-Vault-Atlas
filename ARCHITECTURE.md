# Architecture — K-Tech Vault Atlas

## 概要

Vault Atlas は **Core + 将来 Modules** の1リポジトリ構成。

```
┌─────────────────────────────────────────┐
│           K-Tech Vault Atlas            │
│  (Obsidian Plugin — single manifest)    │
├─────────────────────────────────────────┤
│  Core                                   │
│  · Vault scan                           │
│  · Diagnosis rules                      │
│  · Vault Profile                        │
│  · Report UI / export                   │
├─────────────────────────────────────────┤
│  Modules (future, same repo)            │
│  · Hub Keeper — hub create/link         │
│  · Folder Guide — folder suggestions    │
└─────────────────────────────────────────┘
```

公開までは **private GitHub リポジトリ1本** に MD とコードを同居させる。

## Vault Profile

ユーザーが確認した Vault 固有ルール。`data.json` に保存。

| キー | 例 | 説明 |
| --- | --- | --- |
| `entryNotePath` | `Home.md` | 入口ノート |
| `hubTypeProperty` | `type` | HUB 判定用 frontmatter キー |
| `hubTypeValue` | `hub` | HUB とみなす値 |
| `excludeFolderPrefixes` | `[".obsidian/", "90 System/tools/"]` | スキャン除外 |
| `hubNaming` | `flexible` \| `folder-match` | HUB ファイル名規則 |
| `dailyFolderPattern` | `00 Inbox/Daily/` | HUB 不要候補 |

初回スキャン時に **推定 → 確認 UI → 保存**。

## 診断フロー（Phase 1）

```
User: Run scan
  → Load Vault Profile (or infer defaults)
  → Walk folders (respect excludes)
  → For each folder: detect hub note(s)
  → Cross-check entry note links
  → Build findings[]
  → Render report (view + optional export)
```

**書き込みなし。** Phase 2 以降で Hub Keeper が findings に `fix` アクションを付ける。

## 既存プラグインとの境界

| 製品 | 境界 |
| --- | --- |
| Vault Doctor / Inspector | リンク切れ・孤立ノート全般 → Atlas は触らない |
| Waypoint / Zoottelkeeper | 自動 TOC 生成 → Atlas は「要 HUB か」を先に判断 |
| MOC Link Helper | up リンク整理 → Atlas Phase 3 で連携提案 |
| Dataview | Home 動的一覧 → Atlas はブロック提案のみ |

## Mac / Windows

- 正本: GitHub private repo
- 改行: `.gitattributes` `* text=auto`
- 作業前: `git pull --ff-only --prune`
