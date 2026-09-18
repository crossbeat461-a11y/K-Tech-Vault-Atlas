import { TFile, TFolder } from "obsidian";
import { isScanExcluded } from "../path-utils";
import { isExcludedFolder, type VaultProfileV1 } from "../profile";
import type {
  FolderGuideItem,
  FolderGuideResult,
  NamingDriftGroup,
} from "./report";

function listMarkdownInFolder(folder: TFolder): TFile[] {
  return folder.children.filter(
    (child): child is TFile => child instanceof TFile && child.extension === "md"
  );
}

function normalizeName(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9\u3040-\u30ff\u4e00-\u9fff]+/gi, "");
}

function levenshtein(a: string, b: string): number {
  if (a === b) {
    return 0;
  }
  if (a.length === 0) {
    return b.length;
  }
  if (b.length === 0) {
    return a.length;
  }

  const matrix: number[][] = Array.from({ length: a.length + 1 }, () =>
    Array<number>(b.length + 1).fill(0)
  );

  for (let i = 0; i <= a.length; i += 1) {
    matrix[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  return matrix[a.length][b.length];
}

function namingDriftReason(a: string, b: string): string | null {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb || na === nb) {
    return null;
  }

  if (na.length >= 4 && (na.startsWith(nb) || nb.startsWith(na))) {
    return "名前の前缀が近い";
  }

  const distance = levenshtein(na, nb);
  const threshold = Math.min(na.length, nb.length) >= 6 ? 3 : 2;
  if (distance <= threshold) {
    return `表記が近い（編集距離 ${distance}）`;
  }

  return null;
}

function collectChildFolderNames(folder: TFolder): string[] {
  return folder.children
    .filter((child): child is TFolder => child instanceof TFolder)
    .map((child) => child.name);
}

export function buildFolderGuide(
  folders: TFolder[],
  profile: VaultProfileV1
): FolderGuideResult {
  const emptyFolders: FolderGuideItem[] = [];
  const subfolderOnly: FolderGuideItem[] = [];
  const namingDrift: NamingDriftGroup[] = [];
  const siblingsByParent = new Map<string, string[]>();

  for (const folder of folders) {
    const folderPath = folder.path;

    if (isScanExcluded(folderPath, profile)) {
      continue;
    }
    if (folderPath && isExcludedFolder(`${folderPath}/`, profile)) {
      continue;
    }

    const mdCount = listMarkdownInFolder(folder).length;
    const subfolders = folder.children.filter(
      (child): child is TFolder => child instanceof TFolder
    );

    if (folder.children.length === 0) {
      emptyFolders.push({
        folderPath: folderPath || "(root)",
        detail: "空フォルダ",
      });
      continue;
    }

    if (mdCount === 0 && subfolders.length > 0) {
      subfolderOnly.push({
        folderPath: folderPath || "(root)",
        detail: `直下 .md なし / サブフォルダ ${subfolders.length} 件`,
      });
    }

    if (subfolders.length >= 2) {
      siblingsByParent.set(folderPath, collectChildFolderNames(folder));
    }
  }

  for (const [parentPath, names] of siblingsByParent) {
    for (let i = 0; i < names.length; i += 1) {
      for (let j = i + 1; j < names.length; j += 1) {
        const reason = namingDriftReason(names[i], names[j]);
        if (!reason) {
          continue;
        }
        namingDrift.push({
          parentPath: parentPath || "(root)",
          folders: [names[i], names[j]],
          reason,
        });
      }
    }
  }

  emptyFolders.sort((a, b) => a.folderPath.localeCompare(b.folderPath, "ja"));
  subfolderOnly.sort((a, b) => a.folderPath.localeCompare(b.folderPath, "ja"));
  namingDrift.sort((a, b) => a.parentPath.localeCompare(b.parentPath, "ja"));

  return { emptyFolders, subfolderOnly, namingDrift };
}
