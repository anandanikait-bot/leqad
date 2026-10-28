import { spawn, type ChildProcess } from 'node:child_process';
import { readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { expect } from '@playwright/test';
import { createWindowsMetadataScanner } from '../../src/main/windowCatalog';
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
    { windowsHide: false, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

// Fixed readiness signal only: never read or log titles, handles, or credentials.
async function waitForFixtureWindow(fixture: ChildProcess) {
  return new Promise<number>((resolve, reject) => {
    let received = '';
    const timer = setTimeout(
      () => finish(new Error('Disposable window did not become visible')),
      15_000,
    );
    const onData = (data: Buffer) => {
      received += data.toString();
      if (received.length > 128 || received.includes('WINDOW_NOT_VISIBLE')) {
        finish(
          new Error(
            'Disposable fixture did not expose a visible native window',
          ),
        );
        return;
      }
      const match = received.trim().match(/^WINDOW_READY:([0-9]+)$/);
      if (match) finish(undefined, Number(match[1]));
    };
    const onExit = () =>
      finish(new Error('Disposable window process exited before readiness'));
    const onError = () =>
      finish(new Error('Disposable window process could not start'));
    function finish(error?: Error, processId?: number) {
      clearTimeout(timer);
      fixture.stdout?.off('data', onData);
      fixture.off('exit', onExit);
      fixture.off('error', onError);
      if (error) reject(error);
      else if (Number.isSafeInteger(processId) && processId! > 0)
        resolve(processId!);
      else reject(new Error('Invalid fixture readiness signal'));
    }
    fixture.stdout?.on('data', onData);
    fixture.once('exit', onExit);
    fixture.once('error', onError);
  });
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
  await page.keyboard.press('Shift+Tab');
  await expect(page.getByRole('button', { name: /^Help/ })).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'Got it', exact: true }),
  ).toBeFocused();
  await expect(
    page.getByRole('button', { name: 'Got it', exact: true }),
  ).not.toHaveCSS('outline-style', 'none');
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

