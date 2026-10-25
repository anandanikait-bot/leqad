import { expect, test } from '@playwright/test';
import type { Locator } from '@playwright/test';

// Fixed extension fixtures only. Measures rendered text against composited
// ancestor backgrounds, rather than assuming the panel surface is the background.
async function textContrasts(root: Locator) {
  return root.evaluate((element) => {
    const rgba = (value: string) => {
      const values = value.match(/[\d.]+/g)!.map(Number);
      return [values[0]!, values[1]!, values[2]!, values[3] ?? 1];
    };
    const blend = (front: number[], back: number[]) =>
      front
        .slice(0, 3)
        .map((channel, i) => channel * front[3]! + back[i]! * (1 - front[3]!));
    const luminance = (rgb: number[]) => {
      const linear = rgb.map((channel) =>
        channel / 255 <= 0.04045
          ? channel / 255 / 12.92
          : ((channel / 255 + 0.055) / 1.055) ** 2.4,
      );
      return 0.2126 * linear[0]! + 0.7152 * linear[1]! + 0.0722 * linear[2]!;
    };
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT);
    const results: { text: string; ratio: number }[] = [];
    let node: Node | null;
    while ((node = walker.nextNode())) {
      const target = node.parentElement!;
      if (
        !node.textContent?.trim() ||
        !target.checkVisibility({
          checkOpacity: true,
          checkVisibilityCSS: true,
        }) ||
        target.closest(':disabled')
      )
        continue;
      const ancestors: Element[] = [];
      for (
        let current: Element | null = target;
        current;
        current = current.parentElement
      )
        ancestors.unshift(current);
      let background = [255, 255, 255];
      let opacity = 1;
      for (const ancestor of ancestors) {
        const style = getComputedStyle(ancestor);
        background = blend(rgba(style.backgroundColor), background);
        opacity *= Number(style.opacity);
      }
      const foreground = rgba(getComputedStyle(target).color);
      foreground[3] = foreground[3]! * opacity;
      const a = luminance(blend(foreground, background)),
        b = luminance(background);
      results.push({
        text: node.textContent.trim(),
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      });
    }
    return results;
  });
}
async function meetsAA(root: Locator) {
  const results = await textContrasts(root);
  expect(results.length).toBeGreaterThan(0);
  for (const result of results)
    expect(result.ratio, result.text).toBeGreaterThanOrEqual(4.5);
}
for (const theme of ['light', 'dark'] as const) {
  test(`Phase 1.5 help, evidence and local Ask text meets AA (${theme})`, async ({
    page,
  }, info) => {
    await page.goto('/fixture.html');
    await page.getByRole('button', { name: 'Open Settings' }).click();
    await page
      .getByRole('radio', {
        name: theme === 'light' ? 'Light' : 'Dark',
        exact: true,
      })
      .check();
    await page.getByRole('button', { name: 'Back to Learn' }).click();
    await expect(page.locator('[data-leqad-panel]')).toHaveAttribute(
      'data-theme',
      theme,
    );
    const feedback = page.getByRole('status', { name: 'Lesson progress' });
    await meetsAA(feedback); // waiting
    await page.getByRole('button', { name: 'Pause' }).click();
    await expect(feedback).toContainText('paused');
    await meetsAA(feedback);
    await page.getByRole('button', { name: 'Resume' }).click();
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    const help = page.getByRole('region', { name: 'Lesson help' });
    for (const name of ['Hint', 'Detailed guidance', 'Why it matters']) {
      await page.getByRole('button', { name, exact: true }).click();
      await meetsAA(help);
    }
    await page.getByRole('button', { name: 'Hint', exact: true }).click();
    for (let i = 0; i < 4; i++)
      await page.getByRole('button', { name: 'I’m stuck' }).click();
    await expect(help).toContainText('RECOVERY');
    await meetsAA(help);
    // Negative control proves equal foreground/background is rejected by measurement.
    const hint = page.locator('.leqad-hint');
    const normal = await hint.getAttribute('style');
    // Transparent backgrounds need the actual theme surface for this negative case.
    await hint.evaluate((el) => {
      (el as HTMLElement).style.backgroundColor = 'rgb(100, 100, 100)';
      (el as HTMLElement).style.color = 'rgb(100, 100, 100)';
    });
    expect(
      (await textContrasts(hint)).some((result) => result.ratio < 4.5),
    ).toBe(true);
    await hint.evaluate((el, style) => {
      if (style === null) el.removeAttribute('style');
      else el.setAttribute('style', style);
    }, normal);
    await page.getByRole('button', { name: 'Got it' }).click();
    await meetsAA(feedback); // acknowledgement
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Check progress' }).click();
    await expect(feedback).toContainText('Unable to verify');
    await meetsAA(feedback);
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await page
      .getByRole('button', { name: 'Unable to verify', exact: true })
      .click();
    await meetsAA(help);
    await page.locator('#fixture-top-plane').click();
    await page.getByRole('button', { name: 'Try again' }).click();
    await page.getByRole('button', { name: 'Check progress' }).click();
    await expect(feedback).toContainText('Interface evidence confirms');
    await meetsAA(feedback);
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await page.getByRole('button', { name: 'Detailed guidance' }).click();
    await meetsAA(help);
    await page.getByRole('button', { name: 'Check progress' }).click();
    await page.getByRole('button', { name: 'Mark done' }).click();
    await expect(feedback).toContainText('You marked this step done');
    await meetsAA(feedback);
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    const ask = page.getByRole('region', { name: 'Ask local prototype' });
    await meetsAA(ask);
    for (const question of [
      'Why does this step matter?',
      'What can Leqad verify?',
    ]) {
      await page.getByRole('button', { name: question }).click();
      await meetsAA(ask);
    }
    await info.attach(`contrast-${theme}`, {
      body: JSON.stringify(await textContrasts(ask), null, 2),
      contentType: 'application/json',
    });
  });
}
