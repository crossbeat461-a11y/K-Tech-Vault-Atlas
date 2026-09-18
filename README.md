# K-Tech Vault Atlas

Obsidian プラグイン。**既存 Vault** のフォルダ構造と HUB（Map of Content）を診断し、整理の提案と段階的な導入を支援する。

> 開発中（private）。コミュニティ公開前。

## このプラグインがやること

- Vault をスキャンし、フォルダ・HUB・入口ノートの状態をレポートする
- その Vault 固有のルール（命名、frontmatter、除外フォルダ）を **Vault Profile** として保存する
- HUB 不足・Home 未リンク・孤立フォルダなどを **判断待ち** として提示する（一括上書きしない）

## このプラグインがやらないこと（Phase 1）

- Vault 全体の自動書き換え
- 壊れたリンクの修復（Vault Doctor / Vault Inspector 系の仕事）
- フォルダの強制移動

## モジュール構成（予定）

| モジュール | 役割 | Phase |
| --- | --- | --- |
| **Vault Atlas（Core）** | 診断・レポート・Vault Profile | 1 |
| **Hub Keeper** | HUB 作成・リンク更新 | 2 |
| **Folder Guide** | フォルダ整理の提案 | 3 |

正本: `ROADMAP.md` / `ARCHITECTURE.md` / `docs/diagnosis-rules.md`

## 開発（Mac / Windows 共通）

```bash
cd K-Tech-Vault-Atlas
npm install
npm run build
npm run dev
```

ビルド成果物: `main.js`, `manifest.json`, `styles.css` を Vault の `.obsidian/plugins/k-tech-vault-atlas/` にコピーして有効化。

詳細: `HANDOFF.md`

## ライセンス

MIT — 作者 K-Tech Studio
