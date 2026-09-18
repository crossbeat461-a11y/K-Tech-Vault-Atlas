export type HubNaming = "flexible" | "folder-match";

export interface VaultProfileV1 {
  version: 1;
  entryNotePath: string;
  hubTypeProperty: string;
  hubTypeValue: string;
  hubNaming: HubNaming;
  excludeFolderPrefixes: string[];
  dailyFolderPattern: string | null;
  confirmedAt: string;
}

export const DEFAULT_VAULT_PROFILE: VaultProfileV1 = {
  version: 1,
  entryNotePath: "Home.md",
  hubTypeProperty: "type",
  hubTypeValue: "hub",
  hubNaming: "flexible",
  excludeFolderPrefixes: [".obsidian/", ".cursor/", "node_modules/"],
  dailyFolderPattern: "00 Inbox/Daily/",
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
    excludeFolderPrefixes:
      stored.excludeFolderPrefixes ?? DEFAULT_VAULT_PROFILE.excludeFolderPrefixes,
  };
}
