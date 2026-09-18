export type HubNaming = "flexible" | "folder-match";

export interface VaultProfileV1 {
  version: 1;
  entryNotePath: string;
  hubTypeProperty: string;
  hubTypeValue: string;
  hubNaming: HubNaming;
  excludeFolderPrefixes: string[];
  excludePathSegments: string[];
  dailyFolderPattern: string | null;
  minMarkdownForHub: number;
  deferReconsiderDelta: number;
  skipRootWithoutHub: boolean;
  confirmedAt: string;
}

export const DEFAULT_VAULT_PROFILE: VaultProfileV1 = {
  version: 1,
  entryNotePath: "Home.md",
  hubTypeProperty: "type",
  hubTypeValue: "hub",
  hubNaming: "flexible",
  excludeFolderPrefixes: [
    ".obsidian/",
    ".cursor/",
    "90 System/tools/",
    "00 Inbox/",
  ],
  excludePathSegments: ["node_modules", ".git"],
  dailyFolderPattern: "00 Inbox/Daily/",
  minMarkdownForHub: 3,
  deferReconsiderDelta: 2,
  skipRootWithoutHub: true,
  confirmedAt: "",
};

export function normalizeFolderPath(path: string): string {
  const trimmed = path.replace(/^\/+/, "").replace(/\\/g, "/");
  return trimmed.endsWith("/") ? trimmed : `${trimmed}/`;
}

export function isExcludedFolder(
  folderPath: string,
  profile: VaultProfileV1
): boolean {
  const normalized = normalizeFolderPath(folderPath);
  if (
    profile.dailyFolderPattern &&
    normalized.startsWith(normalizeFolderPath(profile.dailyFolderPattern))
  ) {
    return true;
  }
  return profile.excludeFolderPrefixes.some((prefix) =>
    normalized.startsWith(normalizeFolderPath(prefix))
  );
}

function mergeStringLists(
  defaults: string[],
  stored: string[] | undefined
): string[] {
  return [...new Set([...defaults, ...(stored ?? [])])].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
}

export function mergeVaultProfile(
  stored: Partial<VaultProfileV1> | undefined
): VaultProfileV1 {
  if (!stored || stored.version !== 1) {
    return { ...DEFAULT_VAULT_PROFILE };
  }
  return {
    ...DEFAULT_VAULT_PROFILE,
    ...stored,
    version: 1,
    excludeFolderPrefixes: mergeStringLists(
      DEFAULT_VAULT_PROFILE.excludeFolderPrefixes,
      stored.excludeFolderPrefixes
    ),
    excludePathSegments: mergeStringLists(
      DEFAULT_VAULT_PROFILE.excludePathSegments,
      stored.excludePathSegments
    ),
    minMarkdownForHub:
      typeof stored.minMarkdownForHub === "number"
        ? stored.minMarkdownForHub
        : DEFAULT_VAULT_PROFILE.minMarkdownForHub,
    deferReconsiderDelta:
      typeof stored.deferReconsiderDelta === "number"
        ? stored.deferReconsiderDelta
        : DEFAULT_VAULT_PROFILE.deferReconsiderDelta,
    skipRootWithoutHub:
      typeof stored.skipRootWithoutHub === "boolean"
        ? stored.skipRootWithoutHub
        : DEFAULT_VAULT_PROFILE.skipRootWithoutHub,
  };
}

export function profileDiffersFromStored(
  stored: Partial<VaultProfileV1> | undefined,
  merged: VaultProfileV1
): boolean {
  if (!stored || stored.version !== 1) {
    return true;
  }
  const storedPrefixes = [...(stored.excludeFolderPrefixes ?? [])].sort();
  const mergedPrefixes = [...merged.excludeFolderPrefixes].sort();
  if (storedPrefixes.join("\n") !== mergedPrefixes.join("\n")) {
    return true;
  }
  const storedSegments = [...(stored.excludePathSegments ?? [])].sort();
  const mergedSegments = [...merged.excludePathSegments].sort();
  return storedSegments.join("\n") !== mergedSegments.join("\n");
}
