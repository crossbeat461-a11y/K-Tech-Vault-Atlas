import { collectStrings, stringListHas } from "../type-guards";

export function parseHubProtected(raw: unknown): string[] {
  return collectStrings(raw);
}

export function isHubProtected(
  folderPath: string,
  hubProtected: string[]
): boolean {
  return stringListHas(hubProtected, folderPath);
}

export function upsertHubProtected(
  hubProtected: string[],
  folderPath: string,
  protect: boolean
): string[] {
  if (protect) {
    if (stringListHas(hubProtected, folderPath)) {
      return hubProtected;
    }
    return [...hubProtected, folderPath].sort((a, b) =>
      a.localeCompare(b, "ja")
    );
  }
  return hubProtected.filter((path) => path !== folderPath);
}

export function mergeHubProtectedLists(
  previous: string[],
  selectedFolderPaths: string[]
): string[] {
  return [...new Set(selectedFolderPaths)].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
}
