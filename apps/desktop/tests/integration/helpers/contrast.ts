import { expect } from '@playwright/test';
import type { Locator } from '@playwright/test';

export type ContrastSample = {
  text: string;
  ratio: number;
  foreground: string;
  background: string;
  compositedBackground: number[];
};

// Uses the same ancestor-composited WCAG calculation as the existing Phase 1.5
// pointer-hover regression in apps/extension/tests/e2e/phase15-contrast.spec.ts.
export async function inspectTextContrast(root: Locator) {
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
      const foregroundLuminance = luminance(blend(foreground, background));
      const backgroundLuminance = luminance(background);
      results.push({
        text: node.textContent.trim(),
        foreground: getComputedStyle(target).color,
        background: getComputedStyle(target).backgroundColor,
        compositedBackground: background,
        ratio:
          (Math.max(foregroundLuminance, backgroundLuminance) + 0.05) /
          (Math.min(foregroundLuminance, backgroundLuminance) + 0.05),
      });
    }
    return results;
  });
}

export async function expectTextAA(root: Locator, state: string) {
  const samples = await inspectTextContrast(root);
  expect(samples.length, `${state}: expected rendered text`).toBeGreaterThan(0);
  for (const sample of samples) {
    expect(
      sample.ratio,
      JSON.stringify({ state, ...sample }),
    ).toBeGreaterThanOrEqual(4.5);
  }
  return samples;
}
