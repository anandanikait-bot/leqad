import { expect, test } from '@playwright/test';

// All trigger/portal relationships, layout and handlers are simulations. Only
// label spelling and row child relationships are drawn from the issue review.
test('local Rectangle diagnostics preserve separate opening and option-click evidence beyond 6000 unrelated nodes', async ({
  page,
}) => {
  await page.goto('/fixture.html?unknown-permission');
  await page.evaluate(() => {
    const flood = document.createElement('section');
    flood.style.display = 'none';
    for (let index = 0; index < 6100; index++)
      flood.append(document.createElement('i'));
    document.body.prepend(flood);
    const group = document.createElement('div');
    group.style.cssText =
      'position:fixed;left:400px;top:12px;width:150px;height:28px;z-index:1000';
    const label = document.createElement('span');
    label.textContent = 'Rectangle';
    const trigger = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.style.cssText =
      'display:inline-block;width:32px;height:24px;background:#eee';
    svg.setAttribute('data-fixture-rectangle-input', 'true');
    trigger.append(svg);
    group.append(label, trigger);
    document.body.append(group);
    svg.addEventListener('click', () => {
      const menu = document.createElement('div');
      menu.style.cssText =
        'position:fixed;left:500px;top:60px;width:180px;z-index:1000;background:white';
      for (const [index, name] of [
        'Corner rectangle',
        'Center point rectangle',
        'Aligned Rectangle',
      ].entries()) {
        const row = document.createElement('div');
        row.style.cssText = 'height:24px';
        const text = document.createElement('span');
        text.textContent = name;
        row.append(document.createElement('div'), text);
        if (index < 2) row.append(document.createElement('span'));
        if (index === 0) {
          text.setAttribute('data-fixture-corner-option', 'true');
          text.addEventListener('click', () => {
            document.body.dataset.fixtureCornerClicks = '1';
            menu.remove();
          });
        }
        menu.append(row);
      }
      document.body.append(menu);
    });
  });
  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page
    .getByRole('button', { name: 'Capture Rectangle interaction', exact: true })
    .click();
  await page.locator('[data-fixture-rectangle-input]').click();
  // No panel interaction while the CAD menu is open. Layout/zoom is simulated.
  await page.evaluate(() => {
    document.documentElement.style.zoom = '1.25';
  });
  await expect(
    page.getByRole('button', {
      name: 'Recording Rectangle opening and selection…',
    }),
  ).toBeVisible();
  await page.locator('[data-fixture-corner-option]').click();
  await page.evaluate(() => {
    document.documentElement.style.zoom = '';
  });
  await page
    .getByRole('button', { name: 'Copy Rectangle dropdown report' })
    .click();
  const output = page.getByLabel('Rectangle dropdown diagnostic output');
  const opening = JSON.parse(await output.inputValue());
  expect(opening.version).toBe('leqad-rectangle-dropdown/3');
  expect(opening.baseline.scan).toMatchObject({
    status: 'INCOMPLETE',
    scannedElements: 6000,
  });
  expect(opening.interactions[0]).toMatchObject({
    clickObserved: true,
    clickPathMatchesInput: opening.interactions[0].pathTruncated ? null : true,
  });
  expect(opening.interactions[0].path[0].node.tag).toBe('svg');
  expect(opening.transitions[0]).toMatchObject({
    inputAssociation: 'UNPROVEN',
    after: { domObservedState: 'UNKNOWN' },
  });
  expect(
    opening.transitions[0].after.candidates.map(
      (item: { label: string | null }) => item.label,
    ),
  ).toEqual(
    expect.arrayContaining([
      'Corner rectangle',
      'Center point rectangle',
      'Aligned Rectangle',
    ]),
  );

  // Both actions share one report; no tool selection or geometry is verified.
  const selection = opening;
  expect(selection.interactionMode).toBe('OPEN_THEN_SELECT_RECTANGLE');
  expect(selection.workflowState).toBe('FINISHED');
  expect(selection.interactions).toHaveLength(2);
  expect(selection.interactions[1]).toMatchObject({
    clickObserved: true,
    clickedLabel: 'Corner rectangle',
    clickPathMatchesInput: selection.interactions[1].pathTruncated
      ? null
      : true,
  });
  expect(selection.interactions[1].path[0]).toMatchObject({
    label: 'Corner rectangle',
    node: { connected: true },
  });
  expect(selection.transitions[1].after.candidates).toEqual(
    expect.arrayContaining([
      expect.objectContaining({
        label: 'Corner rectangle',
        node: expect.objectContaining({ connected: false }),
      }),
    ]),
  );
  expect(selection.transitions[1].after.domObservedState).toBe('UNKNOWN');
  await expect(page.locator('body')).toHaveAttribute(
    'data-fixture-corner-clicks',
    '1',
  );
  await expect(page.getByText('Step 1 of 8 · Visited')).toBeVisible();
});
