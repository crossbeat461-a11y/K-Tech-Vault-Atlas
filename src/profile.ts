import { collectStrings, isRecord, stringListHas } from "./type-guards";

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

function readTrimmedString(value: unknown, fallback: string): string {
  return typeof value === "string" && value.trim() ? value.trim() : fallback;
}

function mergeStringLists(
  defaults: string[],
  stored: string[]
): string[] {
  return [...new Set([...defaults, ...stored])].sort((a, b) =>
    a.localeCompare(b, "ja")
  );
}

export function configDirExcludePrefix(configDir: string): string {
  return normalizeFolderPath(configDir);
}

export function withConfigDirExclude(
  profile: VaultProfileV1,
  configDir: string
): VaultProfileV1 {
  const prefix = configDirExcludePrefix(configDir);
  if (stringListHas(profile.excludeFolderPrefixes, prefix)) {
    return profile;
  }
  return {
    ...profile,
    excludeFolderPrefixes: mergeStringLists(profile.excludeFolderPrefixes, [
      prefix,
    ]),
  };
}

export function mergeVaultProfile(stored: unknown): VaultProfileV1 {
  if (!isRecord(stored) || stored.version !== 1) {
    return { ...DEFAULT_VAULT_PROFILE };
  }
  const daily =
    stored.dailyFolderPattern === null
      ? null
      : typeof stored.dailyFolderPattern === "string"
        ? stored.dailyFolderPattern
        : DEFAULT_VAULT_PROFILE.dailyFolderPattern;
  return {
    ...DEFAULT_VAULT_PROFILE,
    version: 1,
    entrySource:
      stored.entrySource === "homepage" || stored.entrySource === "manual"
        ? stored.entrySource
        : DEFAULT_VAULT_PROFILE.entrySource,
    entryNotePath: readTrimmedString(
      stored.entryNotePath,
      DEFAULT_VAULT_PROFILE.entryNotePath
    ),
    hubTypeProperty: readTrimmedString(
      stored.hubTypeProperty,
      DEFAULT_VAULT_PROFILE.hubTypeProperty
    ),
    hubTypeValue: readTrimmedString(
      stored.hubTypeValue,
      DEFAULT_VAULT_PROFILE.hubTypeValue
    ),
    hubManagedProperty: readTrimmedString(
      stored.hubManagedProperty,
      DEFAULT_VAULT_PROFILE.hubManagedProperty
    ),
    hubManagedExternalValue: readTrimmedString(
      stored.hubManagedExternalValue,
      DEFAULT_VAULT_PROFILE.hubManagedExternalValue
    ),
    hubManagedAtlasValue: readTrimmedString(
      stored.hubManagedAtlasValue,
      DEFAULT_VAULT_PROFILE.hubManagedAtlasValue
    ),
    hubNaming:
      stored.hubNaming === "folder-match" || stored.hubNaming === "flexible"
        ? stored.hubNaming
        : DEFAULT_VAULT_PROFILE.hubNaming,
    excludeFolderPrefixes: mergeStringLists(
      DEFAULT_VAULT_PROFILE.excludeFolderPrefixes,
      collectStrings(stored.excludeFolderPrefixes)
    ),
    excludePathSegments: mergeStringLists(
      DEFAULT_VAULT_PROFILE.excludePathSegments,
      collectStrings(stored.excludePathSegments)
    ),
    dailyFolderPattern: daily,
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
    reportExportFolder:
      typeof stored.reportExportFolder === "string" &&
      stored.reportExportFolder.trim()
        ? normalizeFolderPath(stored.reportExportFolder.trim())
        : DEFAULT_VAULT_PROFILE.reportExportFolder,
    confirmedAt:
      typeof stored.confirmedAt === "string"
        ? stored.confirmedAt
        : DEFAULT_VAULT_PROFILE.confirmedAt,
  };
}

export function needsDeepScan(profile: VaultProfileV1): boolean {
  return profile.confirmedAt.trim().length === 0;
}

export function profileDiffersFromStored(
  stored: unknown,
  merged: VaultProfileV1
): boolean {
  if (!isRecord(stored) || stored.version !== 1) {
    return true;
  }
  const storedPrefixes = [...collectStrings(stored.excludeFolderPrefixes)].sort();
  const mergedPrefixes = [...merged.excludeFolderPrefixes].sort();
  if (storedPrefixes.join("\n") !== mergedPrefixes.join("\n")) {
    return true;
  }
  const storedSegments = [...collectStrings(stored.excludePathSegments)].sort();
  const mergedSegments = [...merged.excludePathSegments].sort();
  return storedSegments.join("\n") !== mergedSegments.join("\n");
}
