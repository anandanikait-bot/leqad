export interface NativeWindowPreferenceTarget {
  isDestroyed(): boolean;
  setAlwaysOnTop(enabled: boolean): void;
  focus?(): void;
}

export interface WindowPreferenceController {
  getKeepVisible(): boolean;
  setKeepVisible(enabled: boolean): void;
}

export function createWindowPreferenceController(
  window: NativeWindowPreferenceTarget,
): WindowPreferenceController {
  let keepVisible = true;

  const apply = () => {
    if (!window.isDestroyed()) window.setAlwaysOnTop(keepVisible);
  };

  apply();

  return {
    getKeepVisible: () => keepVisible,
    setKeepVisible(enabled) {
      keepVisible = enabled;
      apply();
    },
  };
}
