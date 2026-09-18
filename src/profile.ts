export type HubNaming = "flexible" | "folder-match";
export type EntrySource = "manual" | "homepage";

export interface VaultProfileV1 {
  version: 1;
  entrySource: EntrySource;
  entryNotePath: string;
  hubTypeProperty: string;
  hubTypeValue: string;
  hubManagedProperty: string;
  hubManagedExternalValue: string;
  hubManagedAtlasValue: string;
  hubNaming: HubNaming;
  excludeFolderPrefixes: string[];
  excludePathSegments: string[];
  dailyFolderPattern: string | null;
  minMarkdownForHub: number;
  deferReconsiderDelta: number;
  skipRootWithoutHub: boolean;
  reportExportFolder: string;
  confirmedAt: string;
}

export const DEFAULT_VAULT_PROFILE: VaultProfileV1 = {
  version: 1,
  entrySource: "manual",
  entryNotePath: "Home.md",
  hubTypeProperty: "type",
  hubTypeValue: "hub",
  hubManagedProperty: "hub-managed",
  hubManagedExternalValue: "external",
  hubManagedAtlasValue: "atlas",
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
  reportExportFolder: "90 System/Vault Atlas/",
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
    entrySource:
      stored.entrySource === "homepage" || stored.entrySource === "manual"
        ? stored.entrySource
        : DEFAULT_VAULT_PROFILE.entrySource,
    hubManagedProperty:
      typeof stored.hubManagedProperty === "string" &&
      stored.hubManagedProperty.trim()
        ? stored.hubManagedProperty.trim()
        : DEFAULT_VAULT_PROFILE.hubManagedProperty,
    hubManagedExternalValue:
      typeof stored.hubManagedExternalValue === "string" &&
      stored.hubManagedExternalValue.trim()
        ? stored.hubManagedExternalValue.trim()
        : DEFAULT_VAULT_PROFILE.hubManagedExternalValue,
    hubManagedAtlasValue:
      typeof stored.hubManagedAtlasValue === "string" &&
      stored.hubManagedAtlasValue.trim()
        ? stored.hubManagedAtlasValue.trim()
        : DEFAULT_VAULT_PROFILE.hubManagedAtlasValue,
    reportExportFolder:
      typeof stored.reportExportFolder === "string" &&
      stored.reportExportFolder.trim()
        ? normalizeFolderPath(stored.reportExportFolder.trim())
        : DEFAULT_VAULT_PROFILE.reportExportFolder,
  };
}

export function needsDeepScan(profile: VaultProfileV1): boolean {
  return profile.confirmedAt.trim().length === 0;
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
