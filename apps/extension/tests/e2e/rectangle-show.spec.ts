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

test('SHOW diagnosis distinguishes the actual stopped context gate, lookup and hidden eligibility', async ({
  page,
}) => {
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
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  const report = async () => {
    await page.getByRole('button', { name: 'SHOW', exact: true }).click();
    await page
      .getByRole('button', { name: 'Copy Rectangle SHOW diagnosis' })
      .click();
    return JSON.parse(
      await page.getByLabel('Recognition diagnostics output').inputValue(),
    );
  };
  const context = await report();
  expect(context).toMatchObject({
    stage: 'CONTEXT',
    reason: 'SKETCH_CONTEXT_UNESTABLISHED',
    productionLookup: 'NOT_RUN',
    inspection: { target: { sketchContext: 'UNESTABLISHED' } },
  });
  await page.locator('#fixture-sketch').click();
  await page
    .locator('#fixture-sketch-toolbar')
    .evaluate((element) => element.removeAttribute('role'));
  const lookup = await report();
  expect(lookup).toMatchObject({
    stage: 'GROUP_LOOKUP',
    reason: 'NO_TOOLBAR_SEMANTICS',
    productionLookup: 'RUN',
    inspection: {
      target: { sketchContext: 'OBSERVED', lookup: { toolbars: 0 } },
    },
  });
  await page
    .locator('#fixture-sketch-toolbar')
    .evaluate((element) => element.setAttribute('role', 'toolbar'));
  await page.locator('#fixture-rectangle').evaluate((element) => {
    (element as HTMLElement).hidden = true;
  });
  const hidden = await report();
  expect(hidden).toMatchObject({
    stage: 'TARGET_ELIGIBILITY',
    reason: 'TARGET_INELIGIBLE',
    productionLookup: 'RUN',
  });
  expect(hidden.inspection.target.eligibility.rejections).toContain('HIDDEN');
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(page.locator('[data-guidance-simulation-menu]')).toHaveCount(0);
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
});

test('opt-in exit capture preserves a normal manual click without claiming active Sketch or target identity (simulation)', async ({
  page,
}) => {
  await rectangleStep(page);
  await page.evaluate(() => {
    document.querySelector('#fixture-sketch-dialog')?.remove();
    document
      .querySelectorAll('[role="toolbar"]')
      .forEach((node) => node.removeAttribute('role'));
    const exit = document.createElement('div');
    exit.id = 'simulated-exit';
    exit.innerHTML =
      '<svg width="16" height="16"><path d="M0 0 L16 16"></path></svg><span>Finish sketch</span>';
    exit.style.cssText =
      'position:fixed;left:40px;top:340px;width:140px;height:32px;background:white';
    exit.addEventListener('click', () => {
      document.body.dataset.manualExitClicks = String(
        Number(document.body.dataset.manualExitClicks ?? 0) + 1,
      );
      exit.remove();
    });
    document.body.append(exit);
  });
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page
    .getByRole('button', { name: 'Capture Sketch exit control', exact: true })
    .click();
  await expect(page.locator('#simulated-exit')).toHaveCount(1);
  await page.locator('#simulated-exit svg').click();
  const output = page.getByLabel('Sketch exit diagnostic report');
  await expect(output).toBeVisible();
  const json = await output.inputValue();
  const report = JSON.parse(json);
  expect(report).toMatchObject({
    version: 'leqad-sketch-control/2',
    capturePurpose: 'ACTIVE_SKETCH_EXIT',
    activeSketchEvidence: 'NOT_ESTABLISHED_BY_USER_INDICATION',
    productionRecognition: 'NOT_RUN',
    uniqueness: 'NOT_EVALUATED',
  });
  expect(report.nodes[0]).toMatchObject({
    tag: 'svg',
    connected: true,
    assessment: 'EXIT_IDENTITY_NOT_VERIFIED',
  });
  expect(json).not.toContain('simulated-exit');
  expect(json).not.toContain('M0 0 L16 16');
  await expect(page.locator('body')).toHaveAttribute(
    'data-manual-exit-clicks',
    '1',
  );
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(output).toHaveCount(0);
});
