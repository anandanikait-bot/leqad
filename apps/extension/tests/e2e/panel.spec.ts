import { expect, test } from '@playwright/test';

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
