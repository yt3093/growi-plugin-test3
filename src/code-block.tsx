import React from 'react';
import hljs from './highlight';
import { resolveLanguage } from './language-aliases';
import type { RendererOptions } from './types';

const LOG_PREFIX = '[codesyntaxhighlight]';

interface CodeProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

function extractText(node: React.ReactNode): string {
  if (node == null || node === false || node === true) return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (React.isValidElement(node)) {
    const children = (node.props as { children?: React.ReactNode } | null)?.children;
    return extractText(children);
  }
  return '';
}

let _debugLogged = false;

function HighlightedCode({ node: _node, inline, className, children, ...props }: CodeProps): React.ReactElement {
  if (!_debugLogged) {
    console.log(`${LOG_PREFIX} HighlightedCode rendered (first call)`, { inline, className, childrenType: typeof children });
    _debugLogged = true;
  }

  const rawCode = extractText(children).replace(/\n$/, '');

  // rehype-react では className が string[] で渡される場合がある
  const classNameStr = Array.isArray(className) ? className.join(' ') : (className ?? '');

  // インラインコード判定: inline prop が true、または言語指定なしで改行なし
  const isInline = inline === true || (!classNameStr && !rawCode.includes('\n'));
  if (isInline) {
    return <code className={classNameStr || undefined} {...props}>{children}</code>;
  }

  // className="language-xxx" から言語名を抽出
  const langMatch = /language-([\w+#.-]+)/.exec(classNameStr);
  const rawLang = langMatch?.[1] ?? '';
  const lang = resolveLanguage(rawLang);

  let highlighted: string;
  let resolvedLang: string;

  if (lang) {
    const result = hljs.highlight(rawCode, { language: lang, ignoreIllegals: true });
    highlighted = result.value;
    resolvedLang = lang;
  } else {
    // 言語指定なしの場合は auto-detect を試みる (信頼度が低い場合は plaintext)
    const result = hljs.highlightAuto(rawCode);
    highlighted = result.value;
    resolvedLang = result.language ?? 'plaintext';
  }

  const lines = highlighted.split('\n');
  // 末尾の空行を除去 (split 結果の最後が空文字になる場合)
  if (lines[lines.length - 1] === '') {
    lines.pop();
  }

  return (
    <div className="growi-shp">
      {resolvedLang && resolvedLang !== 'plaintext' && (
        <div className="growi-shp__header">
          <span className="growi-shp__lang">{resolvedLang}</span>
        </div>
      )}
      <pre className={`growi-shp__pre hljs language-${resolvedLang}`}>
        <code>
          <table className="growi-shp__lines">
            <tbody>
              {lines.map((line, i) => (
                <tr key={i}>
                  <td className="growi-shp__lineno" aria-hidden="true">{i + 1}</td>
                  {/* highlight.js の出力はエスケープ済みの HTML スパン列なので安全 */}
                  <td className="growi-shp__code" dangerouslySetInnerHTML={{ __html: line }} />
                </tr>
              ))}
            </tbody>
          </table>
        </code>
      </pre>
    </div>
  );
}

type OptionsGenerator = (...args: unknown[]) => RendererOptions;

let originalGenerator: OptionsGenerator | undefined;
let retryTimer: ReturnType<typeof setTimeout> | null = null;

function installHook(): boolean {
  const facade = window.growiFacade;
  if (facade?.markdownRenderer == null) return false;

  const { optionsGenerators } = facade.markdownRenderer;
  console.log(`${LOG_PREFIX} installHook`, {
    hasGenerators: !!optionsGenerators,
    hasGenerate: typeof optionsGenerators?.generateViewOptions,
    hasCustom: typeof optionsGenerators?.customGenerateViewOptions,
  });

  originalGenerator = optionsGenerators.customGenerateViewOptions;

  optionsGenerators.customGenerateViewOptions = (...args: unknown[]): RendererOptions => {
    const options = originalGenerator
      ? originalGenerator(...args)
      : optionsGenerators.generateViewOptions(...args);

    console.log(`${LOG_PREFIX} customGenerateViewOptions called, existing components keys:`, Object.keys((options.components as object | undefined) ?? {}));

    return {
      ...options,
      components: {
        ...(options.components as Record<string, unknown> | undefined),
        code: HighlightedCode,
      },
    };
  };

  console.log(`${LOG_PREFIX} hook installed`);
  return true;
}

export function activate(): void {
  console.log(`${LOG_PREFIX} activate called`, {
    hasFacade: !!window.growiFacade,
    hasRenderer: !!window.growiFacade?.markdownRenderer,
  });

  if (installHook()) return;

  // markdownRenderer がまだ準備できていない場合にリトライ
  let attempts = 0;
  retryTimer = setInterval(() => {
    attempts++;
    if (installHook() || attempts >= 20) {
      if (retryTimer != null) clearInterval(retryTimer);
      retryTimer = null;
      if (attempts >= 20) console.warn(`${LOG_PREFIX} markdownRenderer not found after retries`);
    }
  }, 200);
}

export function deactivate(): void {
  if (retryTimer != null) {
    clearInterval(retryTimer);
    retryTimer = null;
  }

  const facade = window.growiFacade;
  if (facade?.markdownRenderer == null) return;

  facade.markdownRenderer.optionsGenerators.customGenerateViewOptions = originalGenerator;
  originalGenerator = undefined;
  console.log(`${LOG_PREFIX} deactivated`);
}
