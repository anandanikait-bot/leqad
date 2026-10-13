import { useEffect, useRef, useState } from 'react';
import type {
  KeyboardEvent as ReactKeyboardEvent,
  PointerEvent as ReactPointerEvent,
} from 'react';
import type { ModelIdentity, VerificationStatus } from '@leqad/contracts';
import {
  FOUNDATIONS_FIRST_SKETCH,
  advanceHint,
  createInitialLessonStepState,
  transitionLessonStep,
} from '@leqad/lesson-engine';
import type { LessonSession, LessonStepState } from '@leqad/lesson-engine';
import { estimateCursorIntent } from '../../services/cursorIntent';
import type { CursorSample } from '../../services/cursorIntent';
import type { OnshapePageContext } from '../../services/onshapePage';
import type { PanelPreferences } from '../../services/progressStore';
import {
  findSemanticTarget,
  isUsableSemanticTarget,
} from '../../services/semanticTargets';
import type { SemanticTargetId } from '../../services/semanticTargets';

interface AssistantPanelProps {
  page?: OnshapePageContext;
  initialSession?: LessonSession | null;
  initialPanelPreferences?: PanelPreferences;
  onShowTarget?: (targetId: SemanticTargetId) => boolean | void;
  onCheckStep?: (
    stepId: string,
    completionSignal: string,
  ) => VerificationStatus;
  onSessionChange?: (session: LessonSession) => void;
  onPanelPreferencesChange?: (preferences: PanelPreferences) => void;
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

function getInitialStepState(
  initialSession?: LessonSession | null,
): LessonStepState {
  const saved =
    initialSession?.lessonId === FOUNDATIONS_FIRST_SKETCH.id
      ? initialSession.steps[FOUNDATIONS_FIRST_SKETCH.steps[0]?.id ?? '']
      : undefined;
  if (saved) return saved;

  let state = createInitialLessonStepState();
  state = transitionLessonStep(state, { type: 'START' });
  return transitionLessonStep(state, { type: 'BEGIN_STEP' });
}

function getInitialPosition(preferences?: PanelPreferences): Position {
  const position = preferences?.position ?? {
    left: Math.max(16, window.innerWidth - 376),
    top: Math.max(16, window.innerHeight - 500),
  };
  return {
    left: Math.min(
      Math.max(8, position.left),
      Math.max(8, window.innerWidth - 352),
    ),
    top: Math.min(
      Math.max(8, position.top),
      Math.max(8, window.innerHeight - 100),
    ),
  };
}

function makeSession(
  page: OnshapePageContext | undefined,
  stepState: LessonStepState,
  prior: LessonSession | null | undefined,
): LessonSession | null {
  if (
    !page?.supported ||
    !page.documentId ||
    !page.workspaceId ||
    !page.elementId
  )
    return null;
  const identity: ModelIdentity = {
    documentId: page.documentId,
    workspaceId: page.workspaceId,
    elementId: page.elementId,
    revision: null,
  };
  const stepId = FOUNDATIONS_FIRST_SKETCH.steps[0]?.id;
  if (!stepId) return null;

  return {
    lessonId: FOUNDATIONS_FIRST_SKETCH.id,
    lessonVersion: FOUNDATIONS_FIRST_SKETCH.version,
    currentStepId: stepId,
    modelIdentity: identity,
    modelRevision: null,
    updatedAt: new Date().toISOString(),
    steps: { ...prior?.steps, [stepId]: stepState },
  };
}

function describeProgress(
  status: LessonStepState['status'],
  result: VerificationStatus | null,
): string {
  if (status === 'COMPLETED' && result === 'PASS') {
    return 'Interface evidence confirms the selected Top plane and sketch mode. Model geometry is not checked.';
  }
  if (status === 'UNKNOWN' || result === 'UNKNOWN') {
    return 'Unable to verify. I could not confirm the selected Top plane and sketch mode from the current interface.';
  }
  if (status === 'NEEDS_CORRECTION') {
    return 'Needs correction. Review the recovery guidance and try again.';
  }
  if (status === 'PAUSED') return 'Lesson paused.';
  return 'Waiting for you to try the guided action.';
}

export function AssistantPanel({
  page,
  initialSession = null,
  initialPanelPreferences,
  onShowTarget,
  onCheckStep,
  onSessionChange,
  onPanelPreferencesChange,
}: AssistantPanelProps) {
  const step = FOUNDATIONS_FIRST_SKETCH.steps[0];
  const [mode, setMode] = useState<PanelMode>('Learn');
  const [collapsed, setCollapsed] = useState(
    initialPanelPreferences?.collapsed ?? false,
  );
  const [position, setPosition] = useState(() =>
    getInitialPosition(initialPanelPreferences),
  );
  const [stepState, setStepState] = useState(() =>
    getInitialStepState(initialSession),
  );
  const [verificationStatus, setVerificationStatus] =
    useState<VerificationStatus | null>(
      initialSession?.lessonId === FOUNDATIONS_FIRST_SKETCH.id
        ? (initialSession.steps[step?.id ?? '']?.verification ?? null)
        : null,
    );
  const [showReason, setShowReason] = useState(false);
  const [showRecovery, setShowRecovery] = useState(false);
  const [guidanceMessage, setGuidanceMessage] = useState('');
  const [cursorCue, setCursorCue] = useState('');
  const dragStart = useRef<DragStart | null>(null);
  const recentSamples = useRef<CursorSample[]>([]);

  useEffect(() => {
    const timeout = window.setTimeout(
      () => onPanelPreferencesChange?.({ collapsed, position }),
      250,
    );
    return () => window.clearTimeout(timeout);
  }, [collapsed, position, onPanelPreferencesChange]);

  useEffect(() => {
    if (!step) return;
    let intentTarget: HTMLElement | null = null;
    let nextTargetLookupAt = Number.NEGATIVE_INFINITY;
    const onPointerMove = (event: PointerEvent) => {
      const now = performance.now();
      if (
        intentTarget &&
        !isUsableSemanticTarget(
          intentTarget,
          step.semanticTarget as SemanticTargetId,
        )
      ) {
        intentTarget = null;
        recentSamples.current = [];
      }
      if (!intentTarget && now >= nextTargetLookupAt) {
        nextTargetLookupAt = now + 500;
        intentTarget = findSemanticTarget(
          document,
          step.semanticTarget as SemanticTargetId,
        );
      }
      if (!intentTarget) {
        recentSamples.current = [];
        setCursorCue('');
        return;
      }

      const target = intentTarget;
      const rect = target.getBoundingClientRect();
      const samples = recentSamples.current;
      samples.push({
        x: event.clientX,
        y: event.clientY,
        at: now,
      });
      if (samples.length > 20) samples.shift();
      const intent = estimateCursorIntent(samples, rect);
      setCursorCue(
        intent.cue === 'NONE'
          ? ''
          : 'Local cue: you are near the Top plane control.',
      );
    };

    document.addEventListener('pointermove', onPointerMove, { passive: true });
    return () => document.removeEventListener('pointermove', onPointerMove);
  }, [step]);

  if (!step) return null;

  const updateStepState = (next: LessonStepState) => {
    setStepState(next);
    const session = makeSession(page, next, initialSession);
    if (session) onSessionChange?.(session);
  };

  const showTarget = () => {
    const found = onShowTarget?.(step.semanticTarget as SemanticTargetId);
    setGuidanceMessage(
      found === false
        ? 'I could not recognize the Top plane control on this page. You can still follow the lesson manually.'
        : 'Looking for the Top plane control. The highlight follows the current interface layout.',
    );
  };

  const checkProgress = () => {
    const checking = transitionLessonStep(stepState, {
      type: 'CHECK_PROGRESS',
    });
    if (checking.status !== 'VERIFYING') return;
    const result = onCheckStep?.(step.id, step.completionSignal) ?? 'UNKNOWN';
    const next = transitionLessonStep(checking, {
      type: 'VERIFICATION_RESULT',
      status: result,
    });
    setVerificationStatus(result);
    updateStepState(next);
    setShowRecovery(result === 'FAIL' || result === 'WARNING');
    setGuidanceMessage('');
  };

  const advanceHintLevel = () => {
    updateStepState({
      ...stepState,
      hintLevel: advanceHint(stepState.hintLevel),
    });
    setShowRecovery(true);
  };

  const pauseOrResume = () => {
    const next = transitionLessonStep(
      stepState,
      stepState.status === 'PAUSED' ? { type: 'RESUME' } : { type: 'PAUSE' },
    );
    updateStepState(next);
  };

  const retryStep = () => {
    const next = transitionLessonStep(stepState, { type: 'RETRY' });
    updateStepState(next);
    setVerificationStatus(null);
    setShowRecovery(false);
  };

  const beginDrag = (event: ReactPointerEvent<HTMLDivElement>) => {
    if (
      event.button !== 0 ||
      (event.target instanceof Element && event.target.closest('button'))
    )
      return;
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
    setPosition({
      left: Math.min(
        Math.max(8, start.left + event.clientX - start.pointerX),
        Math.max(8, window.innerWidth - 352),
      ),
      top: Math.min(
        Math.max(8, start.top + event.clientY - start.pointerY),
        Math.max(8, window.innerHeight - 100),
      ),
    });
  };

  const endDrag = () => {
    dragStart.current = null;
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
    setPosition({
      left: Math.min(
        Math.max(8, position.left + delta.left),
        Math.max(8, window.innerWidth - 352),
      ),
      top: Math.min(
        Math.max(8, position.top + delta.top),
        Math.max(8, window.innerHeight - 100),
      ),
    });
  };

  const panelStyle = { left: `${position.left}px`, top: `${position.top}px` };
  const visibleHint =
    stepState.hintLevel > 0 ? step.hints[stepState.hintLevel - 1] : null;

  return (
    <div data-leqad-root>
      <section
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
          onPointerUp={endDrag}
          onPointerCancel={endDrag}
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
              Limited access
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
            {page && !page.editable && (
              <p className="leqad-readonly-note">
                This document view is read-only. Some lesson guidance may be
                unavailable.
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
              {mode === 'Learn' && (
                <section
                  aria-label="Foundations lesson"
                  className="leqad-lesson"
                >
                  <p className="leqad-eyebrow">FOUNDATIONS · LESSON 01</p>
                  <h2>Your first sketch</h2>
                  <p className="leqad-intro">
                    {FOUNDATIONS_FIRST_SKETCH.description}
                  </p>

                  <div className="leqad-step-card">
                    <p className="leqad-eyebrow">GOAL</p>
                    <p className="leqad-goal">{step.goal}</p>
                    <p className="leqad-eyebrow">NEXT ACTION</p>
                    <p>{step.action}</p>
                    <div className="leqad-help-row">
                      <button
                        type="button"
                        className="leqad-button leqad-button--secondary"
                        onClick={showTarget}
                      >
                        Show me
                      </button>
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
                    <div className="leqad-step-footer">
                      <button
                        type="button"
                        className="leqad-button leqad-button--primary"
                        onClick={checkProgress}
                        disabled={
                          stepState.status === 'COMPLETED' ||
                          stepState.status === 'PAUSED'
                        }
                      >
                        Check progress
                      </button>
                      <button
                        type="button"
                        className="leqad-button leqad-button--text"
                        onClick={pauseOrResume}
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
                      {describeProgress(stepState.status, verificationStatus)}
                    </p>
                  </div>
                  <p className="leqad-footnote">
                    Leqad will not click or change your model. A click alone
                    never counts as verified progress.
                  </p>
                </section>
              )}
              {mode === 'Projects' && (
                <section className="leqad-empty-state">
                  <p className="leqad-eyebrow">PRACTICE</p>
                  <h2>Guided projects</h2>
                  <p>
                    Start with Foundations. Project lessons will build on these
                    modeling skills.
                  </p>
                </section>
              )}
              {mode === 'Ask' && (
                <section className="leqad-empty-state">
                  <p className="leqad-eyebrow">CONTEXTUAL HELP</p>
                  <h2>Ask Leqad</h2>
                  <p>
                    Contextual answers need a connected service. You can use the
                    Foundations lesson while access is limited.
                  </p>
                </section>
              )}
            </main>
          </>
        )}
      </section>
    </div>
  );
}
