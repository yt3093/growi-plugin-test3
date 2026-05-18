import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: 'manifest.json',
    rollupOptions: {
      input: ['/client-entry.tsx'],
      // React は GROWI 環境で外部解決が保証されないためバンドルに同梱。
      // 本プラグインは Hooks を使わない関数コンポーネントのみなので
      // 二重 React インスタンスによる副作用は最小限。
    },
  },
});
