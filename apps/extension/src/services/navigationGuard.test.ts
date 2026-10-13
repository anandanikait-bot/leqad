import { describe, expect, it } from 'vitest';

describe('navigation initialization guard', () => {
  it('rejects an asynchronous initialization response after navigation', async () => {
    const { createNavigationInitializationGuard } =
      await import('./navigationGuard');
    const guard = createNavigationInitializationGuard();
    const first = guard.begin();
    const delayedFirstResponse = Promise.resolve(first);
    const second = guard.begin();

    expect(guard.isCurrent(await delayedFirstResponse)).toBe(false);
    expect(guard.isCurrent(second)).toBe(true);
  });

  it('invalidates pending initialization when the content context closes', async () => {
    const { createNavigationInitializationGuard } =
      await import('./navigationGuard');
    const guard = createNavigationInitializationGuard();
    const pending = guard.begin();

    guard.invalidate();

    expect(guard.isCurrent(pending)).toBe(false);
  });
});
