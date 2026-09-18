import type { EntrySource } from "../profile";
import type { HubLockReason } from "./hub-lock";

export type ScanMode = "quick" | "deep";
export type FindingSeverity = "info" | "warn" | "gap" | "action";

export interface ExcludeSuggestion {
  prefix: string;
  reason: string;
  markdownCount: number;
}

export interface HubReviewItem {
  folderPath: string;
  hubPath: string;
  locked: boolean;
  lockReason: HubLockReason | null;
  lockReasonLabel: string;
  hubManaged: string | null;
  protectSuggested: boolean;
}

export interface EntryInfo {
  effectivePath: string | null;
  source: EntrySource;
  homepageAvailable: boolean;
  homepagePath: string | null;
  manualPath: string;
  exists: boolean;
  displayLabel: string;
}

export interface EntryUnlinkedHub {
  folderPath: string;
  hubPath: string;
  label: string;
}

export interface ScanFinding {
  severity: FindingSeverity;
  code: string;
  message: string;
  path: string;
  detail?: string;
}

export interface HubNetworkStatus {
  parentHubFile: string | null;
  parentHubFolder: string | null;
  listedInParentHub: boolean;
  parentLinksToChild: boolean;
  childHubCount: number;
}

export interface RecommendedHub {
  folderPath: string;
  suggestedPath: string;
  markdownCount: number;
  subfolderCount: number;
  parentHubPath: string | null;
  reason: string;
  network: HubNetworkStatus;
}

export interface ReconsideredHub extends RecommendedHub {
  mdCountAtDefer: number;
  reconsiderReason: string;
}

export interface DeferredHubWaiting {
  folderPath: string;
  mdCountAtDefer: number;
  currentMdCount: number;
  deferredAt: string;
  suggestedPath: string;
  parentHubPath: string | null;
  parentHubFile: string | null;
  parentLinksToChild: boolean;
}

export interface ExistingHubInfo {
  folderPath: string;
  hubPath: string;
  markdownCount: number;
  childHubCount: number;
  listedInParentHub: boolean;
  linkedFromParent: boolean;
  parentHubPath: string | null;
  parentHubFile: string | null;
  locked: boolean;
  lockReason: HubLockReason | null;
  lockReasonLabel: string;
  hubManaged: string | null;
}

export interface LinkGapItem {
  folderPath: string;
  hubPath: string;
  parentHubPath: string;
  message: string;
}

export interface FolderGuideItem {
  folderPath: string;
  detail: string;
}

export interface NamingDriftGroup {
  parentPath: string;
  folders: string[];
  reason: string;
}

export interface FolderGuideResult {
  emptyFolders: FolderGuideItem[];
  subfolderOnly: FolderGuideItem[];
  namingDrift: NamingDriftGroup[];
}

export interface VaultScanResult {
  generatedAt: string;
  vaultName: string;
  scanMode: ScanMode;
  foldersScanned: number;
  hubCount: number;
  needsDecision: number;
  optionalCount: number;
  skippedExcluded: number;
  entryInfo: EntryInfo;
  entryUnlinkedHubs: EntryUnlinkedHub[];
  hubReviewItems: HubReviewItem[];
  excludeSuggestions: ExcludeSuggestion[];
  folderGuide: FolderGuideResult;
  recommendedHubs: RecommendedHub[];
  reconsideredHubs: ReconsideredHub[];
  deferredWaiting: DeferredHubWaiting[];
  existingHubs: ExistingHubInfo[];
  linkGaps: LinkGapItem[];
  findings: ScanFinding[];
}

const SEVERITY_ICON: Record<FindingSeverity, string> = {
  info: "✅",
  warn: "⚠️",
  gap: "❓",
  action: "➕",
};

