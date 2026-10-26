import { describe, expect, it, vi } from 'vitest';
import { createSessionController } from './session';

describe('desktop host session', () => {
  it('keeps selection, consent and SHOW unsupported in the written-only milestone', async () => {
    const abortActive = vi.fn();
    const controller = createSessionController({
      abortActive,
      resetPosition: vi.fn(),
      closeWindow: vi.fn(),
    });

    await controller.command({ type: 'select', windowToken: 'anything' });
    await controller.command({ type: 'consent', allow: true });
    const view = await controller.command({
      type: 'show',
      requestId: 'request-1',
      action: 'rectangle.corner',
      generation: 0,
    });

    expect(view).toMatchObject({
      token: null,
      binding: 'unbound',
      consent: 'off',
      visual: 'unavailable',
      reason: 'unsupported',
      availableActions: [],
    });
    expect(abortActive).not.toHaveBeenCalled();
  });

  it('applies pause, cancel, revoke, disconnect and reset-position locally', async () => {
    const abortActive = vi.fn();
    const resetPosition = vi.fn();
    const controller = createSessionController({
      abortActive,
      resetPosition,
      closeWindow: vi.fn(),
    });

    expect((await controller.command({ type: 'pause', paused: true })).paused).toBe(true);
    expect((await controller.command({ type: 'pause', paused: false })).paused).toBe(false);
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
    const controller = createSessionController({
      abortActive: vi.fn(),
      resetPosition: vi.fn(),
      closeWindow: vi.fn(),
    });
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

  it('aborts work before closing and makes cleanup idempotent', async () => {
    const abortActive = vi.fn();
    const closeWindow = vi.fn();
    const controller = createSessionController({
      abortActive,
      resetPosition: vi.fn(),
      closeWindow,
    });

    await controller.command({ type: 'close' });
    controller.dispose();
    controller.dispose();

    expect(abortActive).toHaveBeenCalledTimes(1);
    expect(closeWindow).toHaveBeenCalledTimes(1);
  });

  it('invalidates the generation on renderer reload while retaining the host bridge', async () => {
    const abortActive = vi.fn();
    const subscriber = vi.fn();
    const controller = createSessionController({
      abortActive,
      resetPosition: vi.fn(),
      closeWindow: vi.fn(),
    });
    controller.subscribe(subscriber);
    const priorGeneration = controller.getView().generation;

    controller.invalidate();

    expect(controller.getView().generation).toBeGreaterThan(priorGeneration);
    expect(controller.getView().consent).toBe('off');
    expect(controller.getView().reason).toBe('canceled');
    expect(abortActive).toHaveBeenCalledTimes(1);
    expect(subscriber).toHaveBeenCalledTimes(1);
  });
});
