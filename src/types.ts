export interface RendererOptions {
  components?: Record<string, unknown>;
  remarkPlugins?: unknown[];
  rehypePlugins?: unknown[];
  remarkRehypeOptions?: Record<string, unknown>;
  [key: string]: unknown;
}

type OptionsGenerator = (...args: unknown[]) => RendererOptions;

interface MarkdownRenderer {
  optionsGenerators: {
    generateViewOptions: OptionsGenerator;
    customGenerateViewOptions: OptionsGenerator | undefined;
  };
}

interface GrowiFacade {
  markdownRenderer?: MarkdownRenderer;
}

declare global {
  interface Window {
    growiFacade?: GrowiFacade;
    pluginActivators?: Record<string, { activate: () => void; deactivate: () => void }>;
  }
}

export {};
