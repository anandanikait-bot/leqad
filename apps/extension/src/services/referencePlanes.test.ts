import { afterEach, describe, expect, it } from 'vitest';
import {
  findSelectedSemanticTargets,
  isUsableSemanticTarget,
  recognizeSemanticTarget,
} from './semanticTargets';

// Controlled simulations, not captured or asserted Onshape DOM.
function referenceTree(name = 'Top', label = name) {
  const tree = document.createElement('div');
  tree.setAttribute('role', 'tree');
  tree.setAttribute('aria-label', 'Feature tree');
  const group = document.createElement('div');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Default geometry');
  const row = document.createElement('div');
  row.setAttribute('role', 'treeitem');
  row.setAttribute('aria-label', label);
  row.tabIndex = -1;
  const text = document.createElement('span');
  text.textContent = name;
  row.append(text);
  row.getBoundingClientRect = () => new DOMRect(20, 30, 180, 28);
  group.append(row);
  tree.append(group);
  document.body.append(tree);
  return { tree, group, row, text };
}

/**
 * Sanitized non-ARIA fixture, based on authenticated Onshape v3 observations:
 * a Top span nested in divs, a shared parent with six children, Default
 * geometry two sibling positions before Top, and an unlabeled sibling between.
 * Three empty placeholders preserve the observed count only; their contents
 * and positions were not captured and do not establish recognition context.
 * Front/Right use this shape only as simulated variants because their live
 * sibling relationships were not captured.
 */
function nonAriaFeatureList(
  plane: 'Top' | 'Front' | 'Right' = 'Top',
  options: { alternateOrder?: boolean; duplicates?: number; interveningText?: string } = {},
) {
  const common = document.createElement('div');
  common.getBoundingClientRect = () => new DOMRect(80, 40, 400, 156);

  const heading = document.createElement('div');
  const headingText = document.createElement('span');
  headingText.textContent = 'Default geometry';
  headingText.getBoundingClientRect = () => new DOMRect(92, 60, 120, 20);
  heading.append(headingText);
  heading.getBoundingClientRect = () => new DOMRect(88, 56, 136, 28);

  const spacer = document.createElement('div');
  // Onshape documents Origin between Default geometry and Top.
  // Leave the older empty-gap fixture as a controlled simulation.
  if (options.interveningText) spacer.textContent = options.interveningText;
  spacer.getBoundingClientRect = () =>
    options.interveningText
      ? new DOMRect(88, 84, 136, 16)
      : new DOMRect(88, 88, 8, 8);

  const rows: Array<{ row: HTMLDivElement; label: HTMLSpanElement }> = [];
  for (let index = 0; index < (options.duplicates ?? 1); index += 1) {
    const row = document.createElement('div');
    const outer = document.createElement('div');
    const inner = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = plane;
    const rowLeft = 96 + index * 100;
    label.getBoundingClientRect = () => new DOMRect(rowLeft + 12, 103, 40, 20);
    row.getBoundingClientRect = () => new DOMRect(rowLeft, 100, 64, 26);
    inner.append(label);
    outer.append(inner);
    row.append(outer);
    rows.push({ row, label });
  }

  // The default order mirrors the observed -2 / -1 / 0 sibling relationship.
  // The alternate order is deliberately simulated and proves that recognition
  // depends on shared structure, not a fixed offset or child count.
  if (options.alternateOrder) {
    common.append(heading, spacer, document.createElement('div'));
    for (const { row } of rows) common.append(row);
    for (let index = 0; index < 3; index += 1)
      common.append(document.createElement('div'));
  } else {
    common.append(heading, spacer, ...rows.map(({ row }) => row));
    for (let index = 0; index < 3; index += 1)
      common.append(document.createElement('div'));
  }
  document.body.append(common);
  return {
    common,
    heading,
    spacer,
    rows,
    row: rows[0]!.row,
    label: rows[0]!.label,
  };
}

afterEach(() => {
  document.body.replaceChildren();
  Reflect.deleteProperty(document, 'elementFromPoint');
});

