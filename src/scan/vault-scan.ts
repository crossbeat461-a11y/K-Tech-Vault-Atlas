import { App, TFile, TFolder } from "obsidian";
import { isExcludedFolder, type VaultProfileV1 } from "../profile";
import { isHubNote } from "./hub-detect";
import type { ScanFinding, VaultScanResult } from "./report";

function listMarkdownInFolder(folder: TFolder): TFile[] {
  return folder.children.filter(
    (child): child is TFile => child instanceof TFile && child.extension === "md"
  );
}

function collectFolders(root: TFolder, profile: VaultProfileV1): TFolder[] {
  const folders: TFolder[] = [];
  const walk = (folder: TFolder): void => {
    if (isExcludedFolder(folder.path ? `${folder.path}/` : "", profile)) {
      return;
    }
    folders.push(folder);
    for (const child of folder.children) {
      if (child instanceof TFolder) {
        walk(child);
      }
    }
  };
  walk(root);
  return folders;
}

export async function scanVault(
  app: App,
  profile: VaultProfileV1
): Promise<VaultScanResult> {
  const findings: ScanFinding[] = [];
  const root = app.vault.getRoot();
  const folders = collectFolders(root, profile);

  const entryFile = app.vault.getAbstractFileByPath(profile.entryNotePath);
  if (entryFile instanceof TFile) {
    findings.push({
      severity: "info",
      code: "ENTRY_FOUND",
      message: `入口ノート: ${profile.entryNotePath}`,
      path: profile.entryNotePath,
    });
  } else {
    findings.push({
      severity: "gap",
      code: "ENTRY_MISSING",
      message: `入口ノートが見つかりません: ${profile.entryNotePath}`,
      path: profile.entryNotePath,
    });
  }

  let hubCount = 0;
  let needsDecision = 0;

  for (const folder of folders) {
    const folderPath = folder.path;
    const prefix = folderPath ? `${folderPath}/` : "";
    if (isExcludedFolder(prefix, profile)) {
      continue;
    }

    const mdFiles = listMarkdownInFolder(folder);
    const hubFiles: TFile[] = [];
    for (const file of mdFiles) {
      const content = await app.vault.read(file);
      if (isHubNote(content, profile)) {
        hubFiles.push(file);
      }
    }

    if (hubFiles.length > 0) {
      hubCount += hubFiles.length;
      if (hubFiles.length > 1) {
        needsDecision += 1;
        findings.push({
          severity: "warn",
          code: "HUB_MULTIPLE",
          message: `HUB が複数: ${folderPath || "(root)"}`,
          path: folderPath,
          detail: hubFiles.map((f) => f.path).join(", "),
        });
      }
      continue;
    }

    const noteCount = mdFiles.length;
    const subfolderCount = folder.children.filter(
      (c) => c instanceof TFolder
    ).length;

    if (noteCount === 0 && subfolderCount === 0) {
      continue;
    }

    if (noteCount >= 2 || subfolderCount > 0) {
      needsDecision += 1;
      findings.push({
        severity: "gap",
        code: "HUB_MISSING",
        message: `HUB なし（要判断）: ${folderPath || "(root)"} — md:${noteCount}, subfolders:${subfolderCount}`,
        path: folderPath,
      });
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    vaultName: app.vault.getName(),
    foldersScanned: folders.length,
    hubCount,
    needsDecision,
    findings,
  };
}
