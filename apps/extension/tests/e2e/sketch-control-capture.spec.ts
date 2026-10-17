import { expect, test } from '@playwright/test';

// Simulated toolbar only; not authenticated Onshape evidence.
test('Sketch capture retains clicked evidence past unrelated controls, preserves clicks and does not complete a step', async ({
  page,
}) => {
  await page.goto('/fixture.html?unknown-permission');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await page.getByRole('button', { name: "I've finished this step" }).click();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  const sketch = page.locator('#fixture-sketch');
  await sketch.evaluate((button) => {
    for (let i = 0; i < 100; i++) {
      const decoy = document.createElement('button');
      decoy.setAttribute('aria-label', `private-${i}`);
      button.before(decoy);
    }
    button.setAttribute('aria-label', 'private-command');
    button.setAttribute('title', 'Sketch');
  });
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(
    page.getByRole('group', { name: 'Sketch highlight calibration' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page
    .getByRole('button', { name: 'Capture Sketch control', exact: true })
    .click();
  await sketch.click();
  const output = page.getByLabel('Sketch diagnostic report');
  await expect(output).toBeVisible();
  const json = await output.inputValue();
  const report = JSON.parse(json);
  expect(report.productionRecognition).toBe('NOT_RUN');
  expect(report.nodes[0]).toMatchObject({
    tag: 'button',
    name: 'UNLISTED',
    title: 'Sketch',
    assessment: 'NO_SUPPORTED_COMMAND_NAME',
    connected: true,
  });
  expect(json).not.toContain('private-');
  expect(json).not.toContain('fixture-sketch');
  expect(json.length).toBeLessThanOrEqual(24000);
  await expect(page.getByRole('dialog', { name: 'Sketch' })).toBeVisible();
  await expect(page.getByText('Step 3 of 8 · Visited')).toBeVisible();
  await page.evaluate(() =>
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: () => Promise.reject(new Error('simulated refusal')),
      },
    }),
  );
  await page.getByRole('button', { name: 'Copy Sketch diagnostic' }).click();
  await expect(
    page.getByText('Select the report below and copy it manually.'),
  ).toBeVisible();
});

