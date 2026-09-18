import {
  DEFAULT_VAULT_PROFILE,
  mergeVaultProfile,
  type VaultProfileV1,
} from "./profile";
import {
  parseHubDeferred,
  type HubDeferredEntry,
} from "./hub-defer";
import { parseHubProtected } from "./hub/hub-protect";
import { isRecord } from "./type-guards";

export interface PluginStorage {
  vaultProfile: VaultProfileV1;
  hubDeferred: HubDeferredEntry[];
  hubProtected: string[];
  lastSeenVersion?: string;
}

export function parseStorage(raw: unknown): PluginStorage {
  if (!isRecord(raw)) {
    return {
      vaultProfile: { ...DEFAULT_VAULT_PROFILE },
      hubDeferred: [],
      hubProtected: [],
    };
  }

  if ("vaultProfile" in raw) {
    return {
      vaultProfile: mergeVaultProfile(raw.vaultProfile),
      hubDeferred: parseHubDeferred(raw.hubDeferred),
      hubProtected: parseHubProtected(raw.hubProtected),
      lastSeenVersion:
        typeof raw.lastSeenVersion === "string"
          ? raw.lastSeenVersion
          : undefined,
    };
  }

  return {
    vaultProfile: mergeVaultProfile(raw),
    hubDeferred: parseHubDeferred(raw.hubDeferred),
    hubProtected: parseHubProtected(raw.hubProtected),
    lastSeenVersion: undefined,
  };
}

export function toStorage(
  vaultProfile: VaultProfileV1,
  hubDeferred: HubDeferredEntry[],
  hubProtected: string[],
  lastSeenVersion?: string
): PluginStorage {
  return { vaultProfile, hubDeferred, hubProtected, lastSeenVersion };
}
