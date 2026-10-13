import { describe, expect, it } from 'vitest';
import type { CursorSample } from './cursorIntent';

describe('estimateCursorIntent', () => {
  it('returns no cue when there are no samples', async () => {
    const { estimateCursorIntent } = await import('./cursorIntent');

    expect(
      estimateCursorIntent([], { left: 20, top: 20, right: 60, bottom: 60 }),
    ).toEqual({ score: 0, cue: 'NONE' });
  });

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

  it('does not treat a stationary cursor outside the target as intent', async () => {
    const { estimateCursorIntent } = await import('./cursorIntent');
    const result = estimateCursorIntent(
      [
        { x: 500, y: 500, at: 0 },
        { x: 500, y: 500, at: 1000 },
      ],
      { left: 20, top: 20, right: 60, bottom: 60 },
    );

    expect(result.cue).toBe('NONE');
  });

  it('bounds stored samples during very rapid pointer movement', async () => {
    const { appendCursorSample, MAX_CURSOR_SAMPLES } =
      await import('./cursorIntent');
    const samples: CursorSample[] = [];

    for (let index = 0; index < 1_000; index += 1) {
      appendCursorSample(samples, { x: index, y: index, at: index });
    }

    expect(samples).toHaveLength(MAX_CURSOR_SAMPLES);
    expect(samples[0]).toMatchObject({ x: 980, at: 980 });
    expect(samples.at(-1)).toMatchObject({ x: 999, at: 999 });
  });

  it('ignores invalid samples rather than polluting the bounded history', async () => {
    const { appendCursorSample } = await import('./cursorIntent');
    const samples = [{ x: 1, y: 1, at: 1 }];

    appendCursorSample(samples, { x: Number.NaN, y: 2, at: 2 });

    expect(samples).toEqual([{ x: 1, y: 1, at: 1 }]);
  });
});
