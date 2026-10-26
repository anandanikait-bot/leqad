import { describe, expect, it, vi } from 'vitest';
import { createDesktopBridge } from './bridge';

describe('sandboxed DesktopBridge', () => {
  it('exposes only closed bridge methods and fixed IPC channels', async () => {
    const invoke = vi.fn(async (channel: string) => {
      if (channel === 'desktop:list-windows')
        return { windows: [], incomplete: false };
      return undefined;
    });
    const bridge = createDesktopBridge({
      invoke,
      on: vi.fn(),
      removeListener: vi.fn(),
    });

    expect(Object.keys(bridge).sort()).toEqual([
      'command',
      'listWindows',
      'loadLesson',
      'loadPreferences',
      'saveLesson',
      'savePreferences',
      'subscribe',
    ]);
    await bridge.listWindows();
    expect(invoke).toHaveBeenCalledExactlyOnceWith('desktop:list-windows');
  });

  it('removes session listeners idempotently when a renderer unsubscribes', () => {
    const on = vi.fn();
    const removeListener = vi.fn();
    const bridge = createDesktopBridge({ invoke: vi.fn(), on, removeListener });
    const unsubscribe = bridge.subscribe(vi.fn());

    unsubscribe();
    unsubscribe();

    expect(on).toHaveBeenCalledTimes(1);
    expect(removeListener).toHaveBeenCalledTimes(1);
    expect(Object.isFrozen(bridge)).toBe(true);
  });
});
