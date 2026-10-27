import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { DEFAULT_PREFERENCES } from '@leqad/desktop-contracts';
import {
  captureScreenshot,
  createUserDataDir,
  launchDesktop,
  test,
} from './helpers/desktop';

const fixtureScript = fileURLToPath(
  new URL('../fixtures/window-catalog-fixture.ps1', import.meta.url),
);

function startWindowsFixture(): ChildProcess {
  return spawn(
    'powershell.exe',
    [
      '-NoLogo',
      '-NoProfile',
      '-NonInteractive',
      '-STA',
      '-File',
      fixtureScript,
    ],
    { windowsHide: true, stdio: 'ignore' },
  );
}

async function stopWindowsFixture(fixture: ChildProcess | undefined) {
  if (!fixture || fixture.exitCode !== null) return;
  await new Promise<void>((resolve) => {
    fixture.once('exit', () => resolve());
    fixture.kill();
    setTimeout(resolve, 2_000).unref();
  });
}

test('startup requires an explicit choice and starts the lesson by keyboard', async ({
  desktop,
}, testInfo) => {
  const { page } = desktop;
  await expect(
    page.getByRole('heading', {
      name: 'Learn alongside your CAD workspace',
      exact: true,
    }),
  ).toBeVisible();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
  const writtenLessons = page.getByRole('button', {
    name: 'Use written lessons',
    exact: true,
  });
  await expect(writtenLessons).toBeEnabled();
  await writtenLessons.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByText('Written lesson · No window selected'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Got it', exact: true }),
  ).toBeFocused();
  await expect(page.getByText(/Step 1 of 8/)).toBeVisible();
  await captureScreenshot(page, testInfo, 'm2-explicit-written-lesson.png');
});

for (const theme of ['light', 'dark'] as const) {
  test(`startup layout remains readable at 320x400 and 200% text (${theme})`, async ({}, testInfo) => {
    const userDataDir = await createUserDataDir();
    await writeFile(
      path.join(userDataDir, 'desktop-state.json'),
      JSON.stringify({
        schemaVersion: 1,
        preferences: {
          ...DEFAULT_PREFERENCES,
          appearance: theme,
          textScale: 2,
        },
        lesson: null,
        placement: null,
      }),
    );
    const { app, page } = await launchDesktop(userDataDir);
    try {
      await page.emulateMedia({ colorScheme: theme });
      await app.evaluate(({ BrowserWindow }) =>
        BrowserWindow.getAllWindows()[0]!.setContentSize(320, 400),
      );
      await expect(page.locator('.desktop-app')).toHaveAttribute(
        'data-appearance',
        theme,
      );
      await expect(page.locator('.desktop-app')).toHaveAttribute(
        'data-text-scale',
        '2',
      );
      const setup = page.locator('.session-setup');
      await expect(setup).toBeVisible();
      const bounds = await page.evaluate(() => {
        const root = document.querySelector('.desktop-app')!;
        const issues: string[] = [];
        const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
        let node: Node | null;
        while ((node = walker.nextNode())) {
          if (!node.textContent?.trim()) continue;
          const range = document.createRange();
          range.selectNodeContents(node);
          for (const rect of Array.from(range.getClientRects())) {
            if (rect.width === 0 || rect.height === 0) continue;
            const rootScroller = document.querySelector('.desktop-app')!;
            if (rect.top < 0 || rect.bottom > innerHeight) {
              rootScroller.scrollTop +=
                rect.top < 0 ? rect.top : rect.bottom - innerHeight;
            }
            const current = range.getBoundingClientRect();
            if (current.left < 0 || current.right > innerWidth)
              issues.push(node.textContent.trim());
          }
        }
        return {
          issues,
          scrollHeight: root.scrollHeight,
          clientHeight: root.clientHeight,
        };
      });
      expect(bounds.issues).toEqual([]);
      expect(bounds.scrollHeight).toBeGreaterThanOrEqual(bounds.clientHeight);
      const scrollers = await page.evaluate(
        () =>
          [...document.querySelectorAll('*')].filter((element) => {
            const style = getComputedStyle(element);
            return (
              ['auto', 'scroll'].includes(style.overflowY) &&
              element.scrollHeight > element.clientHeight + 1
            );
          }).length,
      );
      expect(scrollers).toBeLessThanOrEqual(1);
      await captureScreenshot(
        page,
        testInfo,
        `m2-setup-320x400-200-${theme}.png`,
      );
    } finally {
      await app.close();
      await rm(userDataDir, { recursive: true, force: true });
    }
  });
}

