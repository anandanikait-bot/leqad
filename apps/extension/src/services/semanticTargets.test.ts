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

describe('Structural Sketch toolbar recognition', () => {
  it('finds an exact icon-label Sketch toolbar command', async () => {
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
    const outlines = document.querySelectorAll('[data-leqad-highlight]');
    expect(outlines).toHaveLength(1);
    highlighter.clear();
  });

  it('rejects a tall icon-and-text card', async () => {
    const { strip } = sketchCommandRow();
    strip.getBoundingClientRect = () => new DOMRect(10, 28, 120, 380);
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    const result = recognizeSemanticTarget(document, 'sketch');
    expect(result.status).not.toBe('FOUND');
  });

  it('rejects missing icons and Finish Sketch', async () => {
    const one = sketchCommandRow();
    one.icon.remove();
    sketchCommandRow('Finish Sketch');
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    const result = recognizeSemanticTarget(document, 'sketch');
    expect(result.status).not.toBe('FOUND');
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

  it('abstains when a semantic button competes', async () => {
    sketchCommandRow();
    visibleButton('Sketch');
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    const result = recognizeSemanticTarget(document, 'sketch');
    expect(result.status).toBe('AMBIGUOUS');
  });

  it('rejects a disabled command row', async () => {
    const { strip } = sketchCommandRow();
    strip.setAttribute('inert', '');
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const highlighter = createSemanticHighlighter(document);
    expect(highlighter.show('sketch').status).not.toBe('FOUND');
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    highlighter.clear();
  });

  it('clears the outline after the label changes', async () => {
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
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    document.body.append(toolbar);
    toolbar.append(hidden);
    hidden.setAttribute('aria-haspopup', 'menu');
    visibleButton('Finish sketch');
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
      if (targetId === 'rectangle') {
        const toolbar = document.createElement('div');
        toolbar.setAttribute('role', 'toolbar');
        document.body.append(toolbar);
        toolbar.append(target);
        target.setAttribute('aria-haspopup', 'menu');
        visibleButton('Finish sketch');
      }
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

// Task C evidence boundary: v3 observed SVG/div last-used name and a second
// Corner span. Toolbar/menu roles, ownership, geometry and handlers below are
// SIMULATIONS. The real report did not establish those relationships.
describe('Rectangle dropdown identity (not the last-used command or an option)', () => {
  function activeSketch() {
    return visibleButton('Finish sketch');
  }
  function dropdown(name = 'Corner rectangle') {
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    const control = visibleButton(name);
    control.setAttribute('aria-haspopup', 'menu');
    control.setAttribute('aria-expanded', 'false');
    toolbar.append(control);
    document.body.append(toolbar);
    return { toolbar, control };
  }
  it('does not highlight a standalone Corner command as the Rectangle dropdown', async () => {
    activeSketch();
    visibleButton('Corner rectangle');
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const highlighter = createSemanticHighlighter(document);
    expect(highlighter.show('rectangle').status).not.toBe('FOUND');
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    highlighter.clear();
  });
  it('does not confuse a Corner menu item with a toolbar group', async () => {
    activeSketch();
    const option = visibleButton('Corner rectangle');
    option.setAttribute('role', 'menuitem');
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'rectangle').status).not.toBe(
      'FOUND',
    );
  });
  it.each(['Corner rectangle', 'Center point rectangle', 'Aligned Rectangle'])(
    'recognizes a named popup group labelled with last-used %s, not a selected variant',
    async (name) => {
      activeSketch();
      const { control } = dropdown(name);
      const { recognizeSemanticTarget } = await import('./semanticTargets');
      expect(recognizeSemanticTarget(document, 'rectangle')).toMatchObject({
        status: 'FOUND',
        element: control,
      });
      const option = visibleButton('Corner rectangle');
      option.setAttribute('role', 'menuitem');
      expect(recognizeSemanticTarget(document, 'rectangle')).toMatchObject({
        status: 'FOUND',
        element: control,
        candidateCount: 1,
      });
    },
  );
  it.each([
    'no-sketch',
    'read-only',
    'dialog',
    'canvas',
    'no-popup',
    'wrong-name',
  ])('abstains on %s context or missing dropdown evidence', async (kind) => {
    if (kind !== 'no-sketch') activeSketch();
    const { toolbar, control } = dropdown();
    if (kind === 'read-only') {
      const status = visibleButton('Read only');
      status.setAttribute('role', 'status');
    }
    if (kind === 'dialog') {
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      document.body.append(dialog);
      dialog.append(toolbar);
    }
    if (kind === 'canvas') {
      const canvas = document.createElement('div');
      canvas.setAttribute('role', 'img');
      document.body.append(canvas);
      canvas.append(toolbar);
    }
    if (kind === 'no-popup') control.removeAttribute('aria-haspopup');
    if (kind === 'wrong-name') {
      control.setAttribute('aria-label', 'Delete');
      control.title = 'Corner rectangle';
    }
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'rectangle').status).not.toBe(
      'FOUND',
    );
  });
  it('keeps the actual nonsemantic v3 shape unsupported instead of inventing an arrow', async () => {
    activeSketch();
    const group = document.createElement('div');
    const box = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    box.append(svg);
    const label = document.createElement('span');
    label.textContent = 'Corner rectangle';
    group.append(box, label);
    document.body.append(group);
    const option = document.createElement('span');
    option.textContent = 'Corner rectangle';
    document.body.append(option);
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(recognizeSemanticTarget(document, 'rectangle').status).not.toBe(
      'FOUND',
    );
  });
  it('clears its group outline on the real user click without swallowing it or verifying a step', async () => {
    activeSketch();
    const { control } = dropdown();
    let clicks = 0;
    control.addEventListener('click', () => clicks++);
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const highlighter = createSemanticHighlighter(document);
    expect(highlighter.show('rectangle').status).toBe('FOUND');
    control.click();
    expect(clicks).toBe(1);
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    highlighter.clear();
  });
});

// Strict semantic positive cases are simulations, not claims about real Onshape.
describe('Rectangle group revalidation and bounds', () => {
  function group() {
    const finish = visibleButton('Finish sketch');
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    const control = visibleButton('Corner rectangle');
    control.setAttribute('aria-haspopup', 'menu');
    toolbar.append(control);
    document.body.append(toolbar);
    return { toolbar, control, finish };
  }
  it.each([
    'hidden',
    'disabled',
    'inert',
    'obscured',
    'clipped',
    'duplicate',
    'deep',
    'oversized-scan',
  ])('does not outline %s targets', async (kind) => {
    const { toolbar, control } = group();
    if (kind === 'hidden') control.hidden = true;
    if (kind === 'disabled') control.disabled = true;
    if (kind === 'inert') toolbar.setAttribute('inert', '');
    if (kind === 'obscured')
      Object.defineProperty(document, 'elementFromPoint', {
        configurable: true,
        value: () => document.body,
      });
    if (kind === 'clipped') {
      toolbar.style.overflow = 'hidden';
      toolbar.getBoundingClientRect = () => new DOMRect(21, 31, 1, 1);
    }
    if (kind === 'duplicate') {
      const other = visibleButton('Aligned Rectangle');
      other.setAttribute('aria-haspopup', 'menu');
      toolbar.append(other);
    }
    if (kind === 'deep') {
      for (let i = 0; i < 20; i++) {
        const wrapper = document.createElement('div');
        control.parentElement!.append(wrapper);
        wrapper.append(control);
      }
    }
    if (kind === 'oversized-scan') {
      for (let i = 0; i < 129; i++) {
        const unrelated = document.createElement('button');
        unrelated.setAttribute('aria-haspopup', 'menu');
        toolbar.append(unrelated);
      }
    }
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const h = createSemanticHighlighter(document);
    expect(h.show('rectangle-dropdown').status).not.toBe('FOUND');
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    h.clear();
  });
  it.each([0.8, 1, 1.25, 1.5])(
    'uses measured control bounds at simulated scale %s and clears on replacement',
    async (scale) => {
      const { control } = group();
      control.getBoundingClientRect = () =>
        new DOMRect(20 * scale, 30 * scale, 80 * scale, 24 * scale);
      const { createSemanticHighlighter } = await import('./semanticTargets');
      const h = createSemanticHighlighter(document);
      expect(h.show('rectangle-dropdown').status).toBe('FOUND');
      const outline = document.querySelector<HTMLElement>(
        '[data-leqad-highlight]',
      )!;
      expect(outline.style.width).toBe(`${80 * scale + 6}px`);
      expect(outline.style.pointerEvents).toBe('none');
      control.replaceWith(control.cloneNode(true));
      await new Promise((resolve) => setTimeout(resolve, 0));
      expect(outline.isConnected).toBe(false);
      h.clear();
    },
  );
  it.each([
    'pagehide',
    'popstate',
    'wxt:locationchange',
    'blur',
    'hidden',
    'sketch-ended',
  ])('cleans up on %s with no unsolicited control clicks', async (kind) => {
    const { control, finish } = group();
    let clicks = 0;
    control.onclick = () => clicks++;
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const h = createSemanticHighlighter(document);
    h.show('rectangle-dropdown');
    if (kind === 'hidden') {
      vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
      document.dispatchEvent(new Event('visibilitychange'));
    } else if (kind === 'sketch-ended') {
      finish.remove();
      await new Promise((resolve) => setTimeout(resolve, 0));
    } else window.dispatchEvent(new Event(kind));
    expect(clicks).toBe(0);
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    h.clear();
  });
  it('expires after five seconds and removes input hooks on repeated SHOW', async () => {
    vi.useFakeTimers();
    try {
      const { control } = group();
      const { createSemanticHighlighter } = await import('./semanticTargets');
      const h = createSemanticHighlighter(document);
      h.show('rectangle-dropdown');
      h.show('rectangle-dropdown');
      expect(document.querySelectorAll('[data-leqad-highlight]')).toHaveLength(
        1,
      );
      vi.advanceTimersByTime(5000);
      expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
      control.click();
      h.clear();
    } finally {
      vi.useRealTimers();
    }
  });
});

it.each([
  'popup-removed',
  'modal-context',
  'native-dialog',
  'duplicate-readonly',
  'menuitem-role',
  'detached-cleanup',
])(
  'revalidates Rectangle identity and immediately removes hooks for %s',
  async (kind) => {
    visibleButton('Finish sketch');
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    document.body.append(toolbar);
    const control = visibleButton('Corner rectangle');
    control.setAttribute('aria-haspopup', 'menu');
    toolbar.append(control);
    if (kind === 'duplicate-readonly') {
      visibleButton('Read only');
      visibleButton('Read only');
    }
    if (kind === 'menuitem-role') control.setAttribute('role', 'menuitem');
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const h = createSemanticHighlighter(document);
    const result = h.show('rectangle-dropdown');
    const removed = vi.spyOn(document, 'removeEventListener');
    if (kind === 'popup-removed') control.removeAttribute('aria-haspopup');
    if (kind === 'modal-context') toolbar.setAttribute('aria-modal', 'true');
    if (kind === 'native-dialog') {
      const dialog = document.createElement('dialog');
      dialog.setAttribute('open', '');
      document.body.append(dialog);
      dialog.append(toolbar);
    }
    if (kind === 'detached-cleanup') control.remove();
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    if (kind === 'duplicate-readonly' || kind === 'menuitem-role')
      expect(result.status).not.toBe('FOUND');
    else
      expect(removed.mock.calls.some(([type]) => type === 'click')).toBe(true);
    h.clear();
  },
);

it.each(['click', 'focus'])(
  'clears group-only SHOW when the student moves to another CAD control by %s',
  async (kind) => {
    visibleButton('Finish sketch');
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    document.body.append(toolbar);
    const control = visibleButton('Corner rectangle');
    control.setAttribute('aria-haspopup', 'menu');
    toolbar.append(control);
    const other = visibleButton('Dimension');
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const h = createSemanticHighlighter(document);
    h.show('rectangle-dropdown');
    if (kind === 'click') other.click();
    else other.focus();
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    h.clear();
  },
);

// Reason diagnostics reuse the real resolver. Roles/geometry here are simulations.
describe('Rectangle SHOW rejection diagnostics', () => {
  it('distinguishes missing Sketch evidence from missing toolbar semantics', async () => {
    const group = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    const span = document.createElement('span');
    span.textContent = 'Corner rectangle';
    group.append(svg, span);
    document.body.append(group);
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    const result = recognizeSemanticTarget(document, 'rectangle-dropdown');
    expect(result.rectangleDiagnostic).toMatchObject({
      sketchContext: 'UNESTABLISHED',
      lookup: { reason: 'NO_TOOLBAR_SEMANTICS', toolbars: 0 },
      eligibility: { state: 'NOT_EVALUATED' },
    });
    expect(result.status).not.toBe('FOUND');
  });
  it('reports group lookup failure independently when Sketch context is observed', async () => {
    visibleButton('Finish sketch');
    const { recognizeSemanticTarget } = await import('./semanticTargets');
    expect(
      recognizeSemanticTarget(document, 'rectangle-dropdown')
        .rectangleDiagnostic,
    ).toMatchObject({
      sketchContext: 'OBSERVED',
      lookup: { reason: 'NO_TOOLBAR_SEMANTICS' },
      eligibility: { state: 'NOT_EVALUATED' },
    });
  });
  it.each(['missing-popup', 'hidden', 'disabled', 'duplicate', 'limit'])(
    'reports %s without conflating it with Sketch context',
    async (kind) => {
      visibleButton('Finish sketch');
      const toolbar = document.createElement('div');
      toolbar.setAttribute('role', 'toolbar');
      document.body.append(toolbar);
      const control = visibleButton('Corner rectangle');
      toolbar.append(control);
      control.setAttribute('aria-haspopup', 'menu');
      if (kind === 'missing-popup') control.removeAttribute('aria-haspopup');
      if (kind === 'hidden') control.hidden = true;
      if (kind === 'disabled') control.disabled = true;
      if (kind === 'duplicate') {
        const other = control.cloneNode(true) as HTMLElement;
        other.getBoundingClientRect = () => new DOMRect(120, 30, 80, 24);
        toolbar.append(other);
      }
      if (kind === 'limit')
        for (let i = 0; i < 129; i++) {
          const other = document.createElement('button');
          other.setAttribute('aria-haspopup', 'menu');
          toolbar.append(other);
        }
      const { recognizeSemanticTarget } = await import('./semanticTargets');
      const d = recognizeSemanticTarget(
        document,
        'rectangle-dropdown',
      ).rectangleDiagnostic!;
      expect(d).toBeDefined();
      expect(d.sketchContext).toBe('OBSERVED');
      if (kind === 'missing-popup')
        expect(d.lookup.reason).toBe('NO_POPUP_CONTROLS');
      if (kind === 'hidden')
        expect(d.eligibility.rejections).toContain('HIDDEN');
      if (kind === 'disabled')
        expect(d.eligibility.rejections).toContain('DISABLED');
      if (kind === 'duplicate') expect(d.eligibility.state).toBe('AMBIGUOUS');
      if (kind === 'limit') expect(d.lookup.state).toBe('INCOMPLETE');
    },
  );
});

it('retains both invalid-context and ancestry-limit reasons across separate candidates', async () => {
  visibleButton('Finish sketch');
  const toolbar = document.createElement('div');
  toolbar.setAttribute('role', 'toolbar');
  document.body.append(toolbar);
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  toolbar.append(dialog);
  const first = visibleButton('Corner rectangle');
  first.setAttribute('aria-haspopup', 'menu');
  dialog.append(first);
  let parent = toolbar;
  for (let i = 0; i < 20; i++) {
    const child = document.createElement('div');
    parent.append(child);
    parent = child;
  }
  const second = visibleButton('Center point rectangle');
  second.setAttribute('aria-haspopup', 'menu');
  parent.append(second);
  const { recognizeSemanticTarget } = await import('./semanticTargets');
  const d = recognizeSemanticTarget(
    document,
    'rectangle-dropdown',
  ).rectangleDiagnostic!;
  expect(d.eligibility.rejections).toEqual(
    expect.arrayContaining(['INVALID_CONTEXT', 'ANCESTOR_LIMIT']),
  );
});
