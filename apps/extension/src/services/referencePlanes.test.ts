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

afterEach(() => {
  document.body.replaceChildren();
  Reflect.deleteProperty(document, 'elementFromPoint');
});

describe('context-scoped reference-plane recognition', () => {
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
