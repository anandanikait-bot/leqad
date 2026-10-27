import { expect } from '@playwright/test';
import {
  captureScreenshot,
  chooseWrittenLessons,
  launchDesktop,
  openSettings,
  test,
} from './helpers/desktop';

test('keeps appearance and lesson progress after app and renderer reloads', async ({
  desktop,
}, testInfo) => {
  const { app, page, userDataDir } = desktop;
  await chooseWrittenLessons(page);
  await openSettings(page);
  await page.getByRole('radio', { name: 'Dark', exact: true }).check();
  await page.getByRole('radio', { name: '150%', exact: true }).check();
  await page
    .getByRole('button', { name: 'Back to lesson', exact: true })
    .click();
  await page.getByRole('button', { name: 'Got it', exact: true }).click();
  await page.getByRole('button', { name: 'Next step', exact: true }).click();
  await expect(page.getByText(/Step 2 of 8/)).toBeVisible();

  await app.close();
  const relaunched = await launchDesktop(userDataDir);
  try {
    await chooseWrittenLessons(relaunched.page);
    await expect(
      relaunched.page.getByText('Continue Your First Sketch?'),
    ).toBeVisible();
    await relaunched.page
      .getByRole('button', { name: 'Resume lesson', exact: true })
      .click();
    await expect(relaunched.page.getByText(/Step 2 of 8/)).toBeVisible();
    await openSettings(relaunched.page);
    await expect(
      relaunched.page.getByRole('radio', { name: 'Dark', exact: true }),
    ).toBeChecked();
    await expect(
      relaunched.page.getByRole('radio', { name: '150%', exact: true }),
    ).toBeChecked();
    await relaunched.page
      .getByRole('button', { name: 'Back to lesson', exact: true })
      .click();

    await relaunched.page.reload();
    await chooseWrittenLessons(relaunched.page);
    await expect(
      relaunched.page.getByText('Continue Your First Sketch?'),
    ).toBeVisible();
    await relaunched.page
      .getByRole('button', { name: 'Resume lesson', exact: true })
      .click();
    await expect(relaunched.page.getByText(/Step 2 of 8/)).toBeVisible();
    await openSettings(relaunched.page);
    await expect(
      relaunched.page.getByRole('radio', { name: 'Dark', exact: true }),
    ).toBeChecked();
    await expect(
      relaunched.page.getByRole('radio', { name: '150%', exact: true }),
    ).toBeChecked();
    await relaunched.page
      .getByRole('button', { name: 'Back to lesson', exact: true })
      .click();
    await captureScreenshot(
      relaunched.page,
      testInfo,
      'desktop-persisted-after-reload.png',
    );
  } finally {
    await relaunched.app.close().catch(() => undefined);
  }
});
