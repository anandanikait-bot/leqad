import { mkdtemp, rm } from 'node:fs/promises';
import { createRequire } from 'node:module';
import path from 'node:path';
import { tmpdir } from 'node:os';
import { fileURLToPath } from 'node:url';
import { _electron as electron, test as base } from '@playwright/test';
import type { ElectronApplication, Page, TestInfo } from '@playwright/test';

const require = createRequire(import.meta.url);
const electronExecutable = require('electron') as string;
const mainScript = fileURLToPath(
  new URL('../../../dist/main.cjs', import.meta.url),
);

export type DesktopInstance = {
  app: ElectronApplication;
  page: Page;
  userDataDir: string;
};

export type DesktopFixtures = { desktop: DesktopInstance };

export async function createUserDataDir() {
  return mkdtemp(path.join(tmpdir(), 'leqad-desktop-test-'));
}

export async function launchDesktop(
  userDataDir: string,
): Promise<DesktopInstance> {
  const app = await electron.launch({
    executablePath: electronExecutable,
    args: [mainScript],
    env: {
      ...process.env,
      LEQAD_DESKTOP_TEST_MODE: '1',
      LEQAD_DESKTOP_USER_DATA: userDataDir,
    },
    timeout: 30_000,
  });
  const page = await app.firstWindow();
  await page.waitForLoadState('domcontentloaded');
  return { app, page, userDataDir };
}

export async function captureScreenshot(
  page: Page,
  testInfo: TestInfo,
  name: string,
) {
  const screenshotPath = testInfo.outputPath(name);
  await page.screenshot({ path: screenshotPath });
  await testInfo.attach(name, {
    path: screenshotPath,
    contentType: 'image/png',
  });
}

export async function openSettings(page: Page) {
  await page.getByLabel('Open lesson menu', { exact: true }).click();
  const settingsButton = page.getByRole('button', {
    name: 'Settings',
    exact: true,
  });
  await settingsButton.click();
  return settingsButton;
}

export async function chooseWrittenLessons(page: Page) {
  await page
    .getByRole('button', { name: 'Use written lessons', exact: true })
    .click();
  await page.getByRole('button', { name: /Got it|Resume lesson/ }).waitFor();
}

export const test = base.extend<DesktopFixtures>({
  desktop: async ({}, use) => {
    const userDataDir = await createUserDataDir();
    let app: ElectronApplication | undefined;
    try {
      const instance = await launchDesktop(userDataDir);
      app = instance.app;
      await use(instance);
    } finally {
      if (app) await app.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true });
    }
  },
});
