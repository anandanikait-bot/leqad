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

test('the local answer remains readable above the footer with keyboard scrolling', async ({
  desktop,
}, testInfo) => {
  const { page } = desktop;
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const question = page.getByRole('button', {
    name: 'Why use Corner Rectangle?',
    exact: true,
  });
  await question.focus();
  await page.keyboard.press('Enter');
  const answer = page.getByRole('region', { name: 'Local example' });
  const explanation = answer.getByText(
    'This explanation does not check your sketch.',
    { exact: true },
  );
  await explanation.scrollIntoViewIfNeeded();
  const readableBounds = () =>
    explanation.evaluate((el) => {
      const r = el.getBoundingClientRect();
      const footer = document
        .querySelector('.workspace-footer')!
        .getBoundingClientRect();
      const workspace = document
        .querySelector('.workspace-content')!
        .getBoundingClientRect();
      return (
        r.top >= workspace.top - 1 &&
        r.bottom <= Math.min(workspace.bottom, footer.top) + 1 &&
        r.left >= 0 &&
        r.right <= innerWidth
      );
    });
  await expect
    .poll(readableBounds, {
      message:
        'The entire answer must be reachable without being clipped behind the footer',
    })
    .toBe(true);

  const workspace = page.locator('.workspace-content');
  await workspace.evaluate((el) => {
    el.scrollTop = 0;
  });
  await question.focus();
  await page.keyboard.press('PageDown');
  await expect
    .poll(() => workspace.evaluate((el) => el.scrollTop))
    .toBeGreaterThan(0);
  await explanation.scrollIntoViewIfNeeded();
  await expect.poll(readableBounds).toBe(true);
  await captureScreenshot(page, testInfo, 'desktop-ask-readable-answer.png');

  // Tab to the primary return action, then back to the authored question.
  await question.focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: 'What can Leqad verify?', exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  const back = page.getByRole('button', {
    name: 'Return to Learn',
    exact: true,
  });
  await expect(back).toBeFocused();
  expect(
    await back.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(question).toBeFocused();
  await expect(page.getByText(/Step 1 of 8/)).toBeVisible();
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByLabel('Open lesson menu', { exact: true }),
  ).toBeFocused();
  await expect(page.getByText(/Step 1 of 8/)).toBeVisible();
});
