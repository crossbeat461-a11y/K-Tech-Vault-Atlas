export function parseHubProtected(raw: unknown): string[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw.filter((item): item is string => typeof item === "string");
}

export function isHubProtected(
  folderPath: string,
  hubProtected: string[]
): boolean {
  return hubProtected.includes(folderPath);
}

export function upsertHubProtected(
  hubProtected: string[],
  folderPath: string,
  protect: boolean
): string[] {
  if (protect) {
    if (hubProtected.includes(folderPath)) {
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
