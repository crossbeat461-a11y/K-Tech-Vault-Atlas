import { isExcludedFolder, type VaultProfileV1 } from "./profile";

const DEFAULT_EXCLUDED_SEGMENTS = ["node_modules", ".git"];

export function folderPrefix(folderPath: string): string {
  if (!folderPath) {
    return "";
  }
  return folderPath.endsWith("/") ? folderPath : `${folderPath}/`;
}

export function pathHasExcludedSegment(
  folderPath: string,
  segments: string[]
): boolean {
  const parts = folderPath.split("/").filter(Boolean);
  return parts.some((part) => segments.includes(part));
}

export function isScanExcluded(
  folderPath: string,
  profile: VaultProfileV1
): boolean {
  if (!folderPath) {
    return false;
  }
  const prefix = folderPrefix(folderPath);
  if (isExcludedFolder(prefix, profile)) {
    return true;
  }
  const segments = profile.excludePathSegments ?? DEFAULT_EXCLUDED_SEGMENTS;
  return pathHasExcludedSegment(folderPath, segments);
}

export function isTemplatesFolder(folderPath: string): boolean {
  return (
    folderPath.endsWith("/Templates") ||
    folderPath.includes("/Templates/") ||
    folderPath === "Templates"
  );
}

export function folderBasename(folderPath: string): string {
  const parts = folderPath.split("/").filter(Boolean);
  return parts.length > 0 ? parts[parts.length - 1] : "Hub";
}

export function parentFolderPath(folderPath: string): string | null {
  const parts = folderPath.split("/").filter(Boolean);
  if (parts.length <= 1) {
    return parts.length === 1 ? "" : null;
  }
  parts.pop();
  return parts.join("/");
}
