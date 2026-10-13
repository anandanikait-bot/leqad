import { expect, test } from '@playwright/test';

test('unimplemented checks offer direct self-reported continuation in the browser', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#fixture-top-plane').click();
  for (const step of [2, 3]) {
    await expect(page.getByText(`Step ${step} of 8 · Visited`)).toBeVisible();
    await page.getByRole('button', { name: 'Check progress' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }

  for (const step of [4, 5, 6]) {
    await expect(page.getByText(`Step ${step} of 8 · Visited`)).toBeVisible();
    await expect(
      page.getByText(/cannot verify this step in this version/),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Check progress' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: "I've finished this step" }).click();
    await expect(
      page.getByText(`Step ${step} of 8 · Marked done`),
    ).toBeVisible();
    await expect(
      page.getByRole('status', { name: 'Lesson progress' }),
    ).toContainText('has not verified your CAD work');
    await page.getByRole('button', { name: 'Next' }).click();
  }
});

test('the browser panel highlights a fixture control and confirms Top-plane sketch UI evidence', async ({
  page,
}) => {
  await page.goto('/fixture.html');

  await expect(page.locator('leqad-e2e-host')).toHaveCount(1);
  await expect(
    page.getByRole('heading', { name: 'Your First Sketch' }),
  ).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Connection status' }),
  ).toHaveText('UI guidance available');

  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toBeVisible();

  await page.locator('#fixture-top-plane').click();
  await page.getByRole('button', { name: 'Check progress' }).click();
  await expect(
    page.getByRole('status', { name: 'Lesson progress' }),
  ).toContainText('Interface evidence confirms');
  await expect(
    page.getByRole('status', { name: 'Lesson progress' }),
  ).toContainText('Model geometry and feature values are not checked');

  await page.locator('#host-control').click();
  await expect(page.locator('#host-click-count')).toHaveText('1');
});

test('the Shadow DOM panel supports real-browser navigation and collapse', async ({
  page,
}) => {
  await page.goto('/fixture.html');

  await page.getByRole('button', { name: 'Projects' }).click();
  await expect(
    page.getByRole('heading', { name: 'Guided projects' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Collapse Leqad panel' }).click();
  await expect(
    page.getByRole('button', { name: 'Expand Leqad panel' }),
  ).toBeVisible();
});

test('the browser panel reaches all eight lesson steps without inventing verification', async ({
  page,
}) => {
  await page.goto('/fixture.html');

  for (let step = 1; step <= 8; step += 1) {
    await expect(page.getByText(`Step ${step} of 8 · Visited`)).toBeVisible();
    if (step === 8) break;
    const acknowledge = page.getByRole('button', { name: 'Got it' });
    if (await acknowledge.isVisible()) {
      await acknowledge.click();
    } else {
      const check = page.getByRole('button', { name: 'Check progress' });
      if (await check.isVisible()) await check.click();
      const continueUnverified = page.getByRole('button', {
        name: "I've finished this step",
      });
      if (await continueUnverified.isVisible()) {
        await continueUnverified.click();
      }
    }
    await page.getByRole('button', { name: 'Next' }).click();
  }

  await page.getByRole('button', { name: "I've finished this step" }).click();
  await expect(page.getByText('Step 8 of 8 · Marked done')).toBeVisible();
  await expect(page.getByText(/has not verified your CAD work/)).toBeVisible();
});
