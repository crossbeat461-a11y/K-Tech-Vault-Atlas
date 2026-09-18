import type { VaultProfileV1 } from "./profile";

export interface HubDeferredEntry {
  folderPath: string;
  mdCountAtDefer: number;
  deferredAt: string;
}

export function shouldReconsiderDeferredHub(
  entry: HubDeferredEntry,
  currentMdCount: number,
  profile: VaultProfileV1
): { reconsider: boolean; reason: string | null } {
  const minMd = profile.minMarkdownForHub;
  const delta = profile.deferReconsiderDelta;

  if (
    currentMdCount >= minMd &&
    entry.mdCountAtDefer < minMd
  ) {
    return {
      reconsider: true,
      reason: `ノートが ${minMd} 件以上に増加（保留時 ${entry.mdCountAtDefer} 件）`,
    };
  }

  if (currentMdCount >= entry.mdCountAtDefer + delta) {
    return {
      reconsider: true,
      reason: `ノートが ${delta} 件以上増加（保留時 ${entry.mdCountAtDefer} 件 → 現在 ${currentMdCount} 件）`,
    };
  }

  return { reconsider: false, reason: null };
}

export function upsertDeferredEntry(
  entries: HubDeferredEntry[],
  folderPath: string,
  mdCount: number
): HubDeferredEntry[] {
  const next: HubDeferredEntry = {
    folderPath,
    mdCountAtDefer: mdCount,
    deferredAt: new Date().toISOString(),
  };
  const filtered = entries.filter((e) => e.folderPath !== folderPath);
  return [...filtered, next].sort((a, b) =>
    a.folderPath.localeCompare(b.folderPath, "ja")
  );
}

export function removeDeferredEntry(
  entries: HubDeferredEntry[],
  folderPath: string
): HubDeferredEntry[] {
  return entries.filter((e) => e.folderPath !== folderPath);
}

export function parseHubDeferred(raw: unknown): HubDeferredEntry[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const result: HubDeferredEntry[] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") {
      continue;
    }
    const row = item as Record<string, unknown>;
    if (typeof row.folderPath !== "string" || row.folderPath.length === 0) {
      continue;
    }
    if (typeof row.mdCountAtDefer !== "number") {
      continue;
    }
    result.push({
      folderPath: row.folderPath,
      mdCountAtDefer: row.mdCountAtDefer,
      deferredAt:
        typeof row.deferredAt === "string"
          ? row.deferredAt
          : new Date(0).toISOString(),
    });
  }
  return result;
}
