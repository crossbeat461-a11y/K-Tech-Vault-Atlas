import { TFile, TFolder } from "obsidian";
import { folderBasename } from "../path-utils";
import { stringListHas } from "../type-guards";
import {
  extractWikilinkTargets,
  normalizeLinkTarget,
} from "./hub-network";

const MARKDOWN_LINK_RE = /\[(?:[^\]]*)\]\(([^)\s]+)\)/g;

export interface HubNoteGapItem {
  folderPath: string;
  hubPath: string;
  missingNotes: string[];
  staleLinks: string[];
  canAppend: boolean;
  skipReason: "locked" | "dataview" | null;
}

export function hasDynamicListing(content: string): boolean {
  return /```+\s*dataviewjs?\b/i.test(content);
}

export function extractMarkdownLinkTargets(content: string): string[] {
  const flags = MARKDOWN_LINK_RE.global
    ? MARKDOWN_LINK_RE.flags
    : `${MARKDOWN_LINK_RE.flags}g`;
  const re = new RegExp(MARKDOWN_LINK_RE.source, flags);
  const values: string[] = [];
  let match: RegExpExecArray | null = re.exec(content);
  while (match) {
    const raw = match[1];
    if (typeof raw === "string" && raw.length > 0) {
      const trimmed = raw.split("#")[0].split("?")[0].trim();
      if (trimmed.length > 0) {
        values.push(decodeLinkPath(trimmed));
      }
    }
    match = re.exec(content);
  }
  return values;
}

function decodeLinkPath(raw: string): string {
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

export function collectListedTargets(content: string): string[] {
  return [
    ...extractWikilinkTargets(content),
    ...extractMarkdownLinkTargets(content),
  ].map((target) => normalizeLinkTarget(target));
}

export function noteIsListedInHub(notePath: string, content: string): boolean {
  const noExt = normalizeLinkTarget(notePath);
  const leaf = folderBasename(noExt);
  for (const target of collectListedTargets(content)) {
    if (target === noExt || target === leaf) {
      return true;
    }
  }
  return false;
}

export function listDirectNotePaths(
  folder: TFolder,
  hubFilePaths: readonly string[]
): string[] {
  const notes: string[] = [];
  for (const child of folder.children) {
    if (!(child instanceof TFile) || child.extension !== "md") {
      continue;
    }
    if (stringListHas(hubFilePaths, child.path)) {
      continue;
    }
    notes.push(child.path);
  }
  notes.sort((a, b) => a.localeCompare(b, "ja"));
  return notes;
}

export function findStaleFolderLinks(
  folderPath: string,
  content: string,
  currentNotePaths: readonly string[],
  hubFilePaths: readonly string[]
): string[] {
  const known = new Set(
    [...currentNotePaths, ...hubFilePaths].map((path) =>
      normalizeLinkTarget(path)
    )
  );
  const prefix = folderPath ? `${folderPath}/` : "";
  const stale: string[] = [];
  const seen = new Set<string>();

  for (const target of collectListedTargets(content)) {
    if (seen.has(target)) {
      continue;
    }
    const inThisFolder =
      prefix.length > 0
        ? target === folderPath || target.startsWith(prefix)
        : target.indexOf("/") === -1;
    if (!inThisFolder) {
      continue;
    }
    if (known.has(target)) {
      continue;
    }
    seen.add(target);
    stale.push(target);
  }

  stale.sort((a, b) => a.localeCompare(b, "ja"));
  return stale;
}

export function buildHubNoteGap(input: {
  folderPath: string;
  hubPath: string;
  hubContent: string;
  folder: TFolder;
  hubFilePaths: readonly string[];
  locked: boolean;
}): HubNoteGapItem | null {
  const dynamic = hasDynamicListing(input.hubContent);
  const notes = listDirectNotePaths(input.folder, input.hubFilePaths);
  const missingNotes = dynamic
    ? []
    : notes.filter((path) => !noteIsListedInHub(path, input.hubContent));
  const staleLinks = findStaleFolderLinks(
    input.folderPath,
    input.hubContent,
    notes,
    input.hubFilePaths
  );

  if (missingNotes.length === 0 && staleLinks.length === 0) {
    return null;
  }

  const skipReason = input.locked ? "locked" : dynamic ? "dataview" : null;

  return {
    folderPath: input.folderPath,
    hubPath: input.hubPath,
    missingNotes,
    staleLinks,
    canAppend: skipReason === null && missingNotes.length > 0,
    skipReason,
  };
}
