import { App, Modal, Notice, Setting } from "obsidian";
import type VaultAtlasPlugin from "../main";
import { appendHubLinkToEntry } from "../entry/entry-home-update";
import { createHomeEntryNote } from "../entry/entry-create";
import { deleteHubFile } from "../hub/hub-delete";
import { appendChildLinkToParentHub } from "../hub/hub-parent-update";
import { createHubForFolder } from "../hub/hub-create";
import { exportReportToVault } from "../report/report-export";
import { formatReportMarkdown, type VaultScanResult } from "../scan/report";
import {
  buildAtlasPanelRows,
  statusLabel,
  type AtlasPanelRow,
} from "./atlas-rows";
import { confirmAtlasAction } from "./confirm-modal";
import { DeepScanModal } from "./deep-scan-modal";

export class AtlasPanel extends Modal {
  private result: VaultScanResult | null = null;
  private scanning = false;
  private appendParentLinks = true;
  private headerEl!: HTMLElement;
  private bodyEl!: HTMLElement;
  private rescanBtnEl!: HTMLButtonElement;
  private deepScanBtnEl!: HTMLButtonElement;

  constructor(
    app: App,
    private plugin: VaultAtlasPlugin,
    private openOptions: { deepScan?: boolean } = {}
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl, modalEl } = this;
    titleEl.setText("Vault Atlas");
    contentEl.empty();
    contentEl.addClass("vault-atlas-panel");
    modalEl.addClass("vault-atlas-panel-modal");

    this.headerEl = contentEl.createDiv({ cls: "vault-atlas-panel-header" });
    this.bodyEl = contentEl.createDiv({ cls: "vault-atlas-panel-body" });

