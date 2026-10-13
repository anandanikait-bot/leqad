import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: ['apps/**/*.test.{ts,tsx}', 'packages/**/*.test.ts'],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      'apps/extension/tests/e2e/**',
    ],
    environment: 'jsdom',
    restoreMocks: true,
    clearMocks: true,
  },
});
