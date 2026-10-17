import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { VerificationDecision } from '@leqad/contracts';
import type { LessonSession } from '@leqad/lesson-engine';
import type { OnshapePageContext } from '../../services/onshapePage';
import type { SketchGuidanceObservation } from '../../services/sketchGuidance';
import type { GuidanceRunnerHost } from '../../services/guidanceRunner';
import type {
  TopRowCaptureReport,
  TopRowCaptureTask,
} from '../../services/recognitionDiagnostics';
import {
  inspectRectangleDropdown,
  serializeRectangleDropdownReport,
} from '../../services/rectangleDropdownCapture';
import type {
  RectangleDropdownCaptureReport,
  RectangleDropdownCaptureTask,
  RectangleDropdownManualSnapshot,
} from '../../services/rectangleDropdownCapture';
import { captureRectangleCommandMetadata } from '../../services/rectangleCommandMetadataCapture';

const confirmedPage: OnshapePageContext = {
  supported: true,
  documentId: 'document-a',
  workspaceId: 'workspace-a',
  versionId: null,
  microversionId: null,
  elementId: 'element-a',
  modelType: 'workspace',
  editability: 'editable',
  elementType: 'part-studio',
  capabilitySource: 'UI',
  capabilityObservedAt: '2026-10-13T12:00:00.000Z',
};

function uiDecision(status: 'PASS' | 'UNKNOWN'): VerificationDecision {
  const observedAt = new Date().toISOString();
  const identity = {
    documentId: 'document-a',
    workspaceId: 'workspace-a',
    elementId: 'element-a',
    revision: null,
  };
  const evidence =
    status === 'PASS'
      ? [
          {
            id: 'evidence-1',
            fact: {
              topPlaneSelected: true,
              sketchEditingAppearsActive: true,
            },
            source: 'UI' as const,
            identity,
            revision: null,
            observedAt,
            detectorVersion: 'test/1.0.0',
            expiresAt: null,
            level: 'UI_CONFIRMED' as const,
          },
        ]
      : [];

  return {
    status,
    evidenceLevel: status === 'PASS' ? 'UI_CONFIRMED' : 'UNKNOWN',
    observedFact: status === 'PASS' ? evidence[0]!.fact : null,
    identity,
    observedAt,
    revision: null,
    explanation: status === 'PASS' ? 'UI state observed.' : 'Unavailable.',
    missingRequirements: status === 'PASS' ? [] : ['Supported UI evidence'],
    recoveryAction: status === 'PASS' ? null : 'Try again.',
    evidence,
  };
}

function completeCurrentStep(): void {
  const acknowledge = screen.queryByRole('button', { name: 'Got it' });
  if (acknowledge) {
    fireEvent.click(acknowledge);
    return;
  }
  const selfReport = screen.queryByRole('button', {
    name: "I've finished this step",
  });
  if (selfReport) {
    fireEvent.click(selfReport);
    return;
  }
  const check = screen.queryByRole('button', { name: 'Check progress' });
  if (check && !check.hasAttribute('disabled')) fireEvent.click(check);
  const continueButton = screen.queryByRole('button', {
    name: "I've finished this step",
  });
  if (continueButton) fireEvent.click(continueButton);
}

function advanceToStep(stepNumber: number): void {
  for (let current = 1; current < stepNumber; current += 1) {
    completeCurrentStep();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  }
}

function restoredSession(currentStepId: string): LessonSession {
  return {
    lessonId: 'foundations-first-sketch',
    lessonVersion: '2.0.0',
    currentStepId,
    modelIdentity: {
      documentId: 'document-a',
      workspaceId: 'workspace-a',
      elementId: 'element-a',
      revision: null,
    },
    modelRevision: null,
    modelState: {
      observedUiStates: {},
      verifiedModelStates: {},
      evidenceReferences: [],
      evidenceFreshness: 'unknown',
      uncertaintyReason: 'Reloaded without current model evidence.',
    },
    updatedAt: '2026-10-13T12:00:00.000Z',
    steps: {
      [currentStepId]: {
        status: 'AWAITING_ACTION',
        hintLevel: 0,
        verification: null,
        resumeState: null,
        outcome: 'NONE',
      },
    },
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
});

