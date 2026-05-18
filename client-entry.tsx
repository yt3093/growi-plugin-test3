import './src/styles/github-themes.css';
import './src/styles/code-block.css';
import { activate as installRenderer, deactivate as uninstallRenderer } from './src/code-block';
import { startThemeObserver, stopThemeObserver } from './src/theme-observer';

const PLUGIN_NAME = 'codesyntaxhighlight';

const activate = (): void => {
  installRenderer();
  startThemeObserver();
};

const deactivate = (): void => {
  stopThemeObserver();
  uninstallRenderer();
};

if (typeof window !== 'undefined') {
  window.pluginActivators ??= {};
  window.pluginActivators[PLUGIN_NAME] = { activate, deactivate };
}
