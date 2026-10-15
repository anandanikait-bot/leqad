import { describe, expect, it, vi } from 'vitest';

function removable() {
  return { remove: vi.fn() };
}

describe('page lifecycle coordinator', () => {
  it('mounts one resource for a page context and ignores duplicate starts', async () => {
    const { createPageLifecycleCoordinator } = await import('./pageLifecycle');
    const lifecycle = createPageLifecycleCoordinator();
    const attempt = lifecycle.begin('document-a/workspace-a/element-a');
    const resource = removable();

    expect(attempt).not.toBeNull();
    expect(lifecycle.activate(attempt!, resource)).toBe(true);
    expect(lifecycle.begin('document-a/workspace-a/element-a')).toBeNull();
    expect(resource.remove).not.toHaveBeenCalled();
  });

  it('rejects a delayed initialization after navigation and removes its resource', async () => {
    const { createPageLifecycleCoordinator } = await import('./pageLifecycle');
    const lifecycle = createPageLifecycleCoordinator();
    const delayed = lifecycle.begin('document-a/workspace-a/element-a')!;
    let releaseStorage: (() => void) | undefined;
    const delayedStorageRead = new Promise<void>((resolve) => {
      releaseStorage = resolve;
    });
    const staleResource = removable();
    const finishDelayedInitialization = delayedStorageRead.then(() =>
      lifecycle.activate(delayed, staleResource),
    );
    const current = lifecycle.begin('document-b/workspace-b/element-b')!;
    const currentResource = removable();

    releaseStorage?.();
    await expect(finishDelayedInitialization).resolves.toBe(false);
    expect(staleResource.remove).toHaveBeenCalledTimes(1);
    expect(lifecycle.activate(current, currentResource)).toBe(true);
    expect(currentResource.remove).not.toHaveBeenCalled();
  });

  it('disposes the prior page before activating a different document identity', async () => {
    const { createPageLifecycleCoordinator } = await import('./pageLifecycle');
    const lifecycle = createPageLifecycleCoordinator();
    const first = lifecycle.begin('document-a/workspace-a/element-a')!;
    const firstResource = removable();
    lifecycle.activate(first, firstResource);

    const second = lifecycle.begin('document-a/workspace-a/element-b');

    expect(second).not.toBeNull();
    expect(firstResource.remove).toHaveBeenCalledTimes(1);
  });

  it('cleans active resources and invalidates pending work on shutdown', async () => {
    const { createPageLifecycleCoordinator } = await import('./pageLifecycle');
    const lifecycle = createPageLifecycleCoordinator();
    const activeAttempt = lifecycle.begin('document-a/workspace-a/element-a')!;
    const active = removable();
    lifecycle.activate(activeAttempt, active);
    const pending = lifecycle.begin('document-b/workspace-b/element-b')!;

    lifecycle.invalidate();

    expect(active.remove).toHaveBeenCalledTimes(1);
    expect(lifecycle.isCurrent(pending)).toBe(false);
  });
});
