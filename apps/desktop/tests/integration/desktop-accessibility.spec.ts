import { expect } from '@playwright/test';
import { expectTextAA } from './helpers/contrast';
import { captureScreenshot, test } from './helpers/desktop';

test('Help and Settings work from the keyboard and keep one scroller at minimum size', async ({
  desktop,
}, testInfo) => {
  const { app, page } = desktop;
  const helpButton = page.getByRole('button', { name: /^Help/ });

  await helpButton.focus();
  await page.keyboard.press('Enter');
  const help = page.getByRole('region', { name: 'Lesson help' });
  await expect(help).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Hint', exact: true }),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Detailed guidance', exact: true }),
  ).toBeVisible();
  await help.focus();
  await page.keyboard.press('Escape');
  await expect(help).toBeHidden();
  await expect(helpButton).toBeFocused();

  await page.getByLabel('Open lesson menu', { exact: true }).focus();
  await page.keyboard.press('Enter');
  const settingsButton = page.getByRole('button', {
    name: 'Settings',
    exact: true,
  });
  await settingsButton.focus();
  await page.keyboard.press('Enter');
  await expect(
    page.getByRole('heading', { name: 'Settings', exact: true }),
  ).toBeFocused();
  await page.getByRole('radio', { name: '200%', exact: true }).check();
  await page
    .getByRole('button', { name: 'Back to lesson', exact: true })
    .click();
  await expect(page.getByLabel('Open lesson menu', { exact: true })).toBeFocused();

  await app.evaluate(({ BrowserWindow }) =>
    BrowserWindow.getAllWindows()[0]?.setContentSize(320, 400),
  );
  await expect
    .poll(() => page.evaluate(() => [window.innerWidth, window.innerHeight]))
    .toEqual([320, 400]);
  await helpButton.click();
  await page
    .getByRole('button', { name: 'Detailed guidance', exact: true })
    .click();

  const activeScrollTops = () =>
    page.evaluate(() => {
      const elements = [
        document.scrollingElement,
        ...Array.from(document.querySelectorAll('*')),
      ].filter((element): element is Element => element !== null);
      return elements
        .filter((element) => {
          const overflowY = getComputedStyle(element).overflowY;
          return (
            (overflowY === 'auto' || overflowY === 'scroll') &&
            element.scrollHeight > element.clientHeight + 1
          );
        })
        .map((element) => element.scrollTop);
    });
  const before = await activeScrollTops();
  expect(before).toHaveLength(1);
  await page
    .getByRole('button', { name: 'Detailed guidance', exact: true })
    .focus();
  await page.keyboard.press('PageDown');
  await expect
    .poll(async () => {
      const after = await activeScrollTops();
      return after.length === 1 && after[0]! > before[0]!;
    })
    .toBe(true);
  await captureScreenshot(
    page,
    testInfo,
    'desktop-help-200-percent-320x400.png',
  );
});

for (const theme of ['light', 'dark'] as const) {
  test(`enabled pointer hover text meets AA without changing the lesson (${theme})`, async ({
    desktop,
  }, testInfo) => {
    const { page } = desktop;
    await page.getByLabel('Open lesson menu', { exact: true }).click();
    await page.getByRole('button', { name: 'Settings', exact: true }).click();
    await page
      .getByRole('radio', {
        name: theme === 'light' ? 'Light' : 'Dark',
        exact: true,
      })
      .check();
    await page
      .getByRole('button', { name: 'Back to lesson', exact: true })
      .click();

    const stepBefore = await page.getByText(/Step 1 of 8/).innerText();
    const controls = [
      { label: 'Ask', name: 'Ask' },
      { label: 'Help', name: /^Help/ },
      { label: 'Settings', name: 'Settings' },
      { label: 'Mark done', name: 'Mark done' },
    ];
    const report: Record<string, unknown> = {};

    for (const { label, name } of controls) {
      const button = page.getByRole(
        'button',
        typeof name === 'string' ? { name, exact: true } : { name },
      );
      await expect(button).toBeVisible();
      await expect(button).toBeEnabled();
      await page.mouse.move(1, 1);
      await expect
        .poll(() => button.evaluate((element) => element.matches(':hover')))
        .toBe(false);
      const normal = await expectTextAA(button, 'normal');
      await button.hover();
      await expect
        .poll(() => button.evaluate((element) => element.matches(':hover')))
        .toBe(true);
      const hovered = await expectTextAA(button, 'pointer-hover');
      await page.mouse.move(1, 1);
      await expect
        .poll(() => button.evaluate((element) => element.matches(':hover')))
        .toBe(false);
      const restored = await expectTextAA(button, 'pointer-away');
      expect(restored).toEqual(normal);
      report[label] = { normal, hovered, restored };
    }

    expect(await page.getByText(/Step 1 of 8/).innerText()).toBe(stepBefore);
    await testInfo.attach(`desktop-hover-contrast-${theme}`, {
      body: JSON.stringify(report, null, 2),
      contentType: 'application/json',
    });
    await captureScreenshot(
      page,
      testInfo,
      `desktop-hover-contrast-${theme}.png`,
    );
  });
}
