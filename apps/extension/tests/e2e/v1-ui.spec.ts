import { openLessonHelp } from './help';
import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

// All controls, CAD states, and stored progress in this file are simulations.
// Effective viewport and device scale model desktop browser zoom; these checks
// do not establish actual Chrome zoom behavior or authenticated Onshape support.
async function completeFixtureStep(page: Page) {
  const acknowledge = page.getByRole('button', { name: 'Got it' });
  const check = page.getByRole('button', { name: 'Check progress' });
  if (await acknowledge.isVisible()) await acknowledge.click();
  else {
    if (await check.isVisible()) await check.click();
    await page.getByRole('button', { name: 'Mark done' }).click();
  }
}

for (const zoom of [1, 1.25, 1.5]) {
  for (const colorScheme of ['light', 'dark'] as const) {
    test(`approved V1 UI stays readable at ${zoom * 100}% effective zoom (${colorScheme})`, async ({
      browser,
    }, testInfo) => {
      const context = await browser.newContext({
        viewport: {
          width: Math.floor(1440 / zoom),
          height: Math.floor(1000 / zoom),
        },
        deviceScaleFactor: zoom,
        colorScheme,
      });
      const page = await context.newPage();
      try {
        await page.goto('http://127.0.0.1:4173/fixture.html');
        const panel = page.locator('[data-leqad-panel]');
        const header = page.getByRole('group', { name: 'Move Leqad panel' });
        const mark = header.locator('img.leqad-wordmark__mark');
        await expect(mark).toHaveAttribute('src', /^data:image\/svg\+xml/);
        await expect(mark).toHaveJSProperty('complete', true);
        await expect(mark).toHaveJSProperty('naturalWidth', 278);
        await expect(mark).toHaveCSS('width', '33px');
        await expect(mark).toHaveCSS('height', '33px');
        const dimensions = await panel.boundingBox();
        expect(dimensions!.width).toBe(365);
        expect(dimensions!.y).toBeGreaterThanOrEqual(8);
        expect(dimensions!.y + dimensions!.height).toBeLessThanOrEqual(
          Math.floor(1000 / zoom) - 8,
        );
        await expect(panel).toHaveCSS('border-radius', '10px');
        await expect(panel).toHaveCSS('background-color', 'rgb(245, 239, 231)');
        await expect(header).toHaveCSS('background-color', 'rgb(14, 41, 67)');
        await expect(page.getByRole('progressbar')).toHaveAttribute(
          'aria-valuenow',
          '0',
        );
        await expect(page.locator('.leqad-progress-track')).toHaveCSS(
          'height',
          '6px',
        );

        for (let step = 1; step < 4; step++) {
          await completeFixtureStep(page);
          await page.getByRole('button', { name: 'Next', exact: true }).click();
        }
        await expect(
          page.getByRole('region', { name: 'Next action' }),
        ).toContainText('Corner Rectangle');
        await expect(
          page.getByRole('region', { name: 'Lesson help' }),
        ).toContainText('Help');
        await expect(page.locator('.leqad-step-card')).toHaveCSS(
          'padding',
          '0px',
        );
        await openLessonHelp(page);
        for (const level of ['HINT', 'SHOW', 'GUIDE']) {
          const button = page.getByRole('button', { name: level, exact: true });
          expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(
            44,
          );
          await expect(button).toHaveCSS('font-size', '14px');
        }
        await expect(
          page.getByRole('button', { name: 'HINT', exact: true }),
        ).toHaveCSS('background-color', 'rgb(14, 41, 67)');
        await expect(
          page.getByRole('button', { name: 'SHOW', exact: true }),
        ).toHaveCSS('background-color', 'rgb(255, 250, 244)');
        expect(
          await panel.evaluate(
            (element) => element.scrollWidth <= element.clientWidth,
          ),
        ).toBe(true);
        expect(
          await page
            .locator('.leqad-panel__body')
            .evaluate((element) => element.scrollWidth <= element.clientWidth),
        ).toBe(true);

        await page.getByRole('button', { name: 'Mark done' }).click();
        await expect(page.getByRole('progressbar')).toHaveAttribute(
          'aria-valuenow',
          '50',
        );
        await page.locator('.leqad-panel__body').evaluate((element) => {
          element.scrollTop = 0;
        });
        const screenshotPath = testInfo.outputPath(
          `fixture-v1-${zoom * 100}-${colorScheme}.png`,
        );
        await page.screenshot({ path: screenshotPath });
        await testInfo.attach(`fixture-v1-${zoom * 100}-${colorScheme}`, {
          path: screenshotPath,
          contentType: 'image/png',
        });

        const start = await panel.boundingBox();
        await header.focus();
        await page.keyboard.press('ArrowLeft');
        expect((await panel.boundingBox())!.x).toBeLessThan(start!.x);
        await page
          .getByRole('button', { name: 'Collapse Leqad panel' })
          .click();
        await expect(panel).toHaveCSS('width', '280px');
        await page.getByRole('button', { name: 'Expand Leqad panel' }).click();
        await expect(page.getByRole('progressbar')).toHaveAttribute(
          'aria-valuenow',
          '50',
        );
        await page.getByRole('button', { name: 'Next', exact: true }).click();
        await expect(page.getByText('Step 5 of 8 · Visited')).toBeVisible();
      } finally {
        await context.close();
      }
    });
  }
}

