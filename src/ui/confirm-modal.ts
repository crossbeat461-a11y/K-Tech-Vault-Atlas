import { App, Modal, Setting } from "obsidian";

export function confirmAtlasAction(
  app: App,
  options: {
    title: string;
    message: string;
    confirmLabel: string;
    cancelLabel?: string;
  }
): Promise<boolean> {
  return new Promise((resolve) => {
    const modal = new ConfirmModal(app, options, resolve);
    modal.open();
  });
}

class ConfirmModal extends Modal {
  constructor(
    app: App,
    private options: {
      title: string;
      message: string;
      confirmLabel: string;
      cancelLabel?: string;
    },
    private resolve: (confirmed: boolean) => void
  ) {
    super(app);
  }

  onOpen(): void {
    const { contentEl, titleEl } = this;
    titleEl.setText(this.options.title);
    contentEl.createEl("p", {
      text: this.options.message,
      cls: "vault-atlas-confirm-message",
    });

    new Setting(contentEl)
      .addButton((btn) =>
        btn
          .setButtonText(this.options.cancelLabel ?? "キャンセル")
          .onClick(() => {
            this.close();
            this.resolve(false);
          })
      )
      .addButton((btn) =>
        btn
          .setButtonText(this.options.confirmLabel)
          .setCta()
          .onClick(() => {
            this.close();
            this.resolve(true);
          })
      );
  }

  onClose(): void {
    this.contentEl.empty();
  }
}
