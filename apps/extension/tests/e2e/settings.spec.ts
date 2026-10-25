import { expect, test } from '@playwright/test';

const preferenceKey = 'leqad:panel-preferences:v2';
for (const zoom of [1, 1.25, 1.5]) {
  test(
    'settings keyboard, theme and persistence at effective ' +
      zoom * 100 +
      '% zoom',
    async ({ browser }) => {
      // Viewport/device-scale simulation, not authenticated Onshape or native browser zoom.
      const context = await browser.newContext({
        viewport: {
          width: Math.floor(1440 / zoom),
          height: Math.floor(1000 / zoom),
        },
        deviceScaleFactor: zoom,
        colorScheme: 'dark',
      });
      const page = await context.newPage();
      try {
        await page.goto('/fixture.html');
        const panel = page.locator('[data-leqad-panel]');
        await expect(panel).toHaveAttribute('data-theme', 'light');
        await expect(panel).toHaveCSS('width', '365px');
        const progress = page.getByRole('progressbar');
        await expect(progress).toHaveAttribute('aria-valuenow', '0');
        const hostBackground = await page
          .locator('body')
          .evaluate((el) => getComputedStyle(el).backgroundColor);
        const gear = page.getByRole('button', { name: 'Open Settings' });
        const before = await panel.boundingBox();
        await gear.focus();
        await page.keyboard.press('ArrowLeft');
        expect((await panel.boundingBox())?.x).toBe(before?.x);
        await page.keyboard.press('Enter');
        await expect(
          page.getByRole('button', { name: 'Back to Learn' }),
        ).toBeFocused();
        await page.getByRole('radio', { name: 'Light', exact: true }).focus();
        await page.keyboard.press('ArrowRight');
        await expect(
          page.getByRole('radio', { name: 'Dark', exact: true }),
        ).toBeChecked();
        await expect(panel).toHaveAttribute('data-theme', 'dark');
        await expect(page.locator('.leqad-wordmark__mark')).toHaveJSProperty(
          'naturalWidth',
          278,
        );
        const image = await page
          .locator('.leqad-wordmark__mark')
          .getAttribute('src');
        const decoded = image!.includes(';base64,')
          ? Buffer.from(image!.split(',')[1]!, 'base64').toString()
          : decodeURIComponent(image!.split(',')[1]!);
        expect(decoded).toContain('#191919');
        await expect(panel).toHaveCSS('background-color', 'rgb(32, 32, 32)');
        expect(
          await page
            .locator('body')
            .evaluate((el) => getComputedStyle(el).backgroundColor),
        ).toBe(hostBackground);
        await page
          .getByRole('radio', { name: 'Proactive assistance', exact: true })
          .check();
        await expect
          .poll(() =>
            page.evaluate(
              (key) =>
                JSON.parse(localStorage.getItem(key) ?? '{}').preferences
                  ?.assistanceMode,
              preferenceKey,
            ),
          )
          .toBe('proactive');
        await page.reload();
        await expect(panel).toHaveAttribute('data-theme', 'dark');
        await expect(progress).toHaveAttribute('aria-valuenow', '0');
        await gear.click();
        await expect(
          page.getByRole('radio', {
            name: 'Proactive assistance',
            exact: true,
          }),
        ).toBeChecked();
        await page.getByRole('radio', { name: 'System', exact: true }).check();
        await page.emulateMedia({ colorScheme: 'light' });
        await expect(panel).toHaveAttribute('data-theme', 'light');
        await page.emulateMedia({ colorScheme: 'dark' });
        await expect(panel).toHaveAttribute('data-theme', 'dark');
        await page.keyboard.press('Escape');
        await expect(gear).toBeFocused();
        await expect(progress).toHaveAttribute('aria-valuenow', '0');
        expect(
          await panel.evaluate((el) => el.scrollWidth <= el.clientWidth),
        ).toBe(true);
      } finally {
        await context.close();
      }
    },
  );
}

test('dark and light settings text, controls and keyboard focus have adequate contrast', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  await page.getByRole('button', { name: 'Open Settings' }).click();
  for (const theme of ['Light', 'Dark']) {
    await page.getByRole('radio', { name: theme, exact: true }).check();
    const ratios = await page.locator('.leqad-settings').evaluate((el) => {
      const rgb = (value: string) =>
        value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map(Number);
      const lum = (value: string) =>
        rgb(value)
          .map((v) => {
            const c = v / 255;
            return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
          })
          .reduce((sum, c, i) => sum + c * [0.2126, 0.7152, 0.0722][i]!, 0);
      const contrast = (a: string, b: string) =>
        (Math.max(lum(a), lum(b)) + 0.05) / (Math.min(lum(a), lum(b)) + 0.05);
      const field = el.querySelector('fieldset')!;
      const bg = getComputedStyle(field).backgroundColor;
      return [
        ...el.querySelectorAll(
          'strong, .leqad-settings__option span span, .leqad-settings__note',
        ),
      ].map((text) => contrast(getComputedStyle(text).color, bg));
    });
    expect(Math.min(...ratios)).toBeGreaterThanOrEqual(4.5);
    const radio = page.getByRole('radio', { name: theme, exact: true });
    await radio.focus();
    await page.keyboard.press('Tab');
    await page.keyboard.press('Shift+Tab');
    await expect(radio).toBeFocused();
    await expect(radio).toHaveCSS('outline-width', '3px');
  }
});
