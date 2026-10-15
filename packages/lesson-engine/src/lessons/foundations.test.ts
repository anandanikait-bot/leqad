import { describe, expect, it } from 'vitest';

describe('first Foundations lesson', () => {
  it('defines the complete ordered eight-step Your First Sketch lesson', async () => {
    const { FOUNDATIONS_FIRST_SKETCH } = await import('./foundations');

    expect(FOUNDATIONS_FIRST_SKETCH).toMatchObject({
      title: 'Your First Sketch',
      version: '2.0.0',
    });
    expect(FOUNDATIONS_FIRST_SKETCH.steps.map(({ id }) => id)).toEqual([
      'introduction',
      'select-reference-plane',
      'start-sketch',
      'draw-rectangle',
      'apply-dimensions',
      'finish-sketch',
      'understand-result',
      'independent-practice',
    ]);
  });

  it('uses explicit completion modes and evidence requirements for every step', async () => {
    const { FOUNDATIONS_FIRST_SKETCH } = await import('./foundations');
    const steps = Object.fromEntries(
      FOUNDATIONS_FIRST_SKETCH.steps.map((step) => [step.id, step]),
    );

    expect(steps.introduction).toMatchObject({
      completionMode: 'ACKNOWLEDGEMENT',
      requiredEvidence: null,
      semanticTarget: null,
    });
    expect(steps['select-reference-plane']).toMatchObject({
      completionMode: 'UI_VERIFICATION',
      requiredEvidence: 'UI_CONFIRMED',
      semanticTarget: 'top-plane',
      completionSignal: 'top-plane-selected',
    });
    expect(steps['start-sketch']).toMatchObject({
      completionMode: 'UI_VERIFICATION',
      requiredEvidence: 'UI_CONFIRMED',
      semanticTarget: 'sketch',
      completionSignal: 'sketch-editing',
    });
    expect(steps['apply-dimensions']).toMatchObject({
      completionMode: 'UI_VERIFICATION',
      requiredEvidence: 'API_CONFIRMED',
      allowUnverifiedContinuation: true,
    });
    expect(steps['independent-practice']).toMatchObject({
      completionMode: 'SELF_REPORT',
      requiredEvidence: null,
      semanticTarget: null,
    });
  });

  it('teaches 40 mm by 30 mm design intent without claiming unavailable values', async () => {
    const { FOUNDATIONS_FIRST_SKETCH } = await import('./foundations');
    const dimensions = FOUNDATIONS_FIRST_SKETCH.steps.find(
      ({ id }) => id === 'apply-dimensions',
    );

    expect(dimensions?.action).toContain('40 mm');
    expect(dimensions?.action).toContain('30 mm');
    expect(dimensions?.explanation).toContain('design intent');
    expect(dimensions?.explanation).toContain('cannot confirm');
  });

  it('provides five ordered hints and recovery guidance for every step', async () => {
    const { FOUNDATIONS_FIRST_SKETCH } = await import('./foundations');

    for (const step of FOUNDATIONS_FIRST_SKETCH.steps) {
      expect(step.hints).toHaveLength(5);
      expect(step.commonErrors.length).toBeGreaterThan(0);
      expect(step.recoveryActions.length).toBeGreaterThan(0);
    }
  });
});
