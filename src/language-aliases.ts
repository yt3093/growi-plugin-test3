import hljs from './highlight';

// GitHub Linguist の languages.yml に基づくエイリアスマップ
const LANGUAGE_ALIASES: Record<string, string> = {
  // Ruby
  rb: 'ruby',
  // Python
  py: 'python', py3: 'python', pyw: 'python',
  // JavaScript
  js: 'javascript', mjs: 'javascript', cjs: 'javascript', jsx: 'javascript',
  // TypeScript
  ts: 'typescript', tsx: 'typescript', mts: 'typescript', cts: 'typescript',
  // C / C++
  'c++': 'cpp', cxx: 'cpp', cc: 'cpp', hxx: 'cpp', hpp: 'cpp',
  // C#
  cs: 'csharp',
  // Shell
  sh: 'bash', shell: 'bash', zsh: 'bash', ksh: 'bash', fish: 'bash',
  // YAML
  yml: 'yaml',
  // Markdown
  md: 'markdown', mkd: 'markdown', mkdn: 'markdown',
  // Kotlin
  kt: 'kotlin', kts: 'kotlin',
  // Rust
  rs: 'rust',
  // Swift
  // (swift は hljs で登録済み)
  // Dart
  // (dart は追加登録済み)
  // Go
  // (go は hljs common 済み)
  // Perl
  pl: 'perl', pm: 'perl',
  // PHP
  php3: 'php', php4: 'php', php5: 'php', php7: 'php', php8: 'php', phtml: 'php',
  // Docker
  dockerfile: 'dockerfile', docker: 'dockerfile',
  // PowerShell
  ps1: 'powershell', psm1: 'powershell', psd1: 'powershell',
  // SQL
  // (sql は hljs common 済み)
  // INI / TOML
  toml: 'toml',
  // Groovy
  gvy: 'groovy', gy: 'groovy', gsh: 'groovy',
  // Objective-C
  m: 'objectivec', mm: 'objectivec',
  // Scala
  // (scala は hljs common 済み)
  // R
  r: 'r',
  // Haskell
  hs: 'haskell', lhs: 'haskell',
  // Elixir
  ex: 'elixir', exs: 'elixir',
  // Clojure
  clj: 'clojure', cljs: 'clojure', cljc: 'clojure', edn: 'clojure',
  // Erlang
  erl: 'erlang', hrl: 'erlang',
  // OCaml
  ml: 'ocaml', mli: 'ocaml',
  // Lua
  // (lua は hljs common 済み)
  // HTML / XML
  html: 'xml', htm: 'xml', xhtml: 'xml', svg: 'xml',
  // CSS
  // (css は hljs common 済み)
  // SCSS
  scss: 'scss',
  // Less
  // (less は hljs common 済み)
  // GraphQL
  gql: 'graphql',
  // Vim script
  vim: 'vim', vimrc: 'vim',
  // Makefile
  make: 'makefile', mk: 'makefile',
  // NGINX
  nginx: 'nginx',
  // Plain text
  txt: 'plaintext', text: 'plaintext',
};

export function resolveLanguage(name: string): string | null {
  if (!name) return null;
  const lower = name.toLowerCase().trim();
  const resolved = LANGUAGE_ALIASES[lower] ?? lower;
  return hljs.getLanguage(resolved) ? resolved : null;
}
