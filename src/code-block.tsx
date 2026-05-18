import React from 'react';
import hljs from './highlight';
import { resolveLanguage } from './language-aliases';
import type { RendererOptions } from './types';

interface CodeProps {
  node?: unknown;
  inline?: boolean;
  className?: string;
  children?: React.ReactNode;
  [key: string]: unknown;
}

function HighlightedCode({ node: _node, inline, className, children, ...props }: CodeProps): React.ReactElement {
  const rawCode = String(children ?? '').replace(/\n$/, '');

  // インラインコード判定: inline prop が true、または言語指定なしで改行なし
  const isInline = inline === true || (!className && !rawCode.includes('\n'));
  if (isInline) {
    return <code className={className} {...props}>{children}</code>;
  }

  // className="language-xxx" から言語名を抽出
  const langMatch = /language-([\w+#.-]+)/.exec(className ?? '');
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

export function activate(): void {
  const facade = window.growiFacade;
  if (facade?.markdownRenderer == null) return;

  const { optionsGenerators } = facade.markdownRenderer;
  originalGenerator = optionsGenerators.customGenerateViewOptions;

  optionsGenerators.customGenerateViewOptions = (...args: unknown[]): RendererOptions => {
    const options = originalGenerator
      ? originalGenerator(...args)
      : optionsGenerators.generateViewOptions(...args);

    return {
      ...options,
      components: {
        ...(options.components as Record<string, unknown> | undefined),
        code: HighlightedCode,
      },
    };
  };
}

export function deactivate(): void {
  const facade = window.growiFacade;
  if (facade?.markdownRenderer == null) return;

  facade.markdownRenderer.optionsGenerators.customGenerateViewOptions = originalGenerator;
  originalGenerator = undefined;
}
