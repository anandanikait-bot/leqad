import { expect, test, type Page } from '@playwright/test';

// Every toolbar/popup role, relationship, layout and handler is SIMULATED.
// Owner evidence establishes last-used labels and SVG/div + span paths only.
async function rectangleStep(page: Page) {
  await page.goto('/fixture.html?unknown-permission&production-guidance');
  for (let step = 1; step < 4; step++) {
    await page
      .getByRole('button', {
        name: step === 1 ? 'Got it' : "I've finished this step",
        exact: true,
      })
      .click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
  }
  await page.locator('#fixture-sketch').click();
}
for (const lastUsed of [
  'Corner rectangle',
  'Center point rectangle',
  'Aligned Rectangle',
]) {
  for (const scale of [0.8, 1, 1.25, 1.5]) {
    test(`production group-only SHOW: simulated ${lastUsed} at ${scale * 100}%`, async ({
      page,
    }) => {
      await rectangleStep(page);
      const control = page.locator('#fixture-rectangle');
      await control.evaluate(
        (element, { name, zoom }) => {
          element.setAttribute('aria-label', name);
          element.textContent = name;
          element.style.transformOrigin = 'top left';
          element.style.transform = `scale(${zoom})`;
        },
        { name: lastUsed, zoom: scale },
      );
      await page.getByRole('button', { name: 'SHOW', exact: true }).click();
      const outline = page.locator('[data-leqad-highlight]');
      await expect(outline).toHaveCount(1);
      const target = await control.boundingBox();
      const bounds = await outline.boundingBox();
      expect(bounds!.width).toBeCloseTo(target!.width + 6, 0);
      expect(bounds!.x).toBeCloseTo(target!.x - 3, 0);
      await expect(outline).toHaveCSS('pointer-events', 'none');
      await expect(
        page.getByText(/exact option is not highlighted/),
      ).toBeVisible();
      await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
      // SHOW did not click; the owner operates both controls without a second panel visit.
      await expect(page.locator('[data-guidance-simulation-menu]')).toHaveCount(
        0,
      );
      await control.click();
      await expect(outline).toHaveCount(0);
      await expect(
        page.locator('[data-guidance-simulation-menu]'),
      ).toBeVisible();
      await page.locator('[data-guidance-simulation-item]').click();
      await expect(outline).toHaveCount(0);
      await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
      await page.getByRole('button', { name: 'GUIDE', exact: true }).click();
      await expect(
        page.getByText(/Step-by-step guidance.*not available yet/),
      ).toBeVisible();
    });
  }
}
test('capture-grounded labels remain BLOCKED in a simulated unowned nonsemantic structure', async ({
  page,
}) => {
  await rectangleStep(page);
  await page.evaluate(() => {
    document.querySelector('#fixture-rectangle')?.remove();
    const group = document.createElement('div');
    const box = document.createElement('div');
    box.append(document.createElementNS('http://www.w3.org/2000/svg', 'svg'));
    const text = document.createElement('span');
    text.textContent = 'Corner rectangle';
    group.append(box, text);
    document.querySelector('#fixture-sketch-toolbar')?.append(group);
    const menu = document.createElement('div');
    for (const name of [
      'Corner rectangle',
      'Center point rectangle',
      'Aligned Rectangle',
    ]) {
      const row = document.createElement('div');
      const label = document.createElement('span');
      label.textContent = name;
      row.append(label);
      menu.append(row);
    }
    document.body.append(menu);
  });
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(
    page.getByText(
      /Manually open the Rectangle dropdown arrow and choose Corner Rectangle/,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Retry guidance' }),
  ).toHaveCount(0);
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
});
test('production group SHOW clears on rerender, popup change, scroll/resize and expiration', async ({
  page,
}) => {
  await rectangleStep(page);
  await page.clock.install();
  const control = page.locator('#fixture-rectangle');
  const outline = page.locator('[data-leqad-highlight]');
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(outline).toHaveCount(1);
  await control.evaluate((element) => element.removeAttribute('aria-haspopup'));
  await expect(outline).toHaveCount(0);
  await control.evaluate((element) =>
    element.setAttribute('aria-haspopup', 'menu'),
  );
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await page.evaluate(() => {
    window.dispatchEvent(new Event('resize'));
    window.dispatchEvent(new Event('scroll'));
  });
  await page.clock.fastForward(20);
  await expect(outline).toHaveCount(1);
  await control.evaluate((element) =>
    element.replaceWith(element.cloneNode(true)),
  );
  await expect(outline).toHaveCount(0);
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(outline).toHaveCount(1);
  await page.clock.fastForward(5000);
  await expect(outline).toHaveCount(0);
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(outline).toHaveCount(1);
  await page.evaluate(() =>
    window.dispatchEvent(new Event('wxt:locationchange')),
  );
  await expect(outline).toHaveCount(0);
});
