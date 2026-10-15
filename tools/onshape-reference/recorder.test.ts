// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { askWithinSession, serializePendingCapture } from './recorder.ts';
import { MAX_CAPTURE_BYTES, type ReferenceCapture } from '../../validation/onshape-reference/schema.ts';

describe('bounded sanitized capture serialization', () => {
  it('fits a dense reviewed report without losing any fields', () => {
    // Synthetic size stress-test only, not an Onshape capture.
    const fixture = {
      observations: Array.from({ length: 500 }, (_, index) => ({
        index,
        field: 'NODE',
        nested: { a: false, b: null },
      })),
    } as unknown as ReferenceCapture;
    const serialized = serializePendingCapture(fixture);

    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThanOrEqual(
      MAX_CAPTURE_BYTES,
    );
    expect(JSON.parse(serialized)).toEqual(fixture);
    expect(new TextEncoder().encode(serialized).byteLength).toBeLessThan(
      new TextEncoder().encode(JSON.stringify(fixture, null, 1)).byteLength,
    );
  });
});

describe('recorder timeout messages', () => {
  it('reports the separate sign-in timeout without calling it observation time', async () => {
    await expect(askWithinSession('', 0, 'SIGN_IN')).rejects.toThrow(
      'Sign-in reached its 30-minute time limit.',
    );
  });

  it('reports the observation timeout separately', async () => {
    await expect(askWithinSession('', 0)).rejects.toThrow(
      'Observation session reached its 10-minute time limit.',
    );
  });
});
