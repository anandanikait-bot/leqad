import { expect, test } from '@playwright/test';

test('contextual Top row and all four commands highlight without verifying a click', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  const controls = [
    '#fixture-top-plane',
    '#fixture-sketch',
    '#fixture-rectangle',
    '#fixture-dimension',
    '#fixture-finish',
  ];
  for (let index = 0; index < controls.length; index++) {
    const step = index + 2;
    await page.getByRole('button', { name: 'Show me' }).click();
    await expect(page.locator('[data-leqad-highlight]')).toHaveCount(1);
    const target = await page.locator(controls[index]!).boundingBox();
    const overlay = await page.locator('[data-leqad-highlight]').boundingBox();
    expect(overlay!.x).toBeCloseTo(target!.x - 3, 0);
    expect(overlay!.width).toBeCloseTo(target!.width + 6, 0);
    await expect(page.getByText(`Step ${step} of 8 · Visited`)).toBeVisible();
    if (step === 2) await page.locator('#fixture-top-plane').click();
    if (step === 3) await page.locator('#fixture-sketch').click();
    const check = page.getByRole('button', { name: 'Check progress' });
    if (await check.isVisible()) await check.click();
    else
      await page
        .getByRole('button', { name: "I've finished this step" })
        .click();
    await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
    await page.getByRole('button', { name: 'Next' }).click();
  }
});

test('non-ARIA feature-list simulation highlights only the row and re-resolves after rerender', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  await page.evaluate(() => {
    document.querySelector('[role="tree"]')?.remove();
    const common = document.createElement('div');
    common.dataset.testFeatureList = 'true';
    common.style.cssText =
      'position:fixed;left:100px;top:120px;width:320px;height:156px';

    const heading = document.createElement('div');
    heading.textContent = 'Default geometry';
    heading.style.cssText =
      'position:absolute;left:0;top:12px;width:136px;height:28px';
    const spacer = document.createElement('div');
    spacer.style.cssText =
      'position:absolute;left:0;top:48px;width:8px;height:8px';
    const row = document.createElement('div');
    row.id = 'fixture-nonaria-top-row';
    row.style.cssText =
      'position:absolute;left:12px;top:84px;width:64px;height:26px';
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = 'Top';
    label.style.cssText = 'display:block;width:40px;height:20px';
    inner.append(label);
    outer.append(inner);
    row.append(outer);
    row.addEventListener('click', () =>
      row.setAttribute('data-clicked', 'true'),
    );

    common.append(
      heading,
      spacer,
      row,
      // These unknown siblings preserve the reported total only; their
      // positions do not stand in for captured Onshape evidence.
      document.createElement('div'),
      document.createElement('div'),
      document.createElement('div'),
    );
    document.body.append(common);
  });

  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Show me' }).click();
  const row = page.locator('#fixture-nonaria-top-row');
  const targetBounds = await row.boundingBox();
  const outlineBounds = await page
    .locator('[data-leqad-highlight]')
    .boundingBox();
  expect(outlineBounds!.x).toBeCloseTo(targetBounds!.x - 3, 0);
  expect(outlineBounds!.y).toBeCloseTo(targetBounds!.y - 3, 0);
  expect(outlineBounds!.width).toBeCloseTo(targetBounds!.width + 6, 0);
  expect(outlineBounds!.height).toBeCloseTo(targetBounds!.height + 6, 0);
  await row.click();
  await expect(row).toHaveAttribute('data-clicked', 'true');

  await page.evaluate(() => {
    const oldRow = document.querySelector('#fixture-nonaria-top-row');
    const replacement = oldRow?.cloneNode(true);
    if (!(replacement instanceof HTMLElement) || !oldRow?.parentElement) return;
    replacement.removeAttribute('data-clicked');
    replacement.addEventListener('click', () =>
      replacement.setAttribute('data-clicked', 'true'),
    );
    oldRow.parentElement.replaceChild(replacement, oldRow);
  });
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Show me' }).click();
  const replacementBounds = await page
    .locator('#fixture-nonaria-top-row')
    .boundingBox();
  const refreshedBounds = await page
    .locator('[data-leqad-highlight]')
    .boundingBox();
  expect(refreshedBounds!.x).toBeCloseTo(replacementBounds!.x - 3, 0);
  expect(refreshedBounds!.width).toBeCloseTo(replacementBounds!.width + 6, 0);
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:unmount')));
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
});

