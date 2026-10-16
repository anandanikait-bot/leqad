import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => document.body.replaceChildren());

describe('Sketch guidance observation monitor', () => {
  it('keeps unsupported nonsemantic Sketch UI UNKNOWN instead of claiming CLOSED', async () => {
    // Simulation: v3 established only div/svg/span paths and variant labels.
    // The Finish label below is hypothetical; it is not observed Onshape evidence.
    document.body.innerHTML =
      '<div><svg><path></path></svg><span>Corner rectangle</span></div><div><span>Finish sketch</span></div>';
    const { observeSketchGuidanceUi } = await import('./sketchGuidance');
    expect(observeSketchGuidanceUi(document)).toMatchObject({
      editingAppearsActive: false,
      uiState: 'UNKNOWN',
    });
  });

  it('returns UNKNOWN outside Sketch and OPEN only for existing supported UI evidence', async () => {
    const { observeSketchGuidanceUi } = await import('./sketchGuidance');
    expect(observeSketchGuidanceUi(document)).toMatchObject({
      uiState: 'UNKNOWN',
    });
    const finish = document.createElement('button');
    finish.setAttribute('aria-label', 'Finish sketch');
    finish.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(finish);
    expect(observeSketchGuidanceUi(document)).toMatchObject({
      uiState: 'OPEN',
    });
    finish.hidden = true;
    expect(observeSketchGuidanceUi(document)).toMatchObject({
      uiState: 'UNKNOWN',
    });
  });

  it('revokes active Sketch guidance when the command naming reference changes', async () => {
    const label = document.createElement('span');
    label.id = 'finish-label';
    label.textContent = 'Finish Sketch';
    const command = document.createElement('button');
    command.setAttribute('aria-labelledby', label.id);
    command.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(label, command);
    const { createSketchGuidanceMonitor } = await import('./sketchGuidance');
    const monitor = createSketchGuidanceMonitor(document);
    try {
      expect(monitor.current.editingAppearsActive).toBe(true);
      label.id = 'renamed-finish-label';
      await vi.waitFor(() =>
        expect(monitor.current.editingAppearsActive).toBe(false),
      );
    } finally {
      monitor.disconnect();
    }
  });
  it('updates when supported active-Sketch evidence appears and disappears', async () => {
    const { createSketchGuidanceMonitor } = await import('./sketchGuidance');
    const monitor = createSketchGuidanceMonitor(document);
    const listener = vi.fn();
    const unsubscribe = monitor.subscribe(listener);

    expect(monitor.current.editingAppearsActive).toBe(false);

    const finishSketch = document.createElement('button');
    finishSketch.setAttribute('aria-label', 'Finish sketch');
    finishSketch.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(finishSketch);

    await vi.waitFor(() =>
      expect(monitor.current.editingAppearsActive).toBe(true),
    );
    expect(listener).toHaveBeenLastCalledWith({
      editingAppearsActive: true,
      uiState: 'OPEN',
      dialogPlane: null,
    });

    finishSketch.remove();
    await vi.waitFor(() =>
      expect(monitor.current.editingAppearsActive).toBe(false),
    );
    expect(listener).toHaveBeenLastCalledWith({
      editingAppearsActive: false,
      uiState: 'UNKNOWN',
      dialogPlane: null,
    });

    unsubscribe();
    monitor.disconnect();
  });
});

it('reproduces the owner two-gate snapshot without running production Rectangle lookup (simulation)', async () => {
  const { observeOnshapeGuidanceContext, parseOnshapePage } =
    await import('./onshapePage');
  const { observeSketchGuidanceUi } = await import('./sketchGuidance');
  const { inspectRectangleDropdownRecognition } =
    await import('./semanticTargets');
  const { createGuidanceRunner } = await import('./guidanceRunner');
  // Only wrapper/tag and label facts come from v3. Layout, this local hierarchy,
  // and hypothetical exit text are simulations; no active-Sketch detector is inferred.
  document.body.innerHTML =
    '<div><svg></svg><span>Corner rectangle</span></div><div><span>Finish sketch</span></div>';
  const page = parseOnshapePage(
    'https://cad.onshape.com/documents/simulated/w/simulated/e/simulated',
  );
  let productionLookups = 0;
  const runner = createGuidanceRunner({
    getContext: () => observeOnshapeGuidanceContext(page, document),
    inspectRectangleShow: () => ({
      pageGate: 'ALLOWED',
      target: inspectRectangleDropdownRecognition(document),
    }),
    observe: () => ({
      current: observeSketchGuidanceUi(document).uiState,
      unsubscribe: () => undefined,
    }),
    resolveTarget: () => {
      productionLookups++;
      return { status: 'MISSING' };
    },
    highlightTarget: () => {
      throw new Error('No target may be outlined from this evidence');
    },
    clearHighlight: () => undefined,
  });
  const result = runner.request({
    version: 1,
    actionId: 'rectangle-tool-group',
    level: 'SHOW',
  });
  expect(result.rectangleShowDiagnostic).toMatchObject({
    stage: 'CONTEXT',
    reason: 'SKETCH_CONTEXT_UNESTABLISHED',
    context: 'UNKNOWN',
    productionLookup: 'NOT_RUN',
    inspection: {
      pageGate: 'ALLOWED',
      target: {
        sketchContext: 'UNESTABLISHED',
        finishControl: 'MISSING',
        dialogPlaneObserved: false,
        readOnlyIndicators: 0,
        lookup: {
          state: 'COMPLETE',
          reason: 'NO_TOOLBAR_SEMANTICS',
          toolbars: 0,
        },
        eligibility: { state: 'NOT_EVALUATED' },
      },
    },
  });
  expect(productionLookups).toBe(0);
  expect(observeSketchGuidanceUi(document).uiState).toBe('UNKNOWN');
  expect(page.editability).toBe('unknown');
  runner.dispose();
});
