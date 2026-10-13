import { afterEach, describe, expect, it } from 'vitest';
import type { OnshapePageContext } from './onshapePage';
import {
  evaluateFoundationsPlaneProgress,
  evaluateFoundationsSketchObservation,
  evaluateFoundationsSketchProgress,
  observeFoundationsSketchUi,
} from './foundationsEvidence';

const editablePage: OnshapePageContext = {
  supported: true,
  documentId: 'doc-1',
  workspaceId: 'workspace-1',
  versionId: null,
  microversionId: null,
  elementId: 'part-1',
  modelType: 'workspace',
  editability: 'editable',
  elementType: 'part-studio',
  capabilitySource: 'UI',
  capabilityObservedAt: '2026-10-13T12:00:00.000Z',
};
const observedAt = new Date('2026-10-13T12:00:00.000Z');

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

function evaluateNow(page: OnshapePageContext = editablePage) {
  return evaluateFoundationsSketchProgress(page, document, observedAt);
}

describe('Foundations sketch UI observations', () => {
  it('verifies Top-plane selection without implying that sketch editing started', () => {
    visibleControl('Top plane', 'option', 'true');

    const decision = evaluateFoundationsPlaneProgress(
      editablePage,
      document,
      observedAt,
    );

    expect(decision.status).toBe('PASS');
    expect(decision.observedFact).toMatchObject({
      topPlaneSelected: true,
      sketchEditingAppearsActive: false,
    });
    expect(decision.explanation).toContain(
      'does not claim that sketch editing has started',
    );
  });

  it('keeps Top plane visible but unselected distinct from selected state', () => {
    visibleControl('Top plane', 'option', 'false');
    visibleControl('Finish sketch', 'button');

    const decision = evaluateNow();

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.observedFact).toMatchObject({
      topPlaneControlCount: 1,
      topPlaneSelected: false,
      sketchEditingAppearsActive: true,
    });
    expect(decision.missingRequirements).toContain(
      'A selected Top plane control',
    );
  });

  it('does not confuse a selected plane with active sketch editing', () => {
    visibleControl('Top plane', 'option', 'true');

    const decision = evaluateNow();

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.observedFact).toMatchObject({
      topPlaneSelected: true,
      sketchEditingAppearsActive: false,
    });
    expect(decision.missingRequirements).toContain(
      'Recognized active sketch-editing controls',
    );
  });

  it('does not accept sketch mode with a different selected plane', () => {
    visibleControl('Top plane', 'option', 'false');
    visibleControl('Front plane', 'option', 'true');
    visibleControl('Finish sketch', 'button');

    const decision = evaluateNow();

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.observedFact).toMatchObject({
      selectedOtherPlanes: ['front-plane'],
      sketchEditingAppearsActive: true,
    });
  });

  it('rejects an expired selected-plane observation', () => {
    visibleControl('Top plane', 'option', 'true');
    visibleControl('Finish sketch', 'button');
    const observation = observeFoundationsSketchUi(
      editablePage,
      document,
      observedAt,
    );

    const decision = evaluateFoundationsSketchObservation(
      editablePage,
      observation,
      new Date('2026-10-13T12:00:06.000Z'),
    );

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.missingRequirements).toContain('Current UI evidence');
  });

  it('reports a contradictory different visible plane selection', () => {
    visibleControl('Top plane', 'option', 'true');
    visibleControl('Right plane', 'option', 'true');
    visibleControl('Finish sketch', 'button');

    const decision = evaluateNow();

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.missingRequirements).toContain(
      'No contradictory selected reference plane',
    );
  });

  it('does not mistake Top view for Top plane', () => {
    visibleControl('Top view', 'button', 'true');
    visibleControl('Finish sketch', 'button');

    const decision = evaluateNow();

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.observedFact).toMatchObject({ topPlaneControlCount: 0 });
  });

  it('keeps multiple similar Top plane controls ambiguous', () => {
    visibleControl('Top plane', 'option', 'true');
    visibleControl('Top plane', 'option', 'false');
    visibleControl('Finish sketch', 'button');

    const decision = evaluateNow();

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.missingRequirements).toContain(
      'One unambiguous Top plane control',
    );
  });

  it.each(['disabled', 'hidden'] as const)(
    'ignores a %s Top plane control',
    (state) => {
      const control = visibleControl('Top plane', 'button', 'true');
      if (state === 'disabled') control.setAttribute('aria-disabled', 'true');
      else control.hidden = true;
      visibleControl('Finish sketch', 'button');

      expect(evaluateNow().status).toBe('UNKNOWN');
    },
  );

  it('rejects an observation from a different document context', () => {
    visibleControl('Top plane', 'option', 'true');
    visibleControl('Finish sketch', 'button');
    const observation = observeFoundationsSketchUi(
      editablePage,
      document,
      observedAt,
    );

    const decision = evaluateFoundationsSketchObservation(
      { ...editablePage, documentId: 'doc-2' },
      observation,
      observedAt,
    );

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.missingRequirements).toContain(
      'UI evidence for the active document context',
    );
  });

  it('keeps missing UI evidence unknown', () => {
    const decision = evaluateNow();

    expect(decision.status).toBe('UNKNOWN');
    expect(decision.evidenceLevel).toBe('UNKNOWN');
    expect(decision.missingRequirements).not.toHaveLength(0);
  });

  it('passes only the supported UI state without claiming model facts', () => {
    visibleControl('Top plane', 'option', 'true');
    visibleControl('Finish sketch', 'button');

    const decision = evaluateNow();

    expect(decision).toMatchObject({
      status: 'PASS',
      evidenceLevel: 'UI_CONFIRMED',
      identity: {
        documentId: 'doc-1',
        workspaceId: 'workspace-1',
        elementId: 'part-1',
        revision: null,
      },
      observedFact: {
        topPlaneControlCount: 1,
        topPlaneSelected: true,
        sketchEditingAppearsActive: true,
        activeSketchPlaneAssociation: 'unknown',
        sketchGeometry: 'unknown',
        committedSketch: 'unknown',
      },
    });
    expect(decision.explanation).toContain(
      'does not verify the active sketch plane association',
    );
  });

  it('requires confirmed editable Part Studio capability', () => {
    visibleControl('Top plane', 'option', 'true');
    visibleControl('Finish sketch', 'button');

    expect(
      evaluateNow({ ...editablePage, editability: 'unknown' }).status,
    ).toBe('UNKNOWN');
    expect(
      evaluateNow({ ...editablePage, elementType: 'unknown' }).status,
    ).toBe('UNKNOWN');
  });
});