describe('AssistantPanel', () => {
  it.each([
    { context: 'UNKNOWN', status: 'FALLBACK' },
    { context: 'SKETCH_EDITING', status: 'MISSING' },
  ] as const)(
    'keeps Corner Rectangle teaching visible when SHOW returns $status',
    async ({ context, status }) => {
      const { AssistantPanel } = await import('./AssistantPanel');
      const { createGuidanceRunner } =
        await import('../../services/guidanceRunner');
      const onSessionChange = vi.fn();
      const runner = createGuidanceRunner({
        getContext: () => context,
        resolveTarget: () => ({ status: 'MISSING' }),
        highlightTarget: () => false,
        clearHighlight: () => undefined,
        observe: () => ({ current: 'OPEN', unsubscribe: () => undefined }),
      });
      render(
        <AssistantPanel
          page={{ ...confirmedPage, editability: 'unknown' }}
          initialSession={restoredSession('draw-rectangle')}
          guidanceRunner={runner}
          onSessionChange={onSessionChange}
        />,
      );

      const instruction =
        /Open the Rectangle dropdown with its arrow, choose Corner Rectangle/;
      expect(screen.getByText(instruction)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
      expect(runner.getState().status).toBe(status);
      expect(screen.getByText(instruction)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'GUIDE' }));
      expect(
        screen.getByText(/GUIDE is unavailable for the Rectangle tool group/),
      ).toBeTruthy();
      expect(screen.getByText(instruction)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Why?' }));
      expect(
        screen.getByText(/Center Point Rectangle starts from the center/),
      ).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'HINT' }));
      expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
      expect(
        screen.getByText(
          /The group icon can show the last-used Rectangle variant/,
        ),
      ).toBeTruthy();
      expect(screen.getByText('Step 4 of 8 · Visited')).toBeTruthy();
      expect(onSessionChange).not.toHaveBeenCalled();
      runner.dispose();
    },
  );

  it('resumes existing 2.0.0 self-reported Rectangle progress after the teaching correction', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const session = restoredSession('draw-rectangle');
    session.steps['draw-rectangle'] = {
      status: 'COMPLETED',
      hintLevel: 0,
      verification: 'UNKNOWN',
      resumeState: null,
      outcome: 'SELF_REPORTED',
    };
    const save = vi.fn();
    render(
      <AssistantPanel
        page={confirmedPage}
        initialSession={session}
        onSessionChange={save}
      />,
    );
    expect(screen.getByText('Step 4 of 8 · Marked done')).toBeTruthy();
    expect(screen.getByText(/choose Corner Rectangle/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next' }));
    expect(save.mock.lastCall?.[0]).toMatchObject({
      lessonVersion: '2.0.0',
      currentStepId: 'apply-dimensions',
      steps: {
        'draw-rectangle': { outcome: 'SELF_REPORTED', verification: 'UNKNOWN' },
      },
    });
  });

  it.each([true, false])(
    'ignores an older save settlement when the latest save failed=%s',
    async (latestFails) => {
      const { AssistantPanel } = await import('./AssistantPanel');
      let settleFirst!: () => void;
      let settleLatest!: () => void;
      const first = new Promise<void>((resolve, reject) => {
        settleFirst = () =>
          latestFails ? resolve() : reject(new Error('old save'));
      });
      const latest = new Promise<void>((resolve, reject) => {
        settleLatest = () =>
          latestFails ? reject(new Error('latest save')) : resolve();
      });
      const save = vi
        .fn()
        .mockReturnValueOnce(first)
        .mockReturnValueOnce(latest);
      render(<AssistantPanel page={confirmedPage} onSessionChange={save} />);
      fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
      fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      await act(async () => settleLatest());
      await act(async () => settleFirst());
      expect(
        Boolean(screen.queryByRole('status', { name: 'Progress saving' })),
      ).toBe(latestFails);
      expect(screen.getByText('Step 2 of 8 · Visited')).toBeTruthy();
    },
  );

  it('warns when progress cannot be saved and retries without upgrading self-reported work', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const { createLessonProgressStore } =
      await import('../../services/progressStore');
    const values: Record<string, unknown> = {};
    let unavailable = true;
    const store = createLessonProgressStore({
      async get(key) {
        return { [key]: values[key] };
      },
      async set(items) {
        if (unavailable) throw new Error('Simulated unavailable storage');
        Object.assign(values, items);
      },
    });
    const session = restoredSession('draw-rectangle');
    render(
      <AssistantPanel
        page={{ ...confirmedPage, editability: 'unknown' }}
        initialSession={session}
        onSessionChange={(next) => {
          const save = store.saveSession(next);
          // Keep the pre-fix reproduction from emitting an unhandled rejection.
          void save.catch(() => undefined);
          return save;
        }}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: "I've finished this step" }),
    );
    expect(
      (await screen.findByRole('status', { name: 'Progress saving' }))
        .textContent,
    ).toContain('could not be saved');
    expect(screen.getByText('Step 4 of 8 · Marked done')).toBeTruthy();
    expect(await store.restoreSession(session.modelIdentity, null)).toBeNull();
    unavailable = false;
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Retry saving progress' }),
      );
    });
    expect(
      screen.queryByRole('status', { name: 'Progress saving' }),
    ).toBeNull();
    const restored = await store.restoreSession(session.modelIdentity, null);
    expect(restored?.steps['draw-rectangle']).toMatchObject({
      outcome: 'SELF_REPORTED',
      verification: 'UNKNOWN',
    });
    expect(restored?.modelState.verifiedModelStates).toEqual({});
  });

  it('prefers a real usable semantic Sketch target over a saved approximate location', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const {
      createGuidanceHighlighter,
      createSketchHighlightCalibration,
      readCalibrationViewport,
    } = await import('../../services/calibratedHighlight');
    const highlighter = createGuidanceHighlighter(document);
    const target = document.createElement('button');
    target.setAttribute('aria-label', 'Sketch');
    target.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(target);
    const onShowCalibratedHighlight = vi.fn(highlighter.showCalibrated);
    const calibration = createSketchHighlightCalibration(
      { x: 0.1, y: 0.1, width: 0.1, height: 0.05 },
      readCalibrationViewport(window),
    )!;
    const panel = render(
      <AssistantPanel
        page={confirmedPage}
        initialSession={restoredSession('start-sketch')}
        initialSketchCalibration={calibration}
        onShowTarget={highlighter.show}
        onShowCalibratedHighlight={onShowCalibratedHighlight}
        onClearTarget={highlighter.clear}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    expect(onShowCalibratedHighlight).not.toHaveBeenCalled();
    expect(document.querySelectorAll('[data-leqad-highlight]')).toHaveLength(1);
    expect(document.querySelector('[data-leqad-calibrated]')).toBeNull();
    panel.unmount();
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    target.remove();
  });

  it('offers calibrated SHOW only after semantic Sketch recognition is unavailable', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const onShowTarget = vi.fn();
    const onShowCalibratedHighlight = vi.fn(() => true);
    const onSketchCalibrationChange = vi.fn();
    render(
      <AssistantPanel
        page={{ ...confirmedPage, editability: 'unknown' }}
        initialSession={restoredSession('start-sketch')}
        onShowTarget={onShowTarget}
        onShowCalibratedHighlight={onShowCalibratedHighlight}
        onSketchCalibrationChange={onSketchCalibrationChange}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    expect(
      screen.getByRole('group', { name: 'Sketch highlight calibration' }),
    ).toBeTruthy();
    expect(screen.getByLabelText('Left (%)').getAttribute('value')).toBe('8.9');
    fireEvent.click(screen.getByRole('button', { name: 'Save calibration' }));
    await act(async () => undefined);
    expect(onSketchCalibrationChange).toHaveBeenCalledTimes(1);
    onShowCalibratedHighlight.mockClear();
    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    expect(onShowTarget).toHaveBeenCalledWith('sketch');
    expect(onShowCalibratedHighlight).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(
        'Showing an approximate location based on your calibration. Leqad has not verified this control.',
      ),
    ).toBeTruthy();
    expect(screen.getByText('Step 3 of 8 · Visited')).toBeTruthy();
  });

  it('keeps a user-reported Sketch-mode claim separate from lesson completion and verification', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const onSessionChange = vi.fn();
    const onCheckStep = vi.fn(() => uiDecision('PASS'));
    render(
      <AssistantPanel
        page={confirmedPage}
        initialSession={restoredSession('start-sketch')}
        onSessionChange={onSessionChange}
        onCheckStep={onCheckStep}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: "I'm already in Sketch mode" }),
    );
    expect(
      screen.getByText(/You reported that Sketch mode is active/),
    ).toBeTruthy();
    expect(
      screen.queryByText(/With Top plane selected, choose the Sketch command/),
    ).toBeNull();
    expect(screen.getByText('Step 3 of 8 · Visited')).toBeTruthy();
    expect(onSessionChange).not.toHaveBeenCalled();
    expect(onCheckStep).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: "I've finished this step" }),
    );
    const session = onSessionChange.mock.lastCall?.[0];
    expect(session.steps['start-sketch']).toMatchObject({
      outcome: 'SELF_REPORTED',
      verification: 'UNKNOWN',
    });
    expect(session.modelState.verifiedModelStates).toEqual({});
  });

  it('offers HINT, SHOW, and GUIDE for a registered action without changing lesson completion', async () => {
    const [panelModule, runnerModule, registryModule] = await Promise.all([
      import('./AssistantPanel'),
      import('../../services/guidanceRunner'),
      import('../../services/guidanceRegistry'),
    ]);
    const host: GuidanceRunnerHost = {
      getContext: () => 'SKETCH_EDITING',
      resolveTarget: () => ({ status: 'FOUND' }),
      highlightTarget: () => true,
      clearHighlight: vi.fn(),
      observe: (observationId) => ({
        current: observationId === 'SKETCH_UI_ACTIVE' ? 'OPEN' : 'UNKNOWN',
        unsubscribe: vi.fn(),
      }),
    };
    const runner = runnerModule.createGuidanceRunner(host);
    const onSessionChange = vi.fn();
    render(
      <panelModule.AssistantPanel
        page={{ ...confirmedPage, editability: 'unknown' }}
        initialSession={restoredSession('draw-rectangle')}
        initialPanelPreferences={{
          collapsed: false,
          position: null,
          helpLevel: 'HINT',
        }}
        guidanceRunner={runner}
        onSessionChange={onSessionChange}
      />,
    );

    expect(screen.getByRole('group', { name: 'Guidance level' })).toBeTruthy();
    expect(
      screen.getByText(/GUIDE is unavailable for the Rectangle tool group/),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'HINT' }));
    expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    expect(runner.getState()).toMatchObject({
      status: 'READY',
      request: { level: 'SHOW' },
    });
    expect(
      screen.getByText(
        /temporary highlight was shown for the Rectangle dropdown control/,
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'GUIDE' }));
    expect(runner.getState()).toMatchObject({ status: 'UNSUPPORTED' });
    expect(
      screen.getByText(/Step-by-step guidance.*not available yet/),
    ).toBeTruthy();
    expect(screen.getByText('Step 4 of 8 · Visited')).toBeTruthy();
    expect(onSessionChange).not.toHaveBeenCalled();
    expect(
      registryModule.GUIDANCE_REGISTRY['rectangle-tool-group'].guideRecipe,
    ).toBeUndefined();
  });

  it.each(['MISSING', 'AMBIGUOUS'] as const)(
    'offers Corner Rectangle instructions without blind Retry for %s targets',
    async (targetStatus) => {
      const [panelModule, runnerModule] = await Promise.all([
        import('./AssistantPanel'),
        import('../../services/guidanceRunner'),
      ]);
      const resolveTarget = vi.fn(() => ({ status: targetStatus }) as const);
      const runner = runnerModule.createGuidanceRunner({
        getContext: () => 'SKETCH_EDITING',
        resolveTarget,
        highlightTarget: () => true,
        clearHighlight: vi.fn(),
        observe: (observationId) => ({
          current: observationId === 'SKETCH_UI_ACTIVE' ? 'OPEN' : 'UNKNOWN',
          unsubscribe: vi.fn(),
        }),
      });
      render(
        <panelModule.AssistantPanel
          page={confirmedPage}
          initialSession={restoredSession('draw-rectangle')}
          guidanceRunner={runner}
        />,
      );

      fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
      expect(
        screen.queryByRole('button', { name: 'Retry guidance' }),
      ).toBeNull();
      expect(
        screen.getByText('Find using Onshape Search', { exact: true }),
      ).toBeTruthy();
      expect(resolveTarget).toHaveBeenCalledTimes(1);
      // A new SHOW is still student-controlled after a real interface change.
      fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
      expect(resolveTarget).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Step 4 of 8 · Visited')).toBeTruthy();
    },
  );

  it('offers exact native Corner rectangle search instructions only after SHOW abstains', async () => {
    const [panelModule, runnerModule] = await Promise.all([
      import('./AssistantPanel'),
      import('../../services/guidanceRunner'),
    ]);
    const onSessionChange = vi.fn();
    const runner = runnerModule.createGuidanceRunner({
      getContext: () => 'SKETCH_EDITING',
      resolveTarget: () => ({ status: 'MISSING' }),
      highlightTarget: vi.fn(() => false),
      clearHighlight: vi.fn(),
      observe: () => ({ current: 'OPEN', unsubscribe: vi.fn() }),
    });
    render(
      <panelModule.AssistantPanel
        page={confirmedPage}
        initialSession={restoredSession('draw-rectangle')}
        guidanceRunner={runner}
        onSessionChange={onSessionChange}
      />,
    );

    expect(
      screen.queryByText('Find using Onshape Search', { exact: true }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    expect(runner.getState().status).toBe('MISSING');
    const summary = screen.getByText('Find using Onshape Search', {
      exact: true,
    });
    expect(
      screen.getByText(/couldn.t safely highlight Corner rectangle/i),
    ).toBeTruthy();
    expect(summary.closest('details')?.open).toBe(false);
    fireEvent.click(summary);
    expect(summary.closest('details')?.open).toBe(true);
    expect(screen.getByText(/Alt \+ C/)).toBeTruthy();
    expect(screen.getByText(/Option \+ C/)).toBeTruthy();
    expect(screen.getByText(/Search for Corner rectangle/)).toBeTruthy();
    expect(
      screen.getByText(/If Search Tools is hidden.*Show Search tools/s),
    ).toBeTruthy();
    expect(
      screen.getByText(/If the exact command is missing or unavailable/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Center point rectangle starts from its center/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Aligned Rectangle establishes a line direction/),
    ).toBeTruthy();
    expect(screen.getByText(/Leqad did not select the tool/)).toBeTruthy();
    expect(
      screen.queryByText(/Leqad could not confirm this context/),
    ).toBeNull();
    expect(screen.getByText('Step 4 of 8 · Visited')).toBeTruthy();
    expect(onSessionChange).not.toHaveBeenCalled();
    runner.dispose();
  });

  it('explains native search conservatively for read-only and unknown contexts', async () => {
    const [panelModule, runnerModule] = await Promise.all([
      import('./AssistantPanel'),
      import('../../services/guidanceRunner'),
    ]);
    const runner = runnerModule.createGuidanceRunner({
      getContext: () => 'UNKNOWN',
      resolveTarget: () => ({ status: 'MISSING' }),
      highlightTarget: () => false,
      clearHighlight: vi.fn(),
      observe: () => ({ current: 'UNKNOWN', unsubscribe: vi.fn() }),
    });
    const { rerender } = render(
      <panelModule.AssistantPanel
        page={{ ...confirmedPage, editability: 'unknown' }}
        initialSession={restoredSession('draw-rectangle')}
        guidanceRunner={runner}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    fireEvent.click(
      screen.getByText('Find using Onshape Search', { exact: true }),
    );
    expect(
      screen.getByText(/Leqad cannot confirm that this is an editable Sketch/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Only continue if Onshape lets you edit this Sketch/),
    ).toBeTruthy();

    rerender(
      <panelModule.AssistantPanel
        page={{
          ...confirmedPage,
          editability: 'read-only',
          modelType: 'version',
        }}
        initialSession={restoredSession('draw-rectangle')}
        guidanceRunner={runner}
      />,
    );
    expect(screen.getByText(/This view is read-only/)).toBeTruthy();
    expect(screen.queryByText(/Open Search Tools/)).toBeNull();
    expect(screen.queryByText(/Search for Corner rectangle/)).toBeNull();
    expect(screen.getByText('Step 4 of 8 · Visited')).toBeTruthy();
    runner.dispose();
  });

  it('keeps native search conditional when the page is editable but Sketch is not active', async () => {
    const [panelModule, runnerModule] = await Promise.all([
      import('./AssistantPanel'),
      import('../../services/guidanceRunner'),
    ]);
    const runner = runnerModule.createGuidanceRunner({
      getContext: () => 'PART_STUDIO',
      resolveTarget: () => ({ status: 'MISSING' }),
      highlightTarget: () => false,
      clearHighlight: vi.fn(),
      observe: () => ({ current: 'CLOSED', unsubscribe: vi.fn() }),
    });
    render(
      <panelModule.AssistantPanel
        page={confirmedPage}
        initialSession={restoredSession('draw-rectangle')}
        guidanceRunner={runner}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    fireEvent.click(
      screen.getByText('Find using Onshape Search', { exact: true }),
    );
    expect(
      screen.getByText(/Leqad cannot confirm that this is an editable Sketch/),
    ).toBeTruthy();
    expect(
      screen.getByText(/Only continue if Onshape lets you edit this Sketch/),
    ).toBeTruthy();
    expect(screen.getByText(/Search for Corner rectangle/)).toBeTruthy();
    runner.dispose();
  });

  it('keeps automatic SHOW primary and hides native search on success, other steps and help levels', async () => {
    const [panelModule, runnerModule] = await Promise.all([
      import('./AssistantPanel'),
      import('../../services/guidanceRunner'),
    ]);
    const highlightTarget = vi.fn(() => true);
    const runner = runnerModule.createGuidanceRunner({
      getContext: () => 'SKETCH_EDITING',
      resolveTarget: () => ({ status: 'FOUND' }),
      highlightTarget,
      clearHighlight: vi.fn(),
      observe: () => ({ current: 'OPEN', unsubscribe: vi.fn() }),
    });
    render(
      <panelModule.AssistantPanel
        page={confirmedPage}
        initialSession={restoredSession('draw-rectangle')}
        guidanceRunner={runner}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    expect(highlightTarget).toHaveBeenCalledWith('rectangle-tool-group');
    expect(runner.getState().status).toBe('READY');
    expect(
      screen.queryByText('Find using Onshape Search', { exact: true }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'HINT' }));
    expect(
      screen.queryByText('Find using Onshape Search', { exact: true }),
    ).toBeNull();
    runner.dispose();
  });

  it.each([
    [
      'AMBIGUOUS',
      'VISIBLE',
      'ENABLED',
      'MEDIUM',
      /more than one possible control/,
    ],
    ['REJECTED', 'HIDDEN', 'ENABLED', 'MEDIUM', /isn’t fully visible/],
    ['REJECTED', 'VISIBLE', 'DISABLED', 'MEDIUM', /row is unavailable/],
    ['REJECTED', 'VISIBLE', 'ENABLED', 'LOW', /can't safely identify/],
  ] as const)(
    'explains the supported %s/%s/%s/%s failure briefly',
    async (status, visibility, enabled, confidence, message) => {
      const { AssistantPanel } = await import('./AssistantPanel');
      render(
        <AssistantPanel
          page={confirmedPage}
          initialSession={restoredSession('select-reference-plane')}
          onShowTarget={() => ({
            targetId: 'top-plane',
            status,
            element: null,
            visibility,
            enabled,
            confidence,
            matchStrategy: null,
            candidateCount: 1,
            explanation: 'Developer detail, not default copy.',
          })}
        />,
      );
      fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
      expect(screen.getByText(message)).toBeTruthy();
      expect(screen.queryByText(/Developer detail/)).toBeNull();
      expect(screen.getByText('Step 2 of 8 · Visited')).toBeTruthy();
    },
  );
  it('gives short missing-target guidance and never reports success from a missing callback', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={{ ...confirmedPage, editability: 'unknown' }}
        initialSession={restoredSession('select-reference-plane')}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
    expect(screen.getByText(/couldn't find the Top plane/)).toBeTruthy();
    expect(screen.queryByText(/The highlight follows/)).toBeNull();
    expect(screen.getByText('Step 2 of 8 · Visited')).toBeTruthy();
  });

  it('offers current already-sketching guidance without verifying permission, selection, or geometry', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const onShowTarget = vi.fn();
    render(
      <AssistantPanel
        page={{ ...confirmedPage, editability: 'unknown' }}
        initialSession={restoredSession('select-reference-plane')}
        onShowTarget={onShowTarget}
        onObserveSketchUi={() => ({
          editingAppearsActive: true,
          uiState: 'OPEN',
          dialogPlane: 'Top',
        })}
      />,
    );
    expect(screen.getByText(/already editing a sketch/)).toBeTruthy();
    expect(screen.getByText(/Sketch dialog displays Top plane/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));
    expect(onShowTarget).not.toHaveBeenCalled();
    expect(screen.getByText('Step 2 of 8 · Visited')).toBeTruthy();
    expect(
      screen.getByRole('status', { name: 'Connection status' }).textContent,
    ).toBe('Limited observation');
    fireEvent.click(
      screen.getByRole('button', { name: "I've finished this step" }),
    );
    expect(screen.getByText('Step 2 of 8 · Marked done')).toBeTruthy();
    expect(
      screen.getByRole('status', { name: 'Lesson progress' }).textContent,
    ).toContain('has not verified');
  });

  it('only collects diagnostics after opt-in and explicit copy; clears them when turned off', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const collect = vi.fn(() => '{"version":"sanitized-test"}');
    render(
      <AssistantPanel
        page={confirmedPage}
        onRecognitionDiagnostics={collect}
      />,
    );
    expect(collect).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
    );
    expect(collect).not.toHaveBeenCalled();
    await act(async () => {
      fireEvent.click(
        screen.getByRole('button', { name: 'Copy recognition diagnostics' }),
      );
    });
    expect(
      screen.getByLabelText<HTMLTextAreaElement>(
        'Recognition diagnostics output',
      ).value,
    ).toBe('{"version":"sanitized-test"}');
    expect(collect).toHaveBeenCalledTimes(1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Turn off recognition diagnostics' }),
    );
    expect(
      screen.queryByLabelText('Recognition diagnostics output'),
    ).toBeNull();
  });

  it('keeps the four-state command metadata experiment behind diagnostic opt-in', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const capture = vi.fn((state, generation) =>
      captureRectangleCommandMetadata(document, state, generation),
    );
    render(
      <AssistantPanel
        page={confirmedPage}
        onRecognitionDiagnostics={() => '{}'}
        onCaptureRectangleCommandMetadata={capture}
      />,
    );

    expect(
      screen.queryByLabelText('Rectangle command metadata experiment'),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
    );
    expect(
      screen.getByLabelText('Rectangle command metadata experiment'),
    ).toBeTruthy();
    expect(capture).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Record metadata State A — Sketch editing',
      }),
    );
    expect(capture).toHaveBeenCalledWith('SKETCH_EDITING', 1);
    fireEvent.click(
      screen.getByRole('button', { name: 'Turn off recognition diagnostics' }),
    );
    expect(
      screen.queryByLabelText('Rectangle command metadata experiment'),
    ).toBeNull();
  });

  it('captures a row on request and includes only the capture report when copied', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const captured: TopRowCaptureReport = {
      status: 'CAPTURED',
      diagnosis: 'TREE_ROLE_NOT_EXPOSED',
      findings: ['TREE_ROLE_NOT_EXPOSED'],
      actionableAncestorDistance: 1,
      structure: [
        {
          tag: 'span',
          role: 'none',
          rolePresent: false,
          ariaLabelPresent: false,
          ariaLabelledByPresent: false,
          titlePresent: false,
          tabIndexPresent: false,
          ariaExpanded: 'ABSENT',
          ariaHidden: 'ABSENT',
          hiddenAttributePresent: false,
          planeMatches: ['Top'],
          defaultGeometryMatch: false,
          actionable: false,
          actionabilityEvidence: 'NOT_EXPOSED',
          visibility: 'VISIBLE',
          enabled: 'ENABLED',
          context: 'UNKNOWN',
          geometryRelativeToClicked: null,
        },
      ],
      relationshipOutline: {
        relationships: [],
        elementsInspected: 0,
        labelMatchesRecorded: 0,
        truncated: false,
        interactionHandling: 'JAVASCRIPT_HANDLER_NOT_INSPECTED',
      },
      assessment: null,
    };
    let resolveCapture!: (value: {
      status: 'CAPTURED';
      report: TopRowCaptureReport;
    }) => void;
    const task: TopRowCaptureTask = {
      promise: new Promise((resolve) => {
        resolveCapture = resolve;
      }),
      cancel: vi.fn(),
      isActive: () => true,
    };
    const onCaptureTopRow = vi.fn(() => task);
    const onRecognitionDiagnostics = vi.fn((capture?: TopRowCaptureReport) =>
      JSON.stringify({ capture }),
    );
    render(
      <AssistantPanel
        page={confirmedPage}
        onCaptureTopRow={onCaptureTopRow}
        onRecognitionDiagnostics={onRecognitionDiagnostics}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Capture Top row' }));
    expect(
      screen.getByText(/click the visible Top row in Onshape/i),
    ).toBeTruthy();
    expect(onCaptureTopRow).toHaveBeenCalledTimes(1);
    await act(async () =>
      resolveCapture({ status: 'CAPTURED', report: captured }),
    );
    expect(screen.getByText(/Top row structure captured/)).toBeTruthy();
    await act(async () =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Copy recognition diagnostics' }),
      ),
    );
    expect(onRecognitionDiagnostics).toHaveBeenCalledWith(captured);
    expect(
      JSON.parse(
        screen.getByLabelText<HTMLTextAreaElement>(
          'Recognition diagnostics output',
        ).value,
      ).capture,
    ).toEqual(captured);
  });

  it('cancels the one-shot row listener when diagnostics are turned off', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const task: TopRowCaptureTask = {
      promise: new Promise(() => undefined),
      cancel: vi.fn(),
      isActive: () => true,
    };
    render(
      <AssistantPanel
        page={confirmedPage}
        onCaptureTopRow={() => task}
        onRecognitionDiagnostics={() => '{}'}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
    );
    fireEvent.click(screen.getByRole('button', { name: 'Capture Top row' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Turn off recognition diagnostics' }),
    );
    expect(task.cancel).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Capture Top row' }),
    ).toBeNull();
  });

  it('keeps Rectangle capture opt-in and offers manual UNKNOWN snapshots separately', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const report: RectangleDropdownCaptureReport = {
      version: 'leqad-rectangle-dropdown/3',
      interactionMode: 'OBSERVE_MENU',
      workflowState: 'FINISHED',
      stateHistory: ['FINISHED'],
      cancelReason: null,
      interactions: [],
      status: 'TIMED_OUT',
      captureMode: 'AUTOMATIC',
      baseline: inspectRectangleDropdown(document),
      transitions: [],
      manualSnapshots: [],
      truncated: false,
    };
    let resolveCapture!: (value: {
      status: 'TIMED_OUT';
      report: RectangleDropdownCaptureReport;
    }) => void;
    const task: RectangleDropdownCaptureTask = {
      promise: new Promise((resolve) => {
        resolveCapture = resolve;
      }),
      cancel: vi.fn(),
      isActive: () => true,
    };
    const onCaptureRectangleDropdown = vi.fn(() => task);
    const onCaptureRectangleDropdownSnapshot = vi.fn(
      (
        snapshotRole: 'BEFORE' | 'AFTER',
        userReportedState: 'OPEN' | 'CLOSED',
      ): RectangleDropdownManualSnapshot => ({
        snapshotRole,
        userReportedState,
        snapshot: inspectRectangleDropdown(document),
      }),
    );
    const onRecognitionDiagnostics = vi.fn(() => 'not the rectangle report');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCaptureRectangleDropdown={onCaptureRectangleDropdown}
        onCaptureRectangleDropdownSnapshot={onCaptureRectangleDropdownSnapshot}
        onRecognitionDiagnostics={onRecognitionDiagnostics}
      />,
    );

    expect(
      screen.queryByRole('button', { name: 'Capture Rectangle interaction' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Capture Rectangle interaction' }),
    );
    expect(onCaptureRectangleDropdown).toHaveBeenCalledTimes(1);
    expect(
      screen.getByText(/click Corner rectangle without returning to Leqad/),
    ).toBeTruthy();
    await act(async () => resolveCapture({ status: 'TIMED_OUT', report }));

    expect(
      screen.getByText(/automatic DOM evidence did not establish/i),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Capture manual before snapshot (I report closed)',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Capture manual after snapshot (I report open)',
      }),
    );
    expect(onCaptureRectangleDropdownSnapshot).toHaveBeenNthCalledWith(
      1,
      'BEFORE',
      'CLOSED',
    );
    expect(onCaptureRectangleDropdownSnapshot).toHaveBeenNthCalledWith(
      2,
      'AFTER',
      'OPEN',
    );

    await act(async () =>
      fireEvent.click(
        screen.getByRole('button', { name: 'Copy Rectangle dropdown report' }),
      ),
    );
    const output = screen.getByLabelText<HTMLTextAreaElement>(
      'Rectangle dropdown diagnostic output',
    ).value;
    expect(JSON.parse(output).captureMode).toBe('MANUAL_FALLBACK');
    expect(JSON.parse(output).manualSnapshots).toHaveLength(2);
    expect(output).not.toContain('productionRecognition');
    expect(onRecognitionDiagnostics).not.toHaveBeenCalled();
    expect(serializeRectangleDropdownReport(JSON.parse(output))).toBe(output);
  });

  it('cancels the Rectangle observer when diagnostics are disabled', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const task: RectangleDropdownCaptureTask = {
      promise: new Promise(() => undefined),
      cancel: vi.fn(),
      isActive: () => true,
    };
    render(
      <AssistantPanel
        onCaptureRectangleDropdown={() => task}
        onRecognitionDiagnostics={() => '{}'}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Capture Rectangle interaction' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Turn off recognition diagnostics' }),
    );

    expect(task.cancel).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Capture Rectangle interaction' }),
    ).toBeNull();
  });

  it.each(['draw-rectangle', 'apply-dimensions', 'finish-sketch'])(
    'offers direct unverified continuation for %s without running a nonexistent verifier',
    async (stepId) => {
      const { AssistantPanel } = await import('./AssistantPanel');
      const onCheckStep = vi.fn(() => uiDecision('PASS'));
      const onSessionChange = vi.fn();
      render(
        <AssistantPanel
          page={confirmedPage}
          initialSession={restoredSession(stepId)}
          onCheckStep={onCheckStep}
          onSessionChange={onSessionChange}
        />,
      );

      expect(
        screen.getByText(/Leqad cannot check it automatically/),
      ).toBeTruthy();
      expect(
        screen.queryByRole('button', { name: 'Check progress' }),
      ).toBeNull();
      fireEvent.click(
        screen.getByRole('button', { name: "I've finished this step" }),
      );

      const session = onSessionChange.mock.lastCall?.[0];
      expect(session.steps[stepId]).toMatchObject({
        status: 'COMPLETED',
        verification: 'UNKNOWN',
        outcome: 'SELF_REPORTED',
      });
      expect(session.modelState.verifiedModelStates).toEqual({});
      expect(onCheckStep).not.toHaveBeenCalled();
      expect(
        screen.getByRole('status', { name: 'Lesson progress' }).textContent,
      ).toContain('has not verified your CAD work');
      expect(
        screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
      ).toBe(false);
    },
  );

  it('preserves pause and resume for direct unverified continuation', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        initialSession={restoredSession('draw-rectangle')}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(
      screen.queryByRole('button', { name: "I've finished this step" }),
    ).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));
    fireEvent.click(
      screen.getByRole('button', { name: "I've finished this step" }),
    );
    expect(screen.getByText('Step 4 of 8 · Marked done')).toBeTruthy();
  });

  it('reports an unsupported document and never claims an unverified connection', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');

    render(<AssistantPanel />);

    expect(
      screen.getByRole('status', { name: 'Connection status' }).textContent,
    ).toBe('Unsupported document');
    expect(screen.queryByText('Connected')).toBeNull();
  });

  it('limits operation guidance until editable Part Studio capability is confirmed', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={{
          ...confirmedPage,
          editability: 'unknown',
          elementType: 'unknown',
          capabilitySource: null,
          capabilityObservedAt: null,
        }}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );
    advanceToStep(2);

    expect(
      screen.getByText(/has not verified the Part Studio type/),
    ).toBeTruthy();
    expect(
      screen.getByRole('status', { name: 'Connection status' }).textContent,
    ).toBe('Limited observation');
    expect(screen.queryByRole('button', { name: 'Check progress' })).toBeNull();
    expect(
      screen.getByRole('button', { name: "I've finished this step" }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: "I've finished this step" }),
    );

    expect(screen.getByText('Step 2 of 8 · Marked done')).toBeTruthy();
  });

  it('reports UI guidance only after editable Part Studio capability is confirmed', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');

    render(<AssistantPanel page={confirmedPage} />);

    expect(
      screen.getByRole('status', { name: 'Connection status' }).textContent,
    ).toBe('UI guidance available');
  });

  it('provides first-run onboarding and persists its completion', async () => {
    vi.useFakeTimers();
    try {
      const { AssistantPanel } = await import('./AssistantPanel');
      const onPanelPreferencesChange = vi.fn();
      render(
        <AssistantPanel
          page={confirmedPage}
          onPanelPreferencesChange={onPanelPreferencesChange}
        />,
      );

      expect(screen.getByLabelText('Welcome to Leqad')).toBeTruthy();
      expect(
        screen.getByText(/limited set of current interface states/),
      ).toBeTruthy();
      fireEvent.click(
        screen.getByRole('button', { name: 'Begin Your First Sketch' }),
      );
      vi.advanceTimersByTime(250);

      expect(screen.queryByLabelText('Welcome to Leqad')).toBeNull();
      expect(onPanelPreferencesChange.mock.lastCall?.[0]).toMatchObject({
        onboardingComplete: true,
      });
    } finally {
      vi.useRealTimers();
    }
  });

  it('clamps a saved position with the actual panel and viewport sizes', async () => {
    const { clampPanelPosition } = await import('./AssistantPanel');

    expect(
      clampPanelPosition(
        { left: 2_000, top: 2_000 },
        { width: 360, height: 500 },
        { width: 800, height: 600 },
      ),
    ).toEqual({ left: 432, top: 92 });
    expect(
      clampPanelPosition(
        { left: -50, top: -20 },
        { width: 360, height: 500 },
        { width: 320, height: 300 },
      ),
    ).toEqual({ left: 8, top: 8 });
  });

  it('keeps an off-screen saved panel position reachable on mount', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const { container } = render(
      <AssistantPanel
        initialPanelPreferences={{
          collapsed: false,
          position: { left: 10_000, top: 10_000 },
          onboardingComplete: true,
        }}
      />,
    );
    const panel = container.querySelector('[data-leqad-panel]') as HTMLElement;

    expect(Number.parseFloat(panel.style.left)).toBeLessThan(window.innerWidth);
    expect(Number.parseFloat(panel.style.top)).toBeLessThan(window.innerHeight);
    expect(Number.parseFloat(panel.style.left)).toBeGreaterThanOrEqual(8);
    expect(Number.parseFloat(panel.style.top)).toBeGreaterThanOrEqual(8);
  });

  it('reclamps the panel when expanding guidance changes its size', async () => {
    let notifyResize: ResizeObserverCallback | undefined;
    class ResizeObserverMock {
      constructor(callback: ResizeObserverCallback) {
        notifyResize = callback;
      }
      observe() {}
      disconnect() {}
      unobserve() {}
    }
    vi.stubGlobal('ResizeObserver', ResizeObserverMock);
    const { AssistantPanel } = await import('./AssistantPanel');
    const { container } = render(
      <AssistantPanel
        initialPanelPreferences={{
          collapsed: false,
          position: { left: 100, top: 250 },
          onboardingComplete: true,
        }}
      />,
    );
    const panel = container.querySelector('[data-leqad-panel]') as HTMLElement;
    vi.spyOn(panel, 'getBoundingClientRect').mockReturnValue(
      new DOMRect(100, 250, 360, 700),
    );

    act(() => notifyResize?.([], {} as ResizeObserver));

    expect(Number.parseFloat(panel.style.top)).toBe(
      window.innerHeight - 700 - 8,
    );
  });

  it('lets a keyboard-accessible navigation control change the panel mode', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));

    expect(
      screen.getByRole('heading', { name: 'Guided projects' }),
    ).toBeTruthy();
  });

  it('collapses the panel and exposes an accessible way to expand it', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse Leqad panel' }),
    );

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Expand Leqad panel' }),
    ).toBeTruthy();
  });

  it('uses the fixed brand colors as theme tokens', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'apps/extension/src/styles/panel.css'),
      'utf8',
    ).toLowerCase();

    expect(css).toContain('#0d1c43');
    expect(css).toContain('#793327');
    expect(css).toContain('#f5efe7');
  });

  it('offers all eight Foundations steps in order', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );

    const goals = [
      'Understand what you will build',
      'Select the Top reference plane',
      'Enter sketch-editing mode',
      'Draw one closed rectangle with Corner Rectangle',
      'Set the rectangle to 40 mm by 30 mm',
      'Finish sketch editing',
      'Recognize what the sketch created',
      'Repeat the workflow independently',
    ];
    for (const [index, goal] of goals.entries()) {
      expect(screen.getByText(goal)).toBeTruthy();
      expect(screen.getByText(`Step ${index + 1} of 8 · Visited`)).toBeTruthy();
      if (index < goals.length - 1) {
        completeCurrentStep();
        fireEvent.click(screen.getByRole('button', { name: 'Next' }));
      }
    }

    fireEvent.click(
      screen.getByRole('button', { name: "I've finished this step" }),
    );
    expect(screen.getByText('Step 8 of 8 · Marked done')).toBeTruthy();
  });

  it('moves backward and restarts the whole lesson without retaining completion', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );
    advanceToStep(3);

    fireEvent.click(screen.getByRole('button', { name: 'Back' }));
    expect(screen.getByText('Step 2 of 8 · Marked done')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Restart lesson' }));

    expect(screen.getByText('Step 1 of 8 · Visited')).toBeTruthy();
    expect(screen.getByText('Understand what you will build')).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Next' }).hasAttribute('disabled'),
    ).toBe(true);
  });

  it('pauses and resumes the current lesson step', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    expect(
      screen.getByRole('status', { name: 'Lesson progress' }).textContent,
    ).toContain('Lesson paused');
    fireEvent.click(screen.getByRole('button', { name: 'Resume' }));

    expect(
      screen.getByRole('status', { name: 'Lesson progress' }).textContent,
    ).toContain('Waiting for you');
  });

  it('restores the saved current step after reload', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        initialSession={restoredSession('draw-rectangle')}
      />,
    );

    expect(screen.getByText('Step 4 of 8 · Visited')).toBeTruthy();
    expect(
      screen.getByText('Draw one closed rectangle with Corner Rectangle'),
    ).toBeTruthy();
  });

  it('requests semantic highlights only on steps with a target', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const onShowTarget = vi.fn();
    render(
      <AssistantPanel
        page={confirmedPage}
        onShowTarget={onShowTarget}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );

    expect(screen.queryByRole('button', { name: 'Show me' })).toBeNull();
    advanceToStep(2);
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));

    expect(onShowTarget).toHaveBeenCalledWith('top-plane');
  });

  it('updates active Sketch guidance when observable UI changes without a user request', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    let publishSketchUi: ((value: SketchGuidanceObservation) => void) | null =
      null;
    render(
      <AssistantPanel
        page={confirmedPage}
        initialSession={restoredSession('start-sketch')}
        onObserveSketchUi={() => ({
          editingAppearsActive: false,
          uiState: 'UNKNOWN',
          dialogPlane: null,
        })}
        onSubscribeSketchUi={(listener) => {
          publishSketchUi = listener;
          return () => {
            publishSketchUi = null;
          };
        }}
      />,
    );

    expect(
      screen.getByText(
        'With Top plane selected, choose the Sketch command and wait for sketch-editing controls to appear.',
      ),
    ).toBeTruthy();

    act(() => {
      publishSketchUi?.({
        editingAppearsActive: true,
        uiState: 'OPEN',
        dialogPlane: null,
      });
    });

    expect(screen.getByText(/already editing a sketch/)).toBeTruthy();
    expect(
      screen.queryByText(
        'With Top plane selected, choose the Sketch command and wait for sketch-editing controls to appear.',
      ),
    ).toBeNull();
  });

  it('reveals ordered hints and recovery guidance', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'I’m stuck' }));
    expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
    expect(
      screen.getByText('A sketch starts as geometry on one flat reference.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'I’m stuck' }));

    expect(screen.getByText(/Hint 2 of 5/)).toBeTruthy();
    expect(
      screen.getByText(
        'Reference planes provide stable places to begin a sketch.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('RECOVERY')).toBeNull();
  });

  it('keeps lesson progress unverified when no UI evidence can be read', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );
    advanceToStep(2);

    fireEvent.click(screen.getByRole('button', { name: 'Check progress' }));

    expect(
      screen.getByRole('status', { name: 'Lesson progress' }).textContent,
    ).toContain('Unable to verify');
    expect(screen.getByText('Step 2 of 8 · Unable to verify')).toBeTruthy();
    expect(screen.getByText(/What Leqad knows:/)).toBeTruthy();
    expect(screen.getByText(/What remains unknown:/)).toBeTruthy();
    expect(screen.getByText(/Try next:/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: "I've finished this step" }),
    ).toBeTruthy();
  });

  it('records continued unknown progress as self-reported rather than verified', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );
    advanceToStep(2);
    fireEvent.click(screen.getByRole('button', { name: 'Check progress' }));

    fireEvent.click(
      screen.getByRole('button', { name: "I've finished this step" }),
    );

    expect(screen.getByText('Step 2 of 8 · Marked done')).toBeTruthy();
    expect(
      screen.getByRole('status', { name: 'Lesson progress' }).textContent,
    ).toContain('You marked this step done');
  });

  it('explains UI evidence without implying verified model geometry', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('PASS')}
      />,
    );
    advanceToStep(2);

    fireEvent.click(screen.getByRole('button', { name: 'Check progress' }));

    expect(screen.getByText('Step 2 of 8 · UI verified')).toBeTruthy();
    expect(
      screen.getByRole('status', { name: 'Lesson progress' }).textContent,
    ).toContain('Interface evidence confirms');
    expect(screen.getByText(/Model geometry and feature values/)).toBeTruthy();
  });

  it('keeps dimensions unverified even when a callback offers UI evidence', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('PASS')}
      />,
    );
    advanceToStep(5);

    expect(screen.queryByRole('button', { name: 'Check progress' })).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: "I've finished this step" }),
    );
    expect(screen.getByText('Step 5 of 8 · Marked done')).toBeTruthy();
    expect(screen.queryByText('Step 5 of 8 · UI verified')).toBeNull();
  });

  it('persists observed UI facts separately from verified model facts', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const onSessionChange = vi.fn();
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('PASS')}
        onSessionChange={onSessionChange}
      />,
    );
    advanceToStep(2);
    onSessionChange.mockClear();

    fireEvent.click(screen.getByRole('button', { name: 'Check progress' }));

    expect(onSessionChange).toHaveBeenCalledTimes(1);
    expect(onSessionChange.mock.calls[0]?.[0].modelState).toMatchObject({
      observedUiStates: {
        'select-reference-plane': {
          fact: {
            topPlaneSelected: true,
            sketchEditingAppearsActive: true,
          },
          evidenceIds: ['evidence-1'],
        },
      },
      verifiedModelStates: {},
      evidenceReferences: ['evidence-1'],
      evidenceFreshness: 'current',
    });
  });

  it('records lesson visits, hints, and practice attempts in learning history', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const onLearningHistoryChange = vi.fn();
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('UNKNOWN')}
        onLearningHistoryChange={onLearningHistoryChange}
      />,
    );
    advanceToStep(2);

    fireEvent.click(screen.getByRole('button', { name: 'I’m stuck' }));
    fireEvent.click(screen.getByRole('button', { name: 'Check progress' }));

    const history = onLearningHistoryChange.mock.lastCall?.[0];
    expect(history.lessonsVisited).toHaveProperty('foundations-first-sketch');
    expect(history.conceptsIntroduced.length).toBeGreaterThan(0);
    expect(history.hintUsage['select-reference-plane']).toBe(1);
    expect(
      history.practiceAttempts[
        'foundations-first-sketch:select-reference-plane'
      ],
    ).toBe(1);
  });

  it('reuses the current semantic target for repeated local cursor samples', async () => {
    const semanticTargets = await import('../../services/semanticTargets');
    const findTarget = vi.spyOn(semanticTargets, 'findSemanticTarget');
    const target = document.createElement('button');
    target.setAttribute('aria-label', 'Top plane');
    target.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    target.getClientRects = () =>
      [new DOMRect(20, 30, 80, 24)] as unknown as DOMRectList;
    document.body.append(target);
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );
    advanceToStep(2);

    fireEvent.pointerMove(document, { clientX: 24, clientY: 35 });
    fireEvent.pointerMove(document, { clientX: 26, clientY: 36 });

    expect(findTarget).toHaveBeenCalledTimes(1);
  });

  it.each([
    'paused lesson',
    'inactive mode',
    'completed step',
    'collapsed panel',
  ] as const)('stops cursor tracking for an %s', async (inactiveState) => {
    const semanticTargets = await import('../../services/semanticTargets');
    const findTarget = vi.spyOn(semanticTargets, 'findSemanticTarget');
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );
    advanceToStep(2);
    if (inactiveState === 'paused lesson') {
      fireEvent.click(screen.getByRole('button', { name: 'Pause' }));
    } else if (inactiveState === 'completed step') {
      completeCurrentStep();
    } else if (inactiveState === 'collapsed panel') {
      fireEvent.click(
        screen.getByRole('button', { name: 'Collapse Leqad panel' }),
      );
    } else {
      fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
    }

    fireEvent.pointerMove(document, { clientX: 24, clientY: 35 });

    expect(findTarget).not.toHaveBeenCalled();
  });

  it('removes cursor tracking when the panel unmounts', async () => {
    const removeListener = vi.spyOn(document, 'removeEventListener');
    const { AssistantPanel } = await import('./AssistantPanel');
    const view = render(
      <AssistantPanel
        page={confirmedPage}
        onCheckStep={() => uiDecision('UNKNOWN')}
      />,
    );
    advanceToStep(2);

    view.unmount();

    expect(removeListener).toHaveBeenCalledWith(
      'pointermove',
      expect.any(Function),
    );
  });

  it('moves the panel with pointer dragging and stops after cancellation', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const { container } = render(<AssistantPanel />);
    const panel = container.querySelector('[data-leqad-panel]') as HTMLElement;
    const handle = screen.getByRole('group', { name: 'Move Leqad panel' });
    const before = panel.style.left;

    fireEvent.pointerDown(handle, {
      button: 0,
      pointerId: 1,
      clientX: 100,
      clientY: 100,
    });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientX: 60,
      clientY: 100,
    });
    expect(panel.style.left).not.toBe(before);
    const afterMove = panel.style.left;

    fireEvent.pointerCancel(handle, { pointerId: 1 });
    fireEvent.pointerMove(handle, {
      pointerId: 1,
      clientX: 20,
      clientY: 100,
    });
    expect(panel.style.left).toBe(afterMove);
  });

  it('moves the panel using its keyboard-accessible drag handle', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const { container } = render(<AssistantPanel />);
    const panel = container.querySelector('[data-leqad-panel]') as HTMLElement;
    const handle = screen.getByRole('group', { name: 'Move Leqad panel' });
    const before = panel.style.left;

    fireEvent.keyDown(handle, { key: 'ArrowRight' });

    expect(panel.style.left).not.toBe(before);
  });

  it('debounces local preference writes while the panel is moving', async () => {
    vi.useFakeTimers();
    try {
      const { AssistantPanel } = await import('./AssistantPanel');
      const onPanelPreferencesChange = vi.fn();
      render(
        <AssistantPanel onPanelPreferencesChange={onPanelPreferencesChange} />,
      );
      onPanelPreferencesChange.mockClear();
      const handle = screen.getByRole('group', { name: 'Move Leqad panel' });

      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      expect(onPanelPreferencesChange).not.toHaveBeenCalled();

      vi.advanceTimersByTime(250);
      expect(onPanelPreferencesChange).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});

it('discards a cancelled Rectangle report when diagnostics are turned off', async () => {
  const { AssistantPanel } = await import('./AssistantPanel');
  const report: RectangleDropdownCaptureReport = {
    version: 'leqad-rectangle-dropdown/3',
    interactionMode: 'OPEN_THEN_SELECT_RECTANGLE',
    workflowState: 'CANCELLED',
    stateHistory: ['CANCELLED'],
    cancelReason: 'USER_STOP',
    status: 'CANCELLED',
    captureMode: 'AUTOMATIC',
    baseline: inspectRectangleDropdown(document),
    interactions: [],
    transitions: [],
    manualSnapshots: [],
    truncated: false,
  };
  let resolve!: (value: {
    status: 'CANCELLED';
    report: RectangleDropdownCaptureReport;
  }) => void;
  const task: RectangleDropdownCaptureTask = {
    promise: new Promise((done) => {
      resolve = done;
    }),
    cancel: vi.fn(),
    isActive: () => true,
  };
  render(
    <AssistantPanel
      onRecognitionDiagnostics={() => '{}'}
      onCaptureRectangleDropdown={() => task}
    />,
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Capture Rectangle interaction' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Turn off recognition diagnostics' }),
  );
  fireEvent.click(
    screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
  );
  await act(async () => resolve({ status: 'CANCELLED', report }));
  expect(
    screen.queryByRole('button', { name: 'Copy Rectangle dropdown report' }),
  ).toBeNull();
  expect(screen.queryByText('Rectangle capture stopped.')).toBeNull();
});

