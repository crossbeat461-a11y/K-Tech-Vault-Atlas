import { App, Modal, Notice, Setting } from "obsidian";
import type VaultAtlasPlugin from "../main";
import { deleteHubFile } from "../hub/hub-delete";
import { appendChildLinkToParentHub } from "../hub/hub-parent-update";
import { createHubForFolder } from "../hub/hub-create";
import { formatReportMarkdown, type VaultScanResult } from "../scan/report";
import {
  buildAtlasPanelRows,
  statusLabel,
  type AtlasPanelRow,
} from "./atlas-rows";
import { confirmAtlasAction } from "./confirm-modal";

export class AtlasPanel extends Modal {
  private result: VaultScanResult | null = null;
  private scanning = false;
  private appendParentLinks = true;
  private headerEl!: HTMLElement;
  private bodyEl!: HTMLElement;
  private rescanBtnEl!: HTMLButtonElement;

  constructor(
    app: App,
    private plugin: VaultAtlasPlugin
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
    void this.rescan(false);
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

    actions.createEl("button", {
      text: "Markdown",
      type: "button",
    }).addEventListener("click", () => {
      void this.showMarkdownReport();
    });
  }

  private updateSummary(): void {
    const summaryEl = this.headerEl.querySelector(".vault-atlas-panel-summary");
    if (!(summaryEl instanceof HTMLElement) || !this.result) {
      return;
    }
    summaryEl.setText(
      `HUB ${this.result.hubCount} 件 / 推奨 ${this.result.recommendedHubs.length} / 再検討 ${this.result.reconsideredHubs.length} / 保留 ${this.result.deferredWaiting.length} / リンク不足 ${this.result.linkGaps.length}`
    );
  }

  private setScanning(scanning: boolean): void {
    this.scanning = scanning;
    this.rescanBtnEl.disabled = scanning;
    this.rescanBtnEl.setText(scanning ? "スキャン中…" : "再スキャン");
  }

  async rescan(notify: boolean): Promise<void> {
    if (this.scanning) {
      return;
    }
    this.setScanning(true);
    try {
      this.result = await this.plugin.scanVault();
      this.renderBody();
      this.updateSummary();
      if (notify) {
        new Notice("Vault Atlas: スキャン完了");
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Unknown scan error";
      new Notice(`Vault Atlas: スキャン失敗 — ${message}`);
    } finally {
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
      text: "トグル ON = HUB あり（無ければ作成） / OFF = HUB を削除して保留。再スキャン後、ON で作り直せます。",
    });

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
    if (warnings.length > 0) {
      const details = this.bodyEl.createEl("details");
      details.createEl("summary", { text: "確認事項" });
      const ul = details.createEl("ul");
      for (const w of warnings) {
        ul.createEl("li", { text: w.message });
      }
    }
  }

  private renderRowIn(containerEl: HTMLElement, row: AtlasPanelRow): void {
    const desc = `[${statusLabel(row.status)}] ${row.desc}${row.hubPath ? ` → ${row.hubPath}` : ""}`;

    const setting = new Setting(containerEl)
      .setName(row.folderPath || "(root)")
      .setDesc(desc)
      .addToggle((toggle) => {
        toggle.setValue(row.wantHub);
        toggle.onChange((on) => {
          void this.applyToggle(row, on, () => {
            toggle.setValue(!on);
          });
        });
      });

    setting.settingEl.addClass("vault-atlas-hub-row");
    if (row.status === "existing") {
      setting.settingEl.addClass("vault-atlas-hub-row-existing");
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
        const hubPath = await createHubForFolder(
          this.app,
          row.folderPath,
          profile,
          row.parentHubPath
        );
        await this.plugin.clearDefer(row.folderPath);

        if (
          this.appendParentLinks &&
          row.parentHubFile &&
          !row.parentLinksToChild
        ) {
          await appendChildLinkToParentHub(
            this.app,
            row.parentHubFile,
            hubPath
          );
        }

        new Notice(`Vault Atlas: ${hubPath} を作成しました`);
      } else {
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

  private async showMarkdownReport(): Promise<void> {
    if (!this.result) {
      await this.rescan(false);
    }
    if (!this.result) {
      return;
    }
    const markdown = formatReportMarkdown(this.result);
    try {
      await navigator.clipboard.writeText(markdown);
      new Notice("Vault Atlas: Markdown をクリップボードにコピー");
    } catch {
      new Notice("Vault Atlas: クリップボードにコピーできませんでした");
    }
  }

  onClose(): void {
    this.contentEl.empty();
    this.plugin.onAtlasPanelClosed();
  }
}