describe('context-scoped reference-plane recognition', () => {
  it('recognizes the observed non-ARIA Top branch and highlights its measured row bounds', async () => {
    const { createSemanticHighlighter } = await import('./semanticTargets');
    const { common, row, label } = nonAriaFeatureList();
    const recognition = recognizeSemanticTarget(document, 'top-plane');

    expect(recognition).toMatchObject({
      status: 'FOUND',
      element: row,
      matchStrategy: 'STRUCTURAL_FEATURE_LIST',
      candidateCount: 1,
      enabled: 'UNKNOWN',
    });
    expect(recognition.explanation).toContain(
      'Click handling and selected state are unknown',
    );
    expect(recognition.element).not.toBe(label);
    expect(recognition.element).not.toBe(common);

    const highlighter = createSemanticHighlighter(document);
    highlighter.show('top-plane');
    const outline = document.querySelector<HTMLElement>(
      '[data-leqad-highlight="true"]',
    );
    expect(outline?.style.left).toBe('93px');
    expect(outline?.style.top).toBe('97px');
    expect(outline?.style.width).toBe('70px');
    expect(outline?.style.height).toBe('32px');
    expect(outline?.style.pointerEvents).toBe('none');
    highlighter.clear();
    expect(outline?.isConnected).toBe(false);
  });

  it.each(['Front', 'Right'] as const)(
    'recognizes a simulated %s row using the same structural adapter',
    (plane) => {
      const { row } = nonAriaFeatureList(plane, { alternateOrder: true });
      const id = `${plane.toLowerCase()}-plane` as
        'front-plane' | 'right-plane';
      expect(recognizeSemanticTarget(document, id)).toMatchObject({
        status: 'FOUND',
        element: row,
        matchStrategy: 'STRUCTURAL_FEATURE_LIST',
      });
    },
  );

  it('accepts the documented Origin row between Default geometry and Top', () => {
    const { row } = nonAriaFeatureList('Top', {
      interveningText: 'Origin',
    });
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'FOUND',
      element: row,
      matchStrategy: 'STRUCTURAL_FEATURE_LIST',
      enabled: 'UNKNOWN',
    });
  });

  it('rejects unrelated intervening text instead of guessing a plane row', () => {
    nonAriaFeatureList('Top', { interveningText: 'Unrelated feature' });
    expect(recognizeSemanticTarget(document, 'top-plane').status).toBe(
      'REJECTED',
    );
  });

  it('does not depend on the observed sibling offset or six-child count', () => {
    const { row, common } = nonAriaFeatureList('Top', {
      alternateOrder: true,
    });
    expect(common.children).toHaveLength(7);
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'FOUND',
      element: row,
    });
  });

  it('reports duplicate exact plane rows in one non-ARIA region as ambiguous', () => {
    nonAriaFeatureList('Top', { duplicates: 2 });
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'AMBIGUOUS',
      element: null,
      candidateCount: 2,
    });
  });

  it.each(['camera toolbar', 'viewport label', 'sketch dialog'] as const)(
    'rejects a non-ARIA Top decoy in a %s',
    (context) => {
      const { common } = nonAriaFeatureList();
      if (context === 'sketch dialog') {
        const dialog = document.createElement('div');
        dialog.setAttribute('role', 'dialog');
        dialog.append(common);
        document.body.append(dialog);
      } else {
        const container = document.createElement('div');
        if (context === 'camera toolbar') {
          container.setAttribute('role', 'toolbar');
          container.setAttribute('aria-label', 'View controls');
        } else {
          container.setAttribute('role', 'img');
          container.setAttribute('aria-label', 'Viewport');
        }
        container.append(common);
        document.body.append(container);
      }
      expect(recognizeSemanticTarget(document, 'top-plane').status).toBe(
        'REJECTED',
      );
    },
  );

  it('rejects an unrelated exact Top text span without the shared Default geometry sibling', () => {
    const viewport = document.createElement('div');
    viewport.setAttribute('role', 'img');
    const label = document.createElement('span');
    label.textContent = 'Top';
    viewport.append(label);
    document.body.append(viewport);
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'REJECTED',
      confidence: 'LOW',
      candidateCount: 1,
    });
  });

  it('rejects Default geometry and Top branches that only share a distant ancestor', () => {
    const { common, heading, row } = nonAriaFeatureList();
    const headingContainer = document.createElement('div');
    const rowContainer = document.createElement('div');
    headingContainer.append(heading);
    rowContainer.append(row);
    common.replaceChildren(headingContainer, rowContainer);
    expect(recognizeSemanticTarget(document, 'top-plane').status).toBe(
      'REJECTED',
    );
  });

  it('rejects a row whose measured bounds include the Default geometry sibling', () => {
    const { row, heading, common } = nonAriaFeatureList();
    row.getBoundingClientRect = () => new DOMRect(80, 40, 400, 156);
    expect(heading.getBoundingClientRect().top).toBeLessThan(
      row.getBoundingClientRect().bottom,
    );
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'REJECTED',
      confidence: 'LOW',
    });
    expect(common.getBoundingClientRect().height).toBe(156);
  });

  it('rejects hidden or collapsed non-ARIA reference rows', () => {
    const { row } = nonAriaFeatureList();
    row.parentElement!.hidden = true;
    expect(recognizeSemanticTarget(document, 'top-plane').status).toBe(
      'REJECTED',
    );
  });

  it('does not turn a structurally recognized row into selected-plane evidence', () => {
    const { row } = nonAriaFeatureList();
    row.setAttribute('aria-selected', 'true');
    expect(recognizeSemanticTarget(document, 'top-plane').element).toBe(row);
    expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([]);
  });

  it('reports conflicting visible Sketch dialog plane observations as unknown', async () => {
    const { observedSketchDialogPlane } = await import('./referencePlanes');
    for (const plane of ['Top', 'Front']) {
      const dialog = document.createElement('div');
      dialog.setAttribute('role', 'dialog');
      dialog.setAttribute('aria-label', 'Sketch 2');
      const field = document.createElement('span');
      field.setAttribute('aria-label', `Sketch plane: ${plane} plane`);
      for (const element of [dialog, field])
        element.getBoundingClientRect = () => new DOMRect(10, 20, 180, 28);
      dialog.append(field);
      document.body.append(dialog);
    }
    expect(observedSketchDialogPlane(document)).toBeNull();
  });
  it('deduplicates a nested interactive label into its enclosing feature row', () => {
    const { row } = referenceTree();
    const nested = document.createElement('button');
    nested.setAttribute('aria-label', 'Top');
    nested.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    row.append(nested);
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'FOUND',
      element: row,
      candidateCount: 1,
    });
  });
  it('prefers the usable contextual row over an unusable stronger long-label match', () => {
    const hidden = referenceTree('Top', 'Top plane');
    hidden.row.hidden = true;
    const valid = referenceTree();
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'FOUND',
      element: valid.row,
      candidateCount: 1,
    });
    expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([]);
  });
  it('observes a visible Sketch dialog label separately from selection and committed association', async () => {
    const { observeSketchGuidanceUi } = await import('./sketchGuidance');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    dialog.setAttribute('aria-label', 'Sketch 2');
    const field = document.createElement('span');
    field.setAttribute('aria-label', 'Sketch plane: Top plane');
    const finish = document.createElement('button');
    finish.setAttribute('aria-label', 'Finish sketch');
    for (const control of [dialog, field, finish])
      control.getBoundingClientRect = () => new DOMRect(10, 20, 180, 28);
    dialog.append(field, finish);
    document.body.append(dialog);
    expect(observeSketchGuidanceUi(document)).toEqual({
      editingAppearsActive: true,
      dialogPlane: 'Top',
    });
    expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([]);
    dialog.hidden = true;
    expect(observeSketchGuidanceUi(document)).toEqual({
      editingAppearsActive: false,
      dialogPlane: null,
    });
  });
  it.each(['Top', 'Front', 'Right'] as const)(
    'resolves %s to its actionable Default geometry row',
    (name) => {
      const { row } = referenceTree(name);
      const id = `${name.toLowerCase()}-plane` as
        'top-plane' | 'front-plane' | 'right-plane';
      expect(recognizeSemanticTarget(document, id)).toMatchObject({
        status: 'FOUND',
        element: row,
        matchStrategy: 'VALIDATED_CONTEXT',
        candidateCount: 1,
      });
      expect(isUsableSemanticTarget(row, id)).toBe(true);
    },
  );

  it('deduplicates a nested icon, text label, and row into one actionable target', () => {
    const { row, text } = referenceTree();
    text.setAttribute('aria-label', 'Top');
    const icon = document.createElement('span');
    icon.setAttribute('aria-label', 'Top');
    row.prepend(icon);
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'FOUND',
      element: row,
      candidateCount: 1,
    });
  });

  it.each(['view', 'viewport', 'dialog', 'unrelated'] as const)(
    'rejects a %s decoy even with an exact Top plane accessible name',
    (context) => {
      const container = document.createElement(
        context === 'viewport' ? 'svg' : 'div',
      );
      if (context === 'view') {
        container.setAttribute('role', 'toolbar');
        container.setAttribute('aria-label', 'View controls');
      }
      if (context === 'dialog') {
        container.setAttribute('role', 'dialog');
        container.setAttribute('aria-label', 'Sketch');
      }
      const decoy = document.createElement('button');
      decoy.setAttribute('aria-label', 'Top plane');
      decoy.textContent = 'Top';
      decoy.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
      container.append(decoy);
      document.body.append(container);
      expect(recognizeSemanticTarget(document, 'top-plane').status).not.toBe(
        'FOUND',
      );
      expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([]);
      expect(isUsableSemanticTarget(decoy, 'top-plane')).toBe(false);
      const { row } = referenceTree();
      expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
        status: 'FOUND',
        element: row,
        candidateCount: 1,
      });
    },
  );

  it('reports genuinely distinct reference rows as ambiguous', () => {
    referenceTree();
    referenceTree();
    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'AMBIGUOUS',
      element: null,
      candidateCount: 2,
    });
  });

  it('refuses a Top row outside a named Default geometry context', () => {
    const { group, row } = referenceTree();
    group.removeAttribute('aria-label');
    expect(recognizeSemanticTarget(document, 'top-plane').status).not.toBe(
      'FOUND',
    );
    expect(isUsableSemanticTarget(row, 'top-plane')).toBe(false);
  });

  it('does not promote a non-ARIA Top label without a validated feature row', () => {
    const shell = document.createElement('div');
    const group = document.createElement('div');
    const nestedRow = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = 'Top';
    nestedRow.append(label);
    group.append(nestedRow);
    shell.append(group);
    document.body.append(shell);

    expect(recognizeSemanticTarget(document, 'top-plane')).toMatchObject({
      status: 'REJECTED',
      element: label,
      confidence: 'LOW',
      candidateCount: 1,
    });
    expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([]);
  });

  it.each([
    'collapsed',
    'hidden',
    'disabled',
    'clipped',
    'offscreen',
    'owned',
    'obscured',
  ] as const)(
    'rejects a %s row and exposes no selected-plane evidence',
    (state) => {
      const { tree, group, row } = referenceTree();
      row.setAttribute('aria-selected', 'true');
      if (state === 'collapsed') group.setAttribute('aria-expanded', 'false');
      if (state === 'hidden') group.hidden = true;
      if (state === 'disabled') group.setAttribute('aria-disabled', 'true');
      if (state === 'clipped')
        row.getBoundingClientRect = () => new DOMRect(-10, 20, 80, 24);
      if (state === 'offscreen')
        row.getBoundingClientRect = () => new DOMRect(-100, 20, 80, 24);
      if (state === 'owned') tree.dataset.leqadRoot = 'true';
      if (state === 'obscured')
        Object.defineProperty(document, 'elementFromPoint', {
          configurable: true,
          value: () => document.body,
        });
      expect(recognizeSemanticTarget(document, 'top-plane').status).toBe(
        'REJECTED',
      );
      expect(isUsableSemanticTarget(row, 'top-plane')).toBe(false);
      expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([]);
    },
  );

  it('keeps recognition and independent current selection separate', () => {
    const { row } = referenceTree();
    expect(recognizeSemanticTarget(document, 'top-plane').element).toBe(row);
    expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([]);
    row.setAttribute('aria-selected', 'true');
    expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([row]);
    row.setAttribute('aria-selected', 'false');
    expect(findSelectedSemanticTargets(document, 'top-plane')).toEqual([]);
  });
});