    this.renderHeaderShell();
    void this.bootstrapScan();
  }

  private async bootstrapScan(): Promise<void> {
    await this.rescan(false);
    if (this.openOptions.deepScan) {
      await this.runDeepScan(false);
      return;
    }
    if (this.plugin.shouldOfferInitialDeepScan()) {
      new Notice(
        "Vault Atlas: 初回の Deep Scan をおすすめします（ヘッダーの Deep Scan）"
      );
    }
  }

  private renderHeaderShell(): void {
    this.headerEl.empty();

    this.headerEl.createEl("p", {
      cls: "vault-atlas-panel-summary setting-item-description",
      text: "スキャン中…",
    });

    const actions = this.headerEl.createDiv({ cls: "vault-atlas-panel-actions" });

    this.rescanBtnEl = actions.createEl("button", {
      cls: "mod-cta",
      text: "再スキャン",
      type: "button",
    });
    this.rescanBtnEl.addEventListener("click", () => {
      void this.rescan(true);
    });

    this.deepScanBtnEl = actions.createEl("button", {
      text: "Deep Scan",
      type: "button",
    });
    this.deepScanBtnEl.addEventListener("click", () => {
      void this.runDeepScan(true);
    });

    actions.createEl("button", {
      text: "コピー",
      type: "button",
    }).addEventListener("click", () => {
      void this.copyMarkdownReport();
    });

    actions.createEl("button", {
      text: "レポート保存",
      type: "button",
    }).addEventListener("click", () => {
      void this.saveMarkdownReport();
    });
  }

  private updateSummary(): void {
    const summaryEl = this.headerEl.querySelector(".vault-atlas-panel-summary");
    if (!(summaryEl instanceof HTMLElement) || !this.result) {
      return;
    }
    summaryEl.setText(
      `HUB ${this.result.hubCount} 件 / 推奨 ${this.result.recommendedHubs.length} / 再検討 ${this.result.reconsideredHubs.length} / 保留 ${this.result.deferredWaiting.length} / 親リンク不足 ${this.result.linkGaps.length} / 入口未リンク ${this.result.entryUnlinkedHubs.length}`
    );
  }

  private setScanning(scanning: boolean): void {
    this.scanning = scanning;
    this.rescanBtnEl.disabled = scanning;
    this.deepScanBtnEl.disabled = scanning;
    this.rescanBtnEl.setText(scanning ? "スキャン中…" : "再スキャン");
    this.deepScanBtnEl.setText(scanning ? "Deep Scan中…" : "Deep Scan");
  }

  async rescan(notify: boolean): Promise<void> {
    if (this.scanning) {
      return;
    }
    this.setScanning(true);
    try {
      this.result = await this.plugin.scanVault("quick");
      this.renderBody();
      this.updateSummary();
      if (notify) {
        new Notice("Vault Atlas: 通常スキャン完了");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      new Notice(`Vault Atlas: スキャン失敗 — ${message}`);
    } finally {
      this.setScanning(false);
    }
  }

  async runDeepScan(notify: boolean): Promise<void> {
    if (this.scanning) {
      return;
    }
    this.setScanning(true);
    try {
      const deepResult = await this.plugin.scanVault("deep");
      this.setScanning(false);
      const modal = new DeepScanModal(this.app, this.plugin, deepResult, () => {
        void this.rescan(false);
      });
      modal.open();
      if (notify) {
        new Notice("Vault Atlas: Deep Scan を開きました");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      new Notice(`Vault Atlas: Deep Scan 失敗 — ${message}`);
      this.setScanning(false);
    }
  }

  private renderBody(): void {
    this.bodyEl.empty();
    if (!this.result) {
      this.bodyEl.createEl("p", { text: "スキャン結果がありません。" });
      return;
    }

    const rows = buildAtlasPanelRows(this.result);

    this.bodyEl.createEl("p", {
      cls: "setting-item-description",
      text: "通常スキャン: トグル ON = HUB あり / OFF = 削除して保留。ロック付き HUB は削除できません。Deep Scan で管理範囲を見直せます。",
    });

    this.renderEntrySection();

    if (rows.length === 0) {
      this.bodyEl.createEl("p", { text: "表示するフォルダがありません。" });
    } else {
      this.bodyEl.createEl("h3", { text: "HUB 構成" });
      for (const row of rows) {
        this.renderRowIn(this.bodyEl, row);
      }
    }

    const linkSetting = new Setting(this.bodyEl)
      .setName("親 HUB にリンクを追記")
      .setDesc("トグル ON で HUB を新規作成するとき、親へウィキリンクを足す")
      .addToggle((toggle) =>
        toggle.setValue(this.appendParentLinks).onChange((on) => {
          this.appendParentLinks = on;
        })
      );
    linkSetting.settingEl.addClass("vault-atlas-hub-row");

    if (this.result.linkGaps.length > 0) {
      this.bodyEl.createEl("h3", { text: "リンク不足" });
      const ul = this.bodyEl.createEl("ul");
      for (const gap of this.result.linkGaps) {
        ul.createEl("li", { text: `${gap.folderPath}: ${gap.message}` });
      }
      new Setting(this.bodyEl).addButton((btn) =>
        btn.setButtonText("親 HUB にリンクを追記").onClick(() => {
          void this.fixLinkGaps();
        })
      );
    }

    const warnings = this.result.findings.filter(
      (f) =>
        (f.severity === "warn" || f.severity === "gap") &&
        f.code !== "HUB_LINK_GAP" &&
        f.code !== "HUB_RECOMMENDED" &&
        f.code !== "HUB_RECONSIDER"
    );
    this.renderFolderGuideSection();

    if (warnings.length > 0) {
      const details = this.bodyEl.createEl("details");
      details.createEl("summary", { text: "確認事項" });
      const ul = details.createEl("ul");
      for (const w of warnings) {
        ul.createEl("li", { text: w.message });
      }
    }
  }

  private renderFolderGuideSection(): void {
    if (!this.result) {
      return;
    }

    const guide = this.result.folderGuide;
    const hasGuide =
      guide.emptyFolders.length > 0 ||
      guide.subfolderOnly.length > 0 ||
      guide.namingDrift.length > 0;

    if (!hasGuide) {
      return;
    }

    this.bodyEl.createEl("h3", { text: "Folder Guide" });
    this.bodyEl.createEl("p", {
      cls: "setting-item-description",
      text: "報告のみ。フォルダの自動変更は行いません。",
    });

    if (guide.emptyFolders.length > 0) {
      this.bodyEl.createEl("h4", { text: "空フォルダ" });
      const ul = this.bodyEl.createEl("ul");
      for (const item of guide.emptyFolders) {
        ul.createEl("li", { text: `${item.folderPath}: ${item.detail}` });
      }
    }

    if (guide.subfolderOnly.length > 0) {
      this.bodyEl.createEl("h4", { text: "整理候補（サブフォルダのみ）" });
      const ul = this.bodyEl.createEl("ul");
      for (const item of guide.subfolderOnly) {
        ul.createEl("li", { text: `${item.folderPath}: ${item.detail}` });
      }
    }

    if (guide.namingDrift.length > 0) {
      this.bodyEl.createEl("h4", { text: "命名ゆれ" });
      const ul = this.bodyEl.createEl("ul");
      for (const group of guide.namingDrift) {
        ul.createEl("li", {
          text: `${group.parentPath}: ${group.folders.join(" / ")} — ${group.reason}`,
        });
      }
    }
  }

  private renderEntrySection(): void {
    if (!this.result) {
      return;
    }

    const { entryInfo, entryUnlinkedHubs } = this.result;
    this.bodyEl.createEl("h3", { text: "入口" });
    this.bodyEl.createEl("p", {
      cls: "setting-item-description",
      text: entryInfo.exists
        ? entryInfo.displayLabel
        : `${entryInfo.displayLabel} — ファイル未作成`,
    });

    if (!entryInfo.exists && entryInfo.source === "manual") {
      new Setting(this.bodyEl)
        .setName("Home.md を作成")
        .setDesc("入口ノートが無いとき、最小テンプレートから作成します。")
        .addButton((button) =>
          button.setButtonText("作成").onClick(() => {
            void (async () => {
              try {
                const path = await createHomeEntryNote(
                  this.app,
                  entryInfo.manualPath
                );
                new Notice(`Vault Atlas: ${path} を作成しました`);
                await this.rescan(false);
              } catch (error) {
                const message =
                  error instanceof Error ? error.message : "作成失敗";
                new Notice(`Vault Atlas: ${message}`);
              }
            })();
          })
        );
    }

    if (entryUnlinkedHubs.length > 0) {
      this.bodyEl.createEl("h4", { text: "入口から未リンクの HUB" });
      const ul = this.bodyEl.createEl("ul");
      for (const hub of entryUnlinkedHubs) {
        ul.createEl("li", { text: `${hub.label} → ${hub.hubPath}` });
      }
      new Setting(this.bodyEl).addButton((btn) =>
        btn.setButtonText("入口にリンクを追記").onClick(() => {
          void this.fixEntryUnlinkedHubs();
        })
      );
    }
  }

  private renderRowIn(containerEl: HTMLElement, row: AtlasPanelRow): void {
    const desc = `[${statusLabel(row.status)}] ${row.desc}${row.hubPath ? ` → ${row.hubPath}` : ""}`;

    const setting = new Setting(containerEl)
      .setName(row.folderPath || "(root)")
      .setDesc(desc)
      .addToggle((toggle) => {
        toggle.setValue(row.wantHub);
        if (row.locked && row.wantHub) {
          toggle.setDisabled(true);
        } else {
          toggle.onChange((on) => {
            void this.applyToggle(row, on, () => {
              toggle.setValue(!on);
            });
          });
        }
      });

    setting.settingEl.addClass("vault-atlas-hub-row");
    if (row.status === "existing") {
      setting.settingEl.addClass("vault-atlas-hub-row-existing");
    }
    if (row.locked) {
      setting.settingEl.addClass("vault-atlas-hub-row-locked");
    }
  }

  private async applyToggle(
    row: AtlasPanelRow,
    wantHub: boolean,
    revert: () => void
  ): Promise<void> {
    try {
      if (wantHub) {
        if (row.hubPath) {
          await this.plugin.clearDefer(row.folderPath);
          return;
        }

        const createPath = row.suggestedPath;
        const confirmed = await confirmAtlasAction(this.app, {
          title: "HUB を作成",
          message: `${createPath} を作成します。\n間違えて削除した場合も、ここから作り直せます。`,
          confirmLabel: "作成",
        });
        if (!confirmed) {
          revert();
          return;
        }

        const profile = this.plugin.settings.vaultProfile;
        const entryPath =
          this.result?.entryInfo.effectivePath ??
          (await this.plugin.getEffectiveEntryPath());
        const hubPath = await createHubForFolder(
          this.app,
          row.folderPath,
          profile,
          row.parentHubPath,
          entryPath
        );
        await this.plugin.clearDefer(row.folderPath);

        if (this.appendParentLinks) {
          if (row.parentHubFile && !row.parentLinksToChild) {
            await appendChildLinkToParentHub(
              this.app,
              row.parentHubFile,
              hubPath
            );
          } else if (
            !row.parentHubFile &&
            row.parentHubPath &&
            row.parentHubPath === entryPath
          ) {
            await appendHubLinkToEntry(this.app, entryPath, hubPath);
          }
        }

        new Notice(`Vault Atlas: ${hubPath} を作成しました`);
      } else {
        if (row.locked && row.hubPath) {
          new Notice(
            `Vault Atlas: ${row.hubPath} はロック中のため削除できません`
          );
          revert();
          return;
        }
        if (row.hubPath) {
          const confirmed = await confirmAtlasAction(this.app, {
            title: "HUB を削除",
            message: `${row.hubPath} を削除します。\n中身を編集していた場合は失われます。\n再スキャン後、トグル ON で作り直せます。`,
            confirmLabel: "削除",
          });
          if (!confirmed) {
            revert();
            return;
          }

          await deleteHubFile(this.app, row.hubPath);
          await this.plugin.deferHub(
            row.folderPath,
            row.markdownCount > 0 ? row.markdownCount : 1
          );
          new Notice(
            `Vault Atlas: ${row.hubPath} を削除しました。再スキャン後、トグル ON で作り直せます。`
          );
        } else {
          await this.plugin.deferHub(row.folderPath, row.markdownCount);
        }
      }

      await this.rescan(false);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown error";
      new Notice(`Vault Atlas: ${row.folderPath} — ${message}`);
      revert();
    }
  }

  private async fixEntryUnlinkedHubs(): Promise<void> {
    if (!this.result) {
      return;
    }

    const entryPath = this.result.entryInfo.effectivePath;
    if (!entryPath || !this.result.entryInfo.exists) {
      new Notice("Vault Atlas: 入口ノートがありません");
      return;
    }

    let fixed = 0;
    for (const hub of this.result.entryUnlinkedHubs) {
      try {
        await appendHubLinkToEntry(this.app, entryPath, hub.hubPath);
        fixed += 1;
      } catch {
        // continue
      }
    }

    if (fixed > 0) {
      new Notice(`Vault Atlas: 入口に ${fixed} 件リンクを追記`);
    }
    await this.rescan(false);
  }

  private async fixLinkGaps(): Promise<void> {
    if (!this.result) {
      return;
    }

    let fixed = 0;
    for (const gap of this.result.linkGaps) {
      try {
        await appendChildLinkToParentHub(
          this.app,
          gap.parentHubPath,
          gap.hubPath
        );
        fixed += 1;
      } catch {
        // continue
      }
    }

    if (fixed > 0) {
      new Notice(`Vault Atlas: 親 HUB に ${fixed} 件リンクを追記`);
    }
    await this.rescan(false);
  }

  private async getReportMarkdown(): Promise<string | null> {
    if (!this.result) {
      await this.rescan(false);
    }
    if (!this.result) {
      return null;
    }
    return formatReportMarkdown(this.result);
  }

  private async copyMarkdownReport(): Promise<void> {
    const markdown = await this.getReportMarkdown();
    if (!markdown) {
      return;
    }
    try {
      await navigator.clipboard.writeText(markdown);
      new Notice("Vault Atlas: レポートをクリップボードにコピー");
    } catch {
      new Notice("Vault Atlas: クリップボードにコピーできませんでした");
    }
  }

  private async saveMarkdownReport(): Promise<void> {
    const markdown = await this.getReportMarkdown();
    if (!markdown || !this.result) {
      return;
    }

    try {
      const path = await exportReportToVault(
        this.app,
        markdown,
        this.plugin.settings.vaultProfile.reportExportFolder,
        this.result.generatedAt
      );
      new Notice(`Vault Atlas: レポートを保存 — ${path}`);
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "保存に失敗しました";
      new Notice(`Vault Atlas: ${message}`);
    }
  }

  onClose(): void {
    this.contentEl.empty();
    this.plugin.onAtlasPanelClosed();
  }
}
