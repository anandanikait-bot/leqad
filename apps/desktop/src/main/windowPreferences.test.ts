import { describe, expect, it, vi } from 'vitest';
import { createWindowPreferenceController } from './windowPreferences';

describe('native keep-visible preference', () => {
  it('applies the default and updates always-on-top without focusing the window', () => {
    const setAlwaysOnTop = vi.fn();
    const focus = vi.fn();
    const controller = createWindowPreferenceController({
      isDestroyed: () => false,
      setAlwaysOnTop,
      focus,
    });

    expect(controller.getKeepVisible()).toBe(true);
    expect(setAlwaysOnTop).toHaveBeenNthCalledWith(1, true);

    controller.setKeepVisible(false);
    controller.setKeepVisible(true);

    expect(setAlwaysOnTop).toHaveBeenNthCalledWith(2, false);
    expect(setAlwaysOnTop).toHaveBeenNthCalledWith(3, true);
    expect(focus).not.toHaveBeenCalled();
  });

  it('keeps the preference in memory without calling a destroyed native window', () => {
    const setAlwaysOnTop = vi.fn();
    const controller = createWindowPreferenceController({
      isDestroyed: () => true,
      setAlwaysOnTop,
    });

    controller.setKeepVisible(false);

    expect(controller.getKeepVisible()).toBe(false);
    expect(setAlwaysOnTop).not.toHaveBeenCalled();
  });
});