it('offers an opt-in read-only SHOW diagnosis without repeating a dropdown capture', async () => {
  const { AssistantPanel } = await import('./AssistantPanel');
  const { createGuidanceRunner } =
    await import('../../services/guidanceRunner');
  const lookup = vi.fn(() => ({ status: 'MISSING' as const }));
  const runner = createGuidanceRunner({
    getContext: () => 'UNKNOWN',
    resolveTarget: lookup,
    highlightTarget: () => false,
    clearHighlight: () => undefined,
    observe: () => ({ current: 'UNKNOWN', unsubscribe: () => undefined }),
  });
  render(
    <AssistantPanel
      page={confirmedPage}
      initialSession={restoredSession('draw-rectangle')}
      guidanceRunner={runner}
      onRecognitionDiagnostics={() => '{}'}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
  expect(
    screen.queryByRole('button', { name: 'Copy Rectangle SHOW diagnosis' }),
  ).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
  );
  await act(async () =>
    fireEvent.click(
      screen.getByRole('button', { name: 'Copy Rectangle SHOW diagnosis' }),
    ),
  );
  const report = JSON.parse(
    screen.getByLabelText<HTMLTextAreaElement>('Recognition diagnostics output')
      .value,
  );
  expect(report).toMatchObject({
    version: 'leqad-rectangle-show/1',
    stage: 'CONTEXT',
    reason: 'SKETCH_CONTEXT_UNESTABLISHED',
    productionLookup: 'NOT_RUN',
  });
  expect(lookup).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'HINT' }));
  expect(screen.queryByLabelText('Recognition diagnostics output')).toBeNull();
  runner.dispose();
});