export function formatReportMarkdown(result: VaultScanResult): string {
  const lines: string[] = [
    "# Vault Atlas Report",
    "",
    `Generated: ${result.generatedAt}`,
    `Vault: ${result.vaultName}`,
    "",
    "## Summary",
    `- Folders scanned: ${result.foldersScanned}`,
    `- Hubs found: ${result.hubCount}`,
    `- HUB 推奨（作成候補）: ${result.needsDecision}`,
    `- HUB 再検討（保留から）: ${result.reconsideredHubs.length}`,
    `- HUB 保留中: ${result.deferredWaiting.length}`,
    `- 任意（親 HUB で足りる等）: ${result.optionalCount}`,
    `- 除外スキップ: ${result.skippedExcluded}`,
    `- 入口: ${result.entryInfo.displayLabel}${result.entryInfo.exists ? "" : "（未作成）"}`,
    `- 入口未リンク HUB: ${result.entryUnlinkedHubs.length}`,
    `- スキャン種別: ${result.scanMode === "deep" ? "Deep Scan" : "通常"}`,
    "",
  ];

  if (result.excludeSuggestions.length > 0) {
    lines.push("## 除外フォルダ候補", "");
    for (const item of result.excludeSuggestions) {
      lines.push(
        `- \`${item.prefix}\` — ${item.reason}（md: ${item.markdownCount}）`
      );
    }
    lines.push("");
  }

  if (result.hubReviewItems.length > 0) {
    lines.push("## HUB 管理範囲", "");
    for (const item of result.hubReviewItems) {
      const lockNote = item.locked
        ? `（ロック: ${item.lockReasonLabel}）`
        : item.protectSuggested
          ? "（保護推奨）"
          : "（Atlas 管理可）";
      lines.push(`- \`${item.folderPath}\` → \`${item.hubPath}\`${lockNote}`);
    }
    lines.push("");
  }

  if (result.entryUnlinkedHubs.length > 0) {
    lines.push("## 入口未リンク HUB", "");
    for (const hub of result.entryUnlinkedHubs) {
      lines.push(`- ⚠️ \`${hub.folderPath}\` → \`${hub.hubPath}\``);
    }
    lines.push("");
  }

  if (result.reconsideredHubs.length > 0) {
    lines.push("## HUB 再検討", "");
    for (const hub of result.reconsideredHubs) {
      lines.push(
        `- 🔄 \`${hub.folderPath}\` → \`${hub.suggestedPath}\`（${hub.reconsiderReason}）`
      );
    }
    lines.push("");
  }

  if (result.deferredWaiting.length > 0) {
    lines.push("## HUB 保留中", "");
    for (const item of result.deferredWaiting) {
      lines.push(
        `- 💤 \`${item.folderPath}\`（保留時 ${item.mdCountAtDefer} 件 → 現在 ${item.currentMdCount} 件）`
      );
    }
    lines.push("");
  }

  if (result.recommendedHubs.length > 0) {
    lines.push("## HUB 推奨", "");
    for (const hub of result.recommendedHubs) {
      const net = hub.network;
      const parentNote =
        net.parentHubFile !== null
          ? ` / 親: ${net.parentHubFile}${net.listedInParentHub ? "（記載あり）" : ""}`
          : "";
      lines.push(
        `- ➕ \`${hub.folderPath}\` → \`${hub.suggestedPath}\`（${hub.reason}${parentNote}）`
      );
    }
    lines.push("");
  }

  if (result.existingHubs.length > 0) {
    lines.push(`## 既存 HUB（${result.existingHubs.length}）`, "");
    for (const hub of result.existingHubs) {
      lines.push(`- ✅ \`${hub.folderPath}\` → \`${hub.hubPath}\`（子 HUB: ${hub.childHubCount}）`);
    }
    lines.push("");
  }

  if (result.linkGaps.length > 0) {
    lines.push("## リンク不足", "");
    for (const gap of result.linkGaps) {
      lines.push(`- ⚠️ \`${gap.folderPath}\`: ${gap.message}`);
    }
    lines.push("");
  }

  const guide = result.folderGuide;
  if (
    guide.emptyFolders.length > 0 ||
    guide.subfolderOnly.length > 0 ||
    guide.namingDrift.length > 0
  ) {
    lines.push("## Folder Guide", "");
    if (guide.emptyFolders.length > 0) {
      lines.push("### 空フォルダ", "");
      for (const item of guide.emptyFolders) {
        lines.push(`- \`${item.folderPath}\` — ${item.detail}`);
      }
      lines.push("");
    }
    if (guide.subfolderOnly.length > 0) {
      lines.push("### 整理候補（サブフォルダのみ）", "");
      for (const item of guide.subfolderOnly) {
        lines.push(`- \`${item.folderPath}\` — ${item.detail}`);
      }
      lines.push("");
    }
    if (guide.namingDrift.length > 0) {
      lines.push("### 命名ゆれ", "");
      for (const group of guide.namingDrift) {
        lines.push(
          `- \`${group.parentPath}\`: ${group.folders.map((name) => `\`${name}\``).join(" / ")} — ${group.reason}`
        );
      }
      lines.push("");
    }
  }

  const otherFindings = result.findings.filter(
    (f) =>
      f.code !== "HUB_RECOMMENDED" &&
      f.code !== "FOLDER_EMPTY" &&
      f.code !== "FOLDER_SUBFOLDER_ONLY" &&
      f.code !== "FOLDER_NAMING_DRIFT"
  );

  if (otherFindings.length > 0) {
    lines.push("## その他", "");
    for (const finding of otherFindings) {
      const icon = SEVERITY_ICON[finding.severity];
      lines.push(`${icon} ${finding.message}`);
      if (finding.detail) {
        lines.push(`   ${finding.detail}`);
      }
    }
    lines.push("");
  }

  if (result.recommendedHubs.length === 0 && otherFindings.length === 0) {
    lines.push("_No findings._", "");
  }

  return lines.join("\n");
}
