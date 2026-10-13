import type { ModelIdentity } from '@leqad/contracts';
import type { LessonModelState, LessonSession, LessonStepState } from './types';

export function createUnknownLessonModelState(
  uncertaintyReason: string,
): LessonModelState {
  return {
    observedUiStates: {},
    verifiedModelStates: {},
    evidenceReferences: [],
    evidenceFreshness: 'unknown',
    uncertaintyReason,
  };
}

function sameDocument(left: ModelIdentity, right: ModelIdentity): boolean {
  return (
    left.documentId === right.documentId &&
    left.workspaceId === right.workspaceId &&
    left.elementId === right.elementId
  );
}

function dependsOnModel(state: LessonStepState): boolean {
  if (
    state.outcome === 'UI_VERIFIED' ||
    state.outcome === 'MODEL_VERIFIED' ||
    state.outcome === 'UNABLE_TO_VERIFY'
  ) {
    return true;
  }
  return (
    state.status === 'ACTION_OBSERVED' ||
    state.status === 'VERIFYING' ||
    state.status === 'NEEDS_CORRECTION' ||
    state.status === 'UNKNOWN' ||
    (state.status === 'PAUSED' &&
      state.resumeState !== null &&
      ['ACTION_OBSERVED', 'VERIFYING', 'NEEDS_CORRECTION', 'UNKNOWN'].includes(
        state.resumeState,
      ))
  );
}

export function reconcileSession(
  session: LessonSession,
  currentIdentity: ModelIdentity,
  currentRevision: string | null,
  now: Date = new Date(),
): LessonSession {
  const modelChanged =
    !sameDocument(session.modelIdentity, currentIdentity) ||
    currentRevision === null ||
    currentIdentity.revision !== currentRevision ||
    session.modelRevision !== currentRevision ||
    session.modelIdentity.revision !== session.modelRevision;

  const steps = modelChanged
    ? Object.fromEntries(
        Object.entries(session.steps).map(([stepId, state]) => [
          stepId,
          dependsOnModel(state)
            ? {
                ...state,
                status: 'UNKNOWN' as const,
                verification: 'UNKNOWN' as const,
                resumeState: null,
                outcome: 'UNABLE_TO_VERIFY' as const,
              }
            : state,
        ]),
      )
    : session.steps;
  const modelState = modelChanged
    ? createUnknownLessonModelState(
        currentRevision === null
          ? 'The current model revision is unknown; model-dependent progress must be checked again.'
          : 'Model-dependent progress needs to be checked against the current revision.',
      )
    : session.modelState;

  return {
    ...session,
    modelIdentity: currentIdentity,
    modelRevision: currentRevision,
    modelState,
    updatedAt: now.toISOString(),
    steps,
  };
}
