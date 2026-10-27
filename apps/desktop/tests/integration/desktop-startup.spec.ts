import { readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { expect, type Locator } from '@playwright/test';
import { DEFAULT_PREFERENCES } from '@leqad/desktop-contracts';
import { createDesktopLessonController } from '../../src/renderer/lessonController';
import {
  chooseWrittenLessons,
  createUserDataDir,
  launchDesktop,
  test,
} from './helpers/desktop';

// Isolated saved-state fixture. No owner profile or CAD content is read.
const controller = createDesktopLessonController();
controller.dispatch({ type: 'ACKNOWLEDGE' });
controller.dispatch({ type: 'NEXT' });
const savedLesson = controller.serialize();

async function readableText(locator: Locator) {
  await expect(locator).toBeVisible();
  expect(
    await locator.evaluate((el) => {
      const errors: string[] = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      let node: Node | null;
      while ((node = walker.nextNode())) {
        if (!node.textContent?.trim()) continue;
        const range = document.createRange();
        range.selectNodeContents(node);
        for (let i = 0; i < range.getClientRects().length; i++) {
          let rect = range.getClientRects()[i]!;
          if (!rect.width || !rect.height) continue;
          const root = document.querySelector('.desktop-app')!;
          root.scrollTop += rect.top - innerHeight / 2;
          rect = range.getClientRects()[i]!;
          if (
            rect.left < -1 ||
            rect.right > innerWidth + 1 ||
            rect.top < -1 ||
            rect.bottom > innerHeight + 1
          )
            errors.push(`Unreachable text: ${node.textContent}`);
          const hit = document.elementFromPoint(
            rect.left + rect.width / 2,
            rect.top + rect.height / 2,
          );
          if (hit !== node.parentElement)
            errors.push(`Covered text: ${node.textContent}`);
        }
      }
      return errors;
    }),
    'Every text line can be read through the startup scroll surface',
  ).toEqual([]);
}

async function fullBounds(locator: Locator) {
  await locator.scrollIntoViewIfNeeded();
  expect(
    await locator.evaluate((el) => {
      const r = el.getBoundingClientRect();
      return (
        r.left >= -1 &&
        r.top >= -1 &&
        r.right <= innerWidth + 1 &&
        r.bottom <= innerHeight + 1
      );
    }),
    'The entire control is reachable inside the window',
  ).toBe(true);
}

for (const [width, height] of [
  [365, 600],
  [320, 400],
] as const) {
  for (const scale of [100, 200] as const) {
    for (const theme of ['light', 'dark'] as const) {
      for (const state of ['loading', 'resume'] as const) {
        test(`startup ${state} ${width}x${height} ${scale}% ${theme}`, async ({}, info) => {
          const userDataDir = await createUserDataDir();
          const file = path.join(userDataDir, 'desktop-state.json');
          await writeFile(
            file,
            JSON.stringify({
              schemaVersion: 1,
              preferences: {
                ...DEFAULT_PREFERENCES,
                appearance: theme,
                textScale: scale / 100,
              },
              lesson: savedLesson,
              placement: null,
            }),
          );
          const desktop = await launchDesktop(userDataDir);
          const { page, app } = desktop;
          let actionsCaptured = false;
          async function capture(position: string) {
            if (position === 'actions') actionsCaptured = true;
            const name = `startup-${state}-${width}x${height}-${scale}-${theme}-${position}.png`;
            const screenshot = await page.screenshot({
              path: info.outputPath(name),
            });
            await info.attach(name, {
              body: screenshot,
              contentType: 'image/png',
            });
            // Review-only transport for synthetic UI PNGs through the GitHub connector.
            // The complete matrix is also uploaded as the ordinary Playwright artifact.
            if (
              process.platform === 'win32' &&
              process.env.LEQAD_REVIEW_STARTUP_PNGS === '1' &&
              ((width === 365 && scale === 100 && theme === 'light') ||
                (width === 320 && scale === 200 && theme === 'dark'))
            ) {
              const encoded = screenshot.toString('base64');
              for (let offset = 0; offset < encoded.length; offset += 12000)
                console.log(
                  `STARTUP_PNG ${name} ${offset} ${encoded.slice(offset, offset + 12000)}`,
                );
              console.log(
                `STARTUP_PNG_END ${name} ${createHash('sha256').update(screenshot).digest('hex')}`,
              );
            }
          }
          try {
            await page.emulateMedia({ colorScheme: theme });
            await app.evaluate(
              ({ BrowserWindow }, size) =>
                BrowserWindow.getAllWindows()[0]!.setContentSize(
                  size[0]!,
                  size[1]!,
                ),
              [width, height],
            );
            await chooseWrittenLessons(page);
            await expect(
              page.getByRole('heading', {
                name: 'Continue Your First Sketch?',
                exact: true,
              }),
            ).toBeVisible();
            if (state === 'loading') {
              // Delay only the lesson read, in this test process. Saved preferences
              // still travel through the real preload and store. No production hook.
              await app.evaluate(({ ipcMain, BrowserWindow }) => {
                // The host reinstalls its validated IPC handlers on navigation.
                // Delay after that reinstall, before the renderer starts its read.
                BrowserWindow.getAllWindows()[0]!.webContents.on(
                  'did-start-navigation',
                  (_event, _url, _inPlace, isMainFrame) => {
                    if (!isMainFrame) return;
                    ipcMain.removeHandler('desktop:load-lesson');
                    ipcMain.handle(
                      'desktop:load-lesson',
                      () => new Promise(() => {}),
                    );
                  },
                );
              });
              await page.reload();
              await expect(
                page.getByText('Loading your lesson and settings...', {
                  exact: true,
                }),
              ).toBeVisible();
            }
            await page.evaluate(() => document.fonts.ready);
            await page
              .locator('.desktop-app')
              .evaluate((el) => (el.scrollTop = 0));
            await capture('top');
            const root = page.locator('.desktop-app');
            await expect(root).toHaveAttribute('data-appearance', theme);
            await expect(root).toHaveCSS(
              'background-color',
              theme === 'dark' ? 'rgb(25, 25, 25)' : 'rgb(245, 239, 231)',
            );
            await expect(root).toHaveAttribute(
              'data-text-scale',
              String(scale / 100),
            );
            const heading = page.getByRole('heading', {
              name:
                state === 'loading'
                  ? 'Opening Leqad'
                  : 'Continue Your First Sketch?',
              exact: true,
            });
            await expect(heading).toBeVisible();
            const geometry = await heading.evaluate((el) => {
              const heading = el.getBoundingClientRect(),
                parent = el.parentElement!.getBoundingClientRect(),
                style = getComputedStyle(el);
              return {
                left: heading.left - parent.left,
                font: style.fontFamily,
                size: parseFloat(style.fontSize),
                line: parseFloat(style.lineHeight),
                top: heading.top - parent.top,
              };
            });
            expect(geometry.left).toBe(16);
            expect(geometry.top).toBe(16);
            expect(geometry.font).toContain('Space Grotesk');
            expect(geometry.size).toBe((20 * scale) / 100);
            expect(geometry.line).toBe((26 * scale) / 100);
            await readableText(
              state === 'loading'
                ? page.getByRole('status')
                : page.getByRole('region', {
                    name: 'Saved lesson recovery',
                    exact: true,
                  }),
            );
            if (state === 'resume') {
              await expect(
                page.getByText('Step 2 of 8 · 1 step marked complete', {
                  exact: true,
                }),
              ).toBeVisible();
              await expect(heading).toBeFocused();
              const resume = page.getByRole('button', {
                name: 'Resume lesson',
                exact: true,
              });
              const restart = page.getByRole('button', {
                name: 'Start again',
                exact: true,
              });
              const footer = page.locator('.resume-footer');
              const body = page.locator('.resume-body');
              expect(
                await body.evaluate((el) => {
                  const b = el.getBoundingClientRect(),
                    f = document
                      .querySelector('.resume-footer')!
                      .getBoundingClientRect();
                  return b.bottom <= f.top + 1 && b.height > 0;
                }),
              ).toBe(true);
              await heading.focus();
              if (
                await root.evaluate(
                  (el) => el.scrollHeight > el.clientHeight + 1,
                )
              ) {
                await root.evaluate((el) => (el.scrollTop = 0));
                await page.keyboard.press('PageDown');
                await expect
                  .poll(() => root.evaluate((el) => el.scrollTop))
                  .toBeGreaterThan(0);
              }
              await page.keyboard.press('Tab');
              await expect(resume).toBeFocused();
              await fullBounds(resume);
              expect(
                await resume.evaluate(
                  (el) => getComputedStyle(el).outlineStyle,
                ),
              ).not.toBe('none');
              await page.keyboard.press('Tab');
              await expect(restart).toBeFocused();
              await fullBounds(restart);
              await footer.scrollIntoViewIfNeeded();
              await fullBounds(resume);
              await fullBounds(restart);
              await capture('actions');
              if (scale === 100 && height === 600)
                expect(
                  (await footer.boundingBox())!.y +
                    (await footer.boundingBox())!.height,
                ).toBeCloseTo(height, 0);
              await page.keyboard.press('Shift+Tab');
              await expect(resume).toBeFocused();
              await page.keyboard.press('Enter');
              await expect(
                page.getByLabel('Open lesson menu', { exact: true }),
              ).toBeFocused();
              await expect(page.locator('.step-counter')).toContainText(
                'Step 2 of 8',
              );
            } else {
              await page.keyboard.press('Tab');
              const status = page.getByRole('status');
              await expect(status).toBeFocused();
              expect(
                await status.evaluate(
                  (el) => getComputedStyle(el).outlineStyle,
                ),
              ).not.toBe('none');
              const overflow = await root.evaluate(
                (el) => el.scrollHeight > el.clientHeight + 1,
              );
              if (overflow) {
                await root.evaluate((el) => (el.scrollTop = 0));
                await page.keyboard.press('PageDown');
                await expect
                  .poll(() => root.evaluate((el) => el.scrollTop))
                  .toBeGreaterThan(0);
              }
              await expect(page.getByRole('button')).toHaveCount(0);
              await expect(page.locator('.step-counter')).toHaveCount(0);
            }
            expect(
              await page.evaluate(
                () =>
                  [...document.querySelectorAll('*')].filter(
                    (el) =>
                      ['auto', 'scroll'].includes(
                        getComputedStyle(el).overflowY,
                      ) && el.scrollHeight > el.clientHeight + 1,
                  ).length,
              ),
            ).toBeLessThanOrEqual(1);
            expect(JSON.parse(await readFile(file, 'utf8')).lesson).toEqual(
              savedLesson,
            );
          } finally {
            if (
              state === 'resume' &&
              !actionsCaptured &&
              (await page.locator('.resume-footer').isVisible())
            ) {
              await page.locator('.resume-footer').scrollIntoViewIfNeeded();
              await capture('actions');
            }
            await app.close();
            await rm(userDataDir, { recursive: true, force: true });
          }
        });
      }
    }
  }
}

test('a completed saved lesson resumes its summary without resetting progress', async ({}, info) => {
  const completed = createDesktopLessonController();
  for (let index = 0; index < 8; index++) {
    completed.dispatch({
      type: index === 0 || index === 6 ? 'ACKNOWLEDGE' : 'MARK_DONE',
    });
    if (index < 7) completed.dispatch({ type: 'NEXT' });
  }
  const lesson = completed.serialize();
  const userDataDir = await createUserDataDir();
  const file = path.join(userDataDir, 'desktop-state.json');
  await writeFile(
    file,
    JSON.stringify({
      schemaVersion: 1,
      preferences: { ...DEFAULT_PREFERENCES, appearance: 'dark', textScale: 2 },
      lesson,
      placement: null,
    }),
  );
  const { app, page } = await launchDesktop(userDataDir);
  try {
    await chooseWrittenLessons(page);
    await app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setContentSize(320, 400),
    );
    await expect(
      page.getByRole('heading', {
        name: 'Continue Your First Sketch?',
        exact: true,
      }),
    ).toBeFocused();
    const resume = page.getByRole('button', {
      name: 'Resume lesson',
      exact: true,
    });
    await resume.focus();
    await page.keyboard.press('Enter');
    // Wait through the return-focus animation frame to reject a transient focus pass.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => requestAnimationFrame(() => resolve())),
    );
    await expect(
      page.getByRole('heading', { name: 'Lesson complete', exact: true }),
    ).toBeFocused();
    await expect(
      page.getByRole('region', {
        name: 'Eight-step completion summary',
        exact: true,
      }),
    ).toContainText('8 steps marked complete');
    expect(JSON.parse(await readFile(file, 'utf8')).lesson).toEqual(lesson);
    await info.attach('completed-lesson-resumed.png', {
      body: await page.screenshot(),
      contentType: 'image/png',
    });
  } finally {
    await app.close();
    await rm(userDataDir, { recursive: true, force: true });
  }
});
