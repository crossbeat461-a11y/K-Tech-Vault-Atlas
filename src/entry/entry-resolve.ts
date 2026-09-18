import { App, TFile } from "obsidian";
import type { EntrySource, VaultProfileV1 } from "../profile";
import {
  isHomepagePluginEnabled,
  resolveHomepageEntryPath,
} from "./homepage-integration";

export interface ResolvedEntry {
  effectivePath: string | null;
  source: EntrySource;
  homepageAvailable: boolean;
  homepagePath: string | null;
  manualPath: string;
  exists: boolean;
  displayLabel: string;
}

export async function resolveEntry(
  app: App,
  profile: VaultProfileV1
): Promise<ResolvedEntry> {
  const homepageAvailable = isHomepagePluginEnabled(app);
  const homepagePath = homepageAvailable
    ? await resolveHomepageEntryPath(app)
    : null;
  const manualPath = profile.entryNotePath.trim() || "Home.md";

  let effectivePath: string | null = null;
  let source: EntrySource = profile.entrySource;

  if (profile.entrySource === "homepage") {
    if (homepagePath) {
      effectivePath = homepagePath;
      source = "homepage";
    } else {
      effectivePath = manualPath;
      source = "manual";
    }
  } else {
    effectivePath = manualPath;
    source = "manual";
  }

  const file = effectivePath
    ? app.vault.getAbstractFileByPath(effectivePath)
    : null;
  const exists = file instanceof TFile;

  const displayLabel =
    source === "homepage" && homepagePath
      ? `${effectivePath ?? manualPath}（Homepage 連携）`
      : `${effectivePath ?? manualPath}（手動）`;

  return {
    effectivePath,
    source,
    homepageAvailable,
    homepagePath,
    manualPath,
    exists,
    displayLabel,
  };
}

export function effectiveEntryPathForScan(
  resolved: ResolvedEntry
): string {
  return resolved.effectivePath ?? resolved.manualPath;
}
