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
