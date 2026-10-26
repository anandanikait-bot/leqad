import { expect } from '@playwright/test';
import { captureScreenshot, test } from './helpers/desktop';

async function expectStep(page: import('@playwright/test').Page, step: number) {
  await expect(page.getByText(new RegExp(`Step ${step} of 8`))).toBeVisible();
}

async function markAsReported(page: import('@playwright/test').Page) {
  await page.getByRole('button', { name: 'Mark done', exact: true }).click();
  await expect(page.getByText(/Marked done by you/).first()).toBeVisible();
  await expect(
    page.getByText(/not verified|unverified/i).first(),
  ).toBeVisible();
}

test('completes all eight written steps with honest outcome categories', async ({
  desktop,
}, testInfo) => {
  const { page } = desktop;

  await expectStep(page, 1);
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(page.getByText('Instruction acknowledged')).toBeVisible();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();

  for (let step = 2; step <= 6; step += 1) {
    await expectStep(page, step);
    await markAsReported(page);
    await page.getByRole('button', { name: 'Next step', exact: true }).click();
  }

  await expectStep(page, 7);
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await expect(page.getByText('Instruction acknowledged')).toBeVisible();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();

  await expectStep(page, 8);
  await markAsReported(page);

  await expect(
    page.getByRole('heading', { name: 'Lesson completed' }),
  ).toBeVisible();
  await expect(
    page.getByText(/8 steps completed.*not independently verified/i),
  ).toBeVisible();
  const summary = page.getByRole('region', {
    name: 'Eight-step completion summary',
  });
  await expect(summary).toBeVisible();
  const summaryText = await summary.innerText();
  expect(summaryText.match(/Instruction acknowledged/g) ?? []).toHaveLength(2);
  expect(summaryText.match(/Marked done by you/g) ?? []).toHaveLength(6);
  expect(summaryText).not.toMatch(/MODEL_VERIFIED|UI_VERIFIED|model verified/i);

  const initialScrollTop = await summary.evaluate(
    (element) => element.scrollTop,
  );
  await summary.focus();
  await page.keyboard.press('End');
  await expect
    .poll(() => summary.evaluate((element) => element.scrollTop))
    .toBeGreaterThan(initialScrollTop);
  await expect(summary).toContainText(/Repeat the workflow independently/i);
  await expect(
    page.getByRole('button', { name: 'Review steps', exact: true }),
  ).toBeVisible();
  await captureScreenshot(page, testInfo, 'desktop-eight-step-completion.png');
});
