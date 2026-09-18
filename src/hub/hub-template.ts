import { folderBasename } from "../path-utils";

export function suggestHubPath(folderPath: string): string {
  const base = folderBasename(folderPath);
  return folderPath ? `${folderPath}/${base}.md` : `${base}.md`;
}

function wikilink(path: string, alias?: string): string {
  const noExt = path.replace(/\.md$/i, "");
  return alias ? `[[${noExt}|${alias}]]` : `[[${noExt}]]`;
}

export interface HubTemplateInput {
  folderPath: string;
  hubPath: string;
  parentHubPath: string | null;
  entryNotePath: string;
  childNotePaths: string[];
}

export function buildHubTemplate(input: HubTemplateInput): string {
  const title = folderBasename(input.folderPath);
  const tagStem = title.toLowerCase().replace(/[^a-z0-9]+/gi, "-").replace(/^-|-$/g, "");
  const tags = tagStem ? `[hub, ${tagStem}]` : "[hub]";

  const parentLink = input.parentHubPath
    ? wikilink(input.parentHubPath)
    : wikilink(input.entryNotePath, "Home");

  const childLinks = input.childNotePaths
    .sort((a, b) => a.localeCompare(b, "ja"))
    .map((path) => `- ${wikilink(path)}`)
    .join("\n");

  return `---
title: ${title}
type: hub
hub-managed: atlas
tags: ${tags}
---

# ${title}

## 入口

- 親ハブ: ${parentLink}
- 管制塔: ${wikilink(input.entryNotePath, "Home")}

## ノート

${childLinks || "- （まだノートがありません）"}
`;
}
