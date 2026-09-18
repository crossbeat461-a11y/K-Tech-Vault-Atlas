import type { VaultProfileV1 } from "../profile";

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---/;

export function parseFrontmatter(content: string): Record<string, string> {
  const match = FRONTMATTER_RE.exec(content);
  if (!match) {
    return {};
  }
  const result: Record<string, string> = {};
  for (const line of match[1].split("\n")) {
    const colon = line.indexOf(":");
    if (colon === -1) {
      continue;
    }
    const key = line.slice(0, colon).trim();
    let value = line.slice(colon + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    result[key] = value;
  }
  return result;
}

export function isHubNote(content: string, profile: VaultProfileV1): boolean {
  const fm = parseFrontmatter(content);
  return fm[profile.hubTypeProperty] === profile.hubTypeValue;
}

export function getHubManagedValue(
  content: string,
  profile: VaultProfileV1
): string | null {
  const fm = parseFrontmatter(content);
  const value = fm[profile.hubManagedProperty]?.trim();
  return value && value.length > 0 ? value : null;
}
