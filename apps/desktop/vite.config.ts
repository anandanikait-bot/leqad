import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { fileURLToPath } from 'node:url';
export default defineConfig(({ command }) => ({
  root: fileURLToPath(new URL('.', import.meta.url)),
  base: './',
  plugins: [
    react(),
    ...(command === 'serve'
      ? [
          {
            name: 'local-react-refresh-csp',
            transformIndexHtml(html: string) {
              return html
                .replace(
                  "connect-src 'none'",
                  "connect-src 'self' ws://127.0.0.1:5197",
                )
                .replace(
                  "script-src 'self';",
                  "script-src 'self' 'unsafe-inline';",
                );
            },
          },
        ]
      : []),
  ],
  build: { outDir: 'dist/renderer', emptyOutDir: true },
  server: { host: '127.0.0.1', port: 5197, strictPort: true },
}));
