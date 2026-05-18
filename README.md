# growi-plugin-codesyntaxhighlight

GROWI のコードブロックにシンタックスハイライトを追加する Script プラグインです。

## 機能

- ビュー (編集後) 画面でのシンタックスハイライト適用
- GitHub Linguist 仕様に準じた 50+ 言語エイリアス対応 (例: ` ```rb ` → Ruby)
- 50+ 言語のハイライト対応 (highlight.js ベース)
- GROWI のライト/ダークテーマに自動追従 (GitHub Light / GitHub Dark)
- 行番号表示
- 言語ラベル表示

## 対応言語 (エイリアス例)

| エイリアス | 解釈 |
|---|---|
| `rb` | ruby |
| `py` | python |
| `js` / `jsx` | javascript |
| `ts` / `tsx` | typescript |
| `yml` | yaml |
| `sh` / `shell` / `zsh` | bash |
| `cs` | csharp |
| `kt` | kotlin |
| `rs` | rust |
| `c++` / `cxx` | cpp |

## セットアップ

```bash
pnpm install
pnpm approve-builds --all
pnpm install
pnpm build
```

ビルド後、`dist/` をコミットして GitHub に push し、GROWI 管理画面 `/admin/plugins` でインストールしてください。

## 注意事項

- `dist/` は `.gitignore` に含めずコミットしてください (GROWI はビルドを実行しません)
- `pnpm-workspace.yaml` もコミット対象に含めてください
