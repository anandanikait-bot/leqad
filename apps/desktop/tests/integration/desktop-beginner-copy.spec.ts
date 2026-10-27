import { expect, type Locator } from '@playwright/test';
import { DESKTOP_STEP_COPY } from '../../src/renderer/desktopCopy';
import {
  captureScreenshot,
  chooseWrittenLessons,
  openSettings,
  test,
} from './helpers/desktop';

// Measure individual rendered lines, since a paragraph may be taller than a
// 400px window at 200% text. Scrolling must make every line reachable.
async function readabilityIssues(locator: Locator) {
  return locator.evaluate((el) => {
    const issues: string[] = [];
    const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
    let node: Node | null;
    while ((node = walker.nextNode())) {
      if (!node.textContent?.trim()) continue;
      const range = document.createRange();
      range.selectNodeContents(node);
      const count = range.getClientRects().length;
      for (let i = 0; i < count; i++) {
        let rect = range.getClientRects()[i]!;
        if (!rect.height || !rect.width) continue;
        for (
          let parent: Element | null = el;
          parent;
          parent = parent.parentElement
        ) {
          const style = getComputedStyle(parent);
          if (
            ['auto', 'scroll'].includes(style.overflowY) &&
            parent.scrollHeight > parent.clientHeight + 1
          ) {
            const box = parent.getBoundingClientRect();
            parent.scrollTop += rect.top - box.top - parent.clientHeight / 2;
            rect = range.getClientRects()[i]!;
          }
        }
        if (
          rect.left < -1 ||
          rect.right > innerWidth + 1 ||
          rect.top < -1 ||
          rect.bottom > innerHeight + 1
        )
          issues.push(
            `Unreachable line: ${node.textContent?.trim()} ${JSON.stringify(rect.toJSON())}`,
          );
        for (
          let parent: Element | null = el;
          parent;
          parent = parent.parentElement
        ) {
          const style = getComputedStyle(parent),
            box = parent.getBoundingClientRect();
          if (
            ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowY) &&
            (rect.top < box.top - 1 || rect.bottom > box.bottom + 1)
          )
            issues.push(
              `Clipped line in ${parent.className}: ${node.textContent?.trim()}`,
            );
          if (
            ['auto', 'scroll', 'hidden', 'clip'].includes(style.overflowX) &&
            (rect.left < box.left - 1 || rect.right > box.right + 1)
          )
            issues.push(
              `Horizontally clipped line in ${parent.className}: ${node.textContent?.trim()}`,
            );
        }
        const hit = document.elementFromPoint(
          rect.left + rect.width / 2,
          rect.top + rect.height / 2,
        );
        if (hit !== node.parentElement)
          issues.push(`Covered line: ${node.textContent?.trim()}`);
      }
    }
    return issues;
  });
}

async function expectReadable(locator: Locator) {
  await expect(locator).toBeVisible();
  await expect
    .poll(() => readabilityIssues(locator), {
      message:
        'Every rendered line remains readable through the existing scroll surface',
    })
    .toEqual([]);
}

