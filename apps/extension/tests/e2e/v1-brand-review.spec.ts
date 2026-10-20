import { expect, test } from '@playwright/test';
import type { Page, TestInfo } from '@playwright/test';
import { applyOriginalWordmarkPreview } from '../fixtures/headerReview';

// Fixture-only visual review. Option B is not installed in production and must
// not become the default until the owner approves it. No live Onshape evidence.
async function capture(page: Page, testInfo: TestInfo, name: string) {
  const path = testInfo.outputPath(`${name}.png`);
  await page.locator('[data-leqad-panel]').screenshot({ path });
  await testInfo.attach(name, { path, contentType: 'image/png' });
}

async function rectangleStep(page: Page) {
  await page.goto('/fixture.html?production-guidance');
  for (let step = 1; step < 4; step++) {
    const acknowledge = page.getByRole('button', { name: 'Got it' });
    const check = page.getByRole('button', { name: 'Check progress' });
    if (await acknowledge.isVisible()) await acknowledge.click();
    else {
      if (await check.isVisible()) await check.click();
      await page.getByRole('button', { name: 'Mark done' }).click();
    }
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
}

for (const zoom of [1, 1.25, 1.5]) {
  test(`header A stays default and original-wordmark B is a temporary preview at ${zoom * 100}%`, async ({
    browser,
  }, testInfo) => {
    const context = await browser.newContext({
      viewport: {
        width: Math.floor(1440 / zoom),
        height: Math.floor(1000 / zoom),
      },
      deviceScaleFactor: zoom,
    });
    try {
      const page = await context.newPage();
      await page.goto('http://127.0.0.1:4173/fixture.html');
      const header = page.getByRole('group', { name: 'Move Leqad panel' });
      const label = page.locator('.leqad-wordmark > span');
      await expect(label).toHaveText('Leqad');
      const before = (await header.boundingBox())!;
      await capture(page, testInfo, `header-a-${zoom * 100}`);
      await applyOriginalWordmarkPreview(page);
      const wordmark = page.locator('[data-leqad-wordmark-review]');
      await expect(wordmark).toHaveJSProperty('complete', true);
      await expect(wordmark).toHaveJSProperty('naturalWidth', 320);
      await expect(wordmark).toHaveJSProperty('naturalHeight', 104);
      await expect(label).toHaveCount(0);
      expect((await header.boundingBox())!.height).toBeCloseTo(
        before.height,
        1,
      );
      expect(
        await header.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await capture(page, testInfo, `header-b-${zoom * 100}`);
      await page.getByRole('button', { name: 'Collapse Leqad panel' }).click();
      await expect(page.locator('[data-leqad-panel]')).toHaveCSS(
        'width',
        '280px',
      );
      expect(
        await header.evaluate(
          (element) => element.scrollWidth <= element.clientWidth,
        ),
      ).toBe(true);
      await page.reload();
      await expect(page.locator('.leqad-wordmark > span')).toHaveText('Leqad');
      await expect(page.locator('[data-leqad-wordmark-review]')).toHaveCount(0);
    } finally {
      await context.close();
    }
  });
}

for (const level of ['HINT', 'SHOW', 'GUIDE'] as const) {
  test(`review ${level} selection keeps completed-state percentage and safe fallback`, async ({
    page,
  }, testInfo) => {
    await rectangleStep(page);
    await page.getByRole('button', { name: level, exact: true }).click();
    for (const candidate of ['HINT', 'SHOW', 'GUIDE']) {
      const button = page.getByRole('button', { name: candidate, exact: true });
      await expect(button).toHaveAttribute(
        'aria-pressed',
        String(candidate === level),
      );
      await expect(button).toHaveCSS(
        'background-color',
        candidate === level ? 'rgb(13, 28, 67)' : 'rgb(255, 250, 244)',
      );
      expect((await button.boundingBox())!.height).toBeGreaterThanOrEqual(44);
    }
    await expect(page.getByRole('progressbar')).toHaveAttribute(
      'aria-valuenow',
      '38',
    );
    await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
    if (level === 'SHOW')
      await expect(
        page.getByText('Find using Onshape Search', { exact: true }),
      ).toBeVisible();
    if (level === 'GUIDE')
      await expect(
        page.getByText(/GUIDE is unavailable for the Rectangle tool group/),
      ).toBeVisible();
    await page.locator('.leqad-panel__body').evaluate((element) => {
      element.scrollTop = 0;
    });
    await capture(page, testInfo, `guidance-${level.toLowerCase()}`);
  });
}

test('review production A collapsed header and narrow Step 4 without horizontal clipping', async ({
  page,
}, testInfo) => {
  await rectangleStep(page);
  await page.getByRole('button', { name: 'Collapse Leqad panel' }).click();
  await expect(page.locator('.leqad-wordmark > span')).toHaveText('Leqad');
  await capture(page, testInfo, 'collapsed-a');
  await page.getByRole('button', { name: 'Expand Leqad panel' }).click();
  await page.setViewportSize({ width: 320, height: 720 });
  const panel = page.locator('[data-leqad-panel]');
  await expect(panel).toHaveCSS('width', '304px');
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
  await page.locator('.leqad-panel__body').evaluate((element) => {
    element.scrollTop = 0;
  });
  await capture(page, testInfo, 'narrow-a');
});
