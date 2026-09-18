import {
  DEFAULT_VAULT_PROFILE,
  mergeVaultProfile,
  type VaultProfileV1,
} from "./profile";
import {
  parseHubDeferred,
  type HubDeferredEntry,
} from "./hub-defer";

export interface PluginStorage {
  vaultProfile: VaultProfileV1;
  hubDeferred: HubDeferredEntry[];
  lastSeenVersion?: string;
}

export function parseStorage(raw: unknown): PluginStorage {
  if (!raw || typeof raw !== "object") {
    return { vaultProfile: { ...DEFAULT_VAULT_PROFILE }, hubDeferred: [] };
  }

  const data = raw as Record<string, unknown>;

  if ("vaultProfile" in data) {
    return {
      vaultProfile: mergeVaultProfile(
        data.vaultProfile as Partial<VaultProfileV1> | undefined
      ),
      hubDeferred: parseHubDeferred(data.hubDeferred),
      lastSeenVersion:
        typeof data.lastSeenVersion === "string"
          ? data.lastSeenVersion
          : undefined,
    };
  }

  return {
    vaultProfile: mergeVaultProfile(data as Partial<VaultProfileV1>),
    hubDeferred: parseHubDeferred(data.hubDeferred),
    lastSeenVersion: undefined,
  };
}

export function toStorage(
  vaultProfile: VaultProfileV1,
  hubDeferred: HubDeferredEntry[],
  lastSeenVersion?: string
): PluginStorage {
  return { vaultProfile, hubDeferred, lastSeenVersion };
}
