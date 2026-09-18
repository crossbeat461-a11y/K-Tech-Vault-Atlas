import { App, Modal, Notice, Plugin } from "obsidian";
import { openFundingModal } from "./funding";
import { formatReportMarkdown } from "./scan/report";
import { scanVault } from "./scan/vault-scan";
import { VaultAtlasSettingTab } from "./settings";
import { parseStorage, toStorage, type PluginStorage } from "./storage";

class ReportModal extends Modal {
  constructor(app: App, private markdown: string) {
    super(app);
  }

  onOpen(): void {
    const { contentEl } = this;
    contentEl.addClass("vault-atlas-report");
    contentEl.createEl("h2", { text: "Vault Atlas Report" });
    const pre = contentEl.createEl("pre");
    pre.textContent = this.markdown;
  }

  onClose(): void {
    this.contentEl.empty();
  }
}

export default class VaultAtlasPlugin extends Plugin {
  settings: PluginStorage = parseStorage(undefined);
  private lastSeenVersion?: string;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new VaultAtlasSettingTab(this.app, this));

    this.addCommand({
      id: "run-vault-scan",
      name: "Run vault scan",
      callback: () => {
        void this.runScan();
      },
    });

    this.addRibbonIcon("map", "Vault Atlas: Run scan", () => {
      void this.runScan();
    });

    this.app.workspace.onLayoutReady(() => {
      void this.maybeShowFundingModal();
    });
  }

  private async runScan(): Promise<void> {
    try {
      const result = await scanVault(this.app, this.settings.vaultProfile);
      const markdown = formatReportMarkdown(result);
      new ReportModal(this.app, markdown).open();
      new Notice(
        `Vault Atlas: ${result.needsDecision} item(s) need decision, ${result.hubCount} hub(s) found.`
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      new Notice(`Vault Atlas scan failed: ${message}`);
    }
  }

  async loadSettings(): Promise<void> {
    const storage = parseStorage(await this.loadData());
    this.settings = storage;
    this.lastSeenVersion = storage.lastSeenVersion;
  }

  async saveSettings(): Promise<void> {
    await this.saveData(
      toStorage(this.settings.vaultProfile, this.lastSeenVersion)
    );
  }

  private async maybeShowFundingModal(): Promise<void> {
    const currentVersion = this.manifest.version;
    if (this.lastSeenVersion === currentVersion) {
      return;
    }

    const kind = this.lastSeenVersion ? "update" : "install";
    window.setTimeout(() => {
      openFundingModal(this.app, kind, currentVersion);
    }, 800);

    this.lastSeenVersion = currentVersion;
    await this.saveSettings();
  }
}