test('selects a disposable visible Windows window without granting screen access', async ({
  desktop,
}, testInfo) => {
  test.skip(
    process.platform !== 'win32',
    'Requires Windows window enumeration',
  );
  const { app, page, userDataDir } = desktop;
  let fixture: ChildProcess | undefined = startWindowsFixture();
  try {
    await expect(
      page.getByRole('heading', {
        name: 'Learn alongside your CAD workspace',
        exact: true,
      }),
    ).toBeVisible();
    const fixtureChoice = page
      .getByRole('radio', {
        name: /^Other app · Window \d+$/,
      })
      .first();
    await expect(fixtureChoice).toBeVisible({ timeout: 20_000 });
    await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
    await captureScreenshot(
      page,
      testInfo,
      'm2-window-selection-unselected.png',
    );

    await fixtureChoice.check();
    await page
      .getByRole('button', { name: 'Use selected window', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Visual help isn’t available in this build',
        exact: true,
      }),
    ).toBeVisible();
    await expect(
      page.getByText(/Selected: Other app · Window \d+/),
    ).toBeVisible();
    await expect(page.getByRole('button', { name: /Allow/i })).toHaveCount(0);
    await captureScreenshot(
      page,
      testInfo,
      'm2-window-selected-screen-off.png',
    );

    await page
      .getByRole('button', {
        name: 'Continue with written lessons',
        exact: true,
      })
      .click();
    await expect(
      page.getByText('Screen access off', { exact: true }),
    ).toBeVisible();
    await expect(page.getByText(/Step 1 of 8/)).toBeVisible();
    await page.getByRole('button', { name: 'Got it', exact: true }).click();
    await expect(page.getByText(/Step 2 of 8/)).toBeVisible();

    await page.getByLabel('Open lesson menu', { exact: true }).click();
    await page.getByRole('button', { name: 'Pause window session' }).click();
    await expect(
      page.getByText(/Window session paused · Screen access off/),
    ).toBeVisible();
    await page.getByLabel('Open lesson menu', { exact: true }).click();
    await page.getByRole('button', { name: 'Resume window session' }).click();
    await expect(
      page.getByText('Screen access off', { exact: true }),
    ).toBeVisible();

    await stopWindowsFixture(fixture);
    fixture = undefined;
    await expect(
      page.getByText('Selected window disconnected', { exact: true }),
    ).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Step 2 of 8/)).toBeVisible();
    const persisted = JSON.parse(
      await readFile(path.join(userDataDir, 'desktop-state.json'), 'utf8'),
    ) as Record<string, unknown>;
    expect(persisted).not.toHaveProperty('session');
    expect(persisted.lesson).toMatchObject({ currentStep: 1 });

    await page.reload();
    await expect(
      page.getByRole('heading', {
        name: 'Learn alongside your CAD workspace',
        exact: true,
      }),
    ).toBeVisible();
    await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
    await expect(
      page.getByRole('button', { name: 'Got it', exact: true }),
    ).toHaveCount(0);
    await expect(page.getByText(/Step 1 of 8/)).toHaveCount(0);
    await page
      .getByRole('button', { name: 'Use written lessons', exact: true })
      .click();
    await expect(
      page.getByRole('heading', {
        name: 'Continue Your First Sketch?',
        exact: true,
      }),
    ).toBeVisible();
    await page
      .getByRole('button', { name: 'Resume lesson', exact: true })
      .click();
    await expect(page.getByText(/Step 2 of 8/)).toBeVisible();
  } finally {
    await stopWindowsFixture(fixture);
    await app.close().catch(() => undefined);
  }
});
