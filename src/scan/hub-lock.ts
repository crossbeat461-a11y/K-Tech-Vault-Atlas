import { getHubManagedValue } from "./hub-detect";
import { isHubProtected } from "../hub/hub-protect";
import type { VaultProfileV1 } from "../profile";

export type HubLockReason = "entry" | "external" | "protected";

export interface HubLockStatus {
  locked: boolean;
  reason: HubLockReason | null;
  reasonLabel: string;
  hubManaged: string | null;
}

export function resolveHubLock(input: {
  folderPath: string;
  hubPath: string;
  hubContent: string;
  entryPath: string;
  hubProtected: string[];
  profile: VaultProfileV1;
}): HubLockStatus {
  const hubManaged = getHubManagedValue(input.hubContent, input.profile);

  if (input.hubPath === input.entryPath) {
    return {
      locked: true,
      reason: "entry",
      reasonLabel: "入口ノート",
      hubManaged,
    };
  }

  if (hubManaged === input.profile.hubManagedExternalValue) {
    return {
      locked: true,
      reason: "external",
      reasonLabel: "hub-managed: external",
      hubManaged,
    };
  }

  if (isHubProtected(input.folderPath, input.hubProtected)) {
    return {
      locked: true,
      reason: "protected",
      reasonLabel: "Deep Scan で保護",
      hubManaged,
    };
  }

  return {
    locked: false,
    reason: null,
    reasonLabel: "",
    hubManaged,
  };
}
