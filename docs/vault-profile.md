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
  excludePathSegments: string[];
  dailyFolderPattern: string | null;
  minMarkdownForHub: number;
  deferReconsiderDelta: number;
  skipRootWithoutHub: boolean;
  confirmedAt: string;
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
    "90 System/tools/",
    "00 Inbox/"
  ],
  "excludePathSegments": ["node_modules", ".git"],
  "dailyFolderPattern": "00 Inbox/Daily/",
  "minMarkdownForHub": 3,
  "deferReconsiderDelta": 2,
  "skipRootWithoutHub": true,
  "confirmedAt": ""
}
```

## マージ（0.6.0+）

`excludeFolderPrefixes` と `excludePathSegments` は **デフォルトと保存値の和集合**。  
古い `data.json` に `00 Inbox/` がなくても、起動時にデフォルトが足される。

## 推定フロー（0.8.0 予定）

1. `Home.md` があれば `entryNotePath` 候補
2. `type: hub` を持つファイルを検索 → `hubNaming: flexible` を提案
3. 設定タブまたは初回スキャン後モーダルで確認
4. `confirmedAt` を更新して保存

## 将来（v2）

- フォルダ別ポリシー（連載は親 HUB のみ、等）
- Home 反映方式: `manual` | `dataview` | `both`
