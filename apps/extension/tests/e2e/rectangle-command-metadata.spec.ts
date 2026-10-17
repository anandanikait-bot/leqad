import { expect, test } from '@playwright/test';

// Simulated command metadata only. This fixture does not establish that the
// same private attributes exist in an authenticated Onshape session.
test('four-state Rectangle metadata experiment stays read-only and privacy bounded', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  await page.evaluate(() => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar private-project-class';
    toolbar.dataset.fixtureCommandToolbar = 'true';
    const group = document.createElement('div');
    group.dataset.fixtureRectangleGroup = 'true';
    const face = document.createElement('div');
    face.setAttribute('command-id', 'RECTANGLE_TWO_CORNERS');
    face.style.cssText = 'width:32px;height:24px';
    const arrow = document.createElement('div');
    arrow.className = 'dropdown-arrow';
    arrow.style.cssText = 'width:12px;height:24px';
    arrow.addEventListener('pointerdown', () => {
      const menu = document.createElement('div');
      menu.className = 'os-tool-dropdown-content';
      menu.dataset.fixtureRectangleMenu = 'true';
      for (const id of [
        'RECTANGLE_TWO_CORNERS',
        'RECTANGLE_CENTER',
        'RECTANGLE_ALIGNED',
      ]) {
        const item = document.createElement('div');
        item.setAttribute('command-id', id);
        item.style.cssText = 'width:120px;height:24px';
        menu.append(item);
      }
      document.body.append(menu);
    });
    group.append(face, arrow);
    const line = document.createElement('div');
    line.setAttribute('command-id', 'LINESEGMENT');
    line.style.cssText = 'width:32px;height:24px';
    const unrelated = document.createElement('div');
    unrelated.setAttribute('command-id', 'PRIVATE_DOCUMENT_COMMAND');
    toolbar.append(line, group, unrelated);
    document.body.append(toolbar);
  });

  await page
    .getByRole('button', { name: 'Enable recognition diagnostics' })
    .click();
  await page
    .getByRole('button', { name: 'Record metadata State A — Sketch editing' })
    .click();

  await page
    .getByRole('button', {
      name: 'Arm metadata State B — then open Rectangle dropdown',
    })
    .click();
  await page.locator('.dropdown-arrow').click();

  await page.evaluate(() => {
    document.querySelector('[data-fixture-rectangle-menu]')?.remove();
    document
      .querySelector('[data-fixture-rectangle-group] [command-id]')
      ?.setAttribute('command-id', 'RECTANGLE_CENTER');
  });
  await page
    .getByRole('button', {
      name: 'Record metadata State C — Another Rectangle variant',
    })
    .click();

  await page.evaluate(() => {
    const toolbar = document.querySelector('[data-fixture-command-toolbar]');
    if (!toolbar) return;
    toolbar.replaceChildren();
    const extrude = document.createElement('div');
    extrude.setAttribute('command-id', 'extrude');
    extrude.style.cssText = 'width:32px;height:24px';
    toolbar.append(extrude);
  });
  await page
    .getByRole('button', { name: 'Record metadata State D — Extrude editing' })
    .click();
  await page
    .getByRole('button', { name: 'Copy command metadata report' })
    .click();

  const output = await page
    .getByLabel('Rectangle command metadata diagnostic output')
    .inputValue();
  const report = JSON.parse(output);
  expect(report.productionRecognition).toBe('NOT_RUN');
  expect(report.geometryVerification).toBe('NOT_RUN');
  expect(report.snapshots).toHaveLength(4);
  expect(report.snapshots[0]).toMatchObject({
    ownerReportedState: 'SKETCH_EDITING',
    sketchClue: 'PRESENT',
    ownership: [
      expect.objectContaining({
        faceCommandId: 'RECTANGLE_TWO_CORNERS',
        arrowRelation: 'SAME_PARENT',
      }),
    ],
  });
  expect(
    report.snapshots[1].commands.filter(
      (command: { location: string }) => command.location === 'MENU',
    ),
  ).toHaveLength(3);
  expect(report.snapshots[2].commands).toEqual(
    expect.arrayContaining([
      expect.objectContaining({ commandId: 'RECTANGLE_CENTER' }),
    ]),
  );
  expect(report.snapshots[3]).toMatchObject({
    ownerReportedState: 'EXTRUDE_EDITING',
    sketchClue: 'ABSENT',
    extrudeClue: 'PRESENT',
  });
  expect(output).not.toContain('PRIVATE_DOCUMENT_COMMAND');
  expect(output).not.toContain('private-project-class');
  await expect(page.locator('#host-click-count')).toHaveText('0');
});
