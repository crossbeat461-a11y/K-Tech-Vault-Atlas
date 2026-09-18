# 診断ルール — K-Tech Vault Atlas

<!-- 正本。実装は src/scan/ と同期すること。 -->

## 深刻度

| レベル | 表示 | 意味 |
| --- | --- | --- |
| `info` | ✅ | 問題なし、または参考情報 |
| `warn` | ⚠️ | 要判断（自動修正しない） |
| `gap` | ❓ | HUB なし・リンク不足など、方針次第 |

Phase 1 では **error 級の自動修正は出さない**。

## 診断項目

### 1. 入口ノート（Entry）

- **検出:** 設定 `entryNotePath`（未設定時は `Home.md` を探索）
- **✅:** ファイルが存在する
- **⚠️:** 複数候補（`Home.md`, `ようこそ.md` 等）
- **gap:** 見つからない

### 2. HUB 検出（Hub present）

フォルダ `F` に対し、次のいずれかで HUB と判定:

1. frontmatter `type: hub`（キー/値は Vault Profile）
2. 命名 `flexible`: フォルダ内に `type: hub` を持つ `.md` が1つ以上
3. 命名 `folder-match`: `F/F.md` または `F/<folder-basename>.md`

**✅:** HUB 1件以上  
**⚠️:** HUB が複数（どれが正か要確認）  
**❓:** 記事・ファイルが一定数あるのに HUB なし

### 3. HUB 不要候補（Hub exempt）

デフォルト除外（Profile で上書き可）:

- `.obsidian/`, `.cursor/`, `node_modules/`（パスセグメント一致）
- `00 Inbox/`（日次・一時置き場）
- `90 System/tools/`
- `90 System/Templates/`

**info:** 「HUB 不要候補のためスキップ」と表示。

### 3b. HUB 推奨（Hub recommended）

524 件の「要判断」をそのまま出さず、**本当に HUB が要るフォルダ**だけを推奨する。

推奨条件（いずれか）:

- 直下 `.md` が `minMarkdownForHub`（既定 3）以上
- `.md` が 2 件以上 **かつ** サブフォルダあり
- `20 Published/` 配下で `.md` が 2 件以上（`Published` / `View` 自身は除く）
- フォルダ名が `Queue` で `.md` が 5 件以上

スキップ（任意・レポートに載せない）:

- 親フォルダに HUB があり、子の `.md` が少なくサブフォルダもない
- Vault ルート（`skipRootWithoutHub` が有効なとき）
- 除外プレフィックス・セグメントに該当

レポート UI では **HUB 推奨** をチェックボックス付きで表示し、選択したものだけテンプレートから作成できる。

### 3c. HUB ネットワーク（親子認識）

スキャン時に `hubPathsByFolder` を構築し、各フォルダについて:

- **親 HUB**: 祖先フォルダで最も近い `type: hub` ノート
- **親に記載あり**: 親 HUB 本文の \`Folder/\` 表記またはウィキリンクで子フォルダ名が出現
- **親からリンク済**: 親 HUB が子 HUB ファイルへウィキリンクしている

**既存 HUB** セクション: フォルダ・HUB パス・子 HUB 数・親との整合

**リンク不足**: 子 HUB があるのに親からリンクされていない（表記のみの場合も検出）

推奨リストは「親に記載あり」を優先表示。作成時に親 HUB へリンク追記可能。

### 3d. HUB 保留・再検討

- **Atlas パネル:** リボンで開く。ヘッダーの **再スキャン** は常時表示
- **トグル ON:** HUB 未作成 → 確認後に作成（誤削除後の作り直し可）
- **トグル OFF:** 確認後に HUB ファイルをゴミ箱へ移動 + 保留登録
- **再検討:** 保留中にノート増加で推奨に復帰
- 運用: スキャン → トグル → 再スキャン を繰り返して構成を整える

### 4. Home からのリンク（Entry link）

入口ノート本文・frontmatter 内の wikilink を解析。

- **❓:** `type: hub` のノートが入口からリンクされていない
- **info:** Dataview で `type = "hub"` 一覧がある場合は注記（手書き不要の可能性）

### 5. フォルダ深度・孤立

- **info:** 空フォルダ
- **❓:** 直下に `.md` が0でサブフォルダのみ（整理候補）
- Phase 4（Folder Guide）で詳細化

### 6. 命名ゆれ（Phase 4）

- 同一階層で `Coffee/` と `Cof-folio/` のような表記差
- Phase 1 では報告のみ、修正提案なし

## レポート出力形式（Markdown）

```markdown
# Vault Atlas Report

Generated: {{iso8601}}
Vault: {{vaultName}}
Profile: {{profileVersion}}

## Summary
- Folders scanned: N
- Hubs found: N
- Needs decision: N

## Entry
✅ Home.md

## Folders needing decision
❓ 20 Published/Coffee/ — 5 notes, no hub

## Hubs not linked from Home
❓ [[22分析ページ/22分析ページ]]
```

## 参照 Vault（開発時）

K-Tech Studio PV BOX — HUB 例:

- `10 Drafts/Drafts.md` — フォルダ名と不一致
- `20 Published/Published.md` — 親 HUB
- `20 Published/Coffee/` — 子フォルダ、専用 HUB なし（要判断）
