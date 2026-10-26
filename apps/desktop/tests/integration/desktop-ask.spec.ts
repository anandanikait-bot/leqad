import { expect } from '@playwright/test';
import { captureScreenshot, test } from './helpers/desktop';

test('answers the authored local Ask example without network requests', async ({
  desktop,
}, testInfo) => {
  const { page } = desktop;
  const externalRequests: string[] = [];
  page.on('request', (request) => {
    if (/^https?:\/\//i.test(request.url()))
      externalRequests.push(request.url());
  });
  await page.route(/^https?:\/\//i, async (route) => {
    externalRequests.push(route.request().url());
    await route.abort();
  });

  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const ask = page.getByRole('region', { name: 'Ask' });
  await expect(ask).toContainText('Local prototype · no AI connected');
  await page
    .getByRole('button', { name: 'Why use Corner Rectangle?', exact: true })
    .click();
  await expect(ask).toContainText(
    'Corner Rectangle uses two opposite corners.',
  );
  await expect(ask).toContainText(
    'This explanation does not check your sketch.',
  );
  expect(externalRequests).toEqual([]);
  await captureScreenshot(page, testInfo, 'desktop-local-ask.png');
});
