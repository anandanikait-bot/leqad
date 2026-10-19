import { expect, test, type Page } from '@playwright/test';

// Every toolbar/popup role, relationship, layout and handler is SIMULATED.
// Owner evidence establishes last-used labels and SVG/div + span paths only.
async function rectangleStep(page: Page) {
  await page.goto('/fixture.html?unknown-permission&production-guidance');
  for (let step = 1; step < 4; step++) {
    await page
      .getByRole('button', {
        name: step === 1 ? 'Got it' : 'Mark done',
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
    page.getByText(/couldn’t safely highlight Corner rectangle/),
  ).toBeVisible();
  const fallback = page.getByText('Find using Onshape Search', {
    exact: true,
  });
  await expect(fallback).toBeVisible();
  await fallback.press('Enter');
  await expect(page.getByText(/Search for Corner rectangle/)).toBeVisible();
  await expect(
    page.getByText(/Do not choose another Rectangle variant/),
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
        name: step === 1 ? 'Got it' : 'Mark done',
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

test('a generic three-branch SVG dialog cannot bypass the Sketch gate or identify either action (simulation)', async ({
  page,
}) => {
  await rectangleStep(page);
  await page.evaluate(() => {
    document.querySelector('#fixture-sketch-dialog')?.remove();
    document
      .querySelectorAll('[role="toolbar"]')
      .forEach((element) => element.removeAttribute('role'));
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.innerHTML =
      '<div><input value="Sketch 1"></div><div><div><svg><use></use></svg></div></div><div><div><svg><use></use></svg></div></div>';
    dialog.style.cssText =
      'position:fixed;left:40px;top:340px;width:240px;height:32px';
    for (const branch of Array.from(dialog.children).slice(1)) {
      branch.addEventListener('click', () => {
        document.body.dataset.simulatedActionClicked = 'true';
      });
    }
    document.body.append(dialog);
  });
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page
    .getByRole('button', { name: 'Copy Rectangle SHOW diagnosis' })
    .click();
  const report = JSON.parse(
    await page.getByLabel('Recognition diagnostics output').inputValue(),
  );
  expect(report).toMatchObject({
    stage: 'CONTEXT',
    reason: 'SKETCH_CONTEXT_UNESTABLISHED',
    productionLookup: 'NOT_RUN',
    inspection: {
      target: {
        sketchContext: 'UNESTABLISHED',
        lookup: { reason: 'NO_TOOLBAR_SEMANTICS' },
        eligibility: { state: 'NOT_EVALUATED' },
      },
    },
  });
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveAttribute(
    'data-simulated-action-clicked',
  );
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
});

test('one opt-in dialog identity snapshot retains only local allowlisted structure without CAD interaction (simulation)', async ({
  page,
}) => {
  await rectangleStep(page);
  await page.evaluate(() => {
    document.querySelector('#fixture-sketch-dialog')?.remove();
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.id = 'private-simulation-dialog';
    dialog.innerHTML =
      '<div><span>Sketch plane</span><input value="private-feature-value"></div><div><svg width="16" height="16"><use href="#private-icon"></use></svg></div><div><svg width="16" height="16"><use></use></svg></div>';
    dialog.style.cssText =
      'position:fixed;left:40px;top:340px;width:300px;height:40px;display:flex;background:white';
    for (const branch of dialog.children)
      (branch as HTMLElement).style.cssText = 'width:100px;height:40px';
    dialog.addEventListener('click', () => {
      document.body.dataset.cadClicked = 'true';
    });
    document.body.append(dialog);
  });
  await expect(
    page.getByRole('button', {
      name: 'Capture Sketch dialog identity',
      exact: true,
    }),
  ).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page
    .getByRole('button', {
      name: 'Capture Sketch dialog identity',
      exact: true,
    })
    .click();
  const output = page.getByLabel('Sketch dialog identity report');
  const json = await output.inputValue();
  const report = JSON.parse(json);
  expect(report).toMatchObject({
    status: 'CAPTURED',
    productionRecognition: 'NOT_RUN',
    activeSketchState: 'UNKNOWN',
    staticIdentity: 'NOT_ESTABLISHED',
    branchIdentities: 'UNVERIFIED',
    controlOwnership: 'NOT_INSPECTED',
  });
  expect(report.dialogs[0].labels).toEqual([
    expect.objectContaining({
      label: 'Sketch plane',
      tag: 'span',
      pathFromDialog: [0, 0],
    }),
  ]);
  expect(json).not.toContain('private-');
  await expect(page.locator('body')).not.toHaveAttribute('data-cad-clicked');
  await expect(
    page.getByRole('button', { name: 'Cancel Sketch capture' }),
  ).toHaveCount(0);
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () =>
          Promise.reject(new Error('simulated clipboard unavailable')),
      },
    }),
  );
  await page
    .getByRole('button', { name: 'Copy Sketch dialog identity', exact: true })
    .click();
  await expect(
    page.getByText(
      'Select the Sketch dialog identity report below and copy it manually.',
    ),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Turn off recognition diagnostics' })
    .click();
  await expect(output).toHaveCount(0);
});

test('failed SHOW offers a collapsible manual Search Tools fallback without CAD actions or progress changes', async ({
  page,
}) => {
  await rectangleStep(page);
  // Simulated absence only; this fixture is not an Onshape capture.
  await page
    .locator('#fixture-rectangle')
    .evaluate((element) => element.remove());
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();

  const fallback = page.getByText('Find using Onshape Search', {
    exact: true,
  });
  await expect(fallback).toBeVisible();
  await fallback.press('Enter');
  await expect(page.getByText(/Alt \+ C/)).toBeVisible();
  await expect(page.getByText(/Option \+ C/)).toBeVisible();
  await expect(page.getByText(/Search for Corner rectangle/)).toBeVisible();
  await expect(
    page.getByText(/Center point rectangle starts from its center/),
  ).toBeVisible();
  await expect(
    page.getByText(/Aligned Rectangle establishes a line direction/),
  ).toBeVisible();
  await expect(page.getByText(/do not verify tool activation/)).toBeVisible();
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(page.locator('[data-guidance-simulation-menu]')).toHaveCount(0);
  await expect(page.locator('[data-leqad-panel]')).toHaveCount(1);

  await page.getByRole('button', { name: 'Collapse Leqad panel' }).click();
  await expect(
    page.getByRole('button', { name: 'Expand Leqad panel' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Expand Leqad panel' }).click();
  await expect(fallback).toBeVisible();
  // The existing header drag handle lets the owner move the panel out of
  // Search Tools' way without replacing the active lesson or its guidance.
  const panel = page.locator('[data-leqad-panel]');
  const before = await panel.boundingBox();
  const header = page.getByRole('group', { name: 'Move Leqad panel' });
  const handle = await header.boundingBox();
  expect(before).not.toBeNull();
  expect(handle).not.toBeNull();
  await page.mouse.move(handle!.x + 28, handle!.y + 18);
  await page.mouse.down();
  await page.mouse.move(handle!.x + 72, handle!.y + 18);
  await page.mouse.up();
  const after = await panel.boundingBox();
  expect(after!.x).toBeGreaterThan(before!.x + 20);
  await expect(fallback).toBeVisible();
  await expect(page.locator('[data-leqad-panel]')).toHaveCount(1);
  await expect(page.locator('#host-click-count')).toHaveText('0');
});
