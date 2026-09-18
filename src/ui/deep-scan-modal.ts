import { App, Modal, Notice, Setting } from "obsidian";
import type VaultAtlasPlugin from "../main";
import type { VaultScanResult } from "../scan/report";

export interface DeepScanReviewResult {
  protectedFolderPaths: string[];
  excludePrefixes: string[];
}

export class DeepScanModal extends Modal {
  private readonly protectState = new Map<string, boolean>();
  private readonly excludeState = new Map<string, boolean>();

  constructor(
    app: App,
    private plugin: VaultAtlasPlugin,
    private result: VaultScanResult,
    private onComplete: () => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl, modalEl } = this;
    titleEl.setText("Deep Scan");
    contentEl.empty();
    contentEl.addClass("vault-atlas-deep-scan");
    modalEl.addClass("vault-atlas-deep-scan-modal");

    contentEl.createEl("p", {
      cls: "setting-item-description",
      text: "Vault 全体の見直しです。触らない HUB と除外フォルダを選び、保存後に通常スキャンへ戻ります。",
    });

    this.initState();
    this.renderHubSection(contentEl);
    this.renderExcludeSection(contentEl);
    this.renderActions(contentEl);
  }

  private initState(): void {
    for (const item of this.result.hubReviewItems) {
      this.protectState.set(
        item.folderPath,
        item.locked || item.protectSuggested
      );
    }
    for (const item of this.result.excludeSuggestions) {
      this.excludeState.set(item.prefix, true);
    }
  }

  private renderHubSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "既存 HUB" });

    if (this.result.hubReviewItems.length === 0) {
      containerEl.createEl("p", {
        text: "見直し対象の HUB がありません。",
        cls: "setting-item-description",
      });
      return;
    }

    for (const item of this.result.hubReviewItems) {
      const label = item.folderPath || "(root)";
      const descParts = [item.hubPath];
      if (item.hubManaged) {
        descParts.push(`${item.hubManaged}`);
      }
      if (item.locked) {
        descParts.push(`ロック: ${item.lockReasonLabel}`);
      } else {
        descParts.push("OFF = Atlas で管理（削除可） / ON = 触らない");
      }

      const setting = new Setting(containerEl)
        .setName(label)
        .setDesc(descParts.join(" / "))
        .addToggle((toggle) => {
          const protect = this.protectState.get(item.folderPath) ?? true;
          toggle.setValue(protect);
          if (item.locked) {
            toggle.setDisabled(true);
          } else {
            toggle.onChange((on) => {
              this.protectState.set(item.folderPath, on);
            });
          }
        });

      setting.settingEl.addClass("vault-atlas-hub-row");
      if (item.locked) {
        setting.settingEl.addClass("vault-atlas-hub-row-locked");
      }
    }
  }

  private renderExcludeSection(containerEl: HTMLElement): void {
    containerEl.createEl("h3", { text: "除外フォルダ候補" });

    if (this.result.excludeSuggestions.length === 0) {
      containerEl.createEl("p", {
        text: "新しい除外候補はありません。",
        cls: "setting-item-description",
      });
      return;
    }

    for (const item of this.result.excludeSuggestions) {
      new Setting(containerEl)
        .setName(item.prefix)
        .setDesc(`${item.reason}（md: ${item.markdownCount}）`)
        .addToggle((toggle) => {
          toggle.setValue(this.excludeState.get(item.prefix) ?? false);
          toggle.onChange((on) => {
            this.excludeState.set(item.prefix, on);
          });
        });
    }
  }

  private renderActions(containerEl: HTMLElement): void {
    const actions = containerEl.createDiv({ cls: "vault-atlas-panel-actions" });

    actions.createEl("button", {
      cls: "mod-cta",
      text: "保存して反映",
      type: "button",
    }).addEventListener("click", () => {
      void this.saveReview();
    });

    actions.createEl("button", {
      text: "キャンセル",
      type: "button",
    }).addEventListener("click", () => {
      this.close();
    });
  }

  private collectReview(): DeepScanReviewResult {
    const protectedFolderPaths: string[] = [];
    for (const item of this.result.hubReviewItems) {
      const protect =
        item.locked || (this.protectState.get(item.folderPath) ?? true);
      if (protect) {
        protectedFolderPaths.push(item.folderPath);
      }
    }

    const excludePrefixes = this.result.excludeSuggestions
      .filter((item) => this.excludeState.get(item.prefix))
      .map((item) => item.prefix);

    return { protectedFolderPaths, excludePrefixes };
  }

  private async saveReview(): Promise<void> {
    const review = this.collectReview();
    try {
      await this.plugin.applyDeepScanReview(review);
      new Notice("Vault Atlas: Deep Scan を保存しました");
      this.close();
      this.onComplete();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存に失敗しました";
      new Notice(`Vault Atlas: ${message}`);
    }
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
