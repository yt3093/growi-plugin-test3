# CLAUDE.md (GROWI プラグイン開発テンプレート)

新規 GROWI プラグインを開発する際にプロジェクト直下に置く `CLAUDE.md` のテンプレート。`<<...>>` の箇所をプロジェクト固有値で置換して使う。

---

# CLAUDE.md

## プロジェクト概要

- **名前**: `growi-plugin-codesyntaxhighlight`
- **種別**: GROWI Scrip プラグイン
- **目的**: コードブロック記法のシンタックスハイライトを拡張する。シンタックスハイライトの仕様はgithubに従う。
  - GitHub仕様 : https://github.com/github-linguist/linguist/blob/main/lib/linguist/languages.yml
- **拡張記法 / UI**: 複数行のコードブロック開始行に言語を指定する 「```rb」(rubyの例)


## アーキテクチャ概要

### Script プラグインの基本フック

`window.pluginActivators[codesyntaxhighlight] = { activate, deactivate }` を登録する。GROWI はプラグイン有効化時に `activate()` を呼ぶ。

`activate()` 内では `growiFacade.markdownRenderer.optionsGenerators.customGenerateViewOptions` をラップして RendererOptions を加工するのが定番:

```ts
const activate = (): void => {
  if (growiFacade?.markdownRenderer == null) return;
  const { optionsGenerators } = growiFacade.markdownRenderer;
  const original = optionsGenerators.customGenerateViewOptions;

  optionsGenerators.customGenerateViewOptions = (...args) => {
    const options = original ? original(...args) : optionsGenerators.generateViewOptions(...args);
    // options.components.* を差し替える
    // または options.remarkPlugins / options.rehypePlugins に追加する
    return options;
  };
};
```

### RendererOptions の主な拡張ポイント

| プロパティ | 何ができるか | 主な用途 |
|---|---|---|
| `components` | React 要素 (`a`, `code`, `table` 等) を差し替え | 既存タグの見た目・挙動拡張 (例: code にコピーボタン) |
| `remarkPlugins` | Markdown AST (mdast) 段階で変換 | 独自記法の追加・置換 (例: `[TOC]` → list) |
| `rehypePlugins` | HTML AST (hast) 段階で変換 | 属性付与・サニタイズ等 |
| `remarkRehypeOptions` | mdast→hast 変換のオプション | `allowDangerousHtml` など |

### 設計選択の指針

- **既存要素の見た目だけ変えたい** → `components` を差し替え
- **独自 Markdown 記法を追加したい** → `remarkPlugins` に独自プラグイン追加
- **生成後の HTML 構造を補正したい** → `rehypePlugins` に追加

## ハマりどころ (必読)

### 1. `dist/` を git にコミットすること

GROWI はプラグインインストール時に **`pnpm install` も `pnpm build` も実行しない**。GitHub の archive zip を展開し、`dist/` 配下を Express で静的配信するだけ。

→ `.gitignore` に `dist/` を含めると GROWI 側で JS が読み込まれない。`dist/` は必ずコミットすること。

(根拠: `weseek/growi` の `apps/app/src/features/growi-plugin/server/services/growi-plugin/growi-plugin.ts` 内 `install()` / `retrievePluginManifest()`)

### 2. Vite のマニフェスト出力先

GROWI が読みに行く manifest のパスは以下の順で fallback:

1. `dist/.vite/manifest.json` (Vite 5 デフォルト)
2. `dist/manifest.json` (Vite 4 互換 / 明示設定時)

Vite 5+ では `vite.config.ts` で `build.manifest: 'manifest.json'` を明示してプロジェクト直下風のパスに出力するのが無難。

```ts
// vite.config.ts
export default defineConfig({
  plugins: [react()],
  build: {
    manifest: 'manifest.json',
    rollupOptions: { input: ['/client-entry.tsx'] },
  },
});
```
### 3. pnpm のビルドスクリプト承認 (pnpm 11+ では別対応が必要)

`esbuild` (Vite 依存) はインストール時にビルドスクリプト (`postinstall` の `node install.js`) を実行する必要があるが、pnpm はデフォルトでブロックする。

**pnpm 8〜10**: `package.json` の `pnpm.onlyBuiltDependencies` で明示する。

```json
{
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  }
}
```

**pnpm 11+**: 上記 `package.json` の設定は **無視される**。初回 `pnpm install` 後に以下のエラーが出てビルドできない:

```
[ERR_PNPM_IGNORED_BUILDS] Ignored build scripts: esbuild@X.Y.Z
Run "pnpm approve-builds" to pick which dependencies should be allowed to run scripts.
```

そのまま `pnpm build` を実行すると、esbuild の native binary がインストールされていないため `vite build` 中に `Cannot find module '@esbuild/<platform>'` 等で失敗する。

解決手順:

1. `pnpm approve-builds` (インタラクティブ) または `pnpm approve-builds --all` (一括承認) を実行
2. プロジェクト直下に `pnpm-workspace.yaml` が自動生成され、以下が書き込まれる:
   ```yaml
   allowBuilds:
     esbuild: true
   ```
3. **この `pnpm-workspace.yaml` も git にコミットする**。`.gitignore` には入れない (チーム内で再現するため)
4. その後 `pnpm install` を実行すると esbuild の postinstall が走り、native binary が配置されてビルド可能になる

**Tip**: 初期スカフォールド時は `pnpm install` 直後に必ず `pnpm approve-builds --all` → 再度 `pnpm install` を流すフローを組み込む。

### 4. `[xxx]` パターンの記法は linkReference に化ける

`[TOC]` `[note]` のような単独の角括弧記法は、remark-parse によって `text` ノードではなく `linkReference` ノードとして解釈される。`paragraph.children[0].type === 'text'` だけで判定するとマッチしない。

→ `text` と `linkReference` の両方から元の文字列を再構築してから正規表現マッチする:

```ts
function reconstructSource(children: PhrasingContent[]): string | null {
  let out = '';
  for (const c of children) {
    if (c.type === 'text') out += c.value;
    else if (c.type === 'linkReference') out += `[${c.label ?? toString(c)}]`;
    else return null;
  }
  return out;
}
```

### 5. heading の slug 互換

GROWI は内部で `rehype-slug` 系のスラッグを heading に付与している。プラグインから heading への内部リンクを生成する場合は `github-slugger` を使って同等の slug を作る。同名見出しの連番カウンタも `GithubSlugger` のインスタンスに任せる。

### 6. 再インストールが必要

コード更新を push しても、GROWI 管理画面で「有効/無効トグル」だけでは zip が取り直されない場合がある。確実に反映するには `/admin/plugins` で **削除 → 再インストール**。

## 標準ディレクトリ構成 (Script プラグイン)

```
growi-plugin-<<NAME>>/
├── client-entry.tsx          # エントリ (activate/deactivate, pluginActivators 登録)
├── package.json              # growiPlugin 設定 + pnpm.onlyBuiltDependencies
├── tsconfig.json
├── tsconfig.node.json
├── vite.config.ts            # build.manifest: 'manifest.json' を明示
├── .gitignore                # dist/ を含めない
├── README.md
├── dist/                     # ビルド成果物。コミット必須
│   ├── manifest.json
│   └── assets/
│       ├── client-entry-*.js
│       └── client-entry-*.css (任意)
└── src/
    ├── <<plugin-impl>>.ts    # 本体実装
    ├── types.ts              # GrowiFacade 型の最小宣言
    └── styles/<<name>>.css   # 任意のスタイル
