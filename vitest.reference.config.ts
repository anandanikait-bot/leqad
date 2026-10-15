import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  root: fileURLToPath(new URL('.', import.meta.url)),
  test: {
    include: [
      'validation/onshape-reference/**/*.test.ts',
      'tools/onshape-reference/**/*.test.ts',
    ],
    exclude: ['**/node_modules/**', '**/dist/**'],
    environment: 'jsdom',
    restoreMocks: true,
    clearMocks: true,
  },
});
