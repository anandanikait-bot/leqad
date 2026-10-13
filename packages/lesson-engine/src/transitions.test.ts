import { describe, expect, it } from 'vitest';
import type {
  Evidence,
  EvidenceLevel,
  ModelSource,
  VerificationDecision,
} from '@leqad/contracts';

const identity = {
  documentId: 'document-a',
  workspaceId: 'workspace-a',
  elementId: 'element-a',
  revision: 'revision-a',
};

function decision(
  status: VerificationDecision['status'],
  level: EvidenceLevel = 'UI_CONFIRMED',
  source: ModelSource = 'UI',
): VerificationDecision {
  const evidence: Evidence[] =
    level === 'UNKNOWN'
      ? []
      : [
          {
            id: 'evidence-1',
            fact: { sketchModeVisible: true },
            source,
            identity,
            revision: 'revision-a',
            observedAt: '2026-10-13T11:59:00.000Z',
            detectorVersion: 'test/1.0.0',
            expiresAt: null,
            level,
          },
        ];

  return {
    status,
    evidenceLevel: level,
    observedFact: level === 'UNKNOWN' ? null : evidence[0]!.fact,
    identity,
    observedAt: '2026-10-13T11:59:00.000Z',
    revision: 'revision-a',
    explanation: 'Test decision.',
    missingRequirements:
      status === 'UNKNOWN' ? ['A supported observation'] : [],
    recoveryAction: status === 'PASS' ? null : 'Try again.',
    evidence,
  };
}

describe('lesson step transitions', () => {
  it('does not complete a step when the learner action is merely observed', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    const started = transitionLessonStep(createInitialLessonStepState(), {
      type: 'START',
    });
    const ready = transitionLessonStep(started, { type: 'BEGIN_STEP' });

    const observed = transitionLessonStep(ready, { type: 'ACTION_OBSERVED' });

    expect(observed.status).toBe('ACTION_OBSERVED');
    expect(observed.status).not.toBe('COMPLETED');
  });

  it('completes a step only after a passing decision satisfies its evidence requirement', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    let state = createInitialLessonStepState();
    state = transitionLessonStep(state, { type: 'START' });
    state = transitionLessonStep(state, { type: 'BEGIN_STEP' });
    state = transitionLessonStep(state, { type: 'ACTION_OBSERVED' });
    state = transitionLessonStep(state, { type: 'VERIFY' });

    state = transitionLessonStep(state, {
      type: 'VERIFICATION_RESULT',
      decision: decision('PASS'),
      requiredEvidence: 'UI_CONFIRMED',
      evaluatedAt: '2026-10-13T12:00:00.000Z',
    });

    expect(state.status).toBe('COMPLETED');
  });

  it('keeps a step unknown when verification is unavailable', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    let state = createInitialLessonStepState();
    state = transitionLessonStep(state, { type: 'START' });
    state = transitionLessonStep(state, { type: 'BEGIN_STEP' });
    state = transitionLessonStep(state, { type: 'ACTION_OBSERVED' });
    state = transitionLessonStep(state, { type: 'VERIFY' });

    state = transitionLessonStep(state, {
      type: 'VERIFICATION_RESULT',
      decision: decision('UNKNOWN', 'UNKNOWN', 'INFERRED'),
      requiredEvidence: 'UI_CONFIRMED',
      evaluatedAt: '2026-10-13T12:00:00.000Z',
    });

    expect(state.status).toBe('UNKNOWN');
  });

  it('does not complete from a passing decision below the required evidence level', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    let state = createInitialLessonStepState();
    state = transitionLessonStep(state, { type: 'START' });
    state = transitionLessonStep(state, { type: 'BEGIN_STEP' });
    state = transitionLessonStep(state, { type: 'CHECK_PROGRESS' });

    state = transitionLessonStep(state, {
      type: 'VERIFICATION_RESULT',
      decision: decision('PASS'),
      requiredEvidence: 'API_CONFIRMED',
      evaluatedAt: '2026-10-13T12:00:00.000Z',
    });

    expect(state.status).toBe('UNKNOWN');
    expect(state.verification).toBe('UNKNOWN');
  });

  it('does not let explicit mock fixture evidence complete a production transition', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    let state = createInitialLessonStepState();
    state = transitionLessonStep(state, { type: 'START' });
    state = transitionLessonStep(state, { type: 'BEGIN_STEP' });
    state = transitionLessonStep(state, { type: 'CHECK_PROGRESS' });

    state = transitionLessonStep(state, {
      type: 'VERIFICATION_RESULT',
      decision: decision('PASS', 'INFERRED', 'MOCK'),
      requiredEvidence: 'INFERRED',
      evaluatedAt: '2026-10-13T12:00:00.000Z',
    });

    expect(state.status).toBe('UNKNOWN');
  });

  it('does not complete from evidence that expired before the transition', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    let state = createInitialLessonStepState();
    state = transitionLessonStep(state, { type: 'START' });
    state = transitionLessonStep(state, { type: 'BEGIN_STEP' });
    state = transitionLessonStep(state, { type: 'CHECK_PROGRESS' });
    const stale = decision('PASS');
    stale.evidence[0]!.expiresAt = '2026-10-13T11:59:30.000Z';

    state = transitionLessonStep(state, {
      type: 'VERIFICATION_RESULT',
      decision: stale,
      requiredEvidence: 'UI_CONFIRMED',
      evaluatedAt: '2026-10-13T12:00:00.000Z',
    });

    expect(state.status).toBe('UNKNOWN');
  });

  it('allows an explicit progress check without claiming that an action was observed', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    let state = createInitialLessonStepState();
    state = transitionLessonStep(state, { type: 'START' });
    state = transitionLessonStep(state, { type: 'BEGIN_STEP' });

    state = transitionLessonStep(state, { type: 'CHECK_PROGRESS' });

    expect(state.status).toBe('VERIFYING');
  });

  it('ignores an event that is not allowed from the current state', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    const initial = createInitialLessonStepState();

    const result = transitionLessonStep(initial, { type: 'ACTION_OBSERVED' });

    expect(result).toEqual(initial);
  });

  it('pauses and resumes at the previous lesson state', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    let state = createInitialLessonStepState();
    state = transitionLessonStep(state, { type: 'START' });
    state = transitionLessonStep(state, { type: 'BEGIN_STEP' });
    state = transitionLessonStep(state, { type: 'PAUSE' });
    expect(state.status).toBe('PAUSED');

    state = transitionLessonStep(state, { type: 'RESUME' });

    expect(state.status).toBe('AWAITING_ACTION');
  });
});

describe('hint progression', () => {
  it('advances one level and stops at level five', async () => {
    const { advanceHint } = await import('./transitions');

    expect(advanceHint(0)).toBe(1);
    expect(advanceHint(4)).toBe(5);
    expect(advanceHint(5)).toBe(5);
  });

  it('clamps invalid negative hint levels to the supported range', async () => {
    const { advanceHint } = await import('./transitions');

    expect(advanceHint(-4)).toBe(0);
  });
});
