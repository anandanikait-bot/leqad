import type {
  LessonStepEvent,
  LessonStepState,
  LessonStepStatus,
} from './types';
import { evidenceSatisfiesRequirement } from '@leqad/cad-core';

export function createInitialLessonStepState(): LessonStepState {
  return {
    status: 'NOT_STARTED',
    hintLevel: 0,
    verification: null,
    resumeState: null,
    outcome: 'NONE',
  };
}

export function transitionLessonStep(
  state: LessonStepState,
  event: LessonStepEvent,
): LessonStepState {
  if (event.type === 'RESUME' && state.status === 'PAUSED') {
    return {
      ...state,
      status: state.resumeState ?? 'READY',
      resumeState: null,
    };
  }

  if (
    event.type === 'PAUSE' &&
    state.status !== 'NOT_STARTED' &&
    state.status !== 'COMPLETED' &&
    state.status !== 'PAUSED'
  ) {
    return {
      ...state,
      status: 'PAUSED',
      resumeState: state.status,
    };
  }

  if (event.type === 'START' && state.status === 'NOT_STARTED') {
    return { ...state, status: 'READY' };
  }
  if (event.type === 'BEGIN_STEP' && state.status === 'READY') {
    return { ...state, status: 'AWAITING_ACTION' };
  }
  if (event.type === 'ACTION_OBSERVED' && state.status === 'AWAITING_ACTION') {
    return { ...state, status: 'ACTION_OBSERVED' };
  }
  if (event.type === 'CHECK_PROGRESS' && state.status === 'AWAITING_ACTION') {
    return { ...state, status: 'VERIFYING' };
  }
  if (event.type === 'VERIFY' && state.status === 'ACTION_OBSERVED') {
    return { ...state, status: 'VERIFYING' };
  }
  if (
    event.type === 'ACKNOWLEDGE' &&
    ['READY', 'AWAITING_ACTION'].includes(state.status)
  ) {
    return {
      ...state,
      status: 'COMPLETED',
      verification: null,
      outcome: 'ACKNOWLEDGED',
    };
  }
  if (
    event.type === 'SELF_REPORT' &&
    ['READY', 'AWAITING_ACTION', 'UNKNOWN'].includes(state.status)
  ) {
    return {
      ...state,
      status: 'COMPLETED',
      verification: 'UNKNOWN',
      outcome: 'SELF_REPORTED',
    };
  }
  if (
    event.type === 'CONTINUE_UNVERIFIED' &&
    ['AWAITING_ACTION', 'ACTION_OBSERVED', 'UNKNOWN'].includes(state.status)
  ) {
    return {
      ...state,
      status: 'COMPLETED',
      verification: 'UNKNOWN',
      outcome: 'SELF_REPORTED',
    };
  }
  if (
    event.type === 'RETRY' &&
    ['NEEDS_CORRECTION', 'UNKNOWN'].includes(state.status)
  ) {
    return {
      ...state,
      status: 'AWAITING_ACTION',
      verification: null,
      outcome: 'NONE',
    };
  }
  if (event.type === 'VERIFICATION_RESULT' && state.status === 'VERIFYING') {
    const evidenceSatisfied = evidenceSatisfiesRequirement(
      event.decision,
      event.requiredEvidence,
      new Date(event.evaluatedAt),
    );
    const verification = evidenceSatisfied ? event.decision.status : 'UNKNOWN';
    const status: LessonStepStatus =
      verification === 'PASS'
        ? 'COMPLETED'
        : verification === 'FAIL' || verification === 'WARNING'
          ? 'NEEDS_CORRECTION'
          : 'UNKNOWN';
    const outcome =
      verification === 'PASS'
        ? event.decision.evidenceLevel === 'API_CONFIRMED'
          ? ('MODEL_VERIFIED' as const)
          : ('UI_VERIFIED' as const)
        : verification === 'UNKNOWN'
          ? ('UNABLE_TO_VERIFY' as const)
          : ('NONE' as const);

    return {
      ...state,
      status,
      verification,
      outcome,
    };
  }

  return state;
}

export function advanceHint(currentHint: number): number {
  if (!Number.isFinite(currentHint)) return 0;
  return Math.max(0, Math.min(5, Math.floor(currentHint) + 1));
}
