import { afterEach, describe, expect, it } from 'vitest';
import {
  captureSketchEditorSnapshot,
  compareSketchEditorSnapshots,
} from './sketchEditorComparisonCapture';

// Every DOM below is a SIMULATED fixture. It does not establish Onshape behavior.
function visible(element: Element) {
  element.getBoundingClientRect = () => new DOMRect(10, 10, 60, 24);
  for (const child of element.children) visible(child);
  return element;
}

function simulatedDialog() {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  dialog.innerHTML =
    '<div><svg></svg><span>Sketch plane</span></div><div><svg></svg></div><div><svg></svg></div>';
  visible(dialog);
  document.body.append(dialog);
  return dialog;
}

afterEach(() => document.body.replaceChildren());

describe('paired editor comparison capture', () => {
  it('captures read-only Sketch and other-editor snapshots and compares allowlisted signals', () => {
    const toolbar = document.createElement('div');
    toolbar.innerHTML =
      '<div><svg></svg><span>Sketch</span></div><button aria-label="Finish Sketch"></button><button aria-label="Cancel"></button>';
    visible(toolbar);
    document.body.append(toolbar);
    const stateA = captureSketchEditorSnapshot(document, 'SKETCH');

    toolbar.querySelector('span')!.textContent = 'Extrude';
    toolbar.querySelector('button')!.setAttribute('aria-label', 'Sketch');
    const stateB = captureSketchEditorSnapshot(
      document,
      'OTHER_FEATURE_EDITOR',
    );
    const comparison = compareSketchEditorSnapshots(stateA, stateB);

    expect(comparison).toMatchObject({
      version: 'leqad-sketch-editor-comparison/1',
      activeSketchState: 'UNKNOWN',
      productionRecognition: 'NOT_RUN',
      permissionEvidence: 'NOT_INSPECTED',
      reviewPolicy: {
        signalLocation: 'ALLOWLISTED_LABELS_AND_BOUNDED_STRUCTURE_PATHS',
        editableOrUserContentDependence: 'UNKNOWN_NOT_INSPECTED',
        uniqueness: 'NOT_ESTABLISHED_BY_THIS_PAIR',
        controlOwnership: 'NOT_ESTABLISHED',
        revocationWhenEditingEnds: 'NOT_TESTED',
      },
    });
    expect(comparison.signals.stateAOnly.length).toBeGreaterThan(0);
    expect(comparison.signals.stateBOnly.length).toBeGreaterThan(0);
    expect(JSON.stringify(comparison)).not.toContain('document');
  });

  it('captures non-ARIA control clusters without claiming a toolbar or a Sketch discriminator', () => {
    const group = document.createElement('div');
    group.innerHTML =
      '<div><svg></svg><span>Dimension</span></div><div><svg></svg></div><div><svg></svg></div>';
    visible(group);
    document.body.append(group);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');

    expect(snapshot.discovery).toMatchObject({
      semanticToolbarCount: 0,
      candidateRegionCount: expect.any(Number),
    });
    expect(snapshot.activeSketchState).toBe('UNKNOWN');
    expect(snapshot.observations[0]).toMatchObject({
      label: 'Dimension',
      tag: 'span',
      role: 'none',
    });
  });

  it('keeps enabled state unknown for static and nonsemantic controls without native evidence', () => {
    const label = document.createElement('span');
    label.textContent = 'Sketch';
    const customControl = document.createElement('div');
    customControl.setAttribute('role', 'button');
    customControl.setAttribute('tabindex', '0');
    customControl.setAttribute('aria-label', 'Extrude');
    const nativeButton = document.createElement('button');
    nativeButton.setAttribute('aria-label', 'Finish Sketch');
    const disabledButton = document.createElement('button');
    disabledButton.setAttribute('aria-label', 'Sketch');
    disabledButton.disabled = true;
    for (const element of [label, customControl, nativeButton, disabledButton])
      visible(element);
    document.body.append(label, customControl, nativeButton, disabledButton);

    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    const observation = (label: string, tag: string) =>
      snapshot.observations.find(
        (item) => item.label === label && item.tag === tag,
      );
    expect(observation('Sketch', 'span')?.enabled).toBe('UNKNOWN');
    expect(observation('Extrude', 'div')?.enabled).toBe('UNKNOWN');
    expect(observation('Finish Sketch', 'button')?.enabled).toBe('ENABLED');
    expect(observation('Sketch', 'button')?.enabled).toBe('DISABLED');
  });

  it('re-reads replacement DOM for each snapshot without mutating the page', () => {
    const sketchRegion = document.createElement('section');
    sketchRegion.innerHTML = '<div><svg></svg><span>Sketch</span></div>';
    visible(sketchRegion);
    document.body.append(sketchRegion);
    const stateA = captureSketchEditorSnapshot(document, 'SKETCH');

    const extrudeRegion = document.createElement('section');
    extrudeRegion.innerHTML =
      '<button aria-label="Extrude"><svg></svg></button>';
    visible(extrudeRegion);
    sketchRegion.replaceWith(extrudeRegion);
    const beforeB = document.body.innerHTML;
    const stateB = captureSketchEditorSnapshot(document, 'EXTRUDE');

    expect(document.body.innerHTML).toBe(beforeB);
    expect(stateA.observations).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Sketch' })]),
    );
    expect(stateB.observations).toEqual(
      expect.arrayContaining([expect.objectContaining({ label: 'Extrude' })]),
    );
    expect(
      stateB.observations.some((observation) => observation.label === 'Sketch'),
    ).toBe(false);
    expect(stateA.activeSketchState).toBe('UNKNOWN');
    expect(stateB.activeSketchState).toBe('UNKNOWN');
  });

  it('treats a generic three-control dialog as shared structural evidence', () => {
    simulatedDialog();
    const sketch = captureSketchEditorSnapshot(document, 'SKETCH');
    document.body.replaceChildren();
    simulatedDialog();
    const other = captureSketchEditorSnapshot(document, 'OTHER_FEATURE_EDITOR');
    const comparison = compareSketchEditorSnapshots(sketch, other);

    expect(comparison.signals.stateAOnly).toEqual([]);
    expect(comparison.signals.stateBOnly).toEqual([]);
    expect(comparison.signals.shared.length).toBeGreaterThan(0);
    expect(comparison.signals.unavailableOrAmbiguous).toContain(
      'STATE_A_DIALOG_IDENTITY_NOT_ESTABLISHED',
    );
  });

  it('does not treat Sketch-like text in an unrelated dialog as active Sketch', () => {
    simulatedDialog().querySelector('span')!.textContent = 'Sketch';
    const snapshot = captureSketchEditorSnapshot(
      document,
      'OTHER_FEATURE_EDITOR',
    );

    expect(snapshot.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Sketch', inDialog: true }),
      ]),
    );
    expect(snapshot).toMatchObject({
      ownerReportedState: 'OTHER_FEATURE_EDITOR',
      activeSketchState: 'UNKNOWN',
      productionRecognition: 'NOT_RUN',
    });
    expect(snapshot.limitations).toContain(
      'EDITOR_STATE_IS_OWNER_REPORTED_ONLY',
    );
  });

  it('never exports editable, numbered, unsupported, or private labels', () => {
    const dialog = simulatedDialog();
    const editable = document.createElement('input');
    editable.setAttribute('aria-label', 'Sketch 14 private-feature');
    const numbered = document.createElement('span');
    numbered.textContent = 'Sketch 14';
    Object.defineProperty(editable, 'value', {
      get() {
        throw new Error('editable value must not be read');
      },
    });
    const privateHeading = document.createElement('h2');
    privateHeading.textContent = 'private-document-name';
    privateHeading.id = 'private-document-id';
    privateHeading.className = 'private-dom-class';
    privateHeading.title = 'https://private.invalid/secret';
    dialog.append(editable, numbered, privateHeading);
    const report = JSON.stringify(
      captureSketchEditorSnapshot(document, 'SKETCH'),
    );

    expect(report).not.toContain('Sketch 14');
    expect(report).not.toContain('private-feature');
    expect(report).not.toContain('private-document-name');
    expect(report).not.toContain('private-document-id');
    expect(report).not.toContain('private-dom-class');
    expect(report).not.toContain('private.invalid');
    expect(report).not.toContain('<div');
  });

  it('does not fall back from an explicit unsupported accessible name to visible text', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', 'private command name');
    button.textContent = 'Sketch';
    visible(button);
    document.body.append(button);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');

    expect(snapshot.observations).toEqual([
      expect.objectContaining({
        label: null,
        nameStatus: 'UNLISTED',
        source: 'ARIA_LABEL',
      }),
    ]);
    expect(
      snapshot.observations.some(
        (observation) => observation.label === 'Sketch',
      ),
    ).toBe(false);
    expect(JSON.stringify(snapshot)).not.toContain('private command name');
    expect(snapshot.discovery.unlistedNameCount).toBeGreaterThan(0);
  });

  it('preserves unresolved accessible-name references without reading or exporting their targets', () => {
    const privateName = document.createElement('span');
    privateName.id = 'private-name-target';
    privateName.textContent = 'Sketch';
    const button = document.createElement('button');
    button.setAttribute('aria-labelledby', privateName.id);
    button.textContent = 'Sketch';
    visible(privateName);
    visible(button);
    document.body.append(privateName, button);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');

    expect(snapshot.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Sketch', source: 'TEXT' }),
        expect.objectContaining({
          label: null,
          source: 'ARIA_LABELLED_BY',
          nameStatus: 'REFERENCED_NAME_NOT_RESOLVED',
        }),
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toContain('private-name-target');
  });

  it('preserves hidden or stale controls as hidden and never labels them current', () => {
    const button = document.createElement('button');
    button.setAttribute('aria-label', 'Finish Sketch');
    button.hidden = true;
    visible(button);
    document.body.append(button);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');

    expect(snapshot.observations).toEqual([
      expect.objectContaining({ label: 'Finish Sketch', visibility: 'HIDDEN' }),
    ]);
    expect(snapshot.activeSketchState).toBe('UNKNOWN');
  });

  it('compares visibility changes for exact labels and unlabeled structural controls', () => {
    const region = document.createElement('div');
    region.innerHTML =
      '<div><svg></svg><span>Sketch</span></div><button aria-label="Finish Sketch"></button>';
    visible(region);
    document.body.append(region);
    const stateA = captureSketchEditorSnapshot(document, 'SKETCH');
    region.hidden = true;
    const stateB = captureSketchEditorSnapshot(
      document,
      'OTHER_FEATURE_EDITOR',
    );
    const comparison = compareSketchEditorSnapshots(stateA, stateB);

    expect(comparison.signals.visibilityChanges).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          signal: expect.stringContaining('Finish Sketch'),
          stateA: ['VISIBLE'],
          stateB: ['HIDDEN'],
        }),
      ]),
    );
    expect(comparison.signals.visibilityChanges.length).toBeGreaterThan(0);
  });

  it('retains multiple possible tool regions as ambiguity rather than selecting one', () => {
    for (const name of ['Sketch', 'Extrude']) {
      const region = document.createElement('section');
      region.innerHTML = `<div><svg></svg><span>${name}</span></div><div><svg></svg></div><div><svg></svg></div>`;
      visible(region);
      document.body.append(region);
    }
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');

    expect(snapshot.discovery.candidateRegionCount).toBeGreaterThan(1);
    expect(snapshot.incomplete).toBe(true);
    expect(snapshot.discovery.regionStatus).toBe('INCOMPLETE');
    const other = captureSketchEditorSnapshot(document, 'OTHER_FEATURE_EDITOR');
    const comparison = compareSketchEditorSnapshots(snapshot, other);
    expect(comparison.signals.unavailableOrAmbiguous).toContain(
      'STATE_A_MULTIPLE_CANDIDATE_REGIONS',
    );
  });

  it('bounds traversal and serialized output while preserving incomplete status', () => {
    const inBoundRoot = document.createElement('div');
    let inBoundParent = inBoundRoot;
    for (let i = 0; i < 18; i++) {
      const next = document.createElement('div');
      inBoundParent.append(next);
      inBoundParent = next;
    }
    const deepSketchLabel = document.createElement('span');
    deepSketchLabel.textContent = 'Sketch';
    inBoundParent.append(deepSketchLabel);
    visible(inBoundRoot);
    document.body.append(inBoundRoot);

    const wrapper = document.createElement('div');
    let parent = wrapper;
    for (let i = 0; i < 64; i++) {
      const next = document.createElement('div');
      parent.append(next);
      parent = next;
    }
    const privateNode = document.createComment('private-deep-value');
    parent.append(privateNode);
    visible(wrapper);
    document.body.append(wrapper);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');

    expect(snapshot.incomplete).toBe(true);
    expect(snapshot.discovery.depthLimitReached).toBe(true);
    expect(snapshot.discovery.maxDepthObserved).toBeGreaterThan(0);
    expect(snapshot.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Sketch',
          visibility: 'UNKNOWN',
          ancestryTruncated: true,
        }),
      ]),
    );
    expect(JSON.stringify(snapshot).length).toBeLessThanOrEqual(12_000);
    expect(JSON.stringify(snapshot)).not.toContain('private-deep-value');
  });

  it('does not infer permission, verify geometry, or interact with CAD controls', () => {
    const control = document.createElement('button');
    control.setAttribute('aria-label', 'Finish Sketch');
    visible(control);
    let clicks = 0;
    control.addEventListener('click', () => clicks++);
    document.body.append(control);
    const before = document.body.innerHTML;
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(document.body.innerHTML).toBe(before);
    expect(clicks).toBe(0);
    expect(snapshot).toMatchObject({
      activeSketchState: 'UNKNOWN',
      permissionEvidence: 'NOT_INSPECTED',
      lessonProgression: 'NOT_TOUCHED',
      geometryVerification: 'NOT_RUN',
    });
  });

  it('reports read-only/version labels without treating them as editor permission evidence', () => {
    const status = document.createElement('div');
    status.setAttribute('role', 'status');
    status.textContent = 'Version 23';
    visible(status);
    document.body.append(status);
    const snapshot = captureSketchEditorSnapshot(
      document,
      'OTHER_FEATURE_EDITOR',
    );

    expect(snapshot.permissionEvidence).toBe('NOT_INSPECTED');
    expect(JSON.stringify(snapshot)).not.toContain('Version 23');
    expect(JSON.stringify(snapshot)).not.toContain('workspace');
  });
});
