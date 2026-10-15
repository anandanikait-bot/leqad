import { afterEach, describe, expect, it, vi } from 'vitest';

function inDefaultGeometry(control: HTMLElement) {
  const tree = document.createElement('div');
  tree.setAttribute('role', 'tree');
  const group = document.createElement('div');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Default geometry');
  group.append(control);
  tree.append(group);
  document.body.append(tree);
}

function visibleButton(name: string): HTMLButtonElement {
  const button = document.createElement('button');
  button.setAttribute('aria-label', name);
  button.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
  document.body.append(button);
  if (name === 'Top plane') inDefaultGeometry(button);
  return button;
}

/** Sanitized structural fixture from the owner's successful icon/text clicks. */
function sketchCommandRow(label = 'Sketch') {
  const command = document.createElement('div');
  command.getBoundingClientRect = () => new DOMRect(20, 30, 60, 28);
  const iconContainer = document.createElement('div');
  const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  iconContainer.append(icon);
  const text = document.createElement('span');
  text.textContent = label;
  command.append(iconContainer, text);

  let wrapped: HTMLElement = command;
  for (let depth = 0; depth < 3; depth += 1) {
    const wrapper = document.createElement('div');
    wrapper.append(wrapped);
    wrapped = wrapper;
  }
  const strip = document.createElement('div');
  strip.getBoundingClientRect = () => new DOMRect(10, 28, 720, 32);
  strip.append(wrapped);
  for (let index = 0; index < 11; index += 1) {
    strip.append(document.createElement('div'));
  }
  document.body.append(strip);
  return { command, text, icon, strip };
}

afterEach(() => {
  vi.restoreAllMocks();
  document.body.replaceChildren();
  Reflect.deleteProperty(document, 'elementFromPoint');
});

describe('Sketch toolbar structural recognition (sanitized owner capture)', () => {
  it('recognizes one icon-and-exact-label control in a horizontal command strip', async () => {
    const { command } = sketchCommandRow();
    const { recognizeSemanticTarget, createSemanticHighlighter } =
      await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'sketch')).toMatchObject({
      status: 'FOUND',
      element: command,
      matchStrategy: 'VALIDATED_CONTEXT',
      confidence: 'MEDIUM',
      candidateCount: 1,
    });
    const highlighter = createSemanticHighlighter(document);
    expect(highlighter.show('sketch').status).toBe('FOUND');
    expect(document.querySelectorAll('[data-leqad-highlight]')).toHaveLength(1);
    highlighter.clear();
  });

  it('abstains from labeling a lone icon-and-text card a CAD command', async () => {
    const { strip } = sketchCommandRow();
    strip.getBoundingClientRect = () => new DOMRect(10, 28, 120, 380);
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'sketch').status).not.toBe('FOUND');
  });

  it('rejects text without an SVG sibling and rejects Finish Sketch', async () => {
    const one = sketchCommandRow();
    one.icon.remove();
    sketchCommandRow('Finish Sketch');
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'sketch').status).not.toBe('FOUND');
  });

  it('abstains on competing visually plausible Sketch controls', async () => {
    sketchCommandRow();
    sketchCommandRow();
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'sketch')).toMatchObject({
      status: 'AMBIGUOUS',
      element: null,
      candidateCount: 2,
    });
  });

  it('abstains if a normal semantic Sketch button competes with the structural target', async () => {
    sketchCommandRow();
    visibleButton('Sketch');
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'sketch').status).toBe('AMBIGUOUS');
  });

  it('does not highlight a structural control disabled by an ancestor', async () => {
    const { strip } = sketchCommandRow();
    strip.setAttribute('inert', '');
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const highlighter = createSemanticHighlighter(document);
    expect(highlighter.show('sketch').status).not.toBe('FOUND');
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    highlighter.clear();
  });

  it('removes the temporary outline when the structural label changes', async () => {
    const { text } = sketchCommandRow();
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const highlighter = createSemanticHighlighter(document);
    expect(highlighter.show('sketch').status).toBe('FOUND');
    text.textContent = 'Extrude';
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    highlighter.clear();
  });
});

