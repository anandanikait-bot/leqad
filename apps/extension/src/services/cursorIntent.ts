export interface CursorSample {
  x: number;
  y: number;
  at: number;
}

export interface TargetBounds {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

export type CursorCue =
  'NONE' | 'REGION' | 'SUBTLE_TARGET' | 'CLEAR_TARGET' | 'DIRECT_INSTRUCTION';

export interface CursorIntent {
  score: number;
  cue: CursorCue;
}

const MAX_SAMPLES = 20;
const PROXIMITY_RANGE_PX = 220;

function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

function distanceToTarget(sample: CursorSample, target: TargetBounds): number {
  const nearestX = clamp(sample.x, target.left, target.right);
  const nearestY = clamp(sample.y, target.top, target.bottom);
  return Math.hypot(sample.x - nearestX, sample.y - nearestY);
}

function movementTowardTarget(
  samples: readonly CursorSample[],
  target: TargetBounds,
): number {
  if (samples.length < 2) return 0;
  const first = samples[0];
  const last = samples[samples.length - 1];
  if (!first || !last) return 0;

  const moveX = last.x - first.x;
  const moveY = last.y - first.y;
  const targetX = (target.left + target.right) / 2 - first.x;
  const targetY = (target.top + target.bottom) / 2 - first.y;
  const moveLength = Math.hypot(moveX, moveY);
  const targetLength = Math.hypot(targetX, targetY);
  if (moveLength === 0 || targetLength === 0) return 0;

  return clamp(
    (moveX * targetX + moveY * targetY) / (moveLength * targetLength),
  );
}

function dwellOnTarget(
  samples: readonly CursorSample[],
  target: TargetBounds,
): number {
  if (samples.length < 2) return 0;
  const inside = samples.filter(
    (sample) => distanceToTarget(sample, target) === 0,
  );
  if (inside.length < 2 || inside.length !== samples.length) return 0;
  const first = inside[0];
  const last = inside[inside.length - 1];
  if (!first || !last || last.at < first.at) return 0;
  return clamp((last.at - first.at) / 1000);
}

export function estimateCursorIntent(
  recentSamples: readonly CursorSample[],
  target: TargetBounds,
): CursorIntent {
  const samples = recentSamples
    .filter(
      (sample) =>
        Number.isFinite(sample.x) &&
        Number.isFinite(sample.y) &&
        Number.isFinite(sample.at),
    )
    .slice(-MAX_SAMPLES);
  const current = samples[samples.length - 1];
  if (!current) return { score: 0, cue: 'NONE' };

  const proximity = clamp(
    1 - distanceToTarget(current, target) / PROXIMITY_RANGE_PX,
  );
  const direction = movementTowardTarget(samples, target);
  const dwell = dwellOnTarget(samples, target);
  const score =
    Math.round((proximity * 0.65 + direction * 0.2 + dwell * 0.15) * 1000) /
    1000;
  const cue: CursorCue =
    score >= 0.95
      ? 'DIRECT_INSTRUCTION'
      : score >= 0.85
        ? 'CLEAR_TARGET'
        : score >= 0.7
          ? 'SUBTLE_TARGET'
          : score >= 0.5
            ? 'REGION'
            : 'NONE';

  return { score, cue };
}
