import { App, TFile, TFolder } from "obsidian";
import type { VaultProfileV1 } from "../profile";
import { buildHubTemplate, suggestHubPath } from "./hub-template";
import { isHubNote } from "../scan/hub-detect";

async function listNonHubMarkdown(
  app: App,
  folder: TFolder,
  profile: VaultProfileV1
): Promise<string[]> {
  const paths: string[] = [];
  for (const child of folder.children) {
    if (!(child instanceof TFile) || child.extension !== "md") {
      continue;
    }
    const content = await app.vault.read(child);
    if (!isHubNote(content, profile)) {
      paths.push(child.path);
    }
  }
  return paths;
}

export async function createHubForFolder(
  app: App,
  folderPath: string,
  profile: VaultProfileV1,
  parentHubPath: string | null,
  entryNotePath?: string
): Promise<string> {
  const hubPath = suggestHubPath(folderPath);
  const existing = app.vault.getAbstractFileByPath(hubPath);
  if (existing) {
    throw new Error(`Already exists: ${hubPath}`);
  }

  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!(folder instanceof TFolder)) {
    throw new Error(`Folder not found: ${folderPath}`);
  }

  const childNotePaths = await listNonHubMarkdown(app, folder, profile);
  const content = buildHubTemplate({
    folderPath,
    hubPath,
    parentHubPath,
    entryNotePath: entryNotePath ?? profile.entryNotePath,
    childNotePaths,
  });

  await app.vault.create(hubPath, content);
  return hubPath;
}
