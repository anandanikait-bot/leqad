// @vitest-environment node
import { describe, expect, it } from 'vitest';
import { askWithinSession } from './recorder.ts';

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