describe('findSemanticTarget', () => {
  // Simulated controls: accessible-name conflicts, not captured Onshape DOM.
  it.each([
    ['aria-label', 'Delete', 'Sketch'],
    ['aria-label', 'Sketch settings', 'Sketch'],
    ['aria-label', '', 'Sketch'],
    ['aria-labelledby', 'different-command', 'Sketch'],
    ['aria-labelledby', 'missing-name', 'Sketch'],
  ])(
    'does not identify Sketch through fallback text when %s is %s',
    async (attribute, name, text) => {
      const reference = document.createElement('span');
      reference.id = 'different-command';
      reference.textContent = 'Delete';
      document.body.append(reference);
      const target = visibleButton('Sketch');
      target.setAttribute(attribute!, name!);
      target.title = 'Sketch';
      target.textContent = text!;
      const { createSemanticHighlighter, isUsableSemanticTarget } =
        await import('./semanticTargets');
      const highlighter = createSemanticHighlighter(document);
      expect(highlighter.show('sketch').status).not.toBe('FOUND');
      expect(isUsableSemanticTarget(target, 'sketch')).toBe(false);
      expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
      highlighter.clear();
    },
  );

  it('recognizes a bounded referenced command name before a conflicting aria-label', async () => {
    const reference = document.createElement('span');
    reference.id = 'command-name';
    reference.textContent = 'Sketch';
    document.body.append(reference);
    const target = visibleButton('Delete');
    target.setAttribute('aria-labelledby', reference.id);
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'sketch')).toMatchObject({
      status: 'FOUND',
      element: target,
    });
  });

  it.each(['target', 'ancestor'])(
    'clears a highlight when its %s becomes inert',
    async (scope) => {
      const target = visibleButton('Sketch');
      const toolbar = document.createElement('div');
      document.body.append(toolbar);
      toolbar.append(target);
      const { createTargetHighlight } = await import('./semanticTargets');
      const highlight = createTargetHighlight(target, document.body, 'sketch');
      expect(highlight.element.isConnected).toBe(true);
      // Flush the preceding append before the isolated attribute mutation.
      await Promise.resolve();
      (scope === 'target' ? target : toolbar).setAttribute('inert', '');
      await Promise.resolve();
      expect(highlight.element.isConnected).toBe(false);
      highlight.remove();
    },
  );

  it('clears a highlight when its referenced accessible name is disconnected by an ID change', async () => {
    const label = document.createElement('span');
    label.id = 'sketch-command-label';
    label.textContent = 'Sketch';
    document.body.append(label);
    const target = visibleButton('Sketch');
    target.setAttribute('aria-labelledby', label.id);
    const { createTargetHighlight } = await import('./semanticTargets');
    const highlight = createTargetHighlight(target, document.body, 'sketch');
    await Promise.resolve();
    expect(highlight.element.isConnected).toBe(true);
    label.id = 'renamed-command-label';
    await Promise.resolve();
    expect(highlight.element.isConnected).toBe(false);
    highlight.remove();
  });

  it('does not let an unusable stronger match suppress a visible valid control', async () => {
    const hidden = visibleButton('Sketch');
    hidden.hidden = true;
    const visible = document.createElement('button');
    visible.textContent = 'Sketch';
    visible.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(visible);
    const { recognizeSemanticTarget, findSemanticTargets } =
      await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'sketch')).toMatchObject({
      status: 'FOUND',
      element: visible,
    });
    expect(findSemanticTargets(document, 'sketch')).toEqual([visible]);
  });

  it('returns a typed high-confidence exact accessible-label recognition', async () => {
    const target = visibleButton('Top plane');
    const { recognizeSemanticTarget } = await import('./semanticTargets');

    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      targetId: 'top-plane',
      status: 'FOUND',
      element: target,
      matchStrategy: 'EXACT_ACCESSIBLE_LABEL',
      confidence: 'HIGH',
      visibility: 'VISIBLE',
      enabled: 'ENABLED',
      candidateCount: 1,
    });
  });

  it('recognizes a visible control by accessible name instead of fixed screen position', async () => {
    const target = visibleButton('Top plane');
    const { findSemanticTarget } = await import('./semanticTargets');

    expect(findSemanticTarget(document, 'top-plane')).toBe(target);
  });

  it('rejects weak text-only matches instead of highlighting or verifying an uncertain control', async () => {
    const weak = document.createElement('div');
    weak.tabIndex = 0;
    weak.textContent = 'Top plane navigation item';
    weak.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(weak);
    const {
      findSemanticTarget,
      findSemanticTargets,
      isUsableSemanticTarget,
      recognizeSemanticTarget,
    } = await import('./semanticTargets');

    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'REJECTED',
      confidence: 'LOW',
      matchStrategy: 'WEAK_TEXT',
    });
    expect(
      recognizeSemanticTarget(document, 'top-plane').explanation,
    ).toContain('low-confidence');
    expect(findSemanticTarget(document, 'top-plane')).toBeNull();
    expect(findSemanticTargets(document, 'top-plane')).toEqual([]);
    expect(isUsableSemanticTarget(weak, 'top-plane')).toBe(false);
  });

  it('continues recognizing medium-confidence interactive controls', async () => {
    const target = document.createElement('div');
    target.setAttribute('role', 'treeitem');
    target.textContent = 'Top plane';
    target.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(target);
    inDefaultGeometry(target);
    const { recognizeSemanticTarget, isUsableSemanticTarget } =
      await import('./semanticTargets');

    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'FOUND',
      confidence: 'MEDIUM',
      element: target,
    });
    expect(isUsableSemanticTarget(target, 'top-plane')).toBe(true);
  });

  it('does not confuse a Top view control with the Top plane', async () => {
    visibleButton('Top view');
    const { findSemanticTarget, recognizeSemanticTarget } =
      await import('./semanticTargets');

    expect(findSemanticTarget(document, 'top-plane')).toBeNull();
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'MISSING',
      confidence: 'NONE',
      candidateCount: 0,
    });
  });

  it('revalidates a cached target when it becomes unusable', async () => {
    const target = visibleButton('Top plane');
    const { isUsableSemanticTarget } = await import('./semanticTargets');

    expect(isUsableSemanticTarget(target, 'top-plane')).toBe(true);
    target.disabled = true;
    expect(isUsableSemanticTarget(target, 'top-plane')).toBe(false);
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

  it('rejects duplicate equally strong controls as ambiguous', async () => {
    visibleButton('Sketch');
    visibleButton('Sketch');
    const { recognizeSemanticTarget } = await import('./semanticTargets');

    const result = recognizeSemanticTarget(document, 'sketch');

    expect(result).toMatchObject({
      status: 'AMBIGUOUS',
      element: null,
      matchStrategy: 'EXACT_ACCESSIBLE_LABEL',
      confidence: 'HIGH',
      candidateCount: 2,
    });
    expect(result.explanation).toContain('equally strong');
  });

  it('reports why a matching hidden or disabled target was rejected', async () => {
    const hidden = visibleButton('Rectangle');
    hidden.hidden = true;
    const disabled = visibleButton('Dimension');
    disabled.disabled = true;
    const { recognizeSemanticTarget } = await import('./semanticTargets');

    expect(recognizeSemanticTarget(document, 'rectangle')).toMatchObject({
      status: 'REJECTED',
      visibility: 'HIDDEN',
    });
    expect(recognizeSemanticTarget(document, 'dimension')).toMatchObject({
      status: 'REJECTED',
      enabled: 'DISABLED',
    });
  });

  it.each([
    ['sketch', 'Sketch'],
    ['top-plane', 'Top plane'],
    ['rectangle', 'Rectangle'],
    ['dimension', 'Dimension'],
    ['finish-sketch', 'Finish sketch'],
  ] as const)(
    'recognizes the first-lesson %s target',
    async (targetId, label) => {
      const target = visibleButton(label);
      const { recognizeSemanticTarget } = await import('./semanticTargets');

      expect(recognizeSemanticTarget(document, targetId)).toMatchObject({
        status: 'FOUND',
        element: target,
      });
    },
  );
});

