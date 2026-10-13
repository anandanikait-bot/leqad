import { describe, expect, it } from 'vitest';

describe('estimateCursorIntent', () => {
  it('raises local intent when the cursor dwells over a relevant target', async () => {
    const { estimateCursorIntent } = await import('./cursorIntent');
    const result = estimateCursorIntent(
      [
        { x: 40, y: 40, at: 0 },
        { x: 42, y: 42, at: 500 },
        { x: 43, y: 43, at: 1000 },
      ],
      { left: 20, top: 20, right: 60, bottom: 60 },
    );

    expect(result.score).toBe(0.8);
    expect(result.cue).toBe('SUBTLE_TARGET');
  });

  it('scores movement toward the target higher than movement away', async () => {
    const { estimateCursorIntent } = await import('./cursorIntent');
    const target = { left: 100, top: 0, right: 140, bottom: 40 };
    const approaching = estimateCursorIntent(
      [
        { x: 0, y: 20, at: 0 },
        { x: 40, y: 20, at: 100 },
        { x: 75, y: 20, at: 200 },
      ],
      target,
    );
    const withdrawing = estimateCursorIntent(
      [
        { x: 75, y: 20, at: 0 },
        { x: 40, y: 20, at: 100 },
        { x: 0, y: 20, at: 200 },
      ],
      target,
    );

    expect(approaching.score).toBeGreaterThan(withdrawing.score);
  });

  it('does not cue distant targets', async () => {
    const { estimateCursorIntent } = await import('./cursorIntent');
    const result = estimateCursorIntent([{ x: 0, y: 0, at: 1000 }], {
      left: 900,
      top: 900,
      right: 950,
      bottom: 950,
    });

    expect(result.cue).toBe('NONE');
  });
});
