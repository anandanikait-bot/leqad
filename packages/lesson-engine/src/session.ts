import type { ModelIdentity } from '@leqad/contracts';
import type {
  LessonModelState,
  LessonSession,
  LessonStepState,
  StoredUiObservation,
} from './types';

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

function invalidatedState(state: LessonStepState): LessonStepState {
  return {
    ...state,
    status: state.status === 'PAUSED' ? 'PAUSED' : 'UNKNOWN',
    verification: 'UNKNOWN',
    resumeState: state.status === 'PAUSED' ? 'UNKNOWN' : null,
    outcome: 'UNABLE_TO_VERIFY',
  };
}

function uiObservationIsCurrent(
  observation: StoredUiObservation,
  now: Date,
): boolean {
  const observedAt = Date.parse(observation.observedAt);
  const expiresAt =
    observation.expiresAt === null
      ? Number.POSITIVE_INFINITY
      : Date.parse(observation.expiresAt);
  return observedAt <= now.getTime() && expiresAt > now.getTime();
}

function dependsOnUiObservation(state: LessonStepState): boolean {
  return (
    state.outcome === 'UI_VERIFIED' ||
    state.status === 'ACTION_OBSERVED' ||
    state.status === 'VERIFYING' ||
    state.status === 'NEEDS_CORRECTION' ||
    (state.status === 'PAUSED' &&
      state.resumeState !== null &&
      ['ACTION_OBSERVED', 'VERIFYING', 'NEEDS_CORRECTION'].includes(
        state.resumeState,
      ))
  );
}

function reconcileExpiredUiEvidence(
  session: LessonSession,
  now: Date,
): Pick<LessonSession, 'steps' | 'modelState'> {
  const currentUiEntries = Object.entries(
    session.modelState.observedUiStates,
  ).filter(([, observation]) => uiObservationIsCurrent(observation, now));
  if (
    currentUiEntries.length ===
    Object.keys(session.modelState.observedUiStates).length
  ) {
    return { steps: session.steps, modelState: session.modelState };
  }

  const currentUiStates = Object.fromEntries(currentUiEntries);
  const expiredStepIds = new Set(
    Object.keys(session.modelState.observedUiStates).filter(
      (stepId) => !(stepId in currentUiStates),
    ),
  );
  const steps = Object.fromEntries(
    Object.entries(session.steps).map(([stepId, state]) => [
      stepId,
      expiredStepIds.has(stepId) && dependsOnUiObservation(state)
        ? invalidatedState(state)
        : state,
    ]),
  );
  const evidenceReferences = Array.from(
    new Set([
      ...Object.values(currentUiStates).flatMap(
        ({ evidenceIds }) => evidenceIds,
      ),
      ...Object.values(session.modelState.verifiedModelStates).flatMap(
        ({ evidenceIds }) => evidenceIds,
      ),
    ]),
  );

  return {
    steps,
    modelState: {
      ...session.modelState,
      observedUiStates: currentUiStates,
      evidenceReferences,
      evidenceFreshness: 'stale',
      uncertaintyReason:
        'One or more saved interface observations expired and must be checked again.',
    },
  };
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

  const reconciled = modelChanged
    ? {
        steps: Object.fromEntries(
          Object.entries(session.steps).map(([stepId, state]) => [
            stepId,
            dependsOnModel(state) ? invalidatedState(state) : state,
          ]),
        ),
        modelState: createUnknownLessonModelState(
          currentRevision === null
            ? 'The current model revision is unknown; model-dependent progress must be checked again.'
            : 'Model-dependent progress needs to be checked against the current revision.',
        ),
      }
    : reconcileExpiredUiEvidence(session, now);

  return {
    ...session,
    modelIdentity: currentIdentity,
    modelRevision: currentRevision,
    modelState: reconciled.modelState,
    updatedAt: now.toISOString(),
    steps: reconciled.steps,
  };
}
