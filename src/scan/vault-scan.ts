import { App, TFile, TFolder } from "obsidian";
import {
  effectiveEntryPathForScan,
  resolveEntry,
} from "../entry/entry-resolve";
import { findEntryUnlinkedHubs } from "../entry/entry-links";
import {
  shouldReconsiderDeferredHub,
  type HubDeferredEntry,
} from "../hub-defer";
import { suggestHubPath } from "../hub/hub-template";
import { folderPrefix, isScanExcluded } from "../path-utils";
import { isExcludedFolder, type VaultProfileV1 } from "../profile";
import {
  buildHubNetworkContext,
  countChildHubs,
  enrichRecommendReason,
} from "./hub-network";
import { isHubNote } from "./hub-detect";
import { suggestExcludeFolders } from "./exclude-suggest";
import { buildFolderGuide } from "./folder-guide";
import { resolveHubLock } from "./hub-lock";
import {
  recommendHubReason,
  resolveParentHubPath,
  type HubRecommendInput,
} from "./hub-recommend";
import type {
  DeferredHubWaiting,
  ExistingHubInfo,
  HubReviewItem,
  LinkGapItem,
  RecommendedHub,
  ReconsideredHub,
  ScanFinding,
  ScanMode,
  VaultScanResult,
} from "./report";

export interface ScanOptions {
  mode?: ScanMode;
  hubProtected?: string[];
}

function listMarkdownInFolder(folder: TFolder): TFile[] {
  return folder.children.filter(
    (child): child is TFile => child instanceof TFile && child.extension === "md"
  );
}

function collectFolders(root: TFolder, profile: VaultProfileV1): TFolder[] {
  const folders: TFolder[] = [];
  const walk = (folder: TFolder): void => {
    const path = folder.path;
    if (path && isScanExcluded(path, profile)) {
      return;
    }
    if (path && isExcludedFolder(folderPrefix(path), profile)) {
      return;
    }
    folders.push(folder);
    for (const child of folder.children) {
      if (child instanceof TFolder) {
        walk(child);
      }
    }
  };
  walk(root);
  return folders;
}

async function findHubFilesInFolder(
  app: App,
  folder: TFolder,
  profile: VaultProfileV1
): Promise<TFile[]> {
  const hubFiles: TFile[] = [];
  for (const file of listMarkdownInFolder(folder)) {
    const content = await app.vault.read(file);
    if (isHubNote(content, profile)) {
      hubFiles.push(file);
    }
  }
  return hubFiles;
}

function buildRecommendedHub(
  folderPath: string,
  noteCount: number,
  subfolderCount: number,
  parentHubPath: string | null,
  reason: string,
  hubPathsByFolder: Map<string, string>,
  hubContentsByPath: Map<string, string>
): RecommendedHub {
  const networkCtx = buildHubNetworkContext(
    folderPath,
    hubPathsByFolder,
    hubContentsByPath,
    null
  );
  return {
    folderPath,
    suggestedPath: suggestHubPath(folderPath),
    markdownCount: noteCount,
    subfolderCount,
    parentHubPath,
    reason,
    network: {
      parentHubFile: networkCtx.parentHubFile,
      parentHubFolder: networkCtx.parentHubFolder,
      listedInParentHub: networkCtx.listedInParentHub,
      parentLinksToChild: false,
      childHubCount: countChildHubs(folderPath, hubPathsByFolder),
    },
  };
}

