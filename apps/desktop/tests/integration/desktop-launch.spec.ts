import { expect } from '@playwright/test';
import {
  captureScreenshot,
  chooseWrittenLessons,
  test,
} from './helpers/desktop';

test('launches one secure written-only Electron window', async ({
  desktop,
}, testInfo) => {
  const { app, page } = desktop;
  const windowCount = await app.evaluate(
    ({ BrowserWindow }) => BrowserWindow.getAllWindows().length,
  );
  const contentSize = await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.getContentSize(),
  );

  expect(await app.evaluate(({ app }) => app.getName())).toBe('Leqad');
  expect(windowCount).toBe(1);
  expect(contentSize).toEqual([365, 600]);
  await expect(
    page.getByRole('heading', {
      name: 'Learn alongside your CAD workspace',
      exact: true,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Use written lessons', exact: true }),
  ).toBeEnabled();
  await expect(page.locator('input[type="radio"]:checked')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Got it', exact: true }),
  ).toHaveCount(0);
  await chooseWrittenLessons(page);
  await expect(
    page.getByText('Written lesson · No screen capture'),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'SHOW', exact: true }),
  ).toHaveCount(0);

  const rendererCapabilities = await page.evaluate(() => {
    const exposedWindow = window as Window & {
      require?: unknown;
      process?: unknown;
    };
    return {
      require: typeof exposedWindow.require,
      process: typeof exposedWindow.process,
    };
  });
  expect(rendererCapabilities).toEqual({
    require: 'undefined',
    process: 'undefined',
  });

  await captureScreenshot(page, testInfo, 'desktop-launch.png');
});
