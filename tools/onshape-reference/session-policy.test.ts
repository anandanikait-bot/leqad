import { describe, expect, it } from 'vitest';
import { isSupportedOnshapePartStudioLocation } from './onshape-context.ts';
import {
  MAX_OBSERVATION_MS,
  MAX_SIGN_IN_MS,
  observationDeadlineAfterPartStudioReady,
  signInDeadlineFromLaunch,
} from './session-policy.ts';

describe('local recorder session gates', () => {
  it('starts the observation window after Part Studio readiness, independent of sign-in time', () => {
    const launchTime = 10_000;
    const authenticatedPartStudioTime = launchTime + MAX_SIGN_IN_MS - 1_000;
    const signInDeadline = signInDeadlineFromLaunch(launchTime);
    const observationDeadline = observationDeadlineAfterPartStudioReady(
      authenticatedPartStudioTime,
    );

    expect(signInDeadline).toBe(launchTime + MAX_SIGN_IN_MS);
    expect(observationDeadline).toBe(
      authenticatedPartStudioTime + MAX_OBSERVATION_MS,
    );
    expect(observationDeadline).toBeGreaterThan(signInDeadline);
  });

  it('accepts only the supported Onshape workspace Part Studio route shape in memory', () => {
    const supported = isSupportedOnshapePartStudioLocation(
      'https://cad.onshape.com',
      '/documents/doc-A/w/work-B/e/element-C',
    );

    expect(supported).toBe(true);
    expect(JSON.stringify({ supported }).includes('doc-A')).toBe(false);
    expect(
      isSupportedOnshapePartStudioLocation(
        'https://example.com',
        '/documents/doc-A/w/work-B/e/element-C',
      ),
    ).toBe(false);
    expect(
      isSupportedOnshapePartStudioLocation(
        'https://cad.onshape.com',
        '/documents/doc-A/w/work-B',
      ),
    ).toBe(false);
    expect(
      isSupportedOnshapePartStudioLocation(
        'https://cad.onshape.com',
        '/signin',
      ),
    ).toBe(false);
  });
});
