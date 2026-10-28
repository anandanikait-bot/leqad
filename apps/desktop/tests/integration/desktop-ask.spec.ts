import { expect } from '@playwright/test';
import {
  captureScreenshot,
  chooseWrittenLessons,
  test,
} from './helpers/desktop';

test('shows honest AI unavailability without network requests', async ({
  desktop,
}, testInfo) => {
  const { page } = desktop;
  await chooseWrittenLessons(page);
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
  await expect(ask).toContainText('AI unavailable');
  await expect(ask).toContainText('No answer was generated.');
  await expect(ask).toContainText('Don’t include private CAD data.');
  await page
    .getByRole('button', { name: 'Why use Corner Rectangle?', exact: true })
    .click();
  await expect(
    page.getByRole('textbox', { name: 'Your question' }),
  ).toHaveValue('Why use Corner Rectangle?');
  await expect(page.getByRole('button', { name: 'Send' })).toBeDisabled();
  await expect(ask).not.toContainText('Corner Rectangle lets you draw');
  expect(externalRequests).toEqual([]);
  await captureScreenshot(page, testInfo, 'tutor-unavailable.png');
});

test('the unavailable Ask screen stays readable above the footer with keyboard navigation', async ({
  desktop,
}, testInfo) => {
  const { page } = desktop;
  await chooseWrittenLessons(page);
  await page.getByRole('button', { name: 'Ask', exact: true }).click();
  const question = page.getByRole('button', {
    name: 'Why use Corner Rectangle?',
    exact: true,
  });
  await question.focus();
  await page.keyboard.press('Enter');
  const input = page.getByRole('textbox', { name: 'Your question' });
  await expect(input).toBeDisabled();
  await expect(question).toBeFocused();
  await expect(input).toHaveValue('Why use Corner Rectangle?');
  const privacyNote = page.locator('.tutor-privacy-note');
  await privacyNote.scrollIntoViewIfNeeded();
  const readableBounds = () =>
    privacyNote.evaluate((el) => {
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
  await privacyNote.scrollIntoViewIfNeeded();
  await expect.poll(readableBounds).toBe(true);
  await captureScreenshot(page, testInfo, 'tutor-unavailable-readable.png');

  // Suggested questions and learning history remain keyboard reachable.
  await question.focus();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', {
      name: 'How do I dimension a rectangle?',
      exact: true,
    }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByRole('button', { name: "I'm still confused.", exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  await expect(
    page.getByText('Learning history', { exact: true }),
  ).toBeFocused();
  await page.keyboard.press('Tab');
  const back = page.getByRole('button', {
    name: 'Back to lesson',
    exact: true,
  });
  await expect(back).toBeFocused();
  expect(
    await back.evaluate((el) => getComputedStyle(el).outlineStyle),
  ).not.toBe('none');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await page.keyboard.press('Shift+Tab');
  await expect(question).toBeFocused();
  await expect(page.locator('.step-counter')).toContainText('Step 1 of 8');
  await back.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByLabel('Open lesson menu', { exact: true }),
  ).toBeFocused();
  await expect(page.locator('.step-counter')).toContainText('Step 1 of 8');
});