```

## 標準 `package.json`

```json
{
  "name": "growi-plugin-<<NAME>>",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build"
  },
  "dependencies": {},
  "devDependencies": {
    "@vitejs/plugin-react": "^4.0.0",
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "typescript": "^5.0.0",
    "vite": "^5.0.0"
  },
  "engines": { "node": ">=20", "pnpm": ">=8" },
  "pnpm": {
    "onlyBuiltDependencies": ["esbuild"]
  },
  "growiPlugin": {
    "schemaVersion": "4",
    "types": ["script"]
  }
}
```

## 標準 `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ESNext",
    "lib": ["DOM", "DOM.Iterable", "ESNext"],
    "module": "ESNext",
    "moduleResolution": "Node",
    "jsx": "react-jsx",
    "strict": true,
    "skipLibCheck": true,
    "allowSyntheticDefaultImports": true,
    "resolveJsonModule": true,
    "isolatedModules": true,
    "noEmit": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src", "client-entry.tsx"],
  "references": [{ "path": "./tsconfig.node.json" }]
}
```

## デプロイ手順

```bash
pnpm install
pnpm build              # dist/ を更新
git add -A
git commit -m "..."
git push
```

GROWI 管理画面 `/admin/plugins` で **削除 → 再インストール**。

## 動作確認チェックリスト

1. `pnpm build` が成功し `dist/manifest.json` が出力される
2. push 後、GROWI で削除 → 再インストール
3. DevTools Network タブで `client-entry-*.js` が **200** で取得される
4. Console に `activate` 系のログが出る (開発中は `console.log` を埋め込んで切り分け)
5. プラグイン特有の動作 (記法展開・UI 変化など) が期待通りに動く
6. プラグインを無効化したときに通常表示に戻ること (deactivate でクリーンアップ済か)

## 参考プラグイン (実装パターンの参照元)

- `growilabs/growi-plugin-boilerplate` — 公式テンプレート
- `growilabs/growi-plugin-copy-code-to-clipboard` — `components` 差し替えの最小サンプル
- `growilabs/growi-plugin-datatables` — table コンポーネント拡張

## よく使うライブラリ

- `unist-util-visit` — mdast / hast 走査
- `mdast-util-to-string` — ノードのプレーンテキスト抽出
- `github-slugger` — GROWI の `rehype-slug` と互換のスラッグ生成
- `unified` — Plugin 型定義

## 会話ガイドライン

- 常に日本語で会話する

## 作業ルール

- **git 操作は行わない**。`git add` / `git commit` / `git push` / `git restore` / `git checkout` などの git コマンドは一切実行しないこと。コミットやプッシュが必要な場面ではユーザーに依頼し、こちらでは行わない。
  - 変更内容のサマリだけ提示し、コミットメッセージ案を出す程度に留める。
  - 例外として `git status` / `git log` / `git diff` などの**読み取り専用**コマンドは状況把握のために実行してよい。

- **セキュリティチェックを必ず行う**。コード変更を完了したら、コミット候補としてユーザーに提示する前に以下を確認すること。問題が見つかった場合はその場で修正するか、ユーザーに明示的に報告する。
  - **機密情報の混入**: API キー / トークン / パスワード / 秘密鍵 / `.env` 系ファイルの値が、ソースコード・コメント・サンプル markdown・`dist/` 配下のビルド成果物に含まれていないか。プラグインは `dist/` を含めて GitHub に push するため、ビルド成果物に環境変数が埋め込まれていないかも要確認。
  - **XSS / 危険な HTML 挿入**: ユーザー入力 (markdown 本文・ページタイトル・リンクテキストなど) を `dangerouslySetInnerHTML`・`innerHTML`・`html` ノード・`raw` ノードで未エスケープで埋め込んでいないか。`remarkRehypeOptions.allowDangerousHtml: true` を新たに有効化していないか。React の `components` 差し替えで `children` を `String` 化してそのまま HTML として注入していないか。
  - **オープンリダイレクト / 悪意あるリンク**: `link.url` をユーザー入力から構築する場合、`javascript:` / `data:` スキームを許可していないか。必要なら許可スキームのホワイトリストでフィルタする。
  - **依存パッケージの脆弱性**: 新規追加した npm パッケージは可能なら `pnpm audit` を実行し、メンテナンスされている公式 / 著名な OSS であることを確認する。
  - **権限昇格 / トークン漏洩**: `growiFacade` 経由で `window` や `localStorage` / `sessionStorage` の中身を不必要に読み取り・送信していないか。外部 URL に対する `fetch` / `XMLHttpRequest` を新規追加していないか。追加する場合はその必要性と送信内容をコメントで明示する。
  - **CSP / 外部リソース**: `<script>` / `<link>` を動的挿入して外部ドメインから読み込む実装になっていないか。GROWI 管理者の CSP 設定によってブロックされる前提で、自己完結なバンドルにすること。
  - **正規表現の ReDoS**: ユーザー入力テキストに対して走らせる正規表現が、ネストした量指定子 / バックトラックの暴発を起こさないか確認する。
  - 重大な懸念がある場合は、確認結果を箇条書きで報告してからユーザーの判断を仰ぐ。
