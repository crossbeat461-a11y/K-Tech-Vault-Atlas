import type {
  RecommendedHub,
  ReconsideredHub,
  VaultScanResult,
} from "../scan/report";

export type AtlasRowStatus =
  | "existing"
  | "recommended"
  | "reconsidered"
  | "deferred";

export interface AtlasPanelRow {
  folderPath: string;
  hubPath: string | null;
  suggestedPath: string;
  status: AtlasRowStatus;
  wantHub: boolean;
  locked: boolean;
  desc: string;
  markdownCount: number;
  parentHubPath: string | null;
  parentHubFile: string | null;
  parentLinksToChild: boolean;
}

function hubToRow(
  hub: RecommendedHub | ReconsideredHub,
  status: "recommended" | "reconsidered",
  wantHub: boolean
): AtlasPanelRow {
  const descParts = [hub.reason];
  if ("reconsiderReason" in hub) {
    descParts.unshift(hub.reconsiderReason);
  }
  if (hub.network.parentHubFile) {
    descParts.push(`親: ${hub.network.parentHubFile}`);
  }
  if (hub.network.listedInParentHub) {
    descParts.push("親に記載あり");
  }
  descParts.push(`md: ${hub.markdownCount}`);

  return {
    folderPath: hub.folderPath,
    hubPath: null,
    suggestedPath: hub.suggestedPath,
    status,
    wantHub,
    locked: false,
    desc: descParts.join(" / "),
    markdownCount: hub.markdownCount,
    parentHubPath: hub.parentHubPath,
    parentHubFile: hub.network.parentHubFile,
    parentLinksToChild: hub.network.parentLinksToChild,
  };
}

export function buildAtlasPanelRows(result: VaultScanResult): AtlasPanelRow[] {
  const byPath = new Map<string, AtlasPanelRow>();

  for (const hub of result.existingHubs) {
    const flags: string[] = ["既存 HUB"];
    if (hub.childHubCount > 0) {
      flags.push(`子 HUB ${hub.childHubCount}`);
    }
    if (hub.listedInParentHub) {
      flags.push("親に記載");
    }
    if (hub.linkedFromParent) {
      flags.push("親からリンク済");
    }
    if (hub.locked) {
      flags.push(`ロック: ${hub.lockReasonLabel}`);
    }

    byPath.set(hub.folderPath, {
      folderPath: hub.folderPath,
      hubPath: hub.hubPath,
      suggestedPath: hub.hubPath,
      status: "existing",
      wantHub: true,
      locked: hub.locked,
      desc: flags.join(" / "),
      markdownCount: hub.markdownCount,
      parentHubPath: hub.parentHubPath,
      parentHubFile: hub.parentHubFile,
      parentLinksToChild: hub.linkedFromParent,
    });
  }

  for (const hub of result.reconsideredHubs) {
    if (byPath.has(hub.folderPath)) {
      continue;
    }
    byPath.set(hub.folderPath, hubToRow(hub, "reconsidered", true));
  }

  for (const hub of result.recommendedHubs) {
    if (byPath.has(hub.folderPath)) {
      continue;
    }
    byPath.set(hub.folderPath, hubToRow(hub, "recommended", true));
  }

  for (const item of result.deferredWaiting) {
    if (byPath.has(item.folderPath)) {
      continue;
    }
    byPath.set(item.folderPath, {
      folderPath: item.folderPath,
      hubPath: null,
      suggestedPath: item.suggestedPath,
      status: "deferred",
      wantHub: false,
      locked: false,
      desc: `保留中（${item.mdCountAtDefer} 件 → 現在 ${item.currentMdCount} 件）`,
      markdownCount: item.currentMdCount,
      parentHubPath: item.parentHubPath,
      parentHubFile: item.parentHubFile,
      parentLinksToChild: item.parentLinksToChild,
    });
  }

  const statusOrder: Record<AtlasRowStatus, number> = {
    reconsidered: 0,
    recommended: 1,
    deferred: 2,
    existing: 3,
  };

  return [...byPath.values()].sort((a, b) => {
    const order = statusOrder[a.status] - statusOrder[b.status];
    if (order !== 0) {
      return order;
    }
    return a.folderPath.localeCompare(b.folderPath, "ja");
  });
}

export function statusLabel(status: AtlasRowStatus): string {
  switch (status) {
    case "existing":
      return "既存";
    case "recommended":
      return "推奨";
    case "reconsidered":
      return "再検討";
    case "deferred":
      return "保留";
  }
}
