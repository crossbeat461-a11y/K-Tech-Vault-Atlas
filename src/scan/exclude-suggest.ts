import { App, TFile, TFolder } from "obsidian";
import {
  isExcludedFolder,
  normalizeFolderPath,
  type VaultProfileV1,
} from "../profile";

export interface ExcludeSuggestion {
  prefix: string;
  reason: string;
  markdownCount: number;
}

function listMarkdownInFolder(folder: TFolder): TFile[] {
  return folder.children.filter(
    (child): child is TFile => child instanceof TFile && child.extension === "md"
  );
}

function countMarkdownRecursive(folder: TFolder): number {
  let count = listMarkdownInFolder(folder).length;
  for (const child of folder.children) {
    if (child instanceof TFolder) {
      count += countMarkdownRecursive(child);
    }
  }
  return count;
}

function isPrefixAlreadyExcluded(
  prefix: string,
  profile: VaultProfileV1
): boolean {
  const normalized = normalizeFolderPath(prefix);
  return profile.excludeFolderPrefixes.some((existing) =>
    normalized.startsWith(normalizeFolderPath(existing))
  );
}

function addSuggestion(
  suggestions: Map<string, ExcludeSuggestion>,
  prefix: string,
  reason: string,
  markdownCount: number,
  profile: VaultProfileV1
): void {
  const normalized = normalizeFolderPath(prefix);
  if (isPrefixAlreadyExcluded(normalized, profile)) {
    return;
  }
  const existing = suggestions.get(normalized);
  if (existing) {
    existing.markdownCount = Math.max(existing.markdownCount, markdownCount);
    return;
  }
  suggestions.set(normalized, {
    prefix: normalized,
    reason,
    markdownCount,
  });
}

export function suggestExcludeFolders(
  app: App,
  profile: VaultProfileV1
): ExcludeSuggestion[] {
  const suggestions = new Map<string, ExcludeSuggestion>();
  const root = app.vault.getRoot();

  const walk = (folder: TFolder): void => {
    const folderPath = folder.path;
    const prefix = folderPath ? `${folderPath}/` : "";

    if (folderPath.startsWith(".obsidian")) {
      const mdCount = countMarkdownRecursive(folder);
      if (mdCount > 0) {
        addSuggestion(
          suggestions,
          ".obsidian/",
          "プラグイン設定配下に Markdown あり",
          mdCount,
          profile
        );
      }
    }

    if (folderPath.startsWith(".cursor")) {
      addSuggestion(
        suggestions,
        ".cursor/",
        "Cursor 設定フォルダ",
        countMarkdownRecursive(folder),
        profile
      );
    }

    if (
      profile.dailyFolderPattern &&
      normalizeFolderPath(folderPath ? `${folderPath}/` : "").startsWith(
        normalizeFolderPath(profile.dailyFolderPattern)
      )
    ) {
      addSuggestion(
        suggestions,
        profile.dailyFolderPattern,
        "Daily / 日次フォルダ（HUB 不要候補）",
        countMarkdownRecursive(folder),
        profile
      );
    }

    const mdCount = listMarkdownInFolder(folder).length;
    const leaf = folderPath.split("/").pop() ?? "";
    if (
      mdCount >= 5 &&
      /inbox|daily|archive|temp|queue/i.test(leaf) &&
      !isExcludedFolder(prefix || folderPath + "/", profile)
    ) {
      addSuggestion(
        suggestions,
        folderPath ? `${folderPath}/` : "",
        `一時置き場っぽいフォルダ（md ${mdCount} 件）`,
        mdCount,
        profile
      );
    }

    for (const child of folder.children) {
      if (child instanceof TFolder) {
        walk(child);
      }
    }
  };

  walk(root);

  return [...suggestions.values()].sort((a, b) =>
    a.prefix.localeCompare(b.prefix, "ja")
  );
}
