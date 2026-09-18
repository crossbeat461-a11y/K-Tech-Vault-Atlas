import { DEFAULT_VAULT_PROFILE, mergeVaultProfile, type VaultProfileV1 } from "./profile";

export interface PluginStorage {
  vaultProfile: VaultProfileV1;
  lastSeenVersion?: string;
}

export function parseStorage(raw: unknown): PluginStorage {
  if (!raw || typeof raw !== "object") {
    return { vaultProfile: { ...DEFAULT_VAULT_PROFILE } };
  }

  const data = raw as Record<string, unknown>;

  if ("vaultProfile" in data) {
    return {
      vaultProfile: mergeVaultProfile(
        data.vaultProfile as Partial<VaultProfileV1> | undefined
      ),
      lastSeenVersion:
        typeof data.lastSeenVersion === "string"
          ? data.lastSeenVersion
          : undefined,
    };
  }

  return {
    vaultProfile: mergeVaultProfile(data as Partial<VaultProfileV1>),
    lastSeenVersion: undefined,
  };
}

export function toStorage(
  vaultProfile: VaultProfileV1,
  lastSeenVersion?: string
): PluginStorage {
  return { vaultProfile, lastSeenVersion };
}
