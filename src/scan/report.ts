export type FindingSeverity = "info" | "warn" | "gap";

export interface ScanFinding {
  severity: FindingSeverity;
  code: string;
  message: string;
  path: string;
  detail?: string;
}

export interface VaultScanResult {
  generatedAt: string;
  vaultName: string;
  foldersScanned: number;
  hubCount: number;
  needsDecision: number;
  findings: ScanFinding[];
}

const SEVERITY_ICON: Record<FindingSeverity, string> = {
  info: "✅",
  warn: "⚠️",
  gap: "❓",
};

export function formatReportMarkdown(result: VaultScanResult): string {
  const lines: string[] = [
    "# Vault Atlas Report",
    "",
    `Generated: ${result.generatedAt}`,
    `Vault: ${result.vaultName}`,
    "",
    "## Summary",
    `- Folders scanned: ${result.foldersScanned}`,
    `- Hubs found: ${result.hubCount}`,
    `- Needs decision: ${result.needsDecision}`,
    "",
    "## Findings",
    "",
  ];

  for (const finding of result.findings) {
    const icon = SEVERITY_ICON[finding.severity];
    lines.push(`${icon} ${finding.message}`);
    if (finding.detail) {
      lines.push(`   ${finding.detail}`);
    }
  }

  if (result.findings.length === 0) {
    lines.push("_No findings._");
  }

  lines.push("");
  return lines.join("\n");
}
