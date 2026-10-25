import { expect, test } from '@playwright/test';
// Deterministic extension fixtures only; no authenticated Onshape evidence.
for (const [width, height] of [
  [1440, 900],
  [320, 720],
  [1024, 480],
  [320, 360],
] as const) {
  test(`Phase 1.5 help remains reachable at ${width}x${height}`, async ({
    page,
  }) => {
    await page.setViewportSize({ width, height });
    await page.goto('/fixture.html');
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    const panel = page.locator('[data-leqad-panel]');
    const box = await panel.boundingBox();
    expect(box!.x).toBeGreaterThanOrEqual(8);
    expect(box!.y + box!.height).toBeLessThanOrEqual(height - 7);
    expect(await panel.evaluate((el) => el.scrollWidth <= el.clientWidth)).toBe(
      true,
    );
    await expect(page.getByText(/Hint 1 of 5/)).toBeVisible();
    await page.getByRole('button', { name: 'Why it matters' }).click();
    await expect(page.getByText(/Hint 1 of 5/)).toHaveCount(0);
    const help = page.getByRole('region', { name: 'Help content' });
    await help.evaluate((el) => {
      const p = document.createElement('p');
      p.textContent = 'Long permitted teaching explanation. '.repeat(150);
      el.append(p);
    });
    if (height >= 800) {
      await expect(
        page.getByRole('region', { name: 'Next action' }),
      ).toBeInViewport();
      await expect(
        page.getByRole('button', { name: 'Got it' }),
      ).toBeInViewport();
      expect(await help.evaluate((el) => el.clientHeight)).toBeLessThanOrEqual(
        240,
      );
      expect(
        await help.evaluate((el) => el.scrollHeight > el.clientHeight),
      ).toBe(true);
      await expect(help).toHaveCSS('overflow-y', 'auto');
    } else {
      await expect(help).toHaveCSS('overflow-y', 'visible');
    }
    await help.focus();
    await page.keyboard.press('Escape');
    await expect(
      page.getByRole('button', { name: 'Help', exact: true }),
    ).toBeFocused();
    await page.getByRole('button', { name: 'Got it' }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await expect(
      page.getByRole('button', { name: 'Help', exact: true }),
    ).toHaveAttribute('aria-expanded', 'false');
    await page.getByRole('button', { name: 'Collapse Leqad panel' }).click();
    await expect(
      page.getByRole('button', { name: 'Next', exact: true }),
    ).toHaveCount(0);
  });
}
test('long guidance cannot collapse to a thin strip and passive updates retain focus', async ({
  page,
}) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto('/fixture.html?unknown-permission=1');
  await page.getByRole('button', { name: 'Help', exact: true }).click();
  const content = page.getByRole('region', { name: 'Help content' });
  await expect
    .poll(() => content.evaluate((el) => el.clientHeight))
    .toBeGreaterThanOrEqual(96);
  await content.focus();
  await expect(content).toBeFocused();
  await page.setViewportSize({ width: 320, height: 360 });
  await expect(content).toHaveCSS('overflow-y', 'visible');
});
