import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'node:path';

export function contentConfig(surface: 'commands' | 'tabs') {
  const entry = surface === 'tabs' ? 'src/overlay/tabs.tsx' : 'src/overlay/command.tsx';
  const fileName = surface === 'tabs' ? 'content-tabs.js' : 'content-command.js';

  return defineConfig({
    configFile: false,
    plugins: [react()],
    define: {
      'process.env.NODE_ENV': JSON.stringify('production'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
      },
    },
    build: {
      outDir: 'dist',
      emptyOutDir: false,
      cssCodeSplit: false,
      lib: {
        entry: path.resolve(__dirname, entry),
        name: 'CommandCenterOverlay',
        formats: ['iife'],
        fileName: () => fileName,
      },
      rollupOptions: {
        output: {
          inlineDynamicImports: true,
        },
      },
    },
  });
}
