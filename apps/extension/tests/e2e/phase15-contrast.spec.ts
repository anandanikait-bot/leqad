import { expect, test } from '@playwright/test';
import type { Locator, Page } from '@playwright/test';

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
    const results: {
      text: string;
      ratio: number;
      foreground: string;
      background: string;
      compositedBackground: number[];
      theme: string | null;
    }[] = [];
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
        foreground: getComputedStyle(target).color,
        background: getComputedStyle(target).backgroundColor,
        compositedBackground: background,
        theme:
          target.closest('[data-leqad-panel]')?.getAttribute('data-theme') ??
          null,
        ratio: (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05),
      });
    }
    return results;
  });
}
async function meetsAA(root: Locator, state = 'rendered') {
  const results = await textContrasts(root);
  expect(results.length).toBeGreaterThan(0);
  for (const result of results)
    expect(
      result.ratio,
      JSON.stringify({ state, ...result }),
    ).toBeGreaterThanOrEqual(4.5);
  return results;
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

// Same measurement path for normal, actual :hover and restored states.
async function pointerContrast(page: Page, button: Locator) {
  await expect(button).toBeEnabled();
  await page.mouse.move(2, 2);
  await expect
    .poll(() => button.evaluate((el) => el.matches(':hover')))
    .toBe(false);
  const normal = await meetsAA(button, 'normal');
  await button.hover();
  await expect
    .poll(() => button.evaluate((el) => el.matches(':hover')))
    .toBe(true);
  const hover = await meetsAA(button, 'pointer-hover');
  await page.mouse.move(2, 2);
  await expect
    .poll(() => button.evaluate((el) => el.matches(':hover')))
    .toBe(false);
  const restored = await meetsAA(button, 'pointer-away');
  expect(
    restored,
    JSON.stringify({ control: await button.innerText(), normal, restored }),
  ).toEqual(normal);
  return { control: await button.innerText(), normal, hover, restored };
}
async function watchFixtureClicks(page: Page) {
  await page.evaluate(() => {
    const state = window as Window & { __phase15ExternalClicks?: number };
    state.__phase15ExternalClicks = 0;
    document.addEventListener(
      'click',
      (event) => {
        if (
          !event
            .composedPath()
            .some(
              (node) =>
                node instanceof Element &&
                node.hasAttribute('data-leqad-panel'),
            )
        )
          state.__phase15ExternalClicks =
            (state.__phase15ExternalClicks ?? 0) + 1;
      },
      true,
    );
  });
}
async function hoverState(page: Page) {
  const progress = page.getByRole('progressbar');
  const step = page.locator('.leqad-step-count');
  const outcome = page.getByRole('status', { name: 'Lesson progress' });
  return {
    storage: await page.evaluate(() =>
      Object.fromEntries(
        Object.keys(localStorage)
          .sort()
          .map((key) => [key, localStorage.getItem(key)]),
      ),
    ),
    progress: (await progress.count())
      ? await progress.getAttribute('aria-valuenow')
      : null,
    step: (await step.count()) ? await step.innerText() : null,
    outcome: (await outcome.count()) ? await outcome.innerText() : null,
    clicks: await page.locator('#host-click-count').innerText(),
    externalClicks: await page.evaluate(
      () =>
        (window as Window & { __phase15ExternalClicks?: number })
          .__phase15ExternalClicks ?? 0,
    ),
    selectedPlane: await page
      .locator('#fixture-top-plane')
      .getAttribute('aria-pressed'),
    sketchDialogHidden: await page
      .locator('#fixture-sketch-dialog')
      .evaluate((el) => (el as HTMLElement).hidden),
    highlights: await page.locator('[data-leqad-highlight]').count(),
    response: await page
      .getByRole('region', { name: 'Local example response' })
      .count(),
  };
}
for (const theme of ['light', 'dark'] as const) {
  test(`real pointer hover preserves AA and state (${theme})`, async ({
    page,
  }, info) => {
    // Keep setup-driven panel clamping out of the hover-only storage window.
    await page.setViewportSize({ width: 1440, height: 1400 });
    await page.goto('/fixture.html');
    await watchFixtureClicks(page);
    await page.getByRole('button', { name: 'Open Settings' }).click();
    await page
      .getByRole('radio', {
        name: theme === 'light' ? 'Light' : 'Dark',
        exact: true,
      })
      .check();
    await page.getByRole('button', { name: 'Back to Learn' }).click();
    // Wait for the existing preference debounce before taking a storage baseline.
    await expect
      .poll(() =>
        page.evaluate(
          () =>
            JSON.parse(
              localStorage.getItem('leqad:panel-preferences:v2') ?? '{}',
            ).preferences?.appearance,
        ),
      )
      .toBe(theme);
    const learnBefore = await hoverState(page);
    await page.getByRole('button', { name: 'Ask', exact: true }).click();
    const questions = page
      .getByRole('region', { name: 'Ask local prototype' })
      .locator('button.leqad-button--secondary:enabled');
    expect(await questions.count()).toBeGreaterThan(0);
    const beforeAsk = await hoverState(page);
    const measurements = [];
    for (const button of await questions.all())
      measurements.push(await pointerContrast(page, button));
    expect(await hoverState(page)).toEqual(beforeAsk);
    await page.getByRole('button', { name: 'Learn', exact: true }).click();
    expect(await hoverState(page)).toEqual(learnBefore);
    // Explicit lesson setup, separate from the hover-only assertions.
    await page.getByRole('button', { name: 'Got it' }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Check progress' }).click();
    await page.getByRole('button', { name: 'Mark done' }).click();
    await page.getByRole('button', { name: 'Next', exact: true }).click();
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await page.getByRole('button', { name: 'Detailed guidance' }).click();
    const beforeGuidance = await hoverState(page);

    for (const name of ['HINT', 'SHOW', 'GUIDE']) {
      const control = page
        .getByRole('group', { name: 'Guidance level' })
        .getByRole('button', { name, exact: true });
      await expect(control).toHaveCount(1);
      await expect(control).toBeEnabled();
      measurements.push(await pointerContrast(page, control));
    }
    expect(await hoverState(page)).toEqual(beforeGuidance);
    // Explicit regression sentinel: the old dark ivory-hover/light-text pairing
    // must be detected through this exact real-pointer measurement path.
    if (theme === 'dark') {
      const control = page
        .getByRole('group', { name: 'Guidance level' })
        .getByRole('button', { name: 'SHOW', exact: true });
      await control.hover();
      const style = await control.getAttribute('style');
      try {
        await control.evaluate((el) => {
          (el as HTMLElement).style.setProperty(
            'background-color',
            '#f5efe7',
            'important',
          );
        });
        const reverted = await textContrasts(control);
        expect(reverted.length).toBeGreaterThan(0);
        for (const result of reverted)
          expect(
            result.ratio,
            JSON.stringify({
              state: 'injected old hover regression',
              ...result,
            }),
          ).toBeLessThan(4.5);
      } finally {
        await control.evaluate((el, old) => {
          if (old === null) el.removeAttribute('style');
          else el.setAttribute('style', old);
        }, style);
        await page.mouse.move(2, 2);
      }
      await meetsAA(control, 'restored after negative sentinel');
      expect(await hoverState(page)).toEqual(beforeGuidance);
    }
    console.log(`HOVER_RESULTS ${JSON.stringify({ theme, measurements })}`);
    await info.attach(`pointer-contrast-${theme}`, {
      body: JSON.stringify({ theme, measurements }, null, 2),
      contentType: 'application/json',
    });
  });
}

test('hover side-effect guard detects simulated CAD control clicks', async ({
  page,
}) => {
  await page.goto('/fixture.html');
  await watchFixtureClicks(page);
  const before = await hoverState(page);
  await page.locator('#fixture-top-plane').click();
  await page.locator('#fixture-sketch').click();
  const after = await hoverState(page);
  expect(after.externalClicks - before.externalClicks).toBe(2);
  expect(after.selectedPlane).not.toBe(before.selectedPlane);
  expect(after.sketchDialogHidden).not.toBe(before.sketchDialogHidden);
});
