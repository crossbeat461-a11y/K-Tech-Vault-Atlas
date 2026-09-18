import { App, TFile } from "obsidian";
import { folderBasename } from "../path-utils";

function wikilink(hubPath: string, label?: string): string {
  const noExt = hubPath.replace(/\.md$/i, "");
  return label ? `[[${noExt}|${label}]]` : `[[${noExt}]]`;
}

export async function appendHubLinkToEntry(
  app: App,
  entryPath: string,
  hubPath: string
): Promise<void> {
  const entryFile = app.vault.getAbstractFileByPath(entryPath);
  if (!(entryFile instanceof TFile)) {
    throw new Error(`入口ノートが見つかりません: ${entryPath}`);
  }

  const content = await app.vault.read(entryFile);
  const childNoExt = hubPath.replace(/\.md$/i, "");
  if (content.includes(`[[${childNoExt}`)) {
    return;
  }

  const hubLabel = folderBasename(hubPath.replace(/\.md$/i, ""));
  const linkLine = `- ${wikilink(hubPath, hubLabel)}`;

  const sectionHeaders = [
    "## いま開く",
    "## HUB",
    "## 入口",
    "## 連載",
    "## Quick Lane",
  ];
  let insertAt = content.length;

  for (const header of sectionHeaders) {
    const idx = content.indexOf(header);
    if (idx === -1) {
      continue;
    }
    const afterHeader = content.indexOf("\n", idx);
    if (afterHeader === -1) {
      continue;
    }
    const nextSection = content.indexOf("\n## ", afterHeader + 1);
    insertAt = nextSection === -1 ? content.length : nextSection;
    break;
  }

  const before = content.slice(0, insertAt).replace(/\s+$/, "");
  const after = content.slice(insertAt);
  const updated = `${before}\n${linkLine}\n${after.startsWith("\n") ? after : `\n${after}`}`;

  await app.vault.modify(entryFile, updated);
}
