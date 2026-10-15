import { describe, expect, it } from 'vitest';

describe('first Foundations lesson', () => {
  it('teaches an explicit Corner Rectangle selection and two opposite corner clicks', async () => {
    const { FOUNDATIONS_FIRST_SKETCH } = await import('./foundations');
    const rectangle = FOUNDATIONS_FIRST_SKETCH.steps[3];

    expect(rectangle.action).toMatch(/dropdown.*arrow/i);
    expect(rectangle.action).toContain('choose Corner Rectangle');
    expect(rectangle.action).toMatch(
      /first corner.*diagonally opposite corner/i,
    );
    expect(rectangle.action).toMatch(/closed four-edge profile/i);
  });

  it('explains why Corner Rectangle fits the exercise and how other variants start', async () => {
    const { FOUNDATIONS_FIRST_SKETCH } = await import('./foundations');
    const { explanation } = FOUNDATIONS_FIRST_SKETCH.steps[3];

    expect(explanation).toMatch(/simplest.*axis-aligned/i);
    expect(explanation).toMatch(
      /Center Point Rectangle starts from the center/i,
    );
    expect(explanation).toMatch(
      /Aligned Rectangle.*line direction.*perpendicular width/i,
    );
    expect(explanation).toMatch(/icon.*last.*variant/i);
  });

  it('offers manual Corner Rectangle recovery without asserting geometry or teaching dimensions early', async () => {
    const { FOUNDATIONS_FIRST_SKETCH } = await import('./foundations');
    const rectangle = FOUNDATIONS_FIRST_SKETCH.steps[3];
    const help = [...rectangle.hints, ...rectangle.recoveryActions].join(' ');

    expect(help).toMatch(/cannot identify.*dropdown.*manually/i);
    expect(help).toMatch(/geometry.*unverified/i);
    expect(rectangle.explanation).toMatch(/self-reported/i);
    expect(rectangle.commonErrors.join(' ')).toMatch(
      /last-used.*Corner Rectangle/i,
    );
    expect(rectangle.recoveryActions.join(' ')).toContain('Corner Rectangle');
    expect(rectangle.hints).toHaveLength(5);
    expect(
      [rectangle.action, rectangle.explanation, ...rectangle.hints].join(' '),
    ).not.toMatch(/40 mm|30 mm/);
    expect(FOUNDATIONS_FIRST_SKETCH.steps[4].action).toMatch(
      /horizontal.*40 mm.*vertical.*30 mm/,
    );
  });

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
