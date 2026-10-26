import { expect } from '@playwright/test';
import { captureScreenshot, test } from './helpers/desktop';

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

  expect(windowCount).toBe(1);
  expect(contentSize).toEqual([365, 600]);
  await expect(page.getByText('Written lessons · Capture off')).toBeVisible();
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
