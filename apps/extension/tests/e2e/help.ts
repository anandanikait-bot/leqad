import type { Page } from '@playwright/test';
// UI helper only: preserve original CAD/evidence assertions after relocating help.
export async function openLessonHelp(
  page: Page,
  section = 'Detailed guidance',
) {
  const toggle = page.getByRole('button', { name: 'Help', exact: true });
  if ((await toggle.getAttribute('aria-expanded')) !== 'true')
    await toggle.click();
  await page.getByRole('button', { name: section, exact: true }).click();
}
