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
  it('does not suggest recovery from the first stuck hint', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(
      <AssistantPanel
        page={{ ...confirmedPage, editability: 'unknown' }}
        initialSession={restoredSession('start-sketch')}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'I’m stuck' }));
    expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
    expect(screen.queryByText('RECOVERY')).toBeNull();

    for (let index = 0; index < 4; index += 1) {
      fireEvent.click(screen.getByRole('button', { name: 'I’m stuck' }));
    }
    expect(screen.getByText(/Hint 5 of 5/)).toBeTruthy();
    expect(screen.getByText('RECOVERY')).toBeTruthy();
  });

  it('explains active sketches without highlighting Sketch', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const { createGuidanceRunner } = await import(
      '../../services/guidanceRunner'
    );
    const highlightTarget = vi.fn(() => true);
    const runner = createGuidanceRunner({
      getContext: () => 'SKETCH_EDITING',
      resolveTarget: () => ({ status: 'FOUND' }),
      highlightTarget,
      clearHighlight: vi.fn(),
      observe: () => ({
        current: 'UNKNOWN',
        unsubscribe: vi.fn(),
      }),
    });
    render(
      <AssistantPanel
        page={{ ...confirmedPage, editability: 'unknown' }}
        initialSession={restoredSession('start-sketch')}
        guidanceRunner={runner}
        onObserveSketchUi={() => ({
          editingAppearsActive: true,
          dialogPlane: 'Top',
        })}
      />,
    );

    fireEvent.click(screen.getByRole('button', { name: 'SHOW' }));
    expect(
      screen.getByText(/Sketch editing already appears active/),
    ).toBeTruthy();
    expect(screen.getByText(/mark the step done and continue/)).toBeTruthy();
    expect(highlightTarget).not.toHaveBeenCalled();
    expect(screen.getByText('Step 3 of 8 · Visited')).toBeTruthy();
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
        page={confirmedPage}
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
    expect(screen.getByText(/highlighted control is ready/)).toBeTruthy();
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
    'offers a written instruction and explicit Retry guidance for %s targets',
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
        screen.getByRole('button', { name: 'Retry guidance' }),
      ).toBeTruthy();
      expect(screen.getByText(/Follow the written instruction/)).toBeTruthy();
      fireEvent.click(screen.getByRole('button', { name: 'Retry guidance' }));
      expect(resolveTarget).toHaveBeenCalledTimes(2);
      expect(screen.getByText('Step 4 of 8 · Visited')).toBeTruthy();
    },
  );

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
      version: 'leqad-rectangle-dropdown/1',
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
      screen.queryByRole('button', { name: 'Capture Rectangle dropdown' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Enable recognition diagnostics' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Capture Rectangle dropdown' }),
    );
    expect(onCaptureRectangleDropdown).toHaveBeenCalledTimes(1);
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
      screen.getByRole('button', { name: 'Capture Rectangle dropdown' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Turn off recognition diagnostics' }),
    );

    expect(task.cancel).toHaveBeenCalledTimes(1);
    expect(
      screen.queryByRole('button', { name: 'Capture Rectangle dropdown' }),
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
      screen.getByText(/has not verified the Part Studio type or editing permission/),
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
      'Draw one rectangle',
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
    expect(screen.getByText('Draw one rectangle')).toBeTruthy();
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

  it.each(['paused lesson', 'inactive mode'] as const)(
    'stops cursor tracking for an %s',
    async (inactiveState) => {
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
      } else {
        fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
      }

      fireEvent.pointerMove(document, { clientX: 24, clientY: 35 });

      expect(findTarget).not.toHaveBeenCalled();
    },
  );

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
