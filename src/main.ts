import { Notice, Plugin } from "obsidian";
import { openFundingModal } from "./funding";
import {
  removeDeferredEntry,
  upsertDeferredEntry,
} from "./hub-defer";
import { scanVault } from "./scan/vault-scan";
import type { VaultScanResult } from "./scan/report";
import { VaultAtlasSettingTab } from "./settings";
import {
  mergeVaultProfile,
  profileDiffersFromStored,
} from "./profile";
import { parseStorage, toStorage, type PluginStorage } from "./storage";
import { AtlasPanel } from "./ui/atlas-panel";

export default class VaultAtlasPlugin extends Plugin {
  settings: PluginStorage = parseStorage(undefined);
  private lastSeenVersion?: string;
  private atlasPanel: AtlasPanel | null = null;
  lastScanResult: VaultScanResult | null = null;

  async onload(): Promise<void> {
    await this.loadSettings();

    this.addSettingTab(new VaultAtlasSettingTab(this.app, this));

    this.addCommand({
      id: "open-vault-atlas",
      name: "Open Vault Atlas",
      callback: () => {
        this.openAtlasPanel();
      },
    });

    this.addCommand({
      id: "run-vault-scan",
      name: "Run vault scan",
      callback: () => {
        this.openAtlasPanel();
      },
    });

    this.addRibbonIcon("map", "Vault Atlas", () => {
      this.openAtlasPanel();
    });

    this.app.workspace.onLayoutReady(() => {
      void this.maybeShowFundingModal();
    });
  }

  openAtlasPanel(): void {
    if (this.atlasPanel) {
      this.atlasPanel.open();
      return;
    }
    this.atlasPanel = new AtlasPanel(this.app, this);
    this.atlasPanel.open();
  }

  onAtlasPanelClosed(): void {
    this.atlasPanel = null;
  }

  async scanVault(): Promise<VaultScanResult> {
    const result = await scanVault(
      this.app,
      this.settings.vaultProfile,
      this.settings.hubDeferred
    );
    this.lastScanResult = result;
    return result;
  }

  async loadSettings(): Promise<void> {
    const raw = await this.loadData();
    const storage = parseStorage(raw);
    const mergedProfile = mergeVaultProfile(storage.vaultProfile);
    const rawProfile = storage.vaultProfile;

    this.settings = {
      ...storage,
      vaultProfile: mergedProfile,
    };
    this.lastSeenVersion = storage.lastSeenVersion;

    if (profileDiffersFromStored(rawProfile, mergedProfile)) {
      await this.saveSettings();
    }
  }

  async saveSettings(): Promise<void> {
    await this.saveData(
      toStorage(
        this.settings.vaultProfile,
        this.settings.hubDeferred,
        this.lastSeenVersion
      )
    );
  }

  async deferHub(folderPath: string, mdCount: number): Promise<void> {
    this.settings.hubDeferred = upsertDeferredEntry(
      this.settings.hubDeferred,
      folderPath,
      mdCount
    );
    await this.saveSettings();
  }

  async deferHubs(
    items: { folderPath: string; mdCount: number }[]
  ): Promise<void> {
    let entries = this.settings.hubDeferred;
    for (const item of items) {
      entries = upsertDeferredEntry(
        entries,
        item.folderPath,
        item.mdCount
      );
    }
    this.settings.hubDeferred = entries;
    await this.saveSettings();
  }

  async clearDefer(folderPath: string): Promise<void> {
    this.settings.hubDeferred = removeDeferredEntry(
      this.settings.hubDeferred,
      folderPath
    );
    await this.saveSettings();
  }

  async clearDefers(folderPaths: string[]): Promise<void> {
    let entries = this.settings.hubDeferred;
    for (const folderPath of folderPaths) {
      entries = removeDeferredEntry(entries, folderPath);
    }
    this.settings.hubDeferred = entries;
    await this.saveSettings();
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
