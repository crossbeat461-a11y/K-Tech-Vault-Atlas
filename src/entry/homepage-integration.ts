import { App, TFile } from "obsidian";
import {
  isRecord,
  parseJsonUnknown,
  stringListHas,
  collectStrings,
} from "../type-guards";

const HOMEPAGE_PLUGIN_ID = "homepage";

interface HomepageEntry {
  value: string;
  kind: string;
  openOnStartup?: boolean;
}

interface HomepagePluginData {
  version?: number;
  homepages?: Record<string, HomepageEntry>;
  separateMobile?: boolean;
}

function readEnabledPluginIds(app: App): string[] {
  const pluginsUnknown: unknown = Reflect.get(app, "plugins");
  if (!isRecord(pluginsUnknown)) {
    return [];
  }
  const enabledUnknown: unknown = Reflect.get(
    pluginsUnknown,
    "enabledPlugins"
  );
  if (!(enabledUnknown instanceof Set)) {
    return [];
  }
  return collectStrings(Array.from(enabledUnknown));
}

function parseHomepageEntry(value: unknown): HomepageEntry | null {
  if (!isRecord(value)) {
    return null;
  }
  if (typeof value.value !== "string" || typeof value.kind !== "string") {
    return null;
  }
  const entry: HomepageEntry = {
    value: value.value,
    kind: value.kind,
  };
  if (typeof value.openOnStartup === "boolean") {
    entry.openOnStartup = value.openOnStartup;
  }
  return entry;
}

function parseHomepagePluginData(
  value: unknown
): HomepagePluginData | null {
  if (!isRecord(value)) {
    return null;
  }
  const data: HomepagePluginData = {};
  if (typeof value.version === "number") {
    data.version = value.version;
  }
  if (typeof value.separateMobile === "boolean") {
    data.separateMobile = value.separateMobile;
  }
  if (isRecord(value.homepages)) {
    const pages: Record<string, HomepageEntry> = {};
    const keys = Object.keys(value.homepages);
    for (const key of keys) {
      const entry = parseHomepageEntry(value.homepages[key]);
      if (entry) {
        pages[key] = entry;
      }
    }
    data.homepages = pages;
  }
  return data;
}

export function isHomepagePluginEnabled(app: App): boolean {
  return stringListHas(readEnabledPluginIds(app), HOMEPAGE_PLUGIN_ID);
}

export async function readHomepagePluginData(
  app: App
): Promise<HomepagePluginData | null> {
  if (!isHomepagePluginEnabled(app)) {
    return null;
  }
  const adapter = app.vault.adapter;
  const configPath = `${app.vault.configDir}/plugins/homepage/data.json`;
  try {
    if (!(await adapter.exists(configPath))) {
      return null;
    }
    const raw = await adapter.read(configPath);
    return parseHomepagePluginData(parseJsonUnknown(raw));
  } catch {
    return null;
  }
}

export function pickStartupHomepageEntry(
  data: HomepagePluginData
): HomepageEntry | null {
  const pages = data.homepages;
  if (!pages) {
    return null;
  }
  const entries: HomepageEntry[] = [];
  const keys = Object.keys(pages);
  for (const key of keys) {
    entries.push(pages[key]);
  }
  for (const entry of entries) {
    if (entry.kind === "File" && entry.openOnStartup) {
      return entry;
    }
  }
  for (const entry of entries) {
    if (entry.kind === "File") {
      return entry;
    }
  }
  return null;
}

export function resolveNotePathFromHomepageValue(
  app: App,
  value: string
): string | null {
  const trimmed = value.trim();
  if (!trimmed) {
    return null;
  }

  const candidates = trimmed.endsWith(".md")
    ? [trimmed]
    : [trimmed, `${trimmed}.md`];

  for (const candidate of candidates) {
    const file = app.vault.getAbstractFileByPath(candidate);
    if (file instanceof TFile) {
      return file.path;
    }
  }

  const matches = app.vault
    .getMarkdownFiles()
    .filter((file) => file.basename === trimmed.replace(/\.md$/i, ""));

  if (matches.length === 1) {
    return matches[0].path;
  }

  return null;
}

export async function resolveHomepageEntryPath(
  app: App
): Promise<string | null> {
  const data = await readHomepagePluginData(app);
  if (!data) {
    return null;
  }
  const entry = pickStartupHomepageEntry(data);
  if (!entry || entry.kind !== "File") {
    return null;
  }
  return resolveNotePathFromHomepageValue(app, entry.value);
}