describe('createTargetHighlight', () => {
  it('owns one timed highlight across repeated actions and cancels it on cleanup', async () => {
    vi.useFakeTimers();
    try {
      visibleButton('Top plane');
      const { createSemanticHighlighter } = await import('./semanticTargets');
      const highlighter = createSemanticHighlighter(document);
      expect(highlighter.show('top-plane').status).toBe('FOUND');
      expect(highlighter.show('top-plane').status).toBe('FOUND');
      expect(document.querySelectorAll('[data-leqad-highlight]')).toHaveLength(
        1,
      );
      vi.advanceTimersByTime(5000);
      expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
      highlighter.show('top-plane');
      highlighter.clear();
      expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
      expect(vi.getTimerCount()).toBe(0);
    } finally {
      vi.useRealTimers();
    }
  });

  it('removes a highlight when its still-visible DOM node changes plane identity', async () => {
    const target = visibleButton('Top plane');
    const { createTargetHighlight } = await import('./semanticTargets');
    const highlight = createTargetHighlight(target, document.body, 'top-plane');
    expect(highlight.element.isConnected).toBe(true);
    target.setAttribute('aria-label', 'Front plane');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(highlight.element.isConnected).toBe(false);
  });

  it('removes a highlight after recognition becomes ambiguous or the tree collapses', async () => {
    const target = visibleButton('Top plane');
    const { createTargetHighlight } = await import('./semanticTargets');
    const highlight = createTargetHighlight(target, document.body, 'top-plane');
    const rival = visibleButton('Top plane');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(highlight.element.isConnected).toBe(false);
    rival.remove();
    const next = createTargetHighlight(target, document.body, 'top-plane');
    target.parentElement!.setAttribute('aria-expanded', 'false');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(next.element.isConnected).toBe(false);
  });

  it('tracks scroll and zoom geometry and releases listeners and observers on removal', async () => {
    const target = visibleButton('Top plane');
    let width = 80;
    target.getBoundingClientRect = () => new DOMRect(20, 30, width, 24);
    const { createTargetHighlight } = await import('./semanticTargets');
    const highlight = createTargetHighlight(target, document.body, 'top-plane');
    width = 120;
    window.dispatchEvent(new Event('scroll'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(highlight.element.style.width).toBe('126px');
    highlight.remove();
    highlight.remove();
    const frames = vi.spyOn(window, 'requestAnimationFrame');
    window.dispatchEvent(new Event('scroll'));
    window.dispatchEvent(new Event('resize'));
    target.setAttribute('aria-label', 'Front plane');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(frames).not.toHaveBeenCalled();
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
  });

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

  it('recalculates after resize and removes a target that becomes disabled', async () => {
    const target = visibleButton('Top plane');
    let left = 12;
    target.getBoundingClientRect = () => new DOMRect(left, 20, 60, 25);
    const { createTargetHighlight } = await import('./semanticTargets');
    const highlight = createTargetHighlight(target, document.body);

    left = 72;
    window.dispatchEvent(new Event('resize'));
    await new Promise((resolve) => requestAnimationFrame(resolve));
    expect(highlight.element.style.left).toBe('69px');

    target.disabled = true;
    target.setAttribute('aria-disabled', 'true');
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(highlight.element.isConnected).toBe(false);
  });

  it('recalculates when layout mutation moves the target without scrolling', async () => {
    const target = visibleButton('Top plane');
    let left = 12;
    target.getBoundingClientRect = () => new DOMRect(left, 20, 60, 25);
    const { createTargetHighlight } = await import('./semanticTargets');
    const highlight = createTargetHighlight(target, document.body);

    left = 102;
    target.setAttribute('data-layout-revision', '2');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(highlight.element.style.left).toBe('99px');
    highlight.remove();
  });

  it('tracks ancestor layout changes and removes highlights hidden by an ancestor', async () => {
    const ancestor = document.createElement('div');
    const target = visibleButton('Top plane');
    ancestor.append(target);
    document.body.append(ancestor);
    let left = 10;
    target.getBoundingClientRect = () => new DOMRect(left, 20, 60, 25);
    const { createTargetHighlight } = await import('./semanticTargets');
    const highlight = createTargetHighlight(target, document.body);

    left = 100;
    ancestor.style.transform = 'translateX(90px)';
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(highlight.element.style.left).toBe('97px');

    ancestor.hidden = true;
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(highlight.element.isConnected).toBe(false);
  });

  it('disables highlight transitions when reduced motion is requested', async () => {
    const originalMatchMedia = window.matchMedia;
    window.matchMedia = (() => ({
      matches: true,
    })) as unknown as typeof window.matchMedia;
    try {
      const target = visibleButton('Top plane');
      const { createTargetHighlight } = await import('./semanticTargets');

      const highlight = createTargetHighlight(target, document.body);

      expect(highlight.element.style.transition).toBe('none');
      highlight.remove();
    } finally {
      window.matchMedia = originalMatchMedia;
    }
  });
});
