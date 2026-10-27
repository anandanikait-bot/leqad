import {
  advanceHint,
  createInitialLessonStepState,
  FOUNDATIONS_FIRST_SKETCH,
  transitionLessonStep,
} from '@leqad/lesson-engine';
import type { LessonStepEvent, LessonStepState } from '@leqad/lesson-engine';
import { parseStoredLesson, type StoredLesson } from '@leqad/desktop-contracts';

export type DesktopLessonEvent =
  | { type: 'ACKNOWLEDGE' }
  | { type: 'MARK_DONE' }
  | { type: 'NEXT' }
  | { type: 'BACK' }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'MORE_HELP' }
  | { type: 'RESTART' }
  | { type: 'REVIEW_STEPS' };

export type DesktopStepView =
  (typeof FOUNDATIONS_FIRST_SKETCH.steps)[number] & {
    status: LessonStepState['status'];
    hintLevel: number;
    hint: string | null;
    verification: 'UNKNOWN' | null;
    outcome: LessonStepState['outcome'];
  };

export type DesktopLessonView = Readonly<{
  lesson: typeof FOUNDATIONS_FIRST_SKETCH;
  currentStepIndex: number;
  currentStep: DesktopStepView;
  steps: readonly LessonStepState[];
  completionCount: number;
  isComplete: boolean;
  loadError: boolean;
}>;

const activateStep = (state: LessonStepState): LessonStepState => {
  if (state.status !== 'NOT_STARTED') return state;
  const started = transitionLessonStep(state, { type: 'START' });
  return transitionLessonStep(started, { type: 'BEGIN_STEP' });
};

const initialStates = (): LessonStepState[] =>
  FOUNDATIONS_FIRST_SKETCH.steps.map(() => createInitialLessonStepState());

const deserializeStep = (
  saved: StoredLesson['steps'][number],
): LessonStepState => ({
  status: saved.status,
  hintLevel: saved.hintLevel,
  verification: saved.verification,
  resumeState: saved.resumeState,
  outcome: saved.outcome,
});

function readSavedLesson(value: unknown): {
  currentStep: number;
  steps: LessonStepState[];
  loadError: boolean;
} {
  if (value === null || value === undefined) {
    return { currentStep: 0, steps: initialStates(), loadError: false };
  }

  try {
    const saved = parseStoredLesson(value);
    return {
      currentStep: saved.currentStep,
      steps: saved.steps.map(deserializeStep),
      loadError: false,
    };
  } catch {
    return { currentStep: 0, steps: initialStates(), loadError: true };
  }
}

export function createDesktopLessonController(saved: unknown = null) {
  const loaded = readSavedLesson(saved);
  let states = loaded.steps;
  let currentStepIndex = loaded.currentStep;
  let isComplete = states.every(({ status }) => status === 'COMPLETED');
  let loadError = loaded.loadError;
  states[currentStepIndex] = activateStep(states[currentStepIndex]!);

  const getView = (): DesktopLessonView => {
    const definition = FOUNDATIONS_FIRST_SKETCH.steps[currentStepIndex]!;
    const state = states[currentStepIndex]!;
    return {
      lesson: FOUNDATIONS_FIRST_SKETCH,
      currentStepIndex,
      currentStep: {
        ...definition,
        status: state.status,
        hintLevel: state.hintLevel,
        hint:
          state.hintLevel > 0
            ? (definition.hints[state.hintLevel - 1] ?? null)
            : null,
        verification: state.verification === 'UNKNOWN' ? 'UNKNOWN' : null,
        outcome: state.outcome,
      },
      steps: states.map((step) => ({ ...step })),
      completionCount: states.filter(({ status }) => status === 'COMPLETED')
        .length,
      isComplete,
      loadError,
    };
  };

  const dispatch = (event: DesktopLessonEvent): DesktopLessonView => {
    const definition = FOUNDATIONS_FIRST_SKETCH.steps[currentStepIndex]!;
    const current = states[currentStepIndex]!;

    switch (event.type) {
      case 'ACKNOWLEDGE': {
        if (definition.completionMode !== 'ACKNOWLEDGEMENT') break;
        states[currentStepIndex] = transitionLessonStep(current, {
          type: 'ACKNOWLEDGE',
        });
        isComplete = states.every(({ status }) => status === 'COMPLETED');
        break;
      }
      case 'MARK_DONE': {
        if (definition.completionMode === 'ACKNOWLEDGEMENT') break;
        const engineEvent: LessonStepEvent =
          definition.completionMode === 'SELF_REPORT'
            ? { type: 'SELF_REPORT' }
            : definition.allowUnverifiedContinuation
              ? { type: 'CONTINUE_UNVERIFIED' }
              : { type: 'SELF_REPORT' };
        const next = transitionLessonStep(current, engineEvent);
        if (next !== current) {
          states[currentStepIndex] = next;
          isComplete = states.every(({ status }) => status === 'COMPLETED');
        }
        break;
      }
      case 'NEXT': {
        if (current.status !== 'COMPLETED') break;
        if (currentStepIndex >= states.length - 1) {
          isComplete = states.every(({ status }) => status === 'COMPLETED');
          break;
        }
        currentStepIndex += 1;
        states[currentStepIndex] = activateStep(states[currentStepIndex]!);
        break;
      }
      case 'BACK': {
        if (isComplete) isComplete = false;
        if (currentStepIndex > 0) currentStepIndex -= 1;
        break;
      }
      case 'PAUSE':
        states[currentStepIndex] = transitionLessonStep(current, {
          type: 'PAUSE',
        });
        break;
      case 'RESUME':
        states[currentStepIndex] = transitionLessonStep(current, {
          type: 'RESUME',
        });
        break;
      case 'MORE_HELP': {
        const nextHint = advanceHint(current.hintLevel);
        states[currentStepIndex] = { ...current, hintLevel: nextHint };
        break;
      }
      case 'RESTART':
        states = initialStates();
        currentStepIndex = 0;
        states[0] = activateStep(states[0]!);
        isComplete = false;
        loadError = false;
        break;
      case 'REVIEW_STEPS':
        currentStepIndex = 0;
        isComplete = false;
        break;
    }

    return getView();
  };

  const serialize = (): StoredLesson => ({
    schemaVersion: 1,
    lessonId: FOUNDATIONS_FIRST_SKETCH.id,
    lessonVersion: FOUNDATIONS_FIRST_SKETCH.version,
    currentStep: currentStepIndex,
    steps: states.map((state) => ({
      status: state.status,
      hintLevel: state.hintLevel,
      verification: state.verification === 'UNKNOWN' ? 'UNKNOWN' : null,
      resumeState: state.resumeState,
      outcome: state.outcome,
    })) as StoredLesson['steps'],
  });

  return { getView, dispatch, serialize };
}
