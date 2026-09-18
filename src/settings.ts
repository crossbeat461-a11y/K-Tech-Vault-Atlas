import { App, Notice, PluginSettingTab, Setting } from "obsidian";
import { openBuyMeACoffee } from "./constants";
import { createHomeEntryNote } from "./entry/entry-create";
import { resolveEntry } from "./entry/entry-resolve";
import { isHomepagePluginEnabled } from "./entry/homepage-integration";
import type VaultAtlasPlugin from "./main";
import type { VaultProfileV1 } from "./profile";

type SettingsTabId = "profile" | "scan" | "support";

export class VaultAtlasSettingTab extends PluginSettingTab {
  plugin: VaultAtlasPlugin;
  private activeTab: SettingsTabId = "profile";

  constructor(app: App, plugin: VaultAtlasPlugin) {
    super(app, plugin);
    this.plugin = plugin;
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
                } catch (error) {
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
