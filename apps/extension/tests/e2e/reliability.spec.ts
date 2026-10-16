import { expect, test, type Page } from '@playwright/test';

// All controls and storage failures here are simulations, not live Onshape evidence.
async function reachStep(page: Page, step: number) {
  await page.goto('/fixture.html?unknown-permission');
  for (let current = 1; current < step; current++) {
    await page
      .getByRole('button', {
        name: current === 1 ? 'Got it' : "I've finished this step",
      })
      .click();
    await page.getByRole('button', { name: 'Next' }).click();
  }
}

test('Corner Rectangle teaching survives simulated SHOW failure and self-reported reload', async ({
  page,
}) => {
  await reachStep(page, 4);
  await page.locator('#fixture-sketch').click();
  await page
    .locator('#fixture-rectangle')
    .evaluate((button) => button.remove());
  const instruction = page.getByText(
    /Open the Rectangle dropdown with its arrow, choose Corner Rectangle/,
  );
  await expect(instruction).toBeVisible();
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(
    page.getByText(
      /Manually open the Rectangle dropdown arrow and choose Corner Rectangle/,
    ),
  ).toBeVisible();
  await expect(instruction).toBeVisible();
  await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
  await page.getByRole('button', { name: 'Why?', exact: true }).click();
  await expect(
    page.getByText(/Center Point Rectangle starts from the center/),
  ).toBeVisible();
  await page.getByRole('button', { name: 'HINT', exact: true }).click();
  await expect(page.getByText(/Hint 1 of 5/)).toBeVisible();
  await expect(
    page.getByText(/The group icon can show the last-used Rectangle variant/),
  ).toBeVisible();
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
  await page.getByRole('button', { name: "I've finished this step" }).click();
  await page.reload();
  await expect(page.getByText('Step 4 of 8 · Marked done')).toBeVisible();
  await expect(instruction).toBeVisible();
  await page.getByRole('button', { name: 'Next', exact: true }).click();
  await expect(
    page.getByText(
      /Use Dimension to set one horizontal side to 40 mm and one vertical side to 30 mm/,
    ),
  ).toBeVisible();
});

test('simulated command identity conflicts fall back; inert and replaced controls lose their outlines', async ({
  page,
}) => {
  await reachStep(page, 3);
  const control = page.locator('#fixture-sketch');
  await control.evaluate((button) => {
    button.setAttribute('aria-label', 'Delete');
    button.setAttribute('title', 'Sketch');
    button.textContent = 'Sketch';
  });
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(
    page.getByRole('group', { name: 'Sketch highlight calibration' }),
  ).toBeVisible();
  await expect(
    page.locator('[data-leqad-highlight]:not([data-leqad-calibrated])'),
  ).toHaveCount(0);
  await page.getByRole('button', { name: 'Cancel', exact: true }).click();
  await control.evaluate((button) =>
    button.setAttribute('aria-label', 'Sketch'),
  );
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  const outline = page.locator('[data-leqad-highlight]');
  await expect(outline).toHaveCount(1);
  await control.evaluate((button) => button.setAttribute('inert', ''));
  await expect(outline).toHaveCount(0);
  await control.evaluate((button) => button.removeAttribute('inert'));
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(outline).toHaveCount(1);
  await control.evaluate((button) =>
    button.replaceWith(button.cloneNode(true)),
  );
  await expect(outline).toHaveCount(0);
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(outline).toHaveCount(1);
  await control.evaluate((button) => {
    (button as HTMLElement).style.marginLeft = '90px';
  });
  await expect
    .poll(async () => {
      const targetBox = await control.boundingBox();
      const outlineBox = await outline.boundingBox();
      return targetBox && outlineBox
        ? Math.abs(outlineBox.x - (targetBox.x - 3))
        : Infinity;
    })
    .toBeLessThan(1);
  await expect(outline).toHaveCSS('pointer-events', 'none');
  await expect(page.getByText('Step 3 of 8 · Visited')).toBeVisible();
});

test('simulated SHOW and GUIDE switch to keyboard HINT without retaining highlights or advancing the lesson', async ({
  page,
}) => {
  await reachStep(page, 4);
  await page.locator('#fixture-sketch').click();
  const hint = page.getByRole('button', { name: 'HINT', exact: true });
  const outline = page.locator('[data-leqad-highlight]');
  await page.getByRole('button', { name: 'SHOW', exact: true }).click();
  await expect(outline).toHaveCount(1);
  await hint.focus();
  await hint.press('Enter');
  await expect(outline).toHaveCount(0);
  await expect(page.getByText(/Hint 1 of 5/)).toBeVisible();
  await page.getByRole('button', { name: 'GUIDE', exact: true }).click();
  await expect(
    page.getByText(/Waiting for you to open the menu/),
  ).toBeVisible();
  await expect(outline).toHaveCount(1);
  await hint.click();
  await expect(outline).toHaveCount(0);
  // Opening the simulated menu after cancellation cannot revive the old guide.
  await page.locator('#fixture-rectangle').click();
  await expect(page.locator('[data-guidance-simulation-menu]')).toHaveCount(1);
  await expect(outline).toHaveCount(0);
  await expect(page.getByText('Step 4 of 8 · Visited')).toBeVisible();
});

test('simulated storage failure offers retry and preserves self-reported progress after reload', async ({
  page,
}) => {
  await reachStep(page, 4);
  await page.evaluate(() => {
    const original = Storage.prototype.setItem;
    Storage.prototype.setItem = function (key, value) {
      if (key.startsWith('leqad:model-progress:'))
        throw new DOMException('Simulated quota limit', 'QuotaExceededError');
      return original.call(this, key, value);
    };
    window.addEventListener(
      'restore-fixture-storage',
      () => {
        Storage.prototype.setItem = original;
      },
      { once: true },
    );
  });
  await page.getByRole('button', { name: "I've finished this step" }).click();
  const savingStatus = page.getByRole('status', { name: 'Progress saving' });
  await expect(savingStatus).toContainText('could not be saved');
  await expect(page.getByText('Step 4 of 8 · Marked done')).toBeVisible();
  await page.evaluate(() =>
    window.dispatchEvent(new Event('restore-fixture-storage')),
  );
  await page.getByRole('button', { name: 'Retry saving progress' }).click();
  await expect(savingStatus).toHaveCount(0);
  await page.reload();
  await expect(page.getByText('Step 4 of 8 · Marked done')).toBeVisible();
  await expect(
    page.getByRole('status', { name: 'Lesson progress' }),
  ).toContainText('has not verified');
});