test('Sketch capture cancels when disabled, navigated or paused and can retry', async ({
  page,
}) => {
  await page.goto('/fixture.html?unknown-permission');
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page
    .getByRole('button', { name: 'Capture Sketch control', exact: true })
    .click();
  await page
    .getByRole('button', { name: 'Turn off recognition diagnostics' })
    .click();
  await page.locator('#fixture-sketch').click();
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await expect(page.getByLabel('Sketch diagnostic report')).toHaveCount(0);
  await page
    .getByRole('button', { name: 'Capture Sketch control', exact: true })
    .click();
  await page.evaluate(() =>
    window.dispatchEvent(new Event('wxt:locationchange')),
  );
  await expect(
    page.getByText('Capture cancelled. You can retry.'),
  ).toBeVisible();
  await page
    .getByRole('button', { name: 'Capture Sketch control', exact: true })
    .click();
  await page.getByRole('button', { name: 'Pause', exact: true }).click();
  await expect(
    page.getByRole('region', { name: 'Sketch control capture' }),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Resume', exact: true }).click();
  await expect(page.getByLabel('Sketch diagnostic report')).toHaveCount(0);
  await expect(
    page.getByRole('button', { name: 'Capture Sketch control', exact: true }),
  ).toBeEnabled();
});

test('paired editor capture reaches simulated regions after 6500 unrelated nodes without CAD actions or recognition claims', async ({
  page,
}) => {
  await page.goto('/fixture.html?unknown-permission');
  await page.getByRole('button', { name: 'Got it' }).click();
  const lessonProgress = page.locator('.leqad-step-count');
  const initialProgress = await lessonProgress.textContent();
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  const fakeRegion = await page.evaluate(() => {
    const noise = document.createElement('section');
    noise.innerHTML = '<div></div>'.repeat(6500);
    document.body.prepend(noise);
    const region = document.createElement('div');
    region.id = 'private-simulated-region';
    region.setAttribute('role', 'dialog');
    region.innerHTML =
      '<div><svg></svg><span>Sketch</span></div><button aria-label="Finish Sketch"></button><button aria-label="Cancel"></button>';
    region.style.cssText = 'position:fixed;left:10px;top:10px;z-index:1';
    document.body.append(region);
    for (const element of [region, ...region.querySelectorAll('*')])
      element.getBoundingClientRect = () => new DOMRect(10, 10, 60, 24);
    (window as Window & { __pairedCadClicks?: number }).__pairedCadClicks = 0;
    region.addEventListener('click', () => {
      (window as Window & { __pairedCadClicks?: number }).__pairedCadClicks!++;
    });
    return region.id;
  });
  const stateA = page.getByRole('button', { name: 'Capture State A — Sketch' });
  const stateB = page.getByRole('button', {
    name: 'Capture State B — Other Editor',
  });
  await expect(stateB).toBeDisabled();
  await stateA.click();
  await expect(
    page.getByText('State A captured · owner-reported'),
  ).toBeVisible();
  await page.getByLabel('State B reported editor').selectOption('EXTRUDE');
  const stateBExtrude = page.getByRole('button', {
    name: 'Capture State B — Extrude',
  });
  await expect(stateBExtrude).toBeEnabled();

  await page.locator(`#${fakeRegion}`).evaluate((oldRegion) => {
    const replacement = document.createElement('div');
    replacement.id = oldRegion.id;
    replacement.setAttribute('role', 'dialog');
    replacement.style.cssText = oldRegion.getAttribute('style') ?? '';
    replacement.innerHTML =
      '<button aria-label="Extrude"><svg></svg></button><button aria-label="Sketch"></button>';
    for (const element of [replacement, ...replacement.querySelectorAll('*')])
      element.getBoundingClientRect = () => new DOMRect(10, 10, 60, 24);
    oldRegion.replaceWith(replacement);
  });
  await stateBExtrude.click();
  await page
    .getByRole('button', { name: 'Copy Sketch vs other editor report' })
    .click();
  const output = page.getByLabel('Sketch vs other editor comparison report');
  await expect(output).toBeVisible();
  const json = await output.inputValue();
  const report = JSON.parse(json);
  expect(report).toMatchObject({
    observationClaim: 'OWNER_REPORTED_ONLY',
    activeSketchState: 'UNKNOWN',
    productionRecognition: 'NOT_RUN',
    permissionEvidence: 'NOT_INSPECTED',
    geometryVerification: 'NOT_RUN',
    reviewPolicy: {
      editableOrUserContentDependence: 'UNKNOWN_NOT_INSPECTED',
      uniqueness: 'NOT_ESTABLISHED_BY_THIS_PAIR',
      controlOwnership: 'NOT_ESTABLISHED',
      revocationWhenEditingEnds: 'NOT_TESTED',
    },
  });
  expect(report.stateA.ownerReportedState).toBe('SKETCH');
  for (const snapshot of [report.stateA, report.stateB]) {
    expect(snapshot.discovery.method).toBe(
      'TARGETED_REGIONS_THEN_BOUNDED_LIGHT_DOM_FALLBACK',
    );
    expect(snapshot.discovery.scannedElements).toBeLessThanOrEqual(6000);
    expect(snapshot.discovery.nodeLimitReached).toBe(true);
    expect(snapshot.discovery.domChangedDuringInspection).toBe(false);
    expect(
      snapshot.candidateRegions.some(
        (region: { kind: string }) => region.kind === 'DIALOG_CANDIDATE',
      ),
    ).toBe(true);
  }
  expect(
    report.stateA.observations.some(
      (item: { label: string }) => item.label === 'Finish Sketch',
    ),
  ).toBe(true);
  expect(
    report.stateB.observations.some(
      (item: { label: string }) => item.label === 'Extrude',
    ),
  ).toBe(true);
  expect(report.stateB.ownerReportedState).toBe('EXTRUDE');
  expect(report.signals.stateAOnly.length).toBeGreaterThan(0);
  expect(report.signals.stateBOnly.length).toBeGreaterThan(0);
  expect(json).not.toContain('private-simulated-region');
  expect(json).not.toContain('fixture-document');
  expect(json.length).toBeLessThanOrEqual(24_000);
  expect(
    await page.evaluate(
      () =>
        (window as Window & { __pairedCadClicks?: number }).__pairedCadClicks,
    ),
  ).toBe(0);
  await expect(lessonProgress).toHaveText(initialProgress ?? '');
});
