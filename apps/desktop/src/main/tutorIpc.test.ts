import { describe, expect, it, vi } from 'vitest';
import { TUTOR_CHANNELS, type TutorSnapshot } from '@leqad/desktop-contracts';
import type { RendererEvent } from './ipc';
import { registerTutorIpc } from './tutorIpc';
function harness() {
  const handlers = new Map<
    string,
    (event: RendererEvent, ...args: unknown[]) => unknown
  >();
  const frame = { url: 'file:///app/index.html' };
  const sender = { mainFrame: frame, isDestroyed: () => false, send: vi.fn() };
  const snapshot: TutorSnapshot = {
    mode: 'unavailable',
    messages: [],
    profile: { version: 1, preference: 'none', events: [] },
  };
  const service = {
    snapshot: vi.fn(async () => snapshot),
    ask: vi.fn(async () => ({
      ok: false as const,
      code: 'unavailable' as const,
    })),
    cancel: vi.fn(),
    editMemory: vi.fn(async () => snapshot),
    dispose: vi.fn(),
  };
  const registration = registerTutorIpc({
    ipcMain: {
      handle: (c, h) => handlers.set(c, h),
      removeHandler: (c) => {
        handlers.delete(c);
      },
    },
    getWindow: () => ({ webContents: sender, close: vi.fn() }),
    isTrustedRendererUrl: (url) => url === 'file:///app/index.html',
    service,
  });
  return {
    handlers,
    service,
    registration,
    event: { sender, senderFrame: frame },
    frame,
  };
}
describe('tutor IPC isolation', () => {
  it('rejects foreign senders, subframes and untrusted navigation on every channel', async () => {
    const h = harness();
    for (const handler of h.handlers.values()) {
      await expect(
        handler({ ...h.event, sender: { ...h.event.sender } }),
      ).rejects.toThrow(/untrusted/i);
      await expect(
        handler({ ...h.event, senderFrame: { url: h.frame.url } }),
      ).rejects.toThrow(/untrusted/i);
      await expect(handler({ ...h.event, senderFrame: null })).rejects.toThrow(
        /untrusted/i,
      );
    }
    h.frame.url = 'https://untrusted.invalid/';
    await expect(
      h.handlers.get(TUTOR_CHANNELS.snapshot)!(h.event),
    ).rejects.toThrow(/untrusted/i);
    expect(h.service.ask).not.toHaveBeenCalled();
  });
  it('rejects extra arguments, endpoints, role injection, getters and oversized text before dispatch', async () => {
    const h = harness();
    const ask = h.handlers.get(TUTOR_CHANNELS.ask)!;
    const valid = { id: 'q1', text: 'How do I dimension?', stepIndex: 5 };
    for (const payload of [
      { ...valid, role: 'system' },
      { ...valid, endpoint: 'https://evil.invalid' },
      { ...valid, text: 'x'.repeat(2001) },
      Object.create(valid),
    ]) {
      await expect(ask(h.event, payload)).rejects.toThrow(
        'Invalid tutor request',
      );
    }
    const getter = vi.fn(() => 'private');
    await expect(
      ask(h.event, {
        ...valid,
        ...{
          get extra() {
            return getter();
          },
        },
      }),
    ).rejects.toThrow();
    const accessor = Object.defineProperty({ ...valid }, 'text', {
      get: getter,
      enumerable: true,
    });
    getter.mockClear();
    await expect(ask(h.event, accessor)).rejects.toThrow();
    expect(getter).not.toHaveBeenCalled();
    await expect(ask(h.event, valid, 'secret')).rejects.toThrow();
    expect(h.service.ask).not.toHaveBeenCalled();
    await expect(ask(h.event, valid)).resolves.toEqual({
      ok: false,
      code: 'unavailable',
    });
  });
  it('returns fixed errors instead of provider or disk exception details', async () => {
    const h = harness();
    h.service.snapshot.mockRejectedValueOnce(
      new Error('private path and API secret'),
    );
    await expect(
      h.handlers.get(TUTOR_CHANNELS.snapshot)!(h.event),
    ).rejects.toThrow('Tutor operation unavailable');
  });
  it('cancels and removes all channels at reload or shutdown', async () => {
    const h = harness();
    const ask = h.handlers.get(TUTOR_CHANNELS.ask)!;
    h.registration.dispose();
    h.registration.dispose();
    expect(h.service.dispose).toHaveBeenCalledTimes(1);
    expect(h.handlers.size).toBe(0);
    await expect(
      ask(h.event, { id: 'q1', text: 'Hello', stepIndex: 0 }),
    ).rejects.toThrow();
  });
});
