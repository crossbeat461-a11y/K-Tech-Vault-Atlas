import { App } from "obsidian";

export async function createHomeEntryNote(
  app: App,
  entryPath = "Home.md"
): Promise<string> {
  const existing = app.vault.getAbstractFileByPath(entryPath);
  if (existing) {
    throw new Error(`Already exists: ${entryPath}`);
  }

  const content = `---
title: Home
type: hub
tags: [hub, home]
---

# Home

Vault の入口。主要 HUB へのリンクをここに置きます。

## いま開く

- （Atlas スキャン後、未リンク HUB をここに追加できます）

## 管制塔

主要セクションの HUB を \`type: hub\` で整理してください。
`;

  await app.vault.create(entryPath, content);
  return entryPath;
}