export async function scanVault(
  app: App,
  profile: VaultProfileV1,
  hubDeferred: HubDeferredEntry[] = [],
  options: ScanOptions = {}
): Promise<VaultScanResult> {
  const scanMode: ScanMode = options.mode ?? "quick";
  const hubProtected = options.hubProtected ?? [];
  const resolvedEntry = await resolveEntry(app, profile);
  const entryPath = effectiveEntryPathForScan(resolvedEntry);
  const findings: ScanFinding[] = [];
  const hubReviewItems: HubReviewItem[] = [];
  const recommendedHubs: RecommendedHub[] = [];
  const reconsideredHubs: ReconsideredHub[] = [];
  const deferredWaiting: DeferredHubWaiting[] = [];
  const existingHubs: ExistingHubInfo[] = [];
  const linkGaps: LinkGapItem[] = [];
  const deferredByPath = new Map(
    hubDeferred.map((entry) => [entry.folderPath, entry])
  );
  const root = app.vault.getRoot();
  const folders = collectFolders(root, profile);

  const hubPathsByFolder = new Map<string, string>();
  const hubContentsByPath = new Map<string, string>();
  const hubFilesByFolder = new Map<string, TFile[]>();

  for (const folder of folders) {
    const folderPath = folder.path;
    if (isScanExcluded(folderPath, profile)) {
      continue;
    }
    const hubFiles = await findHubFilesInFolder(app, folder, profile);
    hubFilesByFolder.set(folderPath, hubFiles);
    if (hubFiles.length === 1) {
      const hubPath = hubFiles[0].path;
      hubPathsByFolder.set(folderPath, hubPath);
      hubContentsByPath.set(
        hubPath,
        await app.vault.read(hubFiles[0])
      );
    }
  }

  const entryFile = resolvedEntry.effectivePath
    ? app.vault.getAbstractFileByPath(resolvedEntry.effectivePath)
    : null;
  let entryContent = "";
  if (entryFile instanceof TFile) {
    entryContent = await app.vault.read(entryFile);
    findings.push({
      severity: "info",
      code: "ENTRY_FOUND",
      message: `入口ノート: ${resolvedEntry.displayLabel}`,
      path: entryPath,
    });
  } else {
    findings.push({
      severity: "gap",
      code: "ENTRY_MISSING",
      message: `入口ノートが見つかりません: ${entryPath}`,
      path: entryPath,
    });
  }

  if (
    profile.entrySource === "homepage" &&
    resolvedEntry.homepageAvailable &&
    !resolvedEntry.homepagePath
  ) {
    findings.push({
      severity: "warn",
      code: "HOMEPAGE_ENTRY_UNRESOLVED",
      message:
        "Homepage 連携 ON ですが、起動ノートを解決できません。手動パスにフォールバックしています。",
      path: entryPath,
    });
  }

  const entryUnlinkedHubs =
    entryFile instanceof TFile
      ? findEntryUnlinkedHubs(hubPathsByFolder, entryContent, profile)
      : [];

  for (const item of entryUnlinkedHubs) {
    findings.push({
      severity: "warn",
      code: "ENTRY_HUB_UNLINKED",
      message: `入口から未リンク: ${item.folderPath}`,
      path: item.hubPath,
    });
  }

  const hubCount = hubPathsByFolder.size;
  let optionalCount = 0;
  let skippedExcluded = 0;

  for (const [folderPath, hubPath] of hubPathsByFolder) {
    if (isScanExcluded(folderPath, profile)) {
      continue;
    }

    const hubContent = hubContentsByPath.get(hubPath) ?? "";
    const lock = resolveHubLock({
      folderPath,
      hubPath,
      hubContent,
      entryPath,
      hubProtected,
      profile,
    });

    if (scanMode === "deep") {
      hubReviewItems.push({
        folderPath,
        hubPath,
        locked: lock.locked,
        lockReason: lock.reason,
        lockReasonLabel: lock.reasonLabel,
        hubManaged: lock.hubManaged,
        protectSuggested:
          lock.locked ||
          hubProtected.includes(folderPath) ||
          lock.hubManaged !== profile.hubManagedAtlasValue,
      });
    }

    if (profile.skipRootWithoutHub && folderPath === "") {
      findings.push({
        severity: "warn",
        code: "ROOT_HUB_REDUNDANT",
        message: lock.locked
          ? `Vault ルートの HUB (${hubPath}) は入口 ${entryPath} と重複しやすいです（ロック中）`
          : `Vault ルートの HUB (${hubPath}) は入口 ${entryPath} と重複しやすいです。不要ならトグル OFF で削除を検討`,
        path: hubPath,
      });
      continue;
    }

    const childHubCount = countChildHubs(folderPath, hubPathsByFolder);
    const network = buildHubNetworkContext(
      folderPath,
      hubPathsByFolder,
      hubContentsByPath,
      hubPath
    );
    const folder = app.vault.getAbstractFileByPath(folderPath);
    const markdownCount =
      folder instanceof TFolder ? listMarkdownInFolder(folder).length : 0;
    const parentHubPath = resolveParentHubPath(
      folderPath,
      hubPathsByFolder,
      entryPath
    );

    existingHubs.push({
      folderPath,
      hubPath,
      markdownCount,
      childHubCount,
      listedInParentHub: network.listedInParentHub,
      linkedFromParent: network.parentHubFile
        ? network.parentLinksToChild
        : false,
      parentHubPath,
      parentHubFile: network.parentHubFile,
      locked: lock.locked,
      lockReason: lock.reason,
      lockReasonLabel: lock.reasonLabel,
      hubManaged: lock.hubManaged,
    });

    if (network.parentHubFile && !network.parentLinksToChild) {
      const parentLabel = network.parentHubFile.replace(/\.md$/i, "");
      const message = network.listedInParentHub
        ? `親 ${parentLabel} にフォルダ記載あり・子 HUB へのリンクなし`
        : `親 ${parentLabel} から未リンク`;
      linkGaps.push({
        folderPath,
        hubPath,
        parentHubPath: network.parentHubFile,
        message,
      });
      findings.push({
        severity: "warn",
        code: "HUB_LINK_GAP",
        message: `${folderPath}: ${message}`,
        path: folderPath,
        detail: network.parentHubFile,
      });
    }
  }

  for (const folder of folders) {
    const folderPath = folder.path;

    if (isScanExcluded(folderPath, profile)) {
      skippedExcluded += 1;
      continue;
    }

    const hubFiles = hubFilesByFolder.get(folderPath) ?? [];

    if (hubFiles.length > 0) {
      if (hubFiles.length > 1) {
        findings.push({
          severity: "warn",
          code: "HUB_MULTIPLE",
          message: `HUB が複数: ${folderPath || "(root)"}`,
          path: folderPath,
          detail: hubFiles.map((f) => f.path).join(", "),
        });
      }
      continue;
    }

    const mdFiles = listMarkdownInFolder(folder);
    const noteCount = mdFiles.length;
    const subfolderCount = folder.children.filter(
      (c) => c instanceof TFolder
    ).length;

    const parentPath = folderPath.includes("/")
      ? folderPath.split("/").slice(0, -1).join("/")
      : "";
    const hasParentHub = hubPathsByFolder.has(parentPath);

    const recommendInput: HubRecommendInput = {
      folderPath,
      markdownCount: noteCount,
      subfolderCount,
      hasParentHub,
      profile,
    };

    const baseReason = recommendHubReason(recommendInput);
    if (!baseReason) {
      if (noteCount >= 1 || subfolderCount > 0) {
        optionalCount += 1;
      }
      continue;
    }

    const parentHubPath = resolveParentHubPath(
      folderPath,
      hubPathsByFolder,
      entryPath
    );
    const networkCtx = buildHubNetworkContext(
      folderPath,
      hubPathsByFolder,
      hubContentsByPath,
      null
    );
    const reason = enrichRecommendReason(baseReason, networkCtx);
    const hub = buildRecommendedHub(
      folderPath,
      noteCount,
      subfolderCount,
      parentHubPath,
      reason,
      hubPathsByFolder,
      hubContentsByPath
    );

    const deferredEntry = deferredByPath.get(folderPath);
    if (deferredEntry) {
      const { reconsider, reason: reconsiderReason } =
        shouldReconsiderDeferredHub(deferredEntry, noteCount, profile);
      if (reconsider && reconsiderReason) {
        reconsideredHubs.push({
          ...hub,
          mdCountAtDefer: deferredEntry.mdCountAtDefer,
          reconsiderReason,
        });
        findings.push({
          severity: "action",
          code: "HUB_RECONSIDER",
          message: `HUB 再検討: ${folderPath} — ${reconsiderReason}`,
          path: folderPath,
          detail: hub.suggestedPath,
        });
      } else {
        deferredWaiting.push({
          folderPath,
          mdCountAtDefer: deferredEntry.mdCountAtDefer,
          currentMdCount: noteCount,
          deferredAt: deferredEntry.deferredAt,
          suggestedPath: hub.suggestedPath,
          parentHubPath: hub.parentHubPath,
          parentHubFile: hub.network.parentHubFile,
          parentLinksToChild: hub.network.parentLinksToChild,
        });
      }
      continue;
    }

    recommendedHubs.push(hub);
    findings.push({
      severity: "action",
      code: "HUB_RECOMMENDED",
      message: `HUB 推奨: ${folderPath} — ${reason}（md:${noteCount}）`,
      path: folderPath,
      detail: hub.suggestedPath,
    });
  }

  reconsideredHubs.sort((a, b) =>
    a.folderPath.localeCompare(b.folderPath, "ja")
  );
  deferredWaiting.sort((a, b) =>
    a.folderPath.localeCompare(b.folderPath, "ja")
  );
  recommendedHubs.sort((a, b) => {
    const aListed = a.network.listedInParentHub ? 0 : 1;
    const bListed = b.network.listedInParentHub ? 0 : 1;
    if (aListed !== bListed) {
      return aListed - bListed;
    }
    return a.folderPath.localeCompare(b.folderPath, "ja");
  });
  existingHubs.sort((a, b) => a.folderPath.localeCompare(b.folderPath, "ja"));
  linkGaps.sort((a, b) => a.folderPath.localeCompare(b.folderPath, "ja"));
  hubReviewItems.sort((a, b) => a.folderPath.localeCompare(b.folderPath, "ja"));

  const excludeSuggestions =
    scanMode === "deep" ? suggestExcludeFolders(app, profile) : [];
  const folderGuide = buildFolderGuide(folders, profile);

  for (const item of folderGuide.emptyFolders) {
    findings.push({
      severity: "info",
      code: "FOLDER_EMPTY",
      message: `空フォルダ: ${item.folderPath}`,
      path: item.folderPath,
    });
  }
  for (const item of folderGuide.subfolderOnly) {
    findings.push({
      severity: "gap",
      code: "FOLDER_SUBFOLDER_ONLY",
      message: `整理候補: ${item.folderPath} — ${item.detail}`,
      path: item.folderPath,
    });
  }
  for (const group of folderGuide.namingDrift) {
    findings.push({
      severity: "warn",
      code: "FOLDER_NAMING_DRIFT",
      message: `命名ゆれ: ${group.parentPath} — ${group.folders.join(" / ")}（${group.reason}）`,
      path: group.parentPath,
      detail: group.folders.join(", "),
    });
  }

  return {
    generatedAt: new Date().toISOString(),
    vaultName: app.vault.getName(),
    scanMode,
    foldersScanned: folders.length,
    hubCount,
    needsDecision: recommendedHubs.length + reconsideredHubs.length,
    optionalCount,
    skippedExcluded,
    entryInfo: {
      effectivePath: resolvedEntry.effectivePath,
      source: resolvedEntry.source,
      homepageAvailable: resolvedEntry.homepageAvailable,
      homepagePath: resolvedEntry.homepagePath,
      manualPath: resolvedEntry.manualPath,
      exists: resolvedEntry.exists,
      displayLabel: resolvedEntry.displayLabel,
    },
    entryUnlinkedHubs,
    hubReviewItems,
    excludeSuggestions,
    folderGuide,
    recommendedHubs,
    reconsideredHubs,
    deferredWaiting,
    existingHubs,
    linkGaps,
    findings,
  };
}
