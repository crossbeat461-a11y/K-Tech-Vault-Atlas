import type { VaultProfileV1 } from "../profile";
import {
  isScanExcluded,
  isTemplatesFolder,
  parentFolderPath,
} from "../path-utils";

export interface HubRecommendInput {
  folderPath: string;
  markdownCount: number;
  subfolderCount: number;
  hasParentHub: boolean;
  profile: VaultProfileV1;
}

export function recommendHubReason(input: HubRecommendInput): string | null {
  const {
    folderPath,
    markdownCount,
    subfolderCount,
    hasParentHub,
    profile,
  } = input;

  if (profile.skipRootWithoutHub && !folderPath) {
    return null;
  }
  if (isScanExcluded(folderPath, profile)) {
    return null;
  }
  if (isTemplatesFolder(folderPath)) {
    return null;
  }
  if (markdownCount === 0 && subfolderCount === 0) {
    return null;
  }

  const minMd = profile.minMarkdownForHub;

  if (markdownCount >= minMd) {
    return `${minMd} 件以上のノート`;
  }

  if (markdownCount >= 2 && subfolderCount > 0) {
    return "ノートとサブフォルダあり";
  }

  if (markdownCount >= 2 && folderPath.startsWith("20 Published/")) {
    const leaf = folderPath.split("/").pop() ?? "";
    if (leaf !== "Published" && leaf !== "View") {
      return "公開連載フォルダ";
    }
  }

  if (markdownCount >= 5 && folderPath.endsWith("Queue")) {
    return "Queue に多数のファイル";
  }

  if (hasParentHub && markdownCount < minMd && subfolderCount === 0) {
    return null;
  }

  if (markdownCount >= 2) {
    return "ノートが複数";
  }

  return null;
}

export function isOptionalHubCandidate(input: HubRecommendInput): boolean {
  if (recommendHubReason(input)) {
    return false;
  }
  if (!input.folderPath || isScanExcluded(input.folderPath, input.profile)) {
    return false;
  }
  if (isTemplatesFolder(input.folderPath)) {
    return false;
  }
  return input.markdownCount >= 1 || input.subfolderCount > 0;
}

export function resolveParentHubPath(
  folderPath: string,
  hubPathsByFolder: Map<string, string>,
  entryNotePath: string
): string | null {
  let current = parentFolderPath(folderPath);
  while (current !== null) {
    const hub = hubPathsByFolder.get(current);
    if (hub) {
      return hub;
    }
    if (current === "") {
      break;
    }
    current = parentFolderPath(current);
  }
  return entryNotePath;
}
