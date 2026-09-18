import {
  findNearestParentHub,
  parentLinksToChildHub,
} from "../scan/hub-network";
import { isScanExcluded } from "../path-utils";
import type { VaultProfileV1 } from "../profile";
import type { EntryUnlinkedHub } from "../scan/report";

export function findEntryUnlinkedHubs(
  hubPathsByFolder: Map<string, string>,
  entryContent: string,
  profile: VaultProfileV1
): EntryUnlinkedHub[] {
  const unlinked: EntryUnlinkedHub[] = [];

  for (const [folderPath, hubPath] of hubPathsByFolder) {
    if (isScanExcluded(folderPath, profile)) {
      continue;
    }
    if (profile.skipRootWithoutHub && folderPath === "") {
      continue;
    }

    const nearestParent = findNearestParentHub(folderPath, hubPathsByFolder);
    if (nearestParent) {
      continue;
    }

    if (parentLinksToChildHub(entryContent, folderPath, hubPath)) {
      continue;
    }

    const label = folderPath || "(root)";
    unlinked.push({ folderPath, hubPath, label });
  }

  unlinked.sort((a, b) => a.folderPath.localeCompare(b.folderPath, "ja"));
  return unlinked;
}
