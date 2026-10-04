import { App, TFile, TFolder } from "obsidian";
import { folderBasename } from "../path-utils";
import { isHubNote } from "../scan/hub-detect";
import { resolveHubLock } from "../scan/hub-lock";
import {
  hasDynamicListing,
  listDirectNotePaths,
  noteIsListedInHub,
} from "../scan/hub-note-gap";
import type { VaultProfileV1 } from "../profile";

export type AppendMissingNotesFailure =
  | "missing-hub"
  | "missing-folder"
  | "locked"
  | "dataview"
  | "none";

export type AppendMissingNotesResult =
  | { ok: true; appended: number; hubPath: string }
  | { ok: false; reason: AppendMissingNotesFailure };

function wikilink(path: string): string {
  const noExt = path.replace(/\.md$/i, "");
  return `[[${noExt}]]`;
}

function alreadyHasWikilink(content: string, notePath: string): boolean {
  const noExt = notePath.replace(/\.md$/i, "");
  return content.includes(`[[${noExt}`);
}

export function insertNoteLinesIntoHub(
  content: string,
  notePaths: readonly string[]
): string {
  const uniqueLines: string[] = [];
  let working = content;
  for (const path of notePaths) {
    if (alreadyHasWikilink(working, path) || noteIsListedInHub(path, working)) {
      continue;
    }
    const line = `- ${wikilink(path)}`;
    uniqueLines.push(line);
    working = `${working}\n${line}`;
  }
  if (uniqueLines.length === 0) {
    return content;
  }

  const header = "## ノート";
  const idx = content.indexOf(header);
  if (idx === -1) {
    const trimmed = content.replace(/\s+$/, "");
    return `${trimmed}\n\n${header}\n\n${uniqueLines.join("\n")}\n`;
  }

  const afterHeader = content.indexOf("\n", idx);
  if (afterHeader === -1) {
    return `${content}\n${uniqueLines.join("\n")}\n`;
  }
  const nextSection = content.indexOf("\n## ", afterHeader + 1);
  const insertAt = nextSection === -1 ? content.length : nextSection;
  const before = content.slice(0, insertAt).replace(/\s+$/, "");
  const after = content.slice(insertAt);
  return `${before}\n${uniqueLines.join("\n")}\n${
    after.startsWith("\n") ? after : `\n${after}`
  }`;
}

async function listWritableNotePaths(
  app: App,
  folder: TFolder,
  hubPath: string,
  profile: VaultProfileV1
): Promise<string[]> {
  const hubFilePaths: string[] = [hubPath];
  for (const child of folder.children) {
    if (!(child instanceof TFile) || child.extension !== "md") {
      continue;
    }
    if (child.path === hubPath) {
      continue;
    }
    const body = await app.vault.read(child);
    if (isHubNote(body, profile)) {
      hubFilePaths.push(child.path);
    }
  }
  return listDirectNotePaths(folder, hubFilePaths);
}

export async function appendMissingNotesToHub(
  app: App,
  folderPath: string,
  hubPath: string,
  profile: VaultProfileV1,
  hubProtected: string[],
  entryPath: string
): Promise<AppendMissingNotesResult> {
  const hubFile = app.vault.getAbstractFileByPath(hubPath);
  if (!(hubFile instanceof TFile)) {
    return { ok: false, reason: "missing-hub" };
  }

  const folder = app.vault.getAbstractFileByPath(folderPath);
  if (!(folder instanceof TFolder)) {
    return { ok: false, reason: "missing-folder" };
  }

  const content = await app.vault.read(hubFile);
  const lock = resolveHubLock({
    folderPath,
    hubPath,
    hubContent: content,
    entryPath,
    hubProtected,
    profile,
  });
  if (lock.locked) {
    return { ok: false, reason: "locked" };
  }
  if (hasDynamicListing(content)) {
    return { ok: false, reason: "dataview" };
  }

  const notes = await listWritableNotePaths(app, folder, hubPath, profile);
  const missing = notes.filter(
    (path) =>
      app.vault.getAbstractFileByPath(path) instanceof TFile &&
      !noteIsListedInHub(path, content)
  );
  if (missing.length === 0) {
    return { ok: false, reason: "none" };
  }

  const updated = insertNoteLinesIntoHub(content, missing);
  if (updated === content) {
    return { ok: false, reason: "none" };
  }

  let appended = 0;
  for (const path of missing) {
    if (!noteIsListedInHub(path, content) && noteIsListedInHub(path, updated)) {
      appended += 1;
    }
  }
  if (appended === 0) {
    return { ok: false, reason: "none" };
  }

  await app.vault.modify(hubFile, updated);
  return { ok: true, appended, hubPath };
}

export function formatMissingNotesPreview(
  notePaths: readonly string[],
  limit = 8
): string {
  const names = notePaths.map((path) => folderBasename(path.replace(/\.md$/i, "")));
  if (names.length <= limit) {
    return names.join("、");
  }
  const shown = names.slice(0, limit).join("、");
  return `${shown}、他 ${names.length - limit} 件`;
}
