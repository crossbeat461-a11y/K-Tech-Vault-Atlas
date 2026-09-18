import { App, Notice, PluginSettingTab, Setting, type SettingDefinitionItem } from "obsidian";
import { openBuyMeACoffee } from "./constants";
import { createHomeEntryNote } from "./entry/entry-create";
import { resolveEntry } from "./entry/entry-resolve";
import { isHomepagePluginEnabled } from "./entry/homepage-integration";
import type VaultAtlasPlugin from "./main";
import type { VaultProfileV1 } from "./profile";

type SettingsTabId = "profile" | "scan" | "support";

type VaultAtlasSettingKey =
  | "homepageIntegration"
  | "entryNotePath"
  | "hubTypeProperty"
  | "hubTypeValue"
  | "dailyFolderPattern"
  | "excludeFolderPrefixes"
  | "minMarkdownForHub"
  | "deferReconsiderDelta"
  | "reportExportFolder"
  | "skipRootWithoutHub"
  | "excludePathSegments";

export class VaultAtlasSettingTab extends PluginSettingTab {
  plugin: VaultAtlasPlugin;
  private activeTab: SettingsTabId = "profile";

  constructor(app: App, plugin: VaultAtlasPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  getSettingDefinitions(): SettingDefinitionItem<VaultAtlasSettingKey>[] {
    const homepageAvailable = isHomepagePluginEnabled(this.app);
    return [
      {
        type: "group",
        heading: "Profile",
        items: [
          {
            name: "Homepage integration",
            desc: homepageAvailable
              ? "Use the Homepage plugin startup note as the entry (kind: File)."
              : "Homepage plugin is not enabled. Manual path only.",
            control: {
              type: "toggle",
              key: "homepageIntegration",
              defaultValue: false,
              disabled: () => !isHomepagePluginEnabled(this.app),
            },
          },
          {
            name: "Entry note path",
            desc: "Fallback when Homepage is off or cannot be resolved",
            control: {
              type: "text",
              key: "entryNotePath",
              defaultValue: "Home.md",
            },
          },
          {
            name: "Create Home.md",
            desc: "Create the manual entry note if it is missing",
            action: () => {
              void this.createManualHomeNote();
            },
          },
          {
            name: "Hub type property",
            desc: "Frontmatter key used to detect hubs",
            control: {
              type: "text",
              key: "hubTypeProperty",
              defaultValue: "type",
            },
          },
          {
            name: "Hub type value",
            desc: "Frontmatter value treated as a hub",
            control: {
              type: "text",
              key: "hubTypeValue",
              defaultValue: "hub",
            },
          },
          {
            name: "Daily folder pattern",
            desc: "Folder prefix skipped as hub candidates. Empty disables.",
            control: {
              type: "text",
              key: "dailyFolderPattern",
              defaultValue: "00 Inbox/Daily/",
            },
          },
          {
            name: "Exclude folder prefixes",
            desc: "One prefix per line. Trailing / recommended.",
            control: {
              type: "textarea",
              key: "excludeFolderPrefixes",
              defaultValue: "",
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Scan",
        items: [
          {
            name: "Min markdown for hub",
            desc: "Recommend a hub when a folder has at least this many notes",
            control: {
              type: "number",
              key: "minMarkdownForHub",
              min: 1,
              defaultValue: 3,
            },
          },
          {
            name: "Defer reconsider delta",
            desc: "Bring a deferred folder back when note count grows by this many",
            control: {
              type: "number",
              key: "deferReconsiderDelta",
              min: 1,
              defaultValue: 2,
            },
          },
          {
            name: "Report export folder",
            desc: "Where scan reports are saved. Trailing / recommended.",
            control: {
              type: "text",
              key: "reportExportFolder",
              defaultValue: "90 System/Vault Atlas/",
            },
          },
          {
            name: "Skip root without hub",
            desc: "Do not warn when the vault root has no hub",
            control: {
              type: "toggle",
              key: "skipRootWithoutHub",
              defaultValue: true,
            },
          },
          {
            name: "Exclude path segments",
            desc: "Skip folders whose path contains these names (one per line)",
            control: {
              type: "textarea",
              key: "excludePathSegments",
              defaultValue: "",
            },
          },
        ],
      },
      {
        type: "group",
        heading: "Support",
        items: [
          {
            name: "Buy Me a Coffee",
            desc: "Support K-Tech Studio (optional)",
            action: () => {
              openBuyMeACoffee();
            },
          },
          {
            name: "Version",
            desc: this.plugin.manifest.version,
          },
        ],
      },
    ];
  }

  getControlValue(key: string): unknown {
    const profile = this.plugin.settings.vaultProfile;
    switch (key) {
      case "homepageIntegration":
        return profile.entrySource === "homepage";
      case "entryNotePath":
        return profile.entryNotePath;
      case "hubTypeProperty":
        return profile.hubTypeProperty;
      case "hubTypeValue":
        return profile.hubTypeValue;
      case "dailyFolderPattern":
        return profile.dailyFolderPattern ?? "";
      case "excludeFolderPrefixes":
        return profile.excludeFolderPrefixes.join("\n");
      case "minMarkdownForHub":
        return profile.minMarkdownForHub;
      case "deferReconsiderDelta":
        return profile.deferReconsiderDelta;
      case "reportExportFolder":
        return profile.reportExportFolder;
      case "skipRootWithoutHub":
        return profile.skipRootWithoutHub;
      case "excludePathSegments":
        return profile.excludePathSegments.join("\n");
      default:
        return undefined;
    }
  }

  async setControlValue(key: string, value: unknown): Promise<void> {
    switch (key) {
      case "homepageIntegration":
        await this.saveProfile({
          entrySource: value === true ? "homepage" : "manual",
        });
        return;
      case "entryNotePath":
        if (typeof value === "string") {
          await this.saveProfile({ entryNotePath: value.trim() });
        }
        return;
      case "hubTypeProperty":
        if (typeof value === "string") {
          await this.saveProfile({ hubTypeProperty: value.trim() });
        }
        return;
      case "hubTypeValue":
        if (typeof value === "string") {
          await this.saveProfile({ hubTypeValue: value.trim() });
        }
        return;
      case "dailyFolderPattern":
        if (typeof value === "string") {
          const trimmed = value.trim();
          await this.saveProfile({
            dailyFolderPattern: trimmed.length > 0 ? trimmed : null,
          });
        }
        return;
      case "excludeFolderPrefixes":
        if (typeof value === "string") {
          await this.saveProfile({
            excludeFolderPrefixes: value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          });
        }
        return;
      case "minMarkdownForHub":
        if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
          await this.saveProfile({ minMarkdownForHub: Math.floor(value) });
        }
        return;
      case "deferReconsiderDelta":
        if (typeof value === "number" && Number.isFinite(value) && value >= 1) {
          await this.saveProfile({ deferReconsiderDelta: Math.floor(value) });
        }
        return;
      case "reportExportFolder":
        if (typeof value === "string") {
          const trimmed = value.trim();
          await this.saveProfile({
            reportExportFolder: trimmed.endsWith("/")
              ? trimmed
              : `${trimmed}/`,
          });
        }
        return;
      case "skipRootWithoutHub":
        if (typeof value === "boolean") {
          await this.saveProfile({ skipRootWithoutHub: value });
        }
        return;
      case "excludePathSegments":
        if (typeof value === "string") {
          await this.saveProfile({
            excludePathSegments: value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          });
        }
        return;
      default:
        return;
    }
  }

  private async createManualHomeNote(): Promise<void> {
    const profile = this.plugin.settings.vaultProfile;
    try {
      const path = await createHomeEntryNote(
        this.app,
        profile.entryNotePath || "Home.md"
      );
      new Notice(`Vault Atlas: ${path} を作成しました`);
      this.update();
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : "作成失敗";
      new Notice(`Vault Atlas: ${message}`);
    }
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass("vault-atlas-settings");

    this.renderTabNav(containerEl);
    const panel = containerEl.createDiv({ cls: "vault-atlas-settings-panel" });
    this.renderActiveTab(panel);
  }

  hide(): void {
    this.containerEl.empty();
  }

  private renderTabNav(containerEl: HTMLElement): void {
    const nav = containerEl.createDiv({ cls: "vault-atlas-settings-nav" });
    const tabs: { id: SettingsTabId; label: string }[] = [
      { id: "profile", label: "Profile" },
      { id: "scan", label: "Scan" },
      { id: "support", label: "Support" },
    ];

    for (const tab of tabs) {
      const btn = nav.createEl("button", {
        cls: "vault-atlas-settings-tab",
        text: tab.label,
        type: "button",
      });
      if (tab.id === this.activeTab) {
        btn.addClass("is-active");
      }
      btn.addEventListener("click", () => {
        this.activeTab = tab.id;
        this.display();
      });
    }
  }

  private renderActiveTab(panel: HTMLElement): void {
    switch (this.activeTab) {
      case "profile":
        this.renderProfileTab(panel);
        break;
      case "scan":
        this.renderScanTab(panel);
        break;
      case "support":
        this.renderSupportTab(panel);
        break;
    }
  }

  private profile(): VaultProfileV1 {
    return this.plugin.settings.vaultProfile;
  }

  private async saveProfile(
    patch: Partial<VaultProfileV1>
  ): Promise<void> {
    this.plugin.settings.vaultProfile = {
      ...this.plugin.settings.vaultProfile,
      ...patch,
    };
    await this.plugin.saveSettings();
  }

  private renderProfileTab(containerEl: HTMLElement): void {
    containerEl.createEl("p", {
      text: "Vault ごとの HUB 判定ルール。スキャン前に合わせてください。",
      cls: "setting-item-description",
    });

    const profile = this.profile();
    const homepageAvailable = isHomepagePluginEnabled(this.app);

    new Setting(containerEl)
      .setName("Homepage 連携")
      .setDesc(
        homepageAvailable
          ? "ON にすると Homepage プラグインの起動ノートを入口として使います（kind: File）。"
          : "Homepage プラグインが見つかりません。手動パスのみ使えます。"
      )
      .addToggle((toggle) => {
        toggle.setValue(profile.entrySource === "homepage");
        if (!homepageAvailable) {
          toggle.setDisabled(true);
        }
        toggle.onChange(async (on) => {
          await this.saveProfile({ entrySource: on ? "homepage" : "manual" });
          this.display();
        });
      });

    void resolveEntry(this.app, profile).then((resolved) => {
      new Setting(containerEl)
        .setName("有効な入口")
        .setDesc(
          resolved.exists
            ? resolved.displayLabel
            : `${resolved.displayLabel} — ファイル未作成`
        )
        .addText((text) => {
          text
            .setValue(resolved.effectivePath ?? resolved.manualPath)
            .setDisabled(true);
        });

      if (!resolved.exists && profile.entrySource === "manual") {
        new Setting(containerEl)
          .setName("Home.md を作成")
          .setDesc("入口ノートが無いとき、最小テンプレートから作成します。")
          .addButton((button) =>
            button.setButtonText("作成").onClick(() => {
              void (async () => {
                try {
                  const path = await createHomeEntryNote(
                    this.app,
                    profile.entryNotePath || "Home.md"
                  );
                  new Notice(`Vault Atlas: ${path} を作成しました`);
                  this.display();
                } catch (error: unknown) {
                  const message =
                    error instanceof Error ? error.message : "作成失敗";
                  new Notice(`Vault Atlas: ${message}`);
                }
              })();
            })
          );
      }
    });

    new Setting(containerEl)
      .setName("Entry note path")
      .setDesc("手動モード時、または Homepage で解決できないときのフォールバック")
      .addText((text) =>
        text
          .setPlaceholder("Home.md")
          .setValue(profile.entryNotePath)
          .onChange(async (value) => {
            await this.saveProfile({ entryNotePath: value.trim() });
          })
      );

    new Setting(containerEl)
      .setName("Hub type property")
      .setDesc("HUB 判定 frontmatter キー")
      .addText((text) =>
        text.setValue(profile.hubTypeProperty).onChange(async (value) => {
          await this.saveProfile({ hubTypeProperty: value.trim() });
        })
      );

    new Setting(containerEl)
      .setName("Hub type value")
      .setDesc("HUB とみなす値")
      .addText((text) =>
        text.setValue(profile.hubTypeValue).onChange(async (value) => {
          await this.saveProfile({ hubTypeValue: value.trim() });
        })
      );

    containerEl.createEl("p", {
      cls: "setting-item-description",
      text: "手書き・他プラグインの HUB は frontmatter に hub-managed: external を付けると Atlas から削除できません。Deep Scan でも触らない設定ができます。",
    });

    new Setting(containerEl)
      .setName("Daily folder pattern")
      .setDesc("HUB 不要候補（例: 00 Inbox/Daily/）。空欄で無効。")
      .addText((text) =>
        text
          .setPlaceholder("00 Inbox/Daily/")
          .setValue(profile.dailyFolderPattern ?? "")
          .onChange(async (value) => {
            const trimmed = value.trim();
            await this.saveProfile({
              dailyFolderPattern: trimmed.length > 0 ? trimmed : null,
            });
          })
      );

    new Setting(containerEl)
      .setName("Exclude folder prefixes")
      .setDesc("1行1件。スキャンから除外（末尾 / 推奨）。デフォルト除外は自動で足されます。")
      .addTextArea((area) => {
        area
          .setValue(profile.excludeFolderPrefixes.join("\n"))
          .onChange(async (value) => {
            await this.saveProfile({
              excludeFolderPrefixes: value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            });
          });
        area.inputEl.rows = 4;
      });
  }

  private renderScanTab(containerEl: HTMLElement): void {
    const profile = this.profile();

    new Setting(containerEl)
      .setName("Min markdown for hub")
      .setDesc("この件数以上のノートがあるフォルダを HUB 推奨にする（既定 3）")
      .addText((text) =>
        text
          .setPlaceholder("3")
          .setValue(String(profile.minMarkdownForHub))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed) || parsed < 1) {
              return;
            }
            await this.saveProfile({ minMarkdownForHub: parsed });
          })
      );

