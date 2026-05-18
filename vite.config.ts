import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  build: {
    manifest: 'manifest.json',
    rollupOptions: {
      input: ['/client-entry.tsx'],
      // React は GROWI 本体に同梱されているため二重ロードを防ぐ
      external: ['react', 'react/jsx-runtime', 'react-dom'],
      output: {
        globals: {
          react: 'React',
          'react/jsx-runtime': 'ReactJSXRuntime',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
