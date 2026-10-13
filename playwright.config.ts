import { existsSync } from 'node:fs';
import { defineConfig } from '@playwright/test';

const systemChromium = '/usr/bin/chromium';

export default defineConfig({
  testDir: './apps/extension/tests/e2e',
  fullyParallel: true,
  reporter: 'list',
  use: {
    baseURL: 'http://127.0.0.1:4173',
    browserName: 'chromium',
    launchOptions: existsSync(systemChromium)
      ? { executablePath: systemChromium, args: ['--no-sandbox'] }
      : {},
  },
  webServer: {
    command:
      'pnpm --filter @leqad/extension exec vite --config tests/e2e/fixture-vite.config.ts --host 127.0.0.1 --port 4173 --strictPort',
    url: 'http://127.0.0.1:4173/fixture.html',
    reuseExistingServer: !process.env.CI,
  },
});
