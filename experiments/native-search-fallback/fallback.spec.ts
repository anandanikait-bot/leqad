import { readFileSync } from 'node:fs';
import { test, expect } from '@playwright/test';
const html = readFileSync(new URL('./index.html', import.meta.url), 'utf8');
test('static card: readable, keyboard reachable, no external requests or active controls', async ({
  page,
}) => {
  const external: string[] = [];
  page.on('request', (request) => {
    if (/^https?:/.test(request.url())) external.push(request.url());
  });
  await page.setContent(html);
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Find Corner rectangle with Onshape Search Tools',
  );
  await expect(
    page.getByText(
      'This fallback does not satisfy automatic SHOW acceptance.',
      { exact: false },
    ),
  ).toBeVisible();
  await expect(page.locator('script, iframe, input, button, form')).toHaveCount(
    0,
  );
  await page.keyboard.press('Tab');
  await expect(page.getByRole('link')).toBeFocused();
  for (const width of [320, 1280]) {
    await page.setViewportSize({ width, height: 800 });
    expect(
      await page.evaluate(
        () => document.documentElement.scrollWidth <= innerWidth,
      ),
    ).toBe(true);
  }
  expect(external).toEqual([]);
});
