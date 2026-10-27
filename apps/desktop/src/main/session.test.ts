import { describe, expect, it, vi } from 'vitest';
import { createSessionController } from './session';
import type { WindowBinding } from './windowCatalogTypes';

const firstBinding: WindowBinding = Object.freeze({
  token: 'listed-token-1',
  application: 'Chrome',
  ordinal: 1,
  kind: 'browser',
});

const secondBinding: WindowBinding = Object.freeze({
  token: 'listed-token-2',
  application: 'FreeCAD',
  ordinal: 1,
  kind: 'native',
});

function createCatalogProvider() {
  return {
    list: vi.fn(async () => ({
      availability: 'available' as const,
      unavailableReason: null,
      incomplete: false,
      windows: [],
    })),
    select: vi.fn(async (token: string) =>
      token === 'listed-token-1'
        ? firstBinding
        : token === 'listed-token-2'
          ? secondBinding
          : null,
    ),
    isCurrent: vi.fn(async () => true),
    dispose: vi.fn(),
  };
}

function createController(
  windowCatalog = createCatalogProvider(),
  overrides: {
    abortActive?: () => void;
    resetPosition?: () => Promise<void> | void;
    closeWindow?: () => void;
  } = {},
) {
  const abortActive = overrides.abortActive ?? vi.fn();
  const resetPosition = overrides.resetPosition ?? vi.fn();
  const closeWindow = overrides.closeWindow ?? vi.fn();
  const controller = createSessionController({
    abortActive,
    resetPosition,
    closeWindow,
    windowCatalog,
  });
  return { abortActive, closeWindow, controller, resetPosition, windowCatalog };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((complete) => {
    resolve = complete;
  });
  return { promise, resolve };
}

