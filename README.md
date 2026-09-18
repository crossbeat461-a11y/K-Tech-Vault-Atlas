# K-Tech Vault Atlas

Obsidian プラグイン。**既存 Vault** のフォルダ構造と HUB（Map of Content）を診断し、操作パネルから段階的に整える。

> 開発中（private）。0.6.0 — 1.0 向けに機能追加中。

## できること（0.6.0）

- **Atlas パネル**（リボン）— スキャン結果と HUB 構成を一覧
- **再スキャン** — ヘッダーに常時表示
- **トグル** — ON = HUB 作成 / OFF = ゴミ箱へ削除 + 保留
- **親 HUB 認識** — 表・ウィキリンク解析、リンク不足の検出
- **保留 / 再検討** — 不要なフォルダは保留。ノート増で再提案
- **Vault Profile** — 入口ノート、除外フォルダ、HUB 判定 frontmatter

## やらないこと

- リンク切れ修復（Vault Doctor 系）
- Vault 全体の自動移動・一括上書き
- ネットワーク送信

## 使い方

1. リボン（地図アイコン）→ Atlas パネル
2. **再スキャン** で最新状態を取得
3. トグル ON/OFF で HUB を整える
4. 納得いくまで 2–3 を繰り返す

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
