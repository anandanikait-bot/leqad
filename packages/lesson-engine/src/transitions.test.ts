import { describe, expect, it } from 'vitest';

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

  it('completes a step only after verification returns PASS', async () => {
    const { createInitialLessonStepState, transitionLessonStep } =
      await import('./transitions');
    let state = createInitialLessonStepState();
    state = transitionLessonStep(state, { type: 'START' });
    state = transitionLessonStep(state, { type: 'BEGIN_STEP' });
    state = transitionLessonStep(state, { type: 'ACTION_OBSERVED' });
    state = transitionLessonStep(state, { type: 'VERIFY' });

    state = transitionLessonStep(state, {
      type: 'VERIFICATION_RESULT',
      status: 'PASS',
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
      status: 'UNKNOWN',
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
