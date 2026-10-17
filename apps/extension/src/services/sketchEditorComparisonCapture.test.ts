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
  it('discovers a dialog and a non-ARIA cluster after over 6000 unrelated elements', () => {
    const noise = document.createElement('section');
    noise.innerHTML = '<div></div>'.repeat(6500);
    document.body.append(noise);
    simulatedDialog();
    const cluster = document.createElement('section');
    cluster.innerHTML =
      '<div><svg></svg><span>Dimension</span></div><div><svg></svg></div><div><svg></svg></div>';
    visible(cluster);
    document.body.append(cluster);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(snapshot.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Sketch plane', inDialog: true }),
        expect.objectContaining({ label: 'Dimension', inToolbar: false }),
      ]),
    );
    expect(snapshot.candidateRegions).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'DIALOG_CANDIDATE' }),
        expect.objectContaining({ kind: 'STRUCTURAL_CLUSTER' }),
      ]),
    );
    expect(snapshot.discovery.scannedElements).toBeLessThanOrEqual(6000);
    expect(snapshot.incomplete).toBe(true);
    expect(snapshot.activeSketchState).toBe('UNKNOWN');
  });

  it('keeps unnamed late dialog controls and multiple candidates without asserting identity', () => {
    document.body.innerHTML = '<div></div>'.repeat(6100);
    for (let i = 0; i < 2; i++) {
      const dialog = simulatedDialog();
      dialog.querySelector('span')!.remove();
    }
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(
      snapshot.candidateRegions.filter((r) => r.kind === 'DIALOG_CANDIDATE'),
    ).toHaveLength(2);
    expect(
      snapshot.observations.some((o) => o.kind === 'SVG_STRUCTURE_ONLY'),
    ).toBe(true);
    expect(snapshot.limitations).toContain('MULTIPLE_CANDIDATE_REGIONS');
    expect(snapshot.productionRecognition).toBe('NOT_RUN');
  });

  it('preserves privacy when targeted queries bypass editable or Leqad ancestors', () => {
    document.body.innerHTML =
      '<section contenteditable="true"><div role="dialog"><span>Sketch</span><svg></svg></div></section><section data-leqad-root><div role="toolbar"><button aria-label="Extrude"></button></div></section><section><button aria-label="private-name">Finish Sketch</button></section>';
    visible(document.body);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(snapshot.observations.every((o) => o.label === null)).toBe(true);
    expect(snapshot.candidateRegions).toEqual([]);
    expect(JSON.stringify(snapshot)).not.toContain('private-name');
  });

  it('reports partial discovery instead of claiming absence after candidate or local bounds', () => {
    for (let i = 0; i < 40; i++) simulatedDialog();
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(
      snapshot.discovery.targeted.sources.some((s) => s.candidateLimitReached),
    ).toBe(true);
    expect(
      snapshot.discovery.targeted.sources.some((s) => s.rootLimitReached),
    ).toBe(true);
    expect(snapshot.discovery.scannedElements).toBeLessThanOrEqual(6000);
    expect(snapshot.discovery.targeted.nativeQueryWork).toBe(
      'NOT_HARD_BOUNDED',
    );
    expect(snapshot.incomplete).toBe(true);
    expect(JSON.stringify(snapshot).length).toBeLessThanOrEqual(12000);

    document.body.replaceChildren();
    const dialog = simulatedDialog();
    dialog.prepend(document.createElement('section'));
    dialog.firstElementChild!.innerHTML = '<div></div>'.repeat(200);
    expect(
      captureSketchEditorSnapshot(document, 'SKETCH').discovery.targeted
        .localNodeLimitReached,
    ).toBe(true);
  });

  it('does not traverse a shadow root or equate unvisited controls with absence', () => {
    const host = document.createElement('div');
    document.body.append(host);
    host.attachShadow({ mode: 'open' }).innerHTML =
      '<div role="dialog"><button aria-label="Finish Sketch"></button></div>';
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(snapshot.observations).toEqual([]);
    expect(snapshot.limitations).toContain('SHADOW_DOM_NOT_TRAVERSED');
    expect(snapshot.discovery.openShadowBoundariesObserved).toBe(1);
    expect(snapshot.incomplete).toBe(true);
    expect(snapshot.discovery.targeted.coverage).toBe('PARTIAL_LIGHT_DOM_ONLY');
    expect(snapshot.activeSketchState).toBe('UNKNOWN');
  });

  it('retains a genuinely deep dialog with conservative visibility and ancestry', () => {
    let parent = document.body;
    for (let i = 0; i < 40; i++) {
      const next = document.createElement('div');
      parent.append(next);
      parent = next;
    }
    const dialog = simulatedDialog();
    parent.append(dialog);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(snapshot.observations).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: 'Sketch plane',
          visibility: 'UNKNOWN',
          ancestryTruncated: true,
        }),
      ]),
    );
    expect(snapshot.discovery.depthLimitReached).toBe(true);
  });

  it('captures a late hidden dialog, then re-reads replacement and removed targets', () => {
    const noise = document.createElement('section');
    noise.innerHTML = '<div></div>'.repeat(6100);
    document.body.append(noise);
    const dialog = simulatedDialog();
    dialog.hidden = true;
    expect(
      captureSketchEditorSnapshot(document, 'SKETCH').candidateRegions,
    ).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          kind: 'DIALOG_CANDIDATE',
          visibility: 'HIDDEN',
        }),
      ]),
    );
    // Late discovery is asserted above and in dedicated adversarial tests.
    // Subsequent snapshots test lifecycle invalidation; repeating the large
    // prefix for these adds jsdom work without another distinct assertion.
    noise.remove();
    dialog.remove();
    const replacement = simulatedDialog();
    replacement.querySelector('span')!.textContent = 'Extrude';
    const snapshot = captureSketchEditorSnapshot(document, 'EXTRUDE');
    expect(snapshot.observations.some((o) => o.label === 'Sketch plane')).toBe(
      false,
    );
    expect(snapshot.observations.some((o) => o.label === 'Extrude')).toBe(true);
    replacement.remove();
    expect(
      captureSketchEditorSnapshot(document, 'EXTRUDE').candidateRegions,
    ).toEqual([]);
  });

  it('invalidates observations when DOM changes during inspection and allows a fresh retry', () => {
    const dialog = simulatedDialog();
    let changed = false;
    dialog.getBoundingClientRect = () => {
      if (!changed) {
        changed = true;
        dialog.querySelector('span')!.textContent = 'Extrude';
      }
      return new DOMRect(10, 10, 60, 24);
    };
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(snapshot.discovery.domChangedDuringInspection).toBe(true);
    expect(snapshot.incomplete).toBe(true);
    expect(snapshot.observations).toEqual([]);
    expect(snapshot.candidateRegions).toEqual([]);
    expect(snapshot.limitations).toContain(
      'DOM_CHANGED_DURING_INSPECTION_RETRY',
    );
    const retry = captureSketchEditorSnapshot(document, 'EXTRUDE');
    expect(retry.discovery.domChangedDuringInspection).toBe(false);
    expect(retry.observations.some((o) => o.label === 'Extrude')).toBe(true);
  });

  it('retains an exact named anchor even when its surrounding region exhausts its local budget', () => {
    const group = document.createElement('section');
    group.innerHTML =
      '<div>' +
      '<div></div>'.repeat(6500) +
      '</div><button aria-label="Finish Sketch"></button>';
    visible(group);
    document.body.append(group);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(snapshot.observations.some((o) => o.label === 'Finish Sketch')).toBe(
      true,
    );
    expect(snapshot.discovery.targeted.localNodeLimitReached).toBe(true);
    expect(snapshot.incomplete).toBe(true);
  });

  it('samples beyond an early icon-heavy region instead of spending all SVG discovery on it', () => {
    const early = document.createElement('section');
    early.innerHTML =
      '<div><svg></svg></div>'.repeat(32) + '<div></div>'.repeat(6500);
    document.body.append(early);
    const late = document.createElement('section');
    late.innerHTML =
      '<div><svg></svg><span>Dimension</span></div><div><svg></svg></div><div><svg></svg></div>';
    visible(late);
    document.body.append(late);
    const snapshot = captureSketchEditorSnapshot(document, 'SKETCH');
    expect(snapshot.observations.some((o) => o.label === 'Dimension')).toBe(
      true,
    );
    expect(
      snapshot.discovery.targeted.sources.find(
        (s) => s.source === 'SVG_STRUCTURE',
      )?.candidateLimitReached,
    ).toBe(true);
    expect(snapshot.discovery.scannedElements).toBeLessThanOrEqual(6000);
    expect(snapshot.incomplete).toBe(true);
  });

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
