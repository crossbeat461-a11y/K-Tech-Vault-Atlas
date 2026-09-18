import { App, PluginSettingTab, Setting } from "obsidian";
import { openBuyMeACoffee } from "./constants";
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

    new Setting(containerEl)
      .setName("Entry note path")
      .setDesc("入口ノート（例: Home.md）")
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