for (const [width, height, textScale, appearance] of [
  [365, 600, 1, 'light'],
  [365, 600, 1, 'dark'],
  [320, 400, 2, 'light'],
  [320, 400, 2, 'dark'],
] as const) {
  test(`selects a disposable visible Windows window without granting screen access ${width}x${height} ${appearance}`, async ({}, testInfo) => {
    test.skip(
      process.platform !== 'win32',
      'Requires Windows window enumeration',
    );
    const userDataDir = await createUserDataDir();
    await writeFile(
      path.join(userDataDir, 'desktop-state.json'),
      JSON.stringify({
        schemaVersion: 1,
        preferences: { ...DEFAULT_PREFERENCES, appearance, textScale },
        lesson: null,
        placement: null,
      }),
    );
    const { app, page } = await launchDesktop(userDataDir);
    await app.evaluate(
      ({ BrowserWindow }, [width, height]) =>
        BrowserWindow.getAllWindows()[0]!.setContentSize(width!, height!),
      [width, height],
    );
    let fixture: ChildProcess | undefined = startWindowsFixture();
    try {
      await expect(
        page.getByRole('heading', {
          name: 'Learn alongside your CAD workspace',
          exact: true,
        }),
      ).toBeVisible();
      const fixtureProcessId = await waitForFixtureWindow(fixture);
      // Read-only observation of the real producer boundary: the callback,
      // native query, validation, and UI catalog remain unchanged. Only safe
      // counts/ordinal are retained. The fixture PID stays in this closure.
      await app.evaluate((_electron, fixturePid) => {
        const cp = process.getBuiltinModule(
          'child_process',
        ) as typeof import('node:child_process');
        const original = cp.execFile;
        const state = globalThis as typeof globalThis & {
          __leqadFixtureObservation?: {
            ordinal: number;
            count: number;
            complete: boolean;
          };
        };
        cp.execFile = ((...args: unknown[]) => {
          const command = args[1];
          const callback = args[3];
          if (
            Array.isArray(command) &&
            command.some(
              (value) =>
                typeof value === 'string' &&
                value.includes('namespace LeqadWindowCatalog'),
            ) &&
            typeof callback === 'function'
          ) {
            args[3] = (error: unknown, stdout: unknown, stderr: unknown) => {
              if (!error && typeof stdout === 'string') {
                try {
                  const parsed = JSON.parse(stdout) as {
                    incomplete?: boolean;
                    windows?: { application?: string; processId?: number }[];
                  };
                  if (Array.isArray(parsed.windows)) {
                    const rows = parsed.windows.filter(
                      (row) => row.application === 'Other app',
                    );
                    state.__leqadFixtureObservation = {
                      ordinal:
                        rows.findIndex((row) => row.processId === fixturePid) +
                        1,
                      count: rows.length,
                      complete: parsed.incomplete === false,
                    };
                  }
                } catch {
                  /* No raw provider data is exported. */
                }
              }
              Reflect.apply(callback, undefined, [error, stdout, stderr]);
            };
          }
          return Reflect.apply(original, cp, args) as ChildProcess;
        }) as typeof cp.execFile;
      }, fixtureProcessId);
      // The startup catalog predates this window. Refresh through the normal UI.
      await page
        .getByRole('button', { name: 'Refresh window list', exact: true })
        .click();
      const readObservation = () =>
        app.evaluate(
          () =>
            (
              globalThis as typeof globalThis & {
                __leqadFixtureObservation?: {
                  ordinal: number;
                  count: number;
                  complete: boolean;
                };
              }
            ).__leqadFixtureObservation,
        );
      await expect
        .poll(async () => (await readObservation())?.ordinal ?? 0, {
          message: 'The real native producer must observe the visible fixture',
        })
        .toBeGreaterThan(0);
      const observed = (await readObservation())!;
      expect(observed.complete).toBe(true);
      await expect(
        page.getByRole('radio', { name: /^Other app · Window \d+$/ }),
      ).toHaveCount(observed.count);
      const ordinal = observed.ordinal;
      const fixtureChoice = page.getByRole('radio', {
        name: `Other app · Window ${ordinal}`,
        exact: true,
      });
      await expect(
        fixtureChoice,
        'A real shown fixture must appear after the native catalog refresh',
      ).toBeVisible({ timeout: 20_000 });
      console.log(
        'M2_NATIVE_WINDOW: fixture shown; native catalog exposes a selectable Other app',
      );
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
      console.log(
        'M2_NATIVE_WINDOW: native selection validated; screen access remains off',
      );
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
      await page
        .getByRole('button', { name: 'Next step', exact: true })
        .click();
      await expect(page.getByText(/Step 2 of 8/)).toBeVisible();

      await page.getByLabel('Open lesson menu', { exact: true }).click();
      await page.getByRole('button', { name: 'Pause window session' }).click();
      await expect(
        page.getByText(/Window session paused · Screen access off/),
      ).toBeVisible();
      await captureScreenshot(page, testInfo, 'm2-window-paused.png');
      await page.getByLabel('Open lesson menu', { exact: true }).click();
      await page.getByRole('button', { name: 'Resume window session' }).click();
      await expect(
        page.getByText('Screen access off', { exact: true }),
      ).toBeVisible();

      await expect(page.locator('.session-strip')).toContainText(
        `Other app · Window ${ordinal}`,
      );
      await expect(
        page.getByText('Selected window disconnected', { exact: true }),
      ).toHaveCount(0);
      await stopWindowsFixture(fixture);
      fixture = undefined;
      const afterClosure = await createWindowsMetadataScanner()();
      expect(
        afterClosure.windows.some(
          (window) => window.processId === fixtureProcessId,
        ),
        'The real fixture window must be absent before checking disconnection',
      ).toBe(false);
      await expect(
        page.getByText('Selected window disconnected', { exact: true }),
      )
        .toBeVisible({ timeout: 10_000 })
        .catch(async (error) => {
          const state = await page.evaluate(async () => {
            try {
              // Failure-only session revalidation; the original assertion still fails.
              const view = await window.leqad?.command({
                type: 'pause',
                paused: false,
              });
              await window.leqad?.command({ type: 'pause', paused: true });
              const revalidated = await window.leqad?.command({
                type: 'pause',
                paused: false,
              });
              return {
                afterRevalidation: revalidated?.binding,
                binding: view?.binding,
                paused: view?.paused,
                reason: view?.reason,
              };
            } catch {
              return { reason: 'host-state-unreadable' };
            }
          });
          console.log('M2_DISCONNECT_FAILURE_STATE', JSON.stringify(state));
          throw error;
        });
      console.log(
        'M2_NATIVE_WINDOW: closing fixture disconnected selected window',
      );
      await captureScreenshot(page, testInfo, 'm2-window-disconnected.png');
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
      await captureScreenshot(
        page,
        testInfo,
        'm2-written-fallback-restored.png',
      );
    } finally {
      const catalog = await page
        .evaluate(async () => {
          const result = await window.leqad?.listWindows();
          return (
            result && {
              availability: result.availability,
              incomplete: result.incomplete,
              unavailableReason: result.unavailableReason,
              windows: result.windows.map(({ application, kind, ordinal }) => ({
                application,
                kind,
                ordinal,
              })),
            }
          );
        })
        .catch(() => ({ availability: 'unavailable' }));
      await testInfo.attach('native-catalog-summary.json', {
        body: JSON.stringify(catalog),
        contentType: 'application/json',
      });
      console.log('M2_NATIVE_CATALOG', JSON.stringify(catalog));
      if (
        catalog?.availability === 'unavailable' &&
        width === 365 &&
        appearance === 'light'
      ) {
        await captureScreenshot(
          page,
          testInfo,
          'm2-native-provider-unavailable.png',
        );
      }
      await stopWindowsFixture(fixture);
      await app.close().catch(() => undefined);
      await rm(userDataDir, { recursive: true, force: true });
    }
  });
}
