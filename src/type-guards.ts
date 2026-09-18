export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function stringListHas(
  values: readonly string[],
  value: string
): boolean {
  return values.indexOf(value) !== -1;
}

export function parseJsonUnknown(text: string): unknown {
  return JSON.parse(text) as unknown;
}

export function asUnknownList(raw: unknown): unknown[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  return raw as unknown[];
}

export function collectStrings(raw: unknown): string[] {
  const result: string[] = [];
  for (const item of asUnknownList(raw)) {
    if (typeof item === "string") {
      result.push(item);
    }
  }
  return result;
}