    new Setting(containerEl)
      .setName("Defer reconsider delta")
      .setDesc("保留中フォルダのノートがこの件数以上増えたら「再検討」に戻す（既定 2）")
      .addText((text) =>
        text
          .setPlaceholder("2")
          .setValue(String(profile.deferReconsiderDelta))
          .onChange(async (value) => {
            const parsed = Number.parseInt(value, 10);
            if (!Number.isFinite(parsed) || parsed < 1) {
              return;
            }
            await this.saveProfile({ deferReconsiderDelta: parsed });
          })
      );

    new Setting(containerEl)
      .setName("Report export folder")
      .setDesc("レポート保存先（末尾 / 推奨）。無い場合は自動作成。")
      .addText((text) =>
        text
          .setPlaceholder("90 System/Vault Atlas/")
          .setValue(profile.reportExportFolder)
          .onChange(async (value) => {
            const trimmed = value.trim();
            await this.saveProfile({
              reportExportFolder: trimmed.endsWith("/")
                ? trimmed
                : `${trimmed}/`,
            });
          })
      );

    new Setting(containerEl)
      .setName("Skip root without hub")
      .setDesc("Vault ルートに HUB がなくても警告しない（Home.md が入口のとき）")
      .addToggle((toggle) =>
        toggle
          .setValue(profile.skipRootWithoutHub)
          .onChange(async (value) => {
            await this.saveProfile({ skipRootWithoutHub: value });
          })
      );

    new Setting(containerEl)
      .setName("Exclude path segments")
      .setDesc("パス中に含まれたらスキップ（1行1件。例: node_modules）")
      .addTextArea((area) => {
        area
          .setValue(profile.excludePathSegments.join("\n"))
          .onChange(async (value) => {
            await this.saveProfile({
              excludePathSegments: value
                .split("\n")
                .map((line) => line.trim())
                .filter(Boolean),
            });
          });
        area.inputEl.rows = 3;
      });
  }

  private renderSupportTab(containerEl: HTMLElement): void {
    containerEl.createEl("p", {
      text: "Vault Atlas はローカルのみで動作します。ネットワーク送信はありません。",
      cls: "setting-item-description",
    });

    new Setting(containerEl).setName("Support").setHeading();

    new Setting(containerEl)
      .setName("Buy Me a Coffee")
      .setDesc("K-Tech Studio の開発を支援する（任意）")
      .addButton((button) =>
        button.setButtonText("Buy Me a Coffee").onClick(() => {
          openBuyMeACoffee();
        })
      );

    new Setting(containerEl)
      .setName("Version")
      .setDesc("インストール中の版")
      .addText((text) => {
        text.setValue(this.plugin.manifest.version).setDisabled(true);
      });
  }
}
