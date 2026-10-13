import { afterEach, describe, expect, it } from 'vitest';

function visibleButton(name: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.setAttribute('aria-label', name);
  button.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
  document.body.append(button);
  return button;
}

afterEach(() => {
  document.body.replaceChildren();
  Reflect.deleteProperty(document, 'elementFromPoint');
});

describe('findSemanticTarget', () => {
  it('recognizes a visible control by accessible name instead of fixed screen position', async () => {
    const target = visibleButton('Top plane');
    const { findSemanticTarget } = await import('./semanticTargets');

    expect(findSemanticTarget(document, 'top-plane')).toBe(target);
  });

  it('ignores disabled, hidden, and Leqad-owned controls', async () => {
    const disabled = visibleButton('Top plane');
    disabled.disabled = true;
    const hidden = visibleButton('Top plane');
    hidden.hidden = true;
    const leqadRoot = document.createElement('div');
    leqadRoot.dataset.leqadRoot = 'true';
    const ownControl = document.createElement('button');
    ownControl.setAttribute('aria-label', 'Top plane');
    ownControl.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    leqadRoot.append(ownControl);
    document.body.append(leqadRoot);
    const { findSemanticTarget } = await import('./semanticTargets');

    expect(findSemanticTarget(document, 'top-plane')).toBeNull();
  });

  it('does not return an element obscured by another page control', async () => {
    const target = visibleButton('Top plane');
    const coveringControl = document.createElement('button');
    document.body.append(coveringControl);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => coveringControl,
    });
    const { findSemanticTarget } = await import('./semanticTargets');

    expect(findSemanticTarget(document, 'top-plane')).not.toBe(target);
  });
});

describe('createTargetHighlight', () => {
  it('uses current target geometry and lets all pointer input pass through', async () => {
    const target = document.createElement('button');
    let left = 12;
    target.getBoundingClientRect = () => new DOMRect(left, 20, 60, 25);
    document.body.append(target);
    const { createTargetHighlight } = await import('./semanticTargets');

    const highlight = createTargetHighlight(target, document.body);
    expect(highlight.element.style.left).toBe('9px');
    expect(highlight.element.style.width).toBe('66px');
    expect(highlight.element.style.pointerEvents).toBe('none');

    left = 42;
    highlight.refresh();
    expect(highlight.element.style.left).toBe('39px');

    highlight.remove();
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
  });

  it('removes a stale highlight when Onshape replaces its target', async () => {
    const target = document.createElement('button');
    target.getBoundingClientRect = () => new DOMRect(12, 20, 60, 25);
    document.body.append(target);
    const { createTargetHighlight } = await import('./semanticTargets');
    const highlight = createTargetHighlight(target, document.body);

    target.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(highlight.element.isConnected).toBe(false);
  });
});
