import { afterEach, describe, expect, it } from 'vitest';
import { evaluateFoundationsSketchProgress } from './foundationsEvidence';

const editablePage = {
  supported: true,
  documentId: 'doc-1',
  workspaceId: 'workspace-1',
  elementId: 'part-1',
  modelType: 'workspace' as const,
  editable: true,
};

afterEach(() => document.body.replaceChildren());

function visibleControl(
  name: string,
  role: string,
  selected?: string,
): HTMLElement {
  const control = document.createElement('div');
  control.setAttribute('role', role);
  control.setAttribute('aria-label', name);
  if (selected !== undefined) control.setAttribute('aria-selected', selected);
  control.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
  document.body.append(control);
  return control;
}

describe('evaluateFoundationsSketchProgress', () => {
  it('does not treat sketch mode alone as proof that the Top plane was chosen', () => {
    visibleControl('Finish sketch', 'button');
    visibleControl('Top plane', 'option', 'false');

    expect(evaluateFoundationsSketchProgress(editablePage, document)).toBe(
      'UNKNOWN',
    );
  });

  it('confirms the step only when the Top plane is selected in editable sketch mode', () => {
    visibleControl('Top plane', 'option', 'true');
    visibleControl('Finish sketch', 'button');

    expect(evaluateFoundationsSketchProgress(editablePage, document)).toBe(
      'PASS',
    );
  });

  it('does not confirm progress on a read-only Onshape document', () => {
    visibleControl('Top plane', 'option', 'true');
    visibleControl('Finish sketch', 'button');

    expect(
      evaluateFoundationsSketchProgress(
        { ...editablePage, editable: false, workspaceId: null },
        document,
      ),
    ).toBe('UNKNOWN');
  });

  it('does not mistake a Top view control for the Top plane', () => {
    visibleControl('Top view', 'button', 'true');
    visibleControl('Finish sketch', 'button');

    expect(evaluateFoundationsSketchProgress(editablePage, document)).toBe(
      'UNKNOWN',
    );
  });
});
