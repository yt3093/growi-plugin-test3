const LIGHT_CLASS = 'growi-shp-light';
const DARK_CLASS = 'growi-shp-dark';

let observer: MutationObserver | null = null;
let mediaQuery: MediaQueryList | null = null;

function applyTheme(): void {
  const bsTheme = document.documentElement.getAttribute('data-bs-theme');
  let isDark: boolean;

  if (bsTheme === 'dark') {
    isDark = true;
  } else if (bsTheme === 'light') {
    isDark = false;
  } else {
    // data-bs-theme が未設定の場合は OS テーマにフォールバック
    isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  }

  document.body.classList.toggle(DARK_CLASS, isDark);
  document.body.classList.toggle(LIGHT_CLASS, !isDark);
}

export function startThemeObserver(): void {
  applyTheme();

  observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      if (m.attributeName === 'data-bs-theme') {
        applyTheme();
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-bs-theme'] });

  mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
  mediaQuery.addEventListener('change', applyTheme);
}

export function stopThemeObserver(): void {
  observer?.disconnect();
  observer = null;

  mediaQuery?.removeEventListener('change', applyTheme);
  mediaQuery = null;

  document.body.classList.remove(DARK_CLASS, LIGHT_CLASS);
}
