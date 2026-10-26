import { describe, expect, it, vi } from 'vitest';
import { createSessionController } from './session';
import { registerDesktopIpc } from './ipc';
import type { DesktopIpcDependencies, RendererEvent } from './ipc';

function createHarness(
  onPreferencesSaved?: DesktopIpcDependencies['onPreferencesSaved'],
) {
  const handlers = new Map<
    string,
    (event: RendererEvent, ...args: unknown[]) => unknown
  >();
  const removeHandler = vi.fn((channel: string) => handlers.delete(channel));
  const mainFrame = { url: 'file:///app/renderer/index.html' };
  const trustedUrl = mainFrame.url;
  const webContents = {
    mainFrame,
    isDestroyed: () => false,
    send: vi.fn(),
  };
  const window = { webContents, close: vi.fn() };
  const controller = createSessionController({
    abortActive: vi.fn(),
    resetPosition: vi.fn(),
    closeWindow: window.close,
  });
  const store = {
    loadPreferences: vi.fn(async () => ({
      appearance: 'system' as const,
      textScale: 1 as const,
      keepVisible: true,
      reduceMotion: 'system' as const,
    })),
    savePreferences: vi.fn(async () => undefined),
    loadLesson: vi.fn(async () => null),
    saveLesson: vi.fn(async () => undefined),
  };
  const registered = registerDesktopIpc({
    ipcMain: {
      handle: (channel, handler) => handlers.set(channel, handler),
      removeHandler,
    },
    getWindow: () => window,
    isTrustedRendererUrl: (url) => url === trustedUrl,
    controller,
    store,
    ...(onPreferencesSaved ? { onPreferencesSaved } : {}),
  });
  const event = { sender: webContents, senderFrame: mainFrame };
  return {
    controller,
    event,
    handlers,
    mainFrame,
    registered,
    removeHandler,
    store,
    webContents,
  };
}

describe('desktop IPC boundary', () => {
  it('rejects an invalid sender and a subframe before dispatch', async () => {
    const harness = createHarness();
    const commandHandler = harness.handlers.get('desktop:command')!;

    await expect(
      commandHandler(
        {
          ...harness.event,
          sender: { ...harness.event.sender },
        },
        { type: 'pause', paused: true },
      ),
    ).rejects.toThrow(/untrusted/i);
    await expect(
      commandHandler(
        {
          ...harness.event,
          senderFrame: { url: harness.mainFrame.url },
        },
        { type: 'pause', paused: true },
      ),
    ).rejects.toThrow(/untrusted/i);
    expect(harness.controller.getView().paused).toBe(false);
  });

  it('rejects an unsupported command before it reaches the session', async () => {
    const harness = createHarness();
    const handler = harness.handlers.get('desktop:command')!;

    await expect(
      handler(harness.event, { type: 'run-javascript', code: 'x' }),
    ).rejects.toThrow();
    expect(harness.controller.getView().paused).toBe(false);
  });

  it('rejects prototype-inherited commands and extra properties', async () => {
    const harness = createHarness();
    const handler = harness.handlers.get('desktop:command')!;
    const inherited = Object.create({ type: 'close' }) as object;

    await expect(handler(harness.event, inherited)).rejects.toThrow();
    await expect(
      handler(harness.event, {
        type: 'pause',
        paused: true,
        selector: '#button',
      }),
    ).rejects.toThrow();
    expect(harness.webContents.send).not.toHaveBeenCalled();
    expect(harness.controller.getView().paused).toBe(false);
  });

  it('rejects untrusted renderer URLs and invalid preference or lesson records', async () => {
    const harness = createHarness();
    const badUrl = harness.handlers.get('desktop:load-lesson')!;
    const invalidPreferences = harness.handlers.get(
      'desktop:save-preferences',
    )!;
    const invalidLesson = harness.handlers.get('desktop:save-lesson')!;

    harness.mainFrame.url = 'file:///tmp/attacker.html';
    await expect(badUrl(harness.event)).rejects.toThrow(/untrusted/i);
    await expect(
      invalidPreferences(harness.event, { appearance: 'system', textScale: 8 }),
    ).rejects.toThrow();
    await expect(
      invalidLesson(harness.event, { schemaVersion: 1, lessonId: 'untrusted' }),
    ).rejects.toThrow();
    expect(harness.store.savePreferences).not.toHaveBeenCalled();
    expect(harness.store.saveLesson).not.toHaveBeenCalled();
  });

  it('applies the native preference after a successful durable save only', async () => {
    const order: string[] = [];
    const onPreferencesSaved = vi.fn(() => order.push('applied'));
    const harness = createHarness(onPreferencesSaved);
    harness.store.savePreferences.mockImplementation(async () => {
      order.push('saved');
    });
    const handler = harness.handlers.get('desktop:save-preferences')!;
    const preferences = {
      appearance: 'system',
      textScale: 1,
      keepVisible: false,
      reduceMotion: 'system',
    } as const;

    await handler(harness.event, preferences);
    expect(order).toEqual(['saved', 'applied']);
    expect(onPreferencesSaved).toHaveBeenCalledWith(preferences);

    harness.store.savePreferences.mockRejectedValueOnce(new Error('disk full'));
    await expect(handler(harness.event, preferences)).rejects.toThrow(
      'disk full',
    );
    expect(onPreferencesSaved).toHaveBeenCalledTimes(1);
  });

  it('returns no selectable windows and removes IPC listeners on disposal', async () => {
    const harness = createHarness();
    const list = harness.handlers.get('desktop:list-windows')!;

    await expect(list(harness.event)).resolves.toEqual({
      windows: [],
      incomplete: false,
    });
    harness.registered.dispose();
    harness.registered.dispose();

    expect(harness.handlers.size).toBe(0);
    expect(harness.removeHandler).toHaveBeenCalledTimes(6);
  });
});
