import { openLessonHelp } from './help';
import { expect, test, type Page } from '@playwright/test';

// These controls and positions are simulations, not authenticated Onshape evidence.
async function makeSketchUnrecognizable(page: Page) {
  await page.locator('#fixture-sketch').evaluate((button) => {
    button.removeAttribute('aria-label');
    button.textContent = '';
    button.setAttribute(
      'style',
      'position:fixed;left:10vw;top:10vh;width:10vw;height:5vh',
    );
    button.addEventListener('click', () =>
      button.setAttribute('data-clicked', 'true'),
    );
  });
}

async function startSketchStep(page: Page) {
  await page.goto('/fixture.html?unknown-permission');
  await page.getByRole('button', { name: 'Got it' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: 'Mark done' }).click();
  await page.getByRole('button', { name: 'Next' }).click();
  await makeSketchUnrecognizable(page);
}

async function saveCalibration(page: Page) {
  await openLessonHelp(page, 'Detailed guidance');
  await page
    .getByRole('button', { name: 'Calibrate Sketch highlight' })
    .click();
  for (const [name, value] of [
    ['Left (%)', '10'],
    ['Top (%)', '10'],
    ['Width (%)', '10'],
    ['Height (%)', '5'],
  ])
    await page.getByLabel(name!).fill(value!);
  await page.getByRole('button', { name: 'Save calibration' }).click();
  await expect(
    page.getByRole('group', { name: 'Sketch highlight calibration' }),
  ).toHaveCount(0);
}

test('simulated calibration survives reload, highlights the saved rectangle, and lets CAD clicks pass through', async ({
  page,
}) => {
  await startSketchStep(page);
  await saveCalibration(page);
  await page.reload();
  await expect(page.getByText('Step 3 of 8 · Visited')).toBeVisible();
  await makeSketchUnrecognizable(page);
  await openLessonHelp(page, 'Detailed guidance');
  await page.getByRole('button', { name: 'SHOW' }).click();
  await expect(
    page.getByText(
      'Showing an approximate location based on your calibration. Leqad has not verified this control.',
    ),
  ).toBeVisible();
  const outline = page.locator('[data-leqad-calibrated]');
  await expect(outline).toHaveCount(1);
  const box = (await outline.boundingBox())!;
  const viewport = page.viewportSize()!;
  expect(box.x).toBeCloseTo(viewport.width * 0.1, 0);
  expect(box.height).toBeCloseTo(viewport.height * 0.05, 0);
  await page.mouse.click(box.x + box.width / 2, box.y + box.height / 2);
  await expect(page.locator('#fixture-sketch')).toHaveAttribute(
    'data-clicked',
    'true',
  );
  await openLessonHelp(page, 'Detailed guidance');
  await page
    .getByRole('button', { name: "I'm already in Sketch mode" })
    .click();
  await expect(
    page.getByText(/You reported that Sketch mode is active/),
  ).toBeVisible();
  await expect(page.getByText('Step 3 of 8 · Visited')).toBeVisible();
  await page.getByRole('button', { name: 'Mark done' }).click();
  await expect(page.getByText('Step 3 of 8 · Marked done')).toBeVisible();
  await page.getByRole('button', { name: 'Next' }).click();
  await page.reload();
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
  await page.getByRole('button', { name: 'Back' }).click();
  await expect(page.getByText('Step 3 of 8 · Marked done')).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Lesson progress' }),
  ).toContainText('has not verified');
});

test('simulated semantic targets take precedence; resize, cancel, reset, and unmount clear approximate outlines', async ({
  page,
}) => {
  await startSketchStep(page);
  await saveCalibration(page);
  await page
    .locator('#fixture-sketch')
    .evaluate((button) => button.setAttribute('aria-label', 'Sketch'));
  await openLessonHelp(page, 'Detailed guidance');
  await page.getByRole('button', { name: 'SHOW' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(1);
  await expect(page.locator('[data-leqad-calibrated]')).toHaveCount(0);
  await makeSketchUnrecognizable(page);
  await openLessonHelp(page, 'Detailed guidance');
  await page.getByRole('button', { name: 'SHOW' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(1);
  await expect(page.locator('[data-leqad-calibrated]')).toHaveCount(1);
  const viewport = page.viewportSize()!;
  await page.setViewportSize({ ...viewport, width: viewport.width + 400 });
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await openLessonHelp(page, 'Detailed guidance');
  await page.getByRole('button', { name: 'SHOW' }).click();
  await expect(
    page.getByText(/no longer matches the viewport or zoom/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Cancel' }).click();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await openLessonHelp(page, 'Detailed guidance');
  await page
    .getByRole('button', { name: 'Calibrate Sketch highlight' })
    .click();
  await page.getByRole('button', { name: 'Reset calibration' }).click();
  await openLessonHelp(page, 'Detailed guidance');
  await page.getByRole('button', { name: 'SHOW' }).click();
  await expect(
    page.getByText(/No saved Sketch calibration is available/),
  ).toBeVisible();
  await page.evaluate(() => window.dispatchEvent(new Event('fixture:unmount')));
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
});