describe('desktop host session', () => {
  it('binds only after catalog selection and fresh validation, exposing safe metadata only', async () => {
    const { controller, windowCatalog } = createController();

    const view = await controller.command({
      type: 'select',
      windowToken: 'listed-token-1',
    });

    expect(windowCatalog.select).toHaveBeenCalledWith('listed-token-1');
    expect(windowCatalog.isCurrent).toHaveBeenCalledWith(firstBinding);
    expect(view).toMatchObject({
      token: null,
      binding: 'selected',
      selectedWindow: {
        application: 'Chrome',
        ordinal: 1,
        kind: 'browser',
      },
      consent: 'off',
      visual: 'unavailable',
      reason: 'unsupported',
      availableActions: [],
    });
    expect(view.selectedWindow).not.toHaveProperty('token');
    expect(view.selectedWindow).not.toHaveProperty('title');
    expect(view.selectedWindow).not.toHaveProperty('url');
  });

  it('leaves a stale, closed, or reused catalog target disconnected', async () => {
    const windowCatalog = createCatalogProvider();
    windowCatalog.isCurrent.mockResolvedValue(false);
    const { controller } = createController(windowCatalog);

    const view = await controller.command({
      type: 'select',
      windowToken: 'listed-token-1',
    });

    expect(view).toMatchObject({
      token: null,
      binding: 'disconnected',
      selectedWindow: null,
      consent: 'off',
      visual: 'unavailable',
      reason: 'window-lost',
    });
  });

  it('drops a selected window when selection returns no current binding', async () => {
    const windowCatalog = createCatalogProvider();
    windowCatalog.select.mockResolvedValue(null);
    const { controller } = createController(windowCatalog);

    const view = await controller.command({
      type: 'select',
      windowToken: 'expired-token',
    });

    expect(view.binding).toBe('disconnected');
    expect(view.selectedWindow).toBeNull();
    expect(view.consent).toBe('off');
    expect(windowCatalog.isCurrent).not.toHaveBeenCalled();
  });

  it('ignores a late selection result after disconnect', async () => {
    const selection = deferred<WindowBinding | null>();
    const windowCatalog = createCatalogProvider();
    windowCatalog.select.mockReturnValue(selection.promise);
    const { controller } = createController(windowCatalog);

    const selecting = controller.command({
      type: 'select',
      windowToken: 'listed-token-1',
    });
    await controller.command({ type: 'disconnect' });
    selection.resolve(firstBinding);
    await selecting;

    expect(controller.getView()).toMatchObject({
      binding: 'disconnected',
      token: null,
      selectedWindow: null,
      consent: 'off',
    });
    expect(windowCatalog.isCurrent).not.toHaveBeenCalled();
  });

  it('ignores a late validation result after a new window is selected', async () => {
    const lateValidation = deferred<boolean>();
    const windowCatalog = createCatalogProvider();
    windowCatalog.isCurrent
      .mockResolvedValueOnce(true)
      .mockReturnValueOnce(lateValidation.promise)
      .mockResolvedValueOnce(true);
    const { controller } = createController(windowCatalog);
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });

    const checking = controller.checkWindow();
    await controller.command({ type: 'select', windowToken: 'listed-token-2' });
    lateValidation.resolve(false);
    await checking;

    expect(controller.getView()).toMatchObject({
      binding: 'selected',
      selectedWindow: {
        application: 'FreeCAD',
        ordinal: 1,
        kind: 'native',
      },
      consent: 'off',
    });
  });

  it('disconnects the binding when fresh liveness validation fails', async () => {
    const windowCatalog = createCatalogProvider();
    windowCatalog.isCurrent
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const { controller } = createController(windowCatalog);
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });

    const view = await controller.checkWindow();

    expect(view).toMatchObject({
      token: null,
      binding: 'disconnected',
      selectedWindow: null,
      consent: 'off',
      reason: 'window-lost',
    });
  });

  it('revalidates a selected window before resuming the session', async () => {
    const windowCatalog = createCatalogProvider();
    const { controller } = createController(windowCatalog);
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });
    await controller.command({ type: 'pause', paused: true });

    const view = await controller.command({ type: 'pause', paused: false });

    expect(windowCatalog.isCurrent).toHaveBeenNthCalledWith(2, firstBinding);
    expect(view.paused).toBe(false);
    expect(view.binding).toBe('selected');
  });

  it('keeps a stale selected window paused and disconnected on resume', async () => {
    const windowCatalog = createCatalogProvider();
    windowCatalog.isCurrent
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);
    const { controller } = createController(windowCatalog);
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });
    await controller.command({ type: 'pause', paused: true });

    const view = await controller.command({ type: 'pause', paused: false });

    expect(view).toMatchObject({
      paused: true,
      binding: 'disconnected',
      selectedWindow: null,
      token: null,
      consent: 'off',
      visual: 'unavailable',
      reason: 'window-lost',
    });
  });

  it('keeps an explicit disconnect canceled when a pending resume check settles late', async () => {
    const lateValidation = deferred<boolean>();
    const windowCatalog = createCatalogProvider();
    windowCatalog.isCurrent
      .mockResolvedValueOnce(true)
      .mockReturnValueOnce(lateValidation.promise);
    const { controller } = createController(windowCatalog);
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });
    await controller.command({ type: 'pause', paused: true });

    const resuming = controller.command({ type: 'pause', paused: false });
    const disconnected = await controller.command({ type: 'disconnect' });
    lateValidation.resolve(false);
    await resuming;

    expect(disconnected.reason).toBe('canceled');
    expect(controller.getView()).toMatchObject({
      paused: false,
      binding: 'disconnected',
      selectedWindow: null,
      consent: 'off',
      reason: 'canceled',
    });
  });

  it('reports explicit user disconnect as canceled, not a lost window', async () => {
    const { controller } = createController();
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });

    const view = await controller.command({ type: 'disconnect' });

    expect(view.binding).toBe('disconnected');
    expect(view.selectedWindow).toBeNull();
    expect(view.reason).toBe('canceled');
  });

  it('starts unpaused after pause then disconnect, written lessons, or window change', async () => {
    for (const path of [
      'disconnect',
      'written-only',
      'window-change',
    ] as const) {
      const { controller } = createController();
      await controller.command({
        type: 'select',
        windowToken: 'listed-token-1',
      });
      await controller.command({ type: 'pause', paused: true });

      if (path === 'disconnect') {
        const disconnected = await controller.command({ type: 'disconnect' });
        expect(disconnected.paused).toBe(false);
      } else if (path === 'written-only') {
        const written = await controller.command({ type: 'use-written' });
        expect(written.paused).toBe(false);
      }

      const view = await controller.command({
        type: 'select',
        windowToken: 'listed-token-2',
      });

      expect(view).toMatchObject({
        paused: false,
        binding: 'selected',
        selectedWindow: {
          application: 'FreeCAD',
          ordinal: 1,
          kind: 'native',
        },
        consent: 'off',
        visual: 'unavailable',
      });
      controller.dispose();
    }
  });

  it('denies consent without losing the selected written-learning context', async () => {
    const { controller } = createController();
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });

    const view = await controller.command({
      type: 'consent',
      allow: false,
    });

    expect(view).toMatchObject({
      binding: 'selected',
      selectedWindow: {
        application: 'Chrome',
        ordinal: 1,
        kind: 'browser',
      },
      consent: 'denied',
      visual: 'unavailable',
      availableActions: [],
    });
  });

  it('never turns an allow request into visual permission', async () => {
    const { controller } = createController();
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });

    const view = await controller.command({
      type: 'consent',
      allow: true,
    });

    expect(view).toMatchObject({
      binding: 'selected',
      consent: 'off',
      visual: 'unavailable',
      reason: 'unsupported',
      availableActions: [],
    });
  });

  it('applies pause, resume, cancel, revoke, disconnect and reset-position locally', async () => {
    const abortActive = vi.fn();
    const resetPosition = vi.fn();
    const { controller } = createController(undefined, {
      abortActive,
      resetPosition,
    });

    expect(
      (await controller.command({ type: 'pause', paused: true })).paused,
    ).toBe(true);
    expect(
      (await controller.command({ type: 'pause', paused: false })).paused,
    ).toBe(false);
    const beforeCancel = controller.getView().generation;
    const canceled = await controller.command({ type: 'cancel' });
    expect(canceled.generation).toBeGreaterThan(beforeCancel);
    expect(canceled.reason).toBe('canceled');
    const beforeRevoke = canceled.generation;
    const revoked = await controller.command({ type: 'revoke' });
    expect(revoked.generation).toBeGreaterThan(beforeRevoke);
    expect(revoked.consent).toBe('off');
    const disconnected = await controller.command({ type: 'disconnect' });
    expect(disconnected.binding).toBe('disconnected');
    expect(disconnected.token).toBeNull();
    await controller.command({ type: 'reset-position' });

    expect(abortActive).toHaveBeenCalledTimes(5);
    expect(resetPosition).toHaveBeenCalledTimes(1);
  });

  it('notifies only active subscribers and releases them on dispose', async () => {
    const { controller } = createController();
    const first = vi.fn();
    const second = vi.fn();
    const unsubscribeFirst = controller.subscribe(first);
    const unsubscribeSecond = controller.subscribe(second);

    unsubscribeFirst();
    unsubscribeFirst();
    await controller.command({ type: 'pause', paused: true });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);

    controller.dispose();
    unsubscribeSecond();
    await controller.command({ type: 'pause', paused: false });
    expect(second).toHaveBeenCalledTimes(1);
  });

  it('clears the binding and disposes its provider on close', async () => {
    const closeWindow = vi.fn();
    const windowCatalog = createCatalogProvider();
    const { controller } = createController(windowCatalog, { closeWindow });
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });

    await controller.command({ type: 'close' });
    controller.dispose();
    controller.dispose();

    expect(controller.getView()).toMatchObject({
      token: null,
      binding: 'disconnected',
      selectedWindow: null,
      consent: 'off',
      visual: 'unavailable',
    });
    expect(windowCatalog.dispose).toHaveBeenCalledTimes(1);
    expect(closeWindow).toHaveBeenCalledTimes(1);
  });

  it('clears the selected window and revokes consent on renderer invalidation', async () => {
    const abortActive = vi.fn();
    const subscriber = vi.fn();
    const { controller } = createController(undefined, { abortActive });
    controller.subscribe(subscriber);
    await controller.command({ type: 'select', windowToken: 'listed-token-1' });
    const priorGeneration = controller.getView().generation;

    controller.invalidate();

    expect(controller.getView()).toMatchObject({
      binding: 'disconnected',
      token: null,
      selectedWindow: null,
      consent: 'off',
      reason: 'canceled',
    });
    expect(controller.getView().generation).toBeGreaterThan(priorGeneration);
    expect(abortActive).toHaveBeenCalled();
    expect(subscriber).toHaveBeenCalledTimes(3);
  });
});
