import { describe, expect, it } from 'vitest';

describe('first Foundations lesson', () => {
  it('teaches a first sketch with a UI-only completion signal and ordered recovery hints', async () => {
    const { FOUNDATIONS_FIRST_SKETCH } = await import('./foundations');
    const [step] = FOUNDATIONS_FIRST_SKETCH.steps;

    expect(FOUNDATIONS_FIRST_SKETCH.title).toBe('Your first sketch');
    expect(step).toMatchObject({
      id: 'enter-sketch',
      goal: 'Open a sketch on the Top plane',
      semanticTarget: 'top-plane',
      completionSignal: 'finish-sketch',
      requiredEvidence: 'UI_CONFIRMED',
    });
    expect(step?.hints).toHaveLength(5);
    expect(step?.recoveryActions.length).toBeGreaterThan(0);
  });
});