test('repeated Show me clears on pause, collapse, completion, restart, and unmount', async ({
  page,
}) => {
  await page.goto('/fixture.html?unknown-permission=1');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  for (let count = 0; count < 3; count++)
    await page.getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(1);
  await page.getByRole('button', { name: 'Pause' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: 'Show me' })).toBeDisabled();
  await page.getByRole('button', { name: 'Resume' }).click();
  await page.getByRole('button', { name: 'Show me' }).click();
  await page.getByRole('button', { name: 'Collapse Leqad panel' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Expand Leqad panel' }).click();
  await page.getByRole('button', { name: 'Show me' }).click();
  await page.getByRole('button', { name: "I've finished this step" }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Back' }).click();
  await page.getByRole('button', { name: 'Show me' }).click();
  await page.getByRole('button', { name: 'Restart lesson' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Show me' }).click();
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:unmount')));
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(page.locator('leqad-e2e-host')).toHaveCount(0);
});

test('already sketching with unknown permission stays unverified and exports opt-in diagnostics', async ({
  page,
}) => {
  await page.goto('/fixture.html?unknown-permission=1');
  await page.locator('#fixture-sketch').click();
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await expect(page.getByText(/already editing a sketch/)).toBeVisible();
  await expect(
    page.getByText(/Sketch dialog displays Top plane/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Show me' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await expect(page.getByText('Step 2 of 8 · Visited')).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Connection status' }),
  ).toHaveText('Limited observation');
  await expect(page.getByLabel('Recognition diagnostics output')).toHaveCount(
    0,
  );
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page
    .getByRole('button', { name: 'Copy recognition diagnostics' })
    .click();
  const output = await page
    .getByLabel('Recognition diagnostics output')
    .inputValue();
  expect(JSON.parse(output).version).toBe('leqad-recognition/3');
  expect(output).not.toContain('fixture-document');
  await page
    .getByRole('button', { name: 'Turn off recognition diagnostics' })
    .click();
  await expect(page.getByLabel('Recognition diagnostics output')).toHaveCount(
    0,
  );
  await page.getByRole('button', { name: "I've finished this step" }).click();
  await expect(page.getByText('Step 2 of 8 · Marked done')).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Lesson progress' }),
  ).toContainText('has not verified');
});

test('captures the actual clicked row once without swallowing its click, then copies only structure', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page.getByRole('button', { name: 'Capture Top row' }).click();
  await expect(page.getByText(/Click the visible Top row/)).toBeVisible();
  await page.locator('#fixture-top-plane').click();
  await expect(page.locator('#fixture-top-plane')).toHaveAttribute(
    'aria-pressed',
    'true',
  );
  await expect(page.getByText(/Top row structure captured/)).toBeVisible();
  await page
    .getByRole('button', { name: 'Copy recognition diagnostics' })
    .click();
  const output = await page
    .getByLabel('Recognition diagnostics output')
    .inputValue();
  const report = JSON.parse(output);
  expect(report.version).toBe('leqad-recognition/3');
  expect(report.productionRecognition.status).toBe('NOT_RUN');
  expect(report.capturedTopRow.diagnosis).toBe(
    'STRUCTURE_MATCHES_SUPPORTED_RESOLVER',
  );
  expect(report.capturedTopRow.structure[0].planeMatches).toEqual(['Top']);
  expect(report.capturedTopRow.relationshipOutline).toMatchObject({
    interactionHandling: 'JAVASCRIPT_HANDLER_NOT_INSPECTED',
  });
  expect(typeof report.capturedTopRow.relationshipOutline.truncated).toBe(
    'boolean',
  );
  expect(
    report.capturedTopRow.relationshipOutline.relationships.length,
  ).toBeGreaterThan(0);
  for (const secret of [
    'fixture-document',
    'fixture-workspace',
    'aria-pressed="true"',
    'Top</span>',
  ])
    expect(output).not.toContain(secret);
  await page
    .getByRole('button', { name: 'Turn off recognition diagnostics' })
    .click();
  await expect(page.getByLabel('Recognition diagnostics output')).toHaveCount(
    0,
  );
});

test('unimplemented checks offer direct self-reported continuation in the browser', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.locator('#fixture-top-plane').click();
  for (const step of [2, 3]) {
    await expect(page.getByText(`Step ${step} of 8 · Visited`)).toBeVisible();
    if (step === 3) await page.locator('#fixture-sketch').click();
    await page.getByRole('button', { name: 'Check progress' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
  }

  for (const step of [4, 5, 6]) {
    await expect(page.getByText(`Step ${step} of 8 · Visited`)).toBeVisible();
    await expect(
      page.getByText(/Leqad cannot check it automatically/),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Check progress' }),
    ).toHaveCount(0);
    await page.getByRole('button', { name: "I've finished this step" }).click();
    await expect(
      page.getByText(`Step ${step} of 8 · Marked done`),
    ).toBeVisible();
    await expect(
      page.getByRole('status', { name: 'Lesson progress' }),
    ).toContainText('has not verified your CAD work');
    await page.getByRole('button', { name: 'Next' }).click();
  }
});

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

test('the browser panel reaches all eight lesson steps without inventing verification', async ({
  page,
}) => {
  await page.goto('/fixture.html');

  for (let step = 1; step <= 8; step += 1) {
    await expect(page.getByText(`Step ${step} of 8 · Visited`)).toBeVisible();
    if (step === 8) break;
    const acknowledge = page.getByRole('button', { name: 'Got it' });
    if (await acknowledge.isVisible()) {
      await acknowledge.click();
    } else {
      const check = page.getByRole('button', { name: 'Check progress' });
      if (await check.isVisible()) await check.click();
      const continueUnverified = page.getByRole('button', {
        name: "I've finished this step",
      });
      if (await continueUnverified.isVisible()) {
        await continueUnverified.click();
      }
    }
    await page.getByRole('button', { name: 'Next' }).click();
  }

  await page.getByRole('button', { name: "I've finished this step" }).click();
  await expect(page.getByText('Step 8 of 8 · Marked done')).toBeVisible();
  await expect(page.getByText(/has not verified your CAD work/)).toBeVisible();
});
