import { expect } from '@playwright/test';
import { captureScreenshot, openSettings, test } from './helpers/desktop';

for (const [width, height] of [
  [365, 600],
  [320, 400],
] as const) {
  for (const scale of [100, 125, 150, 200]) {
    test(`text layout ${width}x${height} at ${scale}% has separated readable regions`, async ({
      desktop,
    }, info) => {
      const { page, app } = desktop;
      await openSettings(page);
      await page.getByRole('radio', { name: `${scale}%`, exact: true }).check();
      await page
        .getByRole('button', { name: 'Back to lesson', exact: true })
        .click();
      await app.evaluate(
        ({ BrowserWindow }, size) =>
          BrowserWindow.getAllWindows()[0]!.setContentSize(size[0]!, size[1]!),
        [width, height],
      );
      await expect
        .poll(() => page.evaluate(() => [innerWidth, innerHeight]))
        .toEqual([width, height]);
      expect(
        await page
          .locator('.desktop-app')
          .evaluate((el) => Number.parseFloat(getComputedStyle(el).fontSize)),
      ).toBeCloseTo((14 * scale) / 100, 1);
      await page.getByRole('button', { name: /^Help/ }).click();
      await page
        .getByRole('button', { name: 'Detailed guidance', exact: true })
        .click();
      try {
        await expect
          .poll(
            () =>
              page.evaluate(() => {
                const selectors = [
                  '.app-header',
                  '.session-strip',
                  '.workspace-navigation',
                  '.workspace-content',
                  '.workspace-footer',
                ];
                const issues: string[] = [];
                const regions = selectors.map((selector) => ({
                  selector,
                  element: document.querySelector<HTMLElement>(selector)!,
                }));
                for (let i = 0; i < regions.length; i++) {
                  const { selector, element } = regions[i]!;
                  const box = element.getBoundingClientRect();
                  if (box.height <= 0)
                    issues.push(`${selector}: no content height`);
                  const next = regions[i + 1];
                  if (
                    next &&
                    box.bottom > next.element.getBoundingClientRect().top + 1
                  )
                    issues.push(`${selector}: overlaps ${next.selector}`);
                }
                for (const selector of [
                  '.session-strip',
                  '.workspace-navigation',
                  '.lesson-instruction',
                ]) {
                  const el = document.querySelector(selector)!;
                  const box = el.getBoundingClientRect();
                  const walker = document.createTreeWalker(
                    el,
                    NodeFilter.SHOW_TEXT,
                  );
                  let node: Node | null;
                  while ((node = walker.nextNode())) {
                    if (!node.textContent?.trim()) continue;
                    const range = document.createRange();
                    range.selectNodeContents(node);
                    for (const rect of range.getClientRects())
                      if (
                        rect.height &&
                        (rect.top < box.top - 1 ||
                          rect.bottom > box.bottom + 1 ||
                          rect.left < 0 ||
                          rect.right > innerWidth + 1)
                      )
                        issues.push(
                          `${selector}: text escapes region ${node.textContent?.trim()}`,
                        );
                  }
                }
                return issues;
              }),
            {
              message: `Rendered text/region bounds at ${width}x${height} ${scale}%`,
            },
          )
          .toEqual([]);
        const scrollers = await page.evaluate(() =>
          [...document.querySelectorAll<HTMLElement>('*')]
            .filter(
              (el) =>
                ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) &&
                el.scrollHeight > el.clientHeight + 1,
            )
            .map((el) => el.className),
        );
        expect(scrollers, 'Only one vertical scrolling surface').toHaveLength(
          1,
        );
        for (const locator of [
          page.locator('.session-strip'),
          page.locator('.workspace-navigation'),
          page.locator('.lesson-instruction'),
          page.getByRole('button', { name: 'Got it', exact: true }),
        ]) {
          await locator.scrollIntoViewIfNeeded();
          await expect(locator).toBeInViewport();
          // IntersectionObserver ratios can round below 1 for fractional line boxes.
          // Verify complete viewport/scroll-ancestor containment with pixel bounds instead.
          expect(
            await locator.evaluate((el) => {
              const r = el.getBoundingClientRect();
              const errors: string[] = [];
              if (
                r.top < -1 ||
                r.left < -1 ||
                r.bottom > innerHeight + 1 ||
                r.right > innerWidth + 1
              )
                errors.push(`outside viewport: ${JSON.stringify(r.toJSON())}`);
              for (
                let parent = el.parentElement;
                parent;
                parent = parent.parentElement
              ) {
                const style = getComputedStyle(parent),
                  bounds = parent.getBoundingClientRect();
                if (
                  ['auto', 'scroll', 'hidden', 'clip'].includes(
                    style.overflowY,
                  ) &&
                  (r.top < bounds.top - 1 || r.bottom > bounds.bottom + 1)
                )
                  errors.push(
                    `clipped by ${parent.className}: ${JSON.stringify(bounds.toJSON())}`,
                  );
              }
              return errors;
            }),
            'Full instruction/control bounds remain inside viewport and clipping ancestors',
          ).toEqual([]);
          expect(
            await locator.evaluate((el) => {
              const r = el.getBoundingClientRect();
              const hit = document.elementFromPoint(
                r.left + r.width / 2,
                r.top + Math.min(r.height / 2, 20),
              );
              return hit !== null && (el.contains(hit) || hit === el);
            }),
            'Instruction/control is not covered',
          ).toBe(true);
        }
        const action = page.getByRole('button', {
          name: 'Got it',
          exact: true,
        });
        await page.keyboard.press('Tab');
        await action.focus();
        await expect(action).toBeFocused();
        expect(
          await action.evaluate((el) => getComputedStyle(el).outlineStyle),
        ).not.toBe('none');
      } finally {
        await page.locator('.desktop-app').evaluate((el) => {
          el.scrollTop = 0;
        });
        await captureScreenshot(
          page,
          info,
          `desktop-layout-${width}x${height}-${scale}.png`,
        );
      }
    });
  }
}
