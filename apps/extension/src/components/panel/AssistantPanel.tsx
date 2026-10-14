import { useEffect, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { ModelIdentity, VerificationDecision } from '@leqad/contracts';
import {
  FOUNDATIONS_FIRST_SKETCH,
  advanceHint,
  createInitialLessonStepState,
  createUnknownLessonModelState,
  transitionLessonStep,
} from '@leqad/lesson-engine';
import type {
  LessonModelState,
  LessonSession,
  LessonStepOutcome,
  LessonStepState,
} from '@leqad/lesson-engine';
import {
  appendCursorSample,
  estimateCursorIntent,
} from '../../services/cursorIntent';
import type { CursorSample } from '../../services/cursorIntent';
import {
  hasFoundationsStepObserver,
  unavailableFoundationsDecision,
} from '../../services/foundationsEvidence';
import type { OnshapePageContext } from '../../services/onshapePage';
import { createEmptyLearningHistory } from '../../services/progressStore';
import type {
  LearningHistory,
  PanelPreferences,
} from '../../services/progressStore';
import {
  findSemanticTarget,
  isUsableSemanticTarget,
} from '../../services/semanticTargets';
import type { SemanticTargetId } from '../../services/semanticTargets';
import type { SemanticTargetRecognition } from '../../services/semanticTargets';
import type { SketchGuidanceObservation } from '../../services/sketchGuidance';
import type {
  TopRowCaptureReport,
  TopRowCaptureTask,
} from '../../services/recognitionDiagnostics';

interface AssistantPanelProps {
  onClearTarget?: () => void;
  onObserveSketchUi?: () => SketchGuidanceObservation;
  onCaptureTopRow?: () => TopRowCaptureTask;
  onRecognitionDiagnostics?: (capture?: TopRowCaptureReport) => string;
  page?: OnshapePageContext;
  initialSession?: LessonSession | null;
  initialPanelPreferences?: PanelPreferences;
  initialLearningHistory?: LearningHistory;
  onShowTarget?: (
    targetId: SemanticTargetId,
  ) => SemanticTargetRecognition | void;
  onCheckStep?: (
    stepId: string,
    completionSignal: string,
  ) => VerificationDecision;
  onSessionChange?: (session: LessonSession) => void;
  onPanelPreferencesChange?: (preferences: PanelPreferences) => void;
  onLearningHistoryChange?: (history: LearningHistory) => void;
}

type PanelMode = 'Learn' | 'Projects' | 'Ask';

interface Position {
  left: number;
  top: number;
}

interface DragStart extends Position {
  pointerX: number;
  pointerY: number;
}

interface PanelSize {
  width: number;
  height: number;
}

interface ViewportSize {
  width: number;
  height: number;
}

interface InitialLessonState {
  currentStepIndex: number;
  stepStates: Record<string, LessonStepState>;
}

function beginStep(state: LessonStepState): LessonStepState {
  const started = transitionLessonStep(state, { type: 'START' });
  return transitionLessonStep(started, { type: 'BEGIN_STEP' });
}

function createFreshLessonState(): InitialLessonState {
  const stepStates = Object.fromEntries(
    FOUNDATIONS_FIRST_SKETCH.steps.map(({ id }) => [
      id,
      createInitialLessonStepState(),
    ]),
  );
  const firstStep = FOUNDATIONS_FIRST_SKETCH.steps[0];
  if (firstStep)
    stepStates[firstStep.id] = beginStep(stepStates[firstStep.id]!);
  return { currentStepIndex: 0, stepStates };
}

function getInitialLessonState(
  initialSession?: LessonSession | null,
): InitialLessonState {
  if (
    initialSession?.lessonId !== FOUNDATIONS_FIRST_SKETCH.id ||
    initialSession.lessonVersion !== FOUNDATIONS_FIRST_SKETCH.version
  ) {
    return createFreshLessonState();
  }

  const currentStepIndex = Math.max(
    0,
    FOUNDATIONS_FIRST_SKETCH.steps.findIndex(
      ({ id }) => id === initialSession.currentStepId,
    ),
  );
  const stepStates = Object.fromEntries(
    FOUNDATIONS_FIRST_SKETCH.steps.map(({ id }) => [
      id,
      initialSession.steps[id] ?? createInitialLessonStepState(),
    ]),
  );
  const currentStep = FOUNDATIONS_FIRST_SKETCH.steps[currentStepIndex];
  if (currentStep) {
    stepStates[currentStep.id] = beginStep(stepStates[currentStep.id]!);
  }
  return { currentStepIndex, stepStates };
}

export function clampPanelPosition(
  position: Position,
  panel: PanelSize,
  viewport: ViewportSize,
): Position {
  const margin = 8;
  return {
    left: Math.min(
      Math.max(margin, position.left),
      Math.max(margin, viewport.width - panel.width - margin),
    ),
    top: Math.min(
      Math.max(margin, position.top),
      Math.max(margin, viewport.height - panel.height - margin),
    ),
  };
}

function fallbackPanelSize(collapsed: boolean): PanelSize {
  return {
    width: collapsed ? 280 : 360,
    height: collapsed ? 56 : Math.min(620, window.innerHeight - 16),
  };
}

function getInitialPosition(preferences?: PanelPreferences): Position {
  const position = preferences?.position ?? {
    left: Math.max(16, window.innerWidth - 376),
    top: Math.max(16, window.innerHeight - 500),
  };
  return clampPanelPosition(
    position,
    fallbackPanelSize(preferences?.collapsed ?? false),
    { width: window.innerWidth, height: window.innerHeight },
  );
}

function capabilityLabel(page: OnshapePageContext | undefined): string {
  if (!page?.supported) return 'Unsupported document';
  if (page.editability === 'editable' && page.elementType === 'part-studio') {
    return 'UI guidance available';
  }
  return 'Limited observation';
}

function modelStateWithDecision(
  prior: LessonModelState,
  stepId: string,
  decision: VerificationDecision,
): LessonModelState {
  const evidenceIds = decision.evidence.map(({ id }) => id);
  const observedUiStates = { ...prior.observedUiStates };
  const verifiedModelStates = { ...prior.verifiedModelStates };

  if (decision.evidenceLevel === 'UI_CONFIRMED' && decision.observedFact) {
    observedUiStates[stepId] = {
      fact: decision.observedFact,
      observedAt: decision.observedAt,
      expiresAt: decision.evidence[0]?.expiresAt ?? null,
      evidenceIds,
    };
  }
  if (
    decision.status === 'PASS' &&
    decision.evidenceLevel === 'API_CONFIRMED' &&
    decision.observedFact
  ) {
    verifiedModelStates[stepId] = {
      status: decision.status,
      observedAt: decision.observedAt,
      revision: decision.revision,
      evidenceIds,
    };
  }

  return {
    observedUiStates,
    verifiedModelStates,
    evidenceReferences: Array.from(
      new Set([...prior.evidenceReferences, ...evidenceIds]),
    ),
    evidenceFreshness: evidenceIds.length > 0 ? 'current' : 'unknown',
    uncertaintyReason:
      decision.missingRequirements.length > 0
        ? decision.missingRequirements.join('; ')
        : null,
  };
}

function makeSession(
  page: OnshapePageContext | undefined,
  currentStepId: string,
  stepStates: Record<string, LessonStepState>,
  prior: LessonSession | null | undefined,
  decision?: VerificationDecision,
): LessonSession | null {
  if (
    !page?.supported ||
    !page.documentId ||
    !page.workspaceId ||
    !page.elementId
  ) {
    return null;
  }
  const identity: ModelIdentity = {
    documentId: page.documentId,
    workspaceId: page.workspaceId,
    elementId: page.elementId,
    revision: null,
  };
  const priorModelState =
    prior?.modelState ??
    createUnknownLessonModelState(
      'The current model revision is unknown; model-dependent progress must be checked again.',
    );

  return {
    lessonId: FOUNDATIONS_FIRST_SKETCH.id,
    lessonVersion: FOUNDATIONS_FIRST_SKETCH.version,
    currentStepId,
    modelIdentity: identity,
    modelRevision: null,
    modelState: decision
      ? modelStateWithDecision(priorModelState, currentStepId, decision)
      : priorModelState,
    updatedAt: new Date().toISOString(),
    steps: stepStates,
  };
}

function outcomeLabel(outcome: LessonStepOutcome): string {
  const labels: Record<LessonStepOutcome, string> = {
    NONE: 'Visited',
    ACKNOWLEDGED: 'Acknowledged',
    UI_VERIFIED: 'UI verified',
    MODEL_VERIFIED: 'Model verified',
    SELF_REPORTED: 'Marked done',
    UNABLE_TO_VERIFY: 'Unable to verify',
  };
  return labels[outcome];
}

function describeProgress(state: LessonStepState): string {
  if (state.status === 'PAUSED') return 'Lesson paused.';
  if (state.outcome === 'ACKNOWLEDGED') {
    return 'Acknowledged. This informational step does not claim CAD verification.';
  }
  if (state.outcome === 'UI_VERIFIED') {
    return 'Interface evidence confirms the supported UI state for this step. Model geometry and feature values are not checked.';
  }
  if (state.outcome === 'MODEL_VERIFIED') {
    return 'Current model evidence confirms this step.';
  }
  if (state.outcome === 'SELF_REPORTED') {
    return 'You marked this step done. Leqad has not verified your CAD work.';
  }
  if (state.status === 'UNKNOWN' || state.outcome === 'UNABLE_TO_VERIFY') {
    return 'Unable to verify. Leqad could not obtain the required current evidence.';
  }
  if (state.status === 'NEEDS_CORRECTION') {
    return 'Needs correction. Review the recovery guidance and try again.';
  }
  return 'Waiting for you to try the guided action.';
}

function describeUnavailableDecision(decision: VerificationDecision): string {
  const known =
    decision.evidence.length > 0
      ? 'Leqad observed supported interface evidence for the active document.'
      : 'Leqad has no current supported observation for this check.';
  const unknown =
    decision.missingRequirements.length > 0
      ? decision.missingRequirements.join('; ')
      : 'The required CAD state.';
  const next =
    decision.recoveryAction ??
    'Follow the written action, then check progress again.';
  return `What happened: ${decision.explanation} What Leqad knows: ${known} What remains unknown: ${unknown}. Try next: ${next}`;
}

export function AssistantPanel({
  page,
  initialSession = null,
  initialPanelPreferences,
  initialLearningHistory,
  onShowTarget,
  onClearTarget,
  onObserveSketchUi,
  onCaptureTopRow,
  onRecognitionDiagnostics,
  onCheckStep,
  onSessionChange,
  onPanelPreferencesChange,
  onLearningHistoryChange,
}: AssistantPanelProps) {
  const initialLesson = useRef(getInitialLessonState(initialSession));
  const [mode, setMode] = useState<PanelMode>('Learn');
  const [collapsed, setCollapsed] = useState(
    initialPanelPreferences?.collapsed ?? false,
  );
  const [onboardingComplete, setOnboardingComplete] = useState(
    initialPanelPreferences?.onboardingComplete ?? false,
  );
  const [position, setPosition] = useState(() =>
    getInitialPosition(initialPanelPreferences),
  );
  const [currentStepIndex, setCurrentStepIndex] = useState(
    initialLesson.current.currentStepIndex,
  );
  const [stepStates, setStepStates] = useState(
    initialLesson.current.stepStates,
  );
  const [showReason, setShowReason] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [guidanceMessage, setGuidanceMessage] = useState('');
  const [sketchUi, setSketchUi] = useState<SketchGuidanceObservation | null>(
    null,
  );
  const [diagnosticsEnabled, setDiagnosticsEnabled] = useState(false);
  const [diagnosticsOutput, setDiagnosticsOutput] = useState('');
  const [diagnosticsMessage, setDiagnosticsMessage] = useState('');
  const [capturePending, setCapturePending] = useState(false);
  const [captureReport, setCaptureReport] =
    useState<TopRowCaptureReport | null>(null);
  const [cursorCue, setCursorCue] = useState('');
  const dragStart = useRef<DragStart | null>(null);
  const panelRef = useRef<HTMLElement | null>(null);
  const recentSamples = useRef<CursorSample[]>([]);
  const lastIntentAnalysisAt = useRef(Number.NEGATIVE_INFINITY);
  const sessionRef = useRef<LessonSession | null>(initialSession);
  const captureTaskRef = useRef<TopRowCaptureTask | null>(null);
  const captureGeneration = useRef(0);
  const learningHistoryRef = useRef<LearningHistory>(
    initialLearningHistory ?? createEmptyLearningHistory(),
  );
  const step = FOUNDATIONS_FIRST_SKETCH.steps[currentStepIndex];
  const stepState = step ? stepStates[step.id] : undefined;
  const sketchGuidanceRelevant =
    step?.semanticTarget === 'top-plane' || step?.semanticTarget === 'sketch';

  useEffect(
    () => () => {
      captureGeneration.current++;
      captureTaskRef.current?.cancel();
      captureTaskRef.current = null;
    },
    [],
  );

  useEffect(() => {
    onClearTarget?.();
    setSketchUi(
      sketchGuidanceRelevant && !collapsed
        ? (onObserveSketchUi?.() ?? null)
        : null,
    );
    return () => onClearTarget?.();
  }, [
    step?.id,
    stepState?.status,
    mode,
    collapsed,
    onClearTarget,
    onObserveSketchUi,
    sketchGuidanceRelevant,
  ]);

  const recordLearningHistory = (
    stepId: string,
    nextHintLevel: number,
    practiceAttemptDelta = 0,
  ) => {
    const prior = learningHistoryRef.current;
    const now = new Date().toISOString();
    const priorVisit = prior.lessonsVisited[FOUNDATIONS_FIRST_SKETCH.id];
    const practiceKey = `${FOUNDATIONS_FIRST_SKETCH.id}:${stepId}`;
    const next: LearningHistory = {
      lessonsVisited: {
        ...prior.lessonsVisited,
        [FOUNDATIONS_FIRST_SKETCH.id]: {
          lessonVersion: FOUNDATIONS_FIRST_SKETCH.version,
          firstVisitedAt: priorVisit?.firstVisitedAt ?? now,
          lastVisitedAt: now,
        },
      },
      conceptsIntroduced: Array.from(
        new Set([
          ...prior.conceptsIntroduced,
          ...FOUNDATIONS_FIRST_SKETCH.objectives,
        ]),
      ),
      hintUsage: {
        ...prior.hintUsage,
        [stepId]: Math.max(prior.hintUsage[stepId] ?? 0, nextHintLevel),
      },
      practiceAttempts: {
        ...prior.practiceAttempts,
        [practiceKey]:
          (prior.practiceAttempts[practiceKey] ?? 0) + practiceAttemptDelta,
      },
    };
    learningHistoryRef.current = next;
    onLearningHistoryChange?.(next);
  };

  useEffect(() => {
    if (step && stepState) recordLearningHistory(step.id, stepState.hintLevel);
  }, []);

  useEffect(() => {
    const timeout = window.setTimeout(
      () =>
        onPanelPreferencesChange?.({
          collapsed,
          position,
          onboardingComplete,
        }),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [collapsed, onboardingComplete, position, onPanelPreferencesChange]);

  const clampToViewport = (candidate: Position): Position => {
    const rect = panelRef.current?.getBoundingClientRect();
    const fallback = fallbackPanelSize(collapsed);
    return clampPanelPosition(
      candidate,
      {
        width: rect && rect.width > 0 ? rect.width : fallback.width,
        height: rect && rect.height > 0 ? rect.height : fallback.height,
      },
      { width: window.innerWidth, height: window.innerHeight },
    );
  };

  useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      setPosition((current) => {
        const next = clampToViewport(current);
        return next.left === current.left && next.top === current.top
          ? current
          : next;
      });
    });
    return () => window.cancelAnimationFrame(frame);
  }, [collapsed, mode]);

  useEffect(() => {
    const onResize = () => {
      setPosition((current) => {
        const next = clampToViewport(current);
        return next.left === current.left && next.top === current.top
          ? current
          : next;
      });
    };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  });

  useEffect(() => {
    const panel = panelRef.current;
    if (!panel || !window.ResizeObserver) return;
    const resizeObserver = new window.ResizeObserver(() => {
      const rect = panel.getBoundingClientRect();
      setPosition((current) => {
        const next = clampPanelPosition(
          current,
          {
            width:
              rect.width > 0 ? rect.width : fallbackPanelSize(collapsed).width,
            height:
              rect.height > 0
                ? rect.height
                : fallbackPanelSize(collapsed).height,
          },
          { width: window.innerWidth, height: window.innerHeight },
        );
        return next.left === current.left && next.top === current.top
          ? current
          : next;
      });
    });
    resizeObserver.observe(panel);
    return () => resizeObserver.disconnect();
  }, [collapsed]);

  useEffect(
    () => () => {
      dragStart.current = null;
    },
    [],
  );

  useEffect(() => {
    if (
      !step?.semanticTarget ||
      !stepState ||
      mode !== 'Learn' ||
      collapsed ||
      stepState.status === 'PAUSED'
    ) {
      recentSamples.current = [];
      lastIntentAnalysisAt.current = Number.NEGATIVE_INFINITY;
      setCursorCue((value) => (value ? '' : value));
      return;
    }
    const targetId = step.semanticTarget as SemanticTargetId;
    let intentTarget: HTMLElement | null = null;
    let nextTargetLookupAt = Number.NEGATIVE_INFINITY;
    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (intentTarget && !isUsableSemanticTarget(intentTarget, targetId)) {
        intentTarget = null;
        recentSamples.current = [];
        lastIntentAnalysisAt.current = Number.NEGATIVE_INFINITY;
      }
      if (!intentTarget && now >= nextTargetLookupAt) {
        nextTargetLookupAt = now + 500;
        intentTarget = findSemanticTarget(document, targetId);
      }
      if (!intentTarget) {
        recentSamples.current = [];
        lastIntentAnalysisAt.current = Number.NEGATIVE_INFINITY;
        setCursorCue((value) => (value ? '' : value));
        return;
      }

      const rect = intentTarget.getBoundingClientRect();
      const samples = recentSamples.current;
      appendCursorSample(samples, {
        x: event.clientX,
        y: event.clientY,
        at: now,
      });
      if (now - lastIntentAnalysisAt.current < 50) return;
      lastIntentAnalysisAt.current = now;
      const intent = estimateCursorIntent(samples, rect);
      const nextCue =
        intent.cue !== 'CLEAR_TARGET' && intent.cue !== 'DIRECT_INSTRUCTION'
          ? ''
          : `Local cue: you are near the ${step.goal.toLocaleLowerCase()} control.`;
      setCursorCue((value) => (value === nextCue ? value : nextCue));
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => document.removeEventListener('pointermove', onPointerMove);
  }, [collapsed, currentStepIndex, mode, step, stepState]);

  if (!step || !stepState) return null;
  const operationGuidanceAvailable = Boolean(
    page?.supported &&
    page.editability === 'editable' &&
    page.elementType === 'part-studio',
  );
  const stepObserverAvailable = Boolean(
    onCheckStep && hasFoundationsStepObserver(step.completionSignal),
  );
  const verificationUnavailable =
    step.completionMode === 'UI_VERIFICATION' && !stepObserverAvailable;
  const alreadySketching =
    sketchGuidanceRelevant && sketchUi?.editingAppearsActive;
  const canContinueUnverified =
    step.allowUnverifiedContinuation &&
    (stepState.status === 'UNKNOWN' ||
      (step.completionMode === 'UI_VERIFICATION' &&
        stepState.status === 'AWAITING_ACTION' &&
        (!operationGuidanceAvailable ||
          verificationUnavailable ||
          alreadySketching)));

  const persistLesson = (
    nextStepId: string,
    nextStates: Record<string, LessonStepState>,
    decision?: VerificationDecision,
  ) => {
    setStepStates(nextStates);
    const session = makeSession(
      page,
      nextStepId,
      nextStates,
      sessionRef.current,
      decision,
    );
    if (session) {
      sessionRef.current = session;
      onSessionChange?.(session);
    }
  };

  const updateCurrentStep = (
    next: LessonStepState,
    decision?: VerificationDecision,
  ) => {
    persistLesson(step.id, { ...stepStates, [step.id]: next }, decision);
  };

  const resetTransientGuidance = () => {
    setShowReason(false);
    setShowRecovery(false);
    setGuidanceMessage('');
    setCursorCue('');
    recentSamples.current = [];
    lastIntentAnalysisAt.current = Number.NEGATIVE_INFINITY;
  };

  const showTarget = () => {
    if (!step.semanticTarget || stepState.status === 'PAUSED') return;
    const currentSketchUi = sketchGuidanceRelevant
      ? onObserveSketchUi?.()
      : undefined;
    setSketchUi(currentSketchUi ?? null);
    if (currentSketchUi?.editingAppearsActive) {
      onClearTarget?.();
      setGuidanceMessage('');
      return;
    }
    const recognition = onShowTarget?.(step.semanticTarget as SemanticTargetId);
    if (recognition?.status === 'FOUND' && recognition.element?.isConnected) {
      setGuidanceMessage(
        'The highlighted row or control is ready for you to use.',
      );
      return;
    }
    if (recognition?.status === 'AMBIGUOUS')
      setGuidanceMessage(
        "I found more than one possible control, so I won't highlight the wrong one.",
      );
    else if (
      step.semanticTarget === 'top-plane' &&
      recognition?.status === 'REJECTED' &&
      recognition.confidence === 'LOW'
    )
      setGuidanceMessage(
        "I can't safely identify the Top plane row. Expand Default geometry and try again.",
      );
    else if (
      step.semanticTarget === 'top-plane' &&
      recognition?.status === 'REJECTED' &&
      recognition.enabled === 'DISABLED'
    )
      setGuidanceMessage(
        'The Top plane row is unavailable. Check the current Onshape state and try again.',
      );
    else if (
      step.semanticTarget === 'top-plane' &&
      recognition?.status === 'REJECTED'
    )
      setGuidanceMessage(
        'The Top plane isn’t fully visible. Expand Default geometry, scroll the row into view, and try again.',
      );
    else if (step.semanticTarget === 'top-plane')
      setGuidanceMessage(
        "I couldn't find the Top plane. Expand Default geometry on the left, make the row visible, and try again.",
      );
    else
      setGuidanceMessage(
        "I couldn't highlight that control. Make sure its toolbar is open and try again.",
      );
  };

  const beginTopRowCapture = () => {
    if (!diagnosticsEnabled || !onCaptureTopRow) return;
    captureTaskRef.current?.cancel();
    setCaptureReport(null);
    setDiagnosticsOutput('');
    setDiagnosticsMessage(
      'Click the visible Top row in Onshape within 20 seconds. Its click will continue normally.',
    );
    setCapturePending(true);
    const generation = ++captureGeneration.current;
    const task = onCaptureTopRow();
    captureTaskRef.current = task;
    void task.promise.then((result) => {
      if (captureGeneration.current !== generation) return;
      captureTaskRef.current = null;
      setCapturePending(false);
      if (result.status === 'CAPTURED') {
        setCaptureReport(result.report);
        setDiagnosticsMessage(
          'Top row structure captured. Copy the sanitized report when ready.',
        );
      } else if (result.status === 'TIMED_OUT') {
        setDiagnosticsMessage(
          'No row was captured. Enable diagnostics and try Capture Top row again.',
        );
      } else {
        setDiagnosticsMessage('Top row capture stopped.');
      }
    });
  };

  const stopTopRowCapture = () => {
    captureGeneration.current++;
    captureTaskRef.current?.cancel();
    captureTaskRef.current = null;
    setCapturePending(false);
  };

  const copyDiagnostics = async () => {
    if (!diagnosticsEnabled || !onRecognitionDiagnostics) return;
    try {
      const report = onRecognitionDiagnostics(captureReport ?? undefined);
      setDiagnosticsOutput(report);
      if (!navigator.clipboard?.writeText) {
        setDiagnosticsMessage('Select and copy the report below.');
        return;
      }
      try {
        await navigator.clipboard.writeText(report);
        setDiagnosticsMessage('Sanitized recognition diagnostics copied.');
      } catch {
        setDiagnosticsMessage(
          'Clipboard unavailable. Select and copy the report below.',
        );
      }
    } catch {
      setDiagnosticsOutput('');
      setDiagnosticsMessage('Diagnostics could not be collected. Try again.');
    }
  };

  const checkProgress = () => {
    if (!step.requiredEvidence || !stepObserverAvailable) return;
    const checking = transitionLessonStep(stepState, {
      type: 'CHECK_PROGRESS',
    });
    if (checking.status !== 'VERIFYING') return;
    const decision =
      onCheckStep?.(step.id, step.completionSignal) ??
      unavailableFoundationsDecision(
        page,
        'No supported progress observation is available for this step.',
        [step.completionSignal],
      );
    const next = transitionLessonStep(checking, {
      type: 'VERIFICATION_RESULT',
      decision,
      requiredEvidence: step.requiredEvidence,
      evaluatedAt: new Date().toISOString(),
    });
    updateCurrentStep(next, decision);
    recordLearningHistory(step.id, stepState.hintLevel, 1);
    setShowRecovery(
      decision.status === 'FAIL' || decision.status === 'WARNING',
    );
    setGuidanceMessage(
      decision.status === 'PASS' ? '' : describeUnavailableDecision(decision),
    );
  };

  const completeWithoutEvidence = (
    event: 'ACKNOWLEDGE' | 'SELF_REPORT' | 'CONTINUE_UNVERIFIED',
  ) => {
    const next = transitionLessonStep(stepState, { type: event });
    updateCurrentStep(next);
    if (event === 'SELF_REPORT') {
      recordLearningHistory(step.id, stepState.hintLevel, 1);
    }
  };

  const advanceHintLevel = () => {
    const nextHintLevel = advanceHint(stepState.hintLevel);
    updateCurrentStep({ ...stepState, hintLevel: nextHintLevel });
    recordLearningHistory(step.id, nextHintLevel);
    setShowRecovery(true);
  };

  const pauseOrResume = () => {
    updateCurrentStep(
      transitionLessonStep(
        stepState,
        stepState.status === 'PAUSED' ? { type: 'RESUME' } : { type: 'PAUSE' },
      ),
    );
  };

  const retryStep = () => {
    updateCurrentStep(transitionLessonStep(stepState, { type: 'RETRY' }));
    setShowRecovery(false);
  };

  const goToStep = (nextIndex: number) => {
    const nextStep = FOUNDATIONS_FIRST_SKETCH.steps[nextIndex];
    if (!nextStep) return;
    const nextState = beginStep(stepStates[nextStep.id]!);
    const nextStates = { ...stepStates, [nextStep.id]: nextState };
    setCurrentStepIndex(nextIndex);
    persistLesson(nextStep.id, nextStates);
    recordLearningHistory(nextStep.id, nextState.hintLevel);
    resetTransientGuidance();
  };

  const restartLesson = () => {
    const fresh = createFreshLessonState();
    const firstStep = FOUNDATIONS_FIRST_SKETCH.steps[0];
    if (!firstStep) return;
    sessionRef.current = null;
    setCurrentStepIndex(0);
    persistLesson(firstStep.id, fresh.stepStates);
    resetTransientGuidance();
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button'))
    ) {
      return;
    }
    dragStart.current = {
      pointerX: event.clientX,
      pointerY: event.clientY,
      left: position.left,
      top: position.top,
    };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };

  const moveDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    const start = dragStart.current;
    if (!start) return;
    setPosition(
      clampToViewport({
        left: start.left + event.clientX - start.pointerX,
        top: start.top + event.clientY - start.pointerY,
      }),
    );
  };

  const moveWithKeyboard = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    const amount = event.shiftKey ? 32 : 16;
    const delta = {
      ArrowUp: { left: 0, top: -amount },
      ArrowDown: { left: 0, top: amount },
      ArrowLeft: { left: -amount, top: 0 },
      ArrowRight: { left: amount, top: 0 },
    }[event.key];
    if (!delta) return;
    event.preventDefault();
    setPosition(
      clampToViewport({
        left: position.left + delta.left,
        top: position.top + delta.top,
      }),
    );
  };

  const panelStyle = { left: `${position.left}px`, top: `${position.top}px` };
  const visibleHint =
    stepState.hintLevel > 0 ? step.hints[stepState.hintLevel - 1] : null;
  const canGoNext =
    stepState.status === 'COMPLETED' &&
    currentStepIndex < FOUNDATIONS_FIRST_SKETCH.steps.length - 1;

  return (
    <div data-leqad-root>
      <section
        ref={panelRef}
        className={`leqad-panel${collapsed ? ' leqad-panel--collapsed' : ''}`}
        style={panelStyle}
        data-leqad-panel
      >
        <header
          className="leqad-panel__header"
          role="group"
          aria-label="Move Leqad panel"
          tabIndex={0}
          onPointerDown={beginDrag}
          onPointerMove={moveDrag}
          onPointerUp={() => (dragStart.current = null)}
          onPointerCancel={() => (dragStart.current = null)}
          onKeyDown={moveWithKeyboard}
        >
          <div className="leqad-wordmark" aria-label="Leqad">
            <span className="leqad-wordmark__mark" aria-hidden="true">
              L
            </span>
            <span>Leqad</span>
          </div>
          <div className="leqad-panel__header-meta">
            <span className="leqad-mode-label">{mode}</span>
            <span
              className="leqad-connection"
              role="status"
              aria-label="Connection status"
            >
              {capabilityLabel(page)}
            </span>
          </div>
          <button
            className="leqad-icon-button"
            type="button"
            aria-label={
              collapsed ? 'Expand Leqad panel' : 'Collapse Leqad panel'
            }
            onClick={() => setCollapsed((value) => !value)}
          >
            {collapsed ? '+' : '−'}
          </button>
        </header>

        {!collapsed && (
          <>
            {page && !operationGuidanceAvailable && (
              <p className="leqad-readonly-note">
                {page.editability === 'read-only'
                  ? 'This document view is read-only. Editing guidance is unavailable.'
                  : 'Leqad cannot confirm an editable Part Studio here. Informational guidance remains available.'}
              </p>
            )}
            <nav className="leqad-nav" aria-label="Leqad modes">
              {(['Learn', 'Projects', 'Ask'] as const).map((item) => (
                <button
                  type="button"
                  key={item}
                  className={`leqad-nav__item${mode === item ? ' is-active' : ''}`}
                  aria-current={mode === item ? 'page' : undefined}
                  onClick={() => setMode(item)}
                >
                  {item}
                </button>
              ))}
            </nav>

            <main className="leqad-panel__body">
              {!onboardingComplete && (
                <section
                  className="leqad-onboarding"
                  aria-label="Welcome to Leqad"
                >
                  <p className="leqad-eyebrow">WELCOME</p>
                  <h2>Learn CAD in your workspace</h2>
                  <p>
                    Leqad guides you through Onshape with written steps,
                    progressive hints, and highlights for controls it can
                    recognize.
                  </p>
                  <p>
                    It can observe a limited set of current interface states.
                    Model geometry, feature values, and design correctness stay
                    unverified unless current model evidence is available.
                  </p>
                  <button
                    type="button"
                    className="leqad-button leqad-button--primary"
                    onClick={() => {
                      setMode('Learn');
                      setOnboardingComplete(true);
                    }}
                  >
                    Begin Your First Sketch
                  </button>
                </section>
              )}
              {mode === 'Learn' && (
                <section
                  aria-label="Foundations lesson"
                  className="leqad-lesson"
                >
                  <p className="leqad-eyebrow">FOUNDATIONS · LESSON 01</p>
                  <h2>{FOUNDATIONS_FIRST_SKETCH.title}</h2>
                  <p className="leqad-intro">
                    {FOUNDATIONS_FIRST_SKETCH.description}
                  </p>
                  <p className="leqad-step-count">
                    Step {currentStepIndex + 1} of{' '}
                    {FOUNDATIONS_FIRST_SKETCH.steps.length} ·{' '}
                    {outcomeLabel(stepState.outcome)}
                  </p>

                  <div className="leqad-step-card">
                    <p className="leqad-eyebrow">GOAL</p>
                    <p className="leqad-goal">{step.goal}</p>
                    <p className="leqad-eyebrow">NEXT ACTION</p>
                    {alreadySketching ? (
                      <div className="leqad-guidance" aria-live="polite">
                        <p>
                          It looks like you’re already editing a sketch. You can
                          mark this step done when you’re ready.
                        </p>
                        {sketchUi?.dialogPlane && (
                          <p>
                            The Sketch dialog displays {sketchUi.dialogPlane}{' '}
                            plane. Your CAD work is still unverified.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p>{step.action}</p>
                    )}
                    <div className="leqad-help-row">
                      {step.semanticTarget && (
                        <button
                          type="button"
                          className="leqad-button leqad-button--secondary"
                          onClick={showTarget}
                          disabled={stepState.status === 'PAUSED'}
                        >
                          Show me
                        </button>
                      )}
                      <button
                        type="button"
                        className="leqad-button leqad-button--text"
                        onClick={() => setShowReason((value) => !value)}
                      >
                        Why?
                      </button>
                      <button
                        type="button"
                        className="leqad-button leqad-button--text"
                        onClick={advanceHintLevel}
                        disabled={stepState.status === 'PAUSED'}
                      >
                        I’m stuck
                      </button>
                    </div>
                    {showReason && (
                      <p className="leqad-explanation">{step.explanation}</p>
                    )}
                    {visibleHint && (
                      <p className="leqad-hint" aria-live="polite">
                        <strong>
                          Hint {Math.min(stepState.hintLevel, 5)} of 5:
                        </strong>{' '}
                        {visibleHint}
                      </p>
                    )}
                    {showRecovery && (
                      <div className="leqad-recovery">
                        <p className="leqad-eyebrow">RECOVERY</p>
                        <p>
                          {
                            step.recoveryActions[
                              Math.min(
                                Math.max(stepState.hintLevel - 1, 0),
                                step.recoveryActions.length - 1,
                              )
                            ]
                          }
                        </p>
                      </div>
                    )}
                    {guidanceMessage && (
                      <p className="leqad-guidance" aria-live="polite">
                        {guidanceMessage}
                      </p>
                    )}
                    {cursorCue && (
                      <p className="leqad-cursor-cue" aria-live="polite">
                        {cursorCue}
                      </p>
                    )}
                    {canContinueUnverified && (
                      <p className="leqad-guidance" aria-live="polite">
                        Finished the action in Onshape? Mark this step done.
                        Leqad cannot check it automatically, so your CAD work
                        will remain unverified.
                      </p>
                    )}
                    <div className="leqad-step-footer">
                      {step.completionMode === 'ACKNOWLEDGEMENT' && (
                        <button
                          type="button"
                          className="leqad-button leqad-button--primary"
                          onClick={() => completeWithoutEvidence('ACKNOWLEDGE')}
                          disabled={
                            stepState.status === 'COMPLETED' ||
                            stepState.status === 'PAUSED'
                          }
                        >
                          Got it
                        </button>
                      )}
                      {step.completionMode === 'UI_VERIFICATION' &&
                        stepObserverAvailable &&
                        operationGuidanceAvailable &&
                        stepState.status !== 'COMPLETED' &&
                        stepState.status !== 'PAUSED' &&
                        stepState.status !== 'UNKNOWN' && (
                          <button
                            type="button"
                            className="leqad-button leqad-button--primary"
                            onClick={checkProgress}
                          >
                            Check progress
                          </button>
                        )}
                      {step.completionMode === 'SELF_REPORT' && (
                        <button
                          type="button"
                          className="leqad-button leqad-button--primary"
                          onClick={() => completeWithoutEvidence('SELF_REPORT')}
                          disabled={
                            stepState.status === 'COMPLETED' ||
                            stepState.status === 'PAUSED'
                          }
                        >
                          I've finished this step
                        </button>
                      )}
                      {canContinueUnverified && (
                        <button
                          type="button"
                          className="leqad-button leqad-button--primary"
                          onClick={() =>
                            completeWithoutEvidence('CONTINUE_UNVERIFIED')
                          }
                        >
                          I've finished this step
                        </button>
                      )}
                      <button
                        type="button"
                        className="leqad-button leqad-button--text"
                        onClick={pauseOrResume}
                        disabled={stepState.status === 'COMPLETED'}
                      >
                        {stepState.status === 'PAUSED' ? 'Resume' : 'Pause'}
                      </button>
                      {(stepState.status === 'UNKNOWN' ||
                        stepState.status === 'NEEDS_CORRECTION') && (
                        <button
                          type="button"
                          className="leqad-button leqad-button--text"
                          onClick={retryStep}
                        >
                          Try again
                        </button>
                      )}
                    </div>
                    <p
                      className="leqad-progress"
                      role="status"
                      aria-label="Lesson progress"
                    >
                      {describeProgress(stepState)}
                    </p>
                    <div className="leqad-step-navigation">
                      <button
                        type="button"
                        className="leqad-button leqad-button--text"
                        onClick={() => goToStep(currentStepIndex - 1)}
                        disabled={currentStepIndex === 0}
                      >
                        Back
                      </button>
                      <button
                        type="button"
                        className="leqad-button leqad-button--secondary"
                        onClick={() => goToStep(currentStepIndex + 1)}
                        disabled={!canGoNext}
                      >
                        Next
                      </button>
                      <button
                        type="button"
                        className="leqad-button leqad-button--text"
                        onClick={restartLesson}
                      >
                        Restart lesson
                      </button>
                    </div>
                  </div>
                  <p className="leqad-footnote">
                    Leqad will not click or change your model. A click alone
                    never counts as verified progress.
                  </p>
                </section>
              )}
              {mode === 'Projects' && (
                <section className="leqad-empty-state">
                  <p className="leqad-eyebrow">PRACTICE · PREVIEW</p>
                  <h2>Guided projects</h2>
                  <p>
                    Start with Foundations. Project lessons will build on these
                    modeling skills.
                  </p>
                </section>
              )}
              {mode === 'Ask' && (
                <section className="leqad-empty-state">
                  <p className="leqad-eyebrow">CONTEXTUAL HELP · PREVIEW</p>
                  <h2>Ask Leqad</h2>
                  <p>
                    Contextual answers need a connected service. You can use the
                    Foundations lesson while access is limited.
                  </p>
                </section>
              )}
              {onRecognitionDiagnostics && (
                <section
                  className="leqad-diagnostics"
                  aria-label="Local development diagnostics"
                >
                  <button
                    type="button"
                    className="leqad-button leqad-button--text"
                    onClick={() => {
                      if (diagnosticsEnabled) stopTopRowCapture();
                      setDiagnosticsEnabled(!diagnosticsEnabled);
                      setDiagnosticsOutput('');
                      setDiagnosticsMessage('');
                      setCaptureReport(null);
                    }}
                  >
                    {diagnosticsEnabled
                      ? 'Turn off recognition diagnostics'
                      : 'Enable recognition diagnostics'}
                  </button>
                  {diagnosticsEnabled && (
                    <>
                      <p>
                        Local only. Captures bounded parent and sibling
                        relationships, relative geometry, and exact known label
                        matches. Page text and identifiers are omitted;
                        JavaScript click handling is not inspected. Production
                        Show me recognition is not run.
                      </p>
                      {onCaptureTopRow && (
                        <button
                          type="button"
                          className="leqad-button leqad-button--secondary"
                          onClick={beginTopRowCapture}
                          disabled={capturePending}
                        >
                          {capturePending
                            ? 'Waiting for Top row click…'
                            : 'Capture Top row'}
                        </button>
                      )}
                      {capturePending && (
                        <button
                          type="button"
                          className="leqad-button leqad-button--text"
                          onClick={stopTopRowCapture}
                        >
                          Cancel capture
                        </button>
                      )}
                      <button
                        type="button"
                        className="leqad-button leqad-button--secondary"
                        onClick={() => void copyDiagnostics()}
                      >
                        Copy recognition diagnostics
                      </button>
                      {diagnosticsMessage && (
                        <p role="status">{diagnosticsMessage}</p>
                      )}
                      {diagnosticsOutput && (
                        <textarea
                          readOnly
                          aria-label="Recognition diagnostics output"
                          value={diagnosticsOutput}
                        />
                      )}
                    </>
                  )}
                </section>
              )}
            </main>
          </>
        )}
      </section>
    </div>
  );
}
