import { folderBasename, parentFolderPath } from "../path-utils";

const WIKILINK_RE = /\[\[([^\]|#]+)(?:#[^\]|]+)?(?:\|[^\]]+)?\]\]/g;
const BACKTICK_FOLDER_RE = /`([^`/\\]+)\/?`/g;

export function normalizeLinkTarget(target: string): string {
  return target.replace(/\.md$/i, "").replace(/\\/g, "/").trim();
}

export function extractWikilinkTargets(content: string): string[] {
  const targets: string[] = [];
  for (const match of content.matchAll(WIKILINK_RE)) {
    targets.push(normalizeLinkTarget(match[1]));
  }
  return targets;
}

export function extractBacktickFolderNames(content: string): string[] {
  const names: string[] = [];
  for (const match of content.matchAll(BACKTICK_FOLDER_RE)) {
    names.push(match[1].trim());
  }
  return names;
}

function linkMatchesChildFolder(
  target: string,
  childFolderPath: string,
  childHubPath: string | null
): boolean {
  const leaf = folderBasename(childFolderPath);
  const normalized = normalizeLinkTarget(target);

  if (childHubPath) {
    const hubNoExt = normalizeLinkTarget(childHubPath);
    if (normalized === hubNoExt || normalized.endsWith(`/${leaf}/${leaf}`)) {
      return true;
    }
  }

  if (
    normalized === childFolderPath ||
    normalized.endsWith(`/${leaf}`) ||
    normalized.endsWith(`/${leaf}/${leaf}`)
  ) {
    return true;
  }

  return normalized.split("/").pop() === leaf;
}

export function isChildListedInParentHub(
  parentContent: string,
  childFolderPath: string
): boolean {
  const leaf = folderBasename(childFolderPath);

  for (const name of extractBacktickFolderNames(parentContent)) {
    if (name === leaf) {
      return true;
    }
  }

  for (const target of extractWikilinkTargets(parentContent)) {
    if (linkMatchesChildFolder(target, childFolderPath, null)) {
      return true;
    }
  }

  if (
    parentContent.includes(`${childFolderPath}/`) ||
    parentContent.includes(`/${leaf}/`)
  ) {
    return true;
  }

  return false;
}

export function parentLinksToChildHub(
  parentContent: string,
  childFolderPath: string,
  childHubPath: string
): boolean {
  for (const target of extractWikilinkTargets(parentContent)) {
    if (linkMatchesChildFolder(target, childFolderPath, childHubPath)) {
      return true;
    }
  }
  return false;
}

export interface NearestParentHub {
  parentFolderPath: string;
  parentHubFile: string;
}

export function findNearestParentHub(
  folderPath: string,
  hubPathsByFolder: Map<string, string>
): NearestParentHub | null {
  let current = parentFolderPath(folderPath);
  while (current !== null) {
    const hubFile = hubPathsByFolder.get(current);
    if (hubFile) {
      return { parentFolderPath: current, parentHubFile: hubFile };
    }
    if (current === "") {
      break;
    }
    current = parentFolderPath(current);
  }
  return null;
}

export interface HubNetworkContext {
  parentFolderPath: string | null;
  parentHubFolder: string | null;
  parentHubFile: string | null;
  listedInParentHub: boolean;
  parentLinksToChild: boolean;
}

export function buildHubNetworkContext(
  folderPath: string,
  hubPathsByFolder: Map<string, string>,
  hubContentsByPath: Map<string, string>,
  childHubPath: string | null
): HubNetworkContext {
  const nearest = findNearestParentHub(folderPath, hubPathsByFolder);

  if (!nearest) {
    return {
      parentFolderPath: folderPath.includes("/")
        ? folderPath.split("/").slice(0, -1).join("/")
        : null,
      parentHubFolder: null,
      parentHubFile: null,
      listedInParentHub: false,
      parentLinksToChild: false,
    };
  }

  const parentContent = hubContentsByPath.get(nearest.parentHubFile) ?? "";

  return {
    parentFolderPath: nearest.parentFolderPath,
    parentHubFolder: nearest.parentFolderPath,
    parentHubFile: nearest.parentHubFile,
    listedInParentHub: isChildListedInParentHub(parentContent, folderPath),
    parentLinksToChild:
      childHubPath !== null
        ? parentLinksToChildHub(parentContent, folderPath, childHubPath)
        : false,
  };
}

export function countChildHubs(
  folderPath: string,
  hubPathsByFolder: Map<string, string>
): number {
  const prefix = folderPath ? `${folderPath}/` : "";
  let count = 0;
  for (const path of hubPathsByFolder.keys()) {
    if (!path.startsWith(prefix) || path === folderPath) {
      continue;
    }
    const rest = path.slice(prefix.length);
    if (!rest.includes("/")) {
      count += 1;
    }
  }
  return count;
}

export function enrichRecommendReason(
  baseReason: string,
  network: Pick<HubNetworkContext, "listedInParentHub" | "parentHubFile">
): string {
  if (network.listedInParentHub && network.parentHubFile) {
    const parentLabel = network.parentHubFile.replace(/\.md$/i, "");
    return `親 ${parentLabel} に記載あり・子 HUB 未作成（${baseReason}）`;
  }
  if (network.parentHubFile) {
    const parentLabel = network.parentHubFile.replace(/\.md$/i, "");
    return `${baseReason}（親 HUB: ${parentLabel}）`;
  }
  return baseReason;
}
