import { App, TFile } from "obsidian";
import { folderBasename } from "../path-utils";

function wikilink(hubPath: string, label?: string): string {
  const noExt = hubPath.replace(/\.md$/i, "");
  return label ? `[[${noExt}|${label}]]` : `[[${noExt}]]`;
}

export async function appendChildLinkToParentHub(
  app: App,
  parentHubPath: string,
  childHubPath: string
): Promise<void> {
  const parentFile = app.vault.getAbstractFileByPath(parentHubPath);
  if (!(parentFile instanceof TFile)) {
    throw new Error(`Parent HUB not found: ${parentHubPath}`);
  }

  const content = await app.vault.read(parentFile);
  const childLabel = folderBasename(childHubPath.replace(/\.md$/i, ""));
  const linkLine = `- 子 HUB: ${wikilink(childHubPath, childLabel)}`;

  const childNoExt = childHubPath.replace(/\.md$/i, "");
  if (content.includes(`[[${childNoExt}`)) {
    return;
  }

  const sectionHeaders = ["## 連載フォルダ", "## ノート", "## 入口"];
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

  await app.vault.modify(parentFile, updated);
}
