import { App, TFile } from "obsidian";

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

export function isHomepagePluginEnabled(app: App): boolean {
  const plugin = app.plugins.getPlugin(HOMEPAGE_PLUGIN_ID);
  return plugin !== null && plugin instanceof Object;
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
    return JSON.parse(raw) as HomepagePluginData;
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
  for (const entry of Object.values(pages)) {
    if (entry.kind === "File" && entry.openOnStartup) {
      return entry;
    }
  }
  for (const entry of Object.values(pages)) {
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