for (const [width, height, scale] of [
  [365, 600, 100],
  [320, 400, 200],
] as const) {
  test(`beginner copy, all steps and hints stay readable at ${width}x${height} ${scale}%`, async ({
    desktop,
  }, info) => {
    const { page, app } = desktop;
    await chooseWrittenLessons(page);
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
    await page.evaluate(() => document.fonts.ready);
    expect(
      await page
        .locator('.desktop-app')
        .evaluate((el) => parseFloat(getComputedStyle(el).fontSize)),
    ).toBe((14 * scale) / 100);
    const steps = Object.entries(DESKTOP_STEP_COPY);
    for (let index = 0; index < steps.length; index++) {
      const [id, copy] = steps[index]!;
      await expect(page.locator('.step-counter')).toContainText(
        `Step ${index + 1} of 8`,
      );
      await expect(page.locator('.step-title')).toHaveText(copy.heading);
      await expect(page.locator('.lesson-instruction')).toHaveText(copy.action);
      await expect(
        page.getByRole('button', { name: 'Why it matters', exact: true }),
      ).toHaveCount(0);
      await expect(
        page.getByText(copy.explanation, { exact: true }),
      ).toHaveCount(0);
      await expectReadable(page.locator('.lesson-context'));
      await expectReadable(page.locator('.lesson-instruction'));
      await expectReadable(page.locator('.evidence-copy'));
      if (id === 'draw-rectangle') {
        await page.locator('.lesson-instruction').scrollIntoViewIfNeeded();
        await captureScreenshot(
          page,
          info,
          `desktop-beginner-rectangle-${width}-${scale}.png`,
        );
      }
      await page.getByRole('button', { name: /^Help/ }).click();
      const body = page.locator('.help-topic-body');
      for (let hint = 0; hint < 5; hint++) {
        await expect(body).toContainText(copy.hints[hint]!);
        await expectReadable(body);
        if (hint < 4) {
          const next = page.getByRole('button', {
            name: 'Next hint',
            exact: true,
          });
          await next.focus();
          await page.keyboard.press('Enter');
        }
      }
      await expect(
        page.getByRole('button', { name: 'Next hint', exact: true }),
      ).toHaveCount(0);
      await page
        .getByRole('button', { name: 'Why it matters', exact: true })
        .click();
      await expect(body).toHaveText(copy.explanation);
      await expectReadable(body);
      if (id === 'independent-practice') {
        await body.scrollIntoViewIfNeeded();
        await captureScreenshot(
          page,
          info,
          `desktop-beginner-practice-why-${width}-${scale}.png`,
        );
      }
      await page
        .getByRole('button', { name: 'Step details', exact: true })
        .click();
      for (const text of [...copy.commonErrors, ...copy.recoveryActions])
        await expect(body).toContainText(text);
      await expectReadable(body);
      const scrollers = await page.evaluate(
        () =>
          [...document.querySelectorAll('*')].filter(
            (el) =>
              ['auto', 'scroll'].includes(getComputedStyle(el).overflowY) &&
              el.scrollHeight > el.clientHeight + 1,
          ).length,
      );
      expect(scrollers).toBe(1);
      // Escape from the Help region returns focus without changing progress.
      await page
        .getByRole('region', { name: 'Lesson help', exact: true })
        .focus();
      await page.keyboard.press('Escape');
      await expect(
        page.getByRole('button', { name: 'Help +', exact: true }),
      ).toBeFocused();
      const action = page.getByRole('button', {
        name: index === 0 || index === 6 ? 'Got it' : 'Mark done',
        exact: true,
      });
      await action.focus();
      await expect(action).toBeInViewport();
      expect(
        await action.evaluate((el) => getComputedStyle(el).outlineStyle),
      ).not.toBe('none');
      await page.keyboard.press('Enter');
      if (index < 7) {
        await expect(page.locator('.evidence-copy')).toHaveText(
          index === 0 || index === 6
            ? 'You clicked Got it.'
            : "You marked this step done. Leqad hasn't checked it.",
        );
        await page
          .getByRole('button', { name: 'Next step', exact: true })
          .click();
      }
    }
    const summary = page.getByRole('region', {
      name: 'Eight-step completion summary',
      exact: true,
    });
    await expect(
      page.getByRole('heading', { name: 'Lesson complete', exact: true }),
    ).toBeFocused();
    await expect(summary).toContainText('Leqad has not checked your drawing.');
    expect(
      (await summary.innerText()).match(/You clicked Got it/g),
    ).toHaveLength(2);
    expect(
      (await summary.innerText()).match(/Marked done by you/g),
    ).toHaveLength(6);
    await expectReadable(summary);
    await expectReadable(page.locator('.workspace-footer'));
    await summary.getByRole('heading').scrollIntoViewIfNeeded();
    await captureScreenshot(
      page,
      info,
      `desktop-beginner-summary-top-${width}-${scale}.png`,
    );
    await page
      .getByRole('button', { name: 'Close Leqad', exact: true })
      .scrollIntoViewIfNeeded();
    await captureScreenshot(
      page,
      info,
      `desktop-beginner-summary-${width}-${scale}.png`,
    );
  });
}

for (const defect of ['horizontal clipping', 'internal cover'] as const) {
  test(`text overflow guard rejects ${defect}`, async ({ desktop }) => {
    const { page } = desktop;
    const instruction = page.locator('.lesson-instruction');
    await expect(instruction).toBeVisible();
    // Negative controls alter only this isolated Leqad test window, not CAD UI.
    await instruction.evaluate((el, defect) => {
      const p = el.querySelector('p')!;
      if (defect === 'horizontal clipping') {
        (el as HTMLElement).style.width = '80px';
        (el as HTMLElement).style.overflowX = 'hidden';
        p.style.whiteSpace = 'nowrap';
        p.textContent = 'Readable sample text';
      } else {
        p.style.position = 'relative';
        const cover = document.createElement('span');
        cover.style.cssText =
          'position:absolute;inset:0;background:ivory;pointer-events:auto';
        p.append(cover);
      }
    }, defect);
    const issues = await readabilityIssues(instruction);
    expect(
      issues.some((issue) =>
        defect === 'horizontal clipping'
          ? issue.startsWith('Horizontally clipped')
          : issue.startsWith('Covered line'),
      ),
    ).toBe(true);
  });
}