test('V1 completed-step progress survives reload and resets without claiming geometry verification', async ({
  page,
}) => {
  await page.goto('/fixture.html?unknown-permission=1');
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  for (let completed = 1; completed <= 8; completed++) {
    await completeFixtureStep(page);
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      String(Math.round((completed / 8) * 100)),
    );
    if (completed < 8)
      await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await expect(page.getByText(/has not verified your CAD work/)).toBeVisible();
  await page.reload();
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '100',
  );
  await expect(page.getByText('Step 8 of 8 · Marked done')).toBeVisible();
  await page.getByRole('button', { name: 'Restart lesson' }).click();
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await page.reload();
  await expect(page.getByRole('progressbar')).toHaveAttribute(
    'aria-valuenow',
    '0',
  );
  await expect(page.getByText('Step 1 of 8 · Visited')).toBeVisible();
});

test('inactive navigation text meets normal-text contrast on the ivory surface', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  const contrast = await page
    .getByRole('button', { name: 'Projects', exact: true })
    .evaluate((element) => {
      const panel = element.closest('[data-leqad-panel]')!;
      const luminance = (value: string) => {
        const [red, green, blue] = value
          .match(/[\d.]+/g)!
          .slice(0, 3)
          .map((part) => {
            const channel = Number(part) / 255;
            return channel <= 0.04045
              ? channel / 12.92
              : ((channel + 0.055) / 1.055) ** 2.4;
          });
        return 0.2126 * red! + 0.7152 * green! + 0.0722 * blue!;
      };
      const values = [
        luminance(getComputedStyle(element).color),
        luminance(getComputedStyle(panel).backgroundColor),
      ].sort((a, b) => a - b);
      return (values[1]! + 0.05) / (values[0]! + 0.05);
    });
  expect(contrast).toBeGreaterThanOrEqual(4.5);
});

test('V1 panel supports pointer dragging and a narrow viewport without horizontal clipping', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  const panel = page.locator('[data-leqad-panel]');
  const header = page.getByRole('group', { name: 'Move Leqad panel' });
  const before = (await panel.boundingBox())!;
  const handle = (await header.boundingBox())!;
  await page.mouse.move(
    handle.x + handle.width / 2,
    handle.y + handle.height / 2,
  );
  await page.mouse.down();
  await page.mouse.move(
    handle.x + handle.width / 2 - 100,
    handle.y + handle.height / 2 + 30,
  );
  await page.mouse.up();
  expect((await panel.boundingBox())!.x).toBeCloseTo(before.x - 100, 0);
  await page.setViewportSize({ width: 320, height: 600 });
  await expect(panel).toHaveCSS('width', '304px');
  expect(
    await panel.evaluate(
      (element) => element.scrollWidth <= element.clientWidth,
    ),
  ).toBe(true);
  // CSS width resolves before the resize event's position clamp is rendered.
  await expect
    .poll(
      async () => {
        const after = (await panel.boundingBox())!;
        return after.x >= 8 && after.x + after.width <= 312;
      },
      { message: 'Resized panel must settle inside the viewport' },
    )
    .toBe(true);
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(page.getByText('Step 2 of 8 · Visited')).toBeVisible();
});
