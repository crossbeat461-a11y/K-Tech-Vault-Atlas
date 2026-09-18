# K-Tech Vault Atlas

既存 Vault のフォルダ構造と HUB（Map of Content）を診断し、操作パネルから段階的に整える Obsidian 拡張機能です。

> 開発中（private）。**0.9.0** — 1.0.0 出荷準備前。

## できること（0.9.0）

- **Atlas パネル** — スキャン結果と HUB 構成を一覧
- **通常スキャン / Deep Scan** — 日常運用と Vault 全体の見直し
- **HUB トグル** — 作成 / 削除（ゴミ箱）/ 保留 / 再検討
- **Homepage 連携** — 起動ノートを入口として使う
- **HUB 保護** — `hub-managed: external`、Deep Scan、入口ノート
- **Folder Guide** — 空フォルダ・命名ゆれなど（報告のみ）
- **レポート** — クリップボードコピー / Vault 内ファイル保存

## やらないこと

- リンク切れ修復（Vault Doctor 系）
- フォルダの自動移動・一括上書き
- ネットワーク送信（Buy Me a Coffee リンク除く）

## 使い方

1. リボン（地図アイコン）→ Atlas パネル
2. **再スキャン** で最新状態を取得
3. トグル ON/OFF で HUB を整える
4. 構成見直しは **Deep Scan**
5. レポート保存は **レポート保存** ボタン

## 開発

```bash
cd K-Tech-Vault-Atlas
npm install
npm run build
```

`main.js`, `manifest.json`, `styles.css` を Vault の `.obsidian/plugins/k-tech-vault-atlas/` にコピー。

正本: `ROADMAP.md` / `HANDOFF.md` / `docs/diagnosis-rules.md`

## ライセンス

MIT — K-Tech Studio
