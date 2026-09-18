import { App, TFile } from "obsidian";

export async function deleteHubFile(app: App, hubPath: string): Promise<void> {
  const file = app.vault.getAbstractFileByPath(hubPath);
  if (!(file instanceof TFile)) {
    throw new Error(`HUB が見つかりません: ${hubPath}`);
  }
  await app.fileManager.trashFile(file);
}
