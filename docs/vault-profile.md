# Vault Profile — 仕様

Vault Atlas が Vault ごとに保存する設定。插件 `data.json` の `vaultProfile` キーに格納。

## スキーマ（v1）

```typescript
interface VaultProfileV1 {
  version: 1;
  entryNotePath: string;
  hubTypeProperty: string;
  hubTypeValue: string;
  hubNaming: "flexible" | "folder-match";
  excludeFolderPrefixes: string[];
  dailyFolderPattern: string | null;
  confirmedAt: string; // ISO8601 — ユーザーが推定を確認した日時
}
```

## デフォルト（未設定時）

```json
{
  "version": 1,
  "entryNotePath": "Home.md",
  "hubTypeProperty": "type",
  "hubTypeValue": "hub",
  "hubNaming": "flexible",
  "excludeFolderPrefixes": [
    ".obsidian/",
    ".cursor/",
    "node_modules/"
  ],
  "dailyFolderPattern": "00 Inbox/Daily/",
  "confirmedAt": ""
}
```

## 推定フロー（Phase 1）

1. `Home.md` があれば `entryNotePath` 候補
2. `type: hub` を持つファイルを全検索 → `hubNaming: flexible` を提案
3. 除外フォルダは上記デフォルトを提案
4. 設定タブまたは初回スキャン後モーダルで確認
5. `confirmedAt` を更新して保存

## 将来（v2）

- 連載フォルダは親 HUB のみで十分、等の **フォルダ別ポリシー**
- Home 反映方式: `manual` | `dataview` | `both`
