import { App, TFile } from "obsidian";
import { normalizeFolderPath } from "../profile";

function buildReportFileName(generatedAt: string): string {
  const datePart = generatedAt.slice(0, 10);
  const timePart = generatedAt.slice(11, 19).replace(/:/g, "");
  return `Vault Atlas Report ${datePart}${timePart ? `-${timePart}` : ""}.md`;
}

async function ensureFolder(app: App, folderPath: string): Promise<void> {
  const normalized = normalizeFolderPath(folderPath).replace(/\/$/, "");
  if (!normalized) {
    return;
  }

  const parts = normalized.split("/");
  let current = "";
  for (const part of parts) {
    current = current ? `${current}/${part}` : part;
    const existing = app.vault.getAbstractFileByPath(current);
    if (!existing) {
      await app.vault.createFolder(current);
    }
  }
}

function resolveUniquePath(app: App, folderPath: string, fileName: string): string {
  const base = normalizeFolderPath(folderPath);
  let candidate = `${base}${fileName}`;
  let index = 2;

  while (app.vault.getAbstractFileByPath(candidate)) {
    const stem = fileName.replace(/\.md$/i, "");
    candidate = `${base}${stem} (${index}).md`;
    index += 1;
  }

  return candidate;
}

export async function exportReportToVault(
  app: App,
  markdown: string,
  exportFolder: string,
  generatedAt: string
): Promise<string> {
  const folder = normalizeFolderPath(exportFolder || "Vault Atlas/");
  await ensureFolder(app, folder);

  const fileName = buildReportFileName(generatedAt);
  const filePath = resolveUniquePath(app, folder, fileName);
  const created = await app.vault.create(filePath, markdown);

  if (!(created instanceof TFile)) {
    throw new Error(`レポートを保存できません: ${filePath}`);
  }

  return created.path;
}
