export const MAX_SIGN_IN_MS = 30 * 60 * 1000;
export const MAX_OBSERVATION_MS = 10 * 60 * 1000;

export function signInDeadlineFromLaunch(launchTime: number): number {
  return launchTime + MAX_SIGN_IN_MS;
}

export function observationDeadlineAfterPartStudioReady(
  partStudioReadyTime: number,
): number {
  return partStudioReadyTime + MAX_OBSERVATION_MS;
}
