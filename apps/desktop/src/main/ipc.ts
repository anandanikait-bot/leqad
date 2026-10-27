import {
  PreferencesSchema,
  parseCommand,
  parseStoredLesson,
  type Command,
  type DesktopPreferences,
} from '@leqad/desktop-contracts';
import type { DesktopStateStore } from './preferences';
import type { SessionController } from './session';

export const DESKTOP_CHANNELS = Object.freeze({
  listWindows: 'desktop:list-windows',
  command: 'desktop:command',
  sessionChanged: 'desktop:session-changed',
  loadPreferences: 'desktop:load-preferences',
  savePreferences: 'desktop:save-preferences',
  loadLesson: 'desktop:load-lesson',
  saveLesson: 'desktop:save-lesson',
});

export interface RendererFrame {
  url: string;
}

export interface RendererWebContents {
  mainFrame: RendererFrame;
  isDestroyed(): boolean;
  send(channel: string, value: unknown): void;
}

export interface RendererEvent {
  sender: RendererWebContents;
  senderFrame: RendererFrame | null;
}

export interface IpcMainPort {
  handle(
    channel: string,
    listener: (event: RendererEvent, ...args: unknown[]) => unknown,
  ): void;
  removeHandler(channel: string): void;
}

export interface IpcWindow {
  webContents: RendererWebContents;
  close(): void;
}

export interface DesktopIpcDependencies {
  ipcMain: IpcMainPort;
  getWindow(): IpcWindow | null;
  isTrustedRendererUrl(value: string): boolean;
  controller: SessionController;
  store: Pick<
    DesktopStateStore,
    'loadPreferences' | 'savePreferences' | 'loadLesson' | 'saveLesson'
  >;
  onPreferencesSaved?(preferences: DesktopPreferences): void;
}

export interface DesktopIpcRegistration {
  dispose(): void;
}

function copyPlainData(
  value: unknown,
  state = { nodes: 0 },
  depth = 0,
): unknown {
  state.nodes += 1;
  if (state.nodes > 2_000 || depth > 16)
    throw new Error('IPC payload is too complex');
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'string') {
    if (value.length > 8_192)
      throw new Error('IPC payload contains an oversized string');
    return value;
  }
  if (typeof value === 'number') {
    if (!Number.isFinite(value))
      throw new Error('IPC payload contains a non-finite number');
    return value;
  }
  if (Array.isArray(value)) {
    if (Object.getPrototypeOf(value) !== Array.prototype)
      throw new Error('IPC array prototype is not allowed');
    return value.map((item) => copyPlainData(item, state, depth + 1));
  }
  if (typeof value !== 'object')
    throw new Error('IPC payload must contain only plain data');
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error('IPC payload prototype is not allowed');
  }
  if (Object.getOwnPropertySymbols(value).length > 0)
    throw new Error('IPC symbol properties are not allowed');
  const result: Record<string, unknown> = Object.create(null) as Record<
    string,
    unknown
  >;
  for (const key of Object.keys(value)) {
    if (key === '__proto__')
      throw new Error('IPC prototype mutation is not allowed');
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !descriptor.enumerable || !('value' in descriptor)) {
      throw new Error('IPC accessors are not allowed');
    }
    result[key] = copyPlainData(descriptor.value, state, depth + 1);
  }
  return result;
}

function assertTrustedSender(
  event: RendererEvent,
  dependencies: DesktopIpcDependencies,
): IpcWindow {
  const window = dependencies.getWindow();
  const frame = event.senderFrame;
  if (
    !window ||
    window.webContents !== event.sender ||
    event.sender.isDestroyed() ||
    !frame ||
    frame !== event.sender.mainFrame ||
    !dependencies.isTrustedRendererUrl(frame.url)
  ) {
    throw new Error('Untrusted IPC sender or frame');
  }
  return window;
}

export function registerDesktopIpc(
  dependencies: DesktopIpcDependencies,
): DesktopIpcRegistration {
  const channels = Object.values(DESKTOP_CHANNELS).filter(
    (channel) => channel !== DESKTOP_CHANNELS.sessionChanged,
  );
  let disposed = false;
  const unsubscribe = dependencies.controller.subscribe((view) => {
    const window = dependencies.getWindow();
    if (!window || window.webContents.isDestroyed()) return;
    window.webContents.send(DESKTOP_CHANNELS.sessionChanged, view);
  });

  const addHandler = (
    channel: string,
    expectedArgs: number,
    handler: (window: IpcWindow, ...args: unknown[]) => unknown,
  ) => {
    dependencies.ipcMain.handle(channel, async (event, ...args) => {
      assertTrustedSender(event, dependencies);
      if (args.length !== expectedArgs)
        throw new Error('Unexpected IPC argument count');
      return handler(dependencies.getWindow()!, ...args);
    });
  };

  addHandler(DESKTOP_CHANNELS.listWindows, 0, () => ({
    windows: [],
    incomplete: false,
  }));
  addHandler(DESKTOP_CHANNELS.command, 1, async (_window, rawCommand) => {
    const command: Command = parseCommand(copyPlainData(rawCommand));
    return dependencies.controller.command(command);
  });
  addHandler(DESKTOP_CHANNELS.loadPreferences, 0, () =>
    dependencies.store.loadPreferences(),
  );
  addHandler(DESKTOP_CHANNELS.savePreferences, 1, async (_window, value) => {
    const safeValue = copyPlainData(value);
    const preferences = PreferencesSchema.parse(safeValue);
    await dependencies.store.savePreferences(preferences);
    dependencies.onPreferencesSaved?.(preferences);
  });
  addHandler(DESKTOP_CHANNELS.loadLesson, 0, () =>
    dependencies.store.loadLesson(),
  );
  addHandler(DESKTOP_CHANNELS.saveLesson, 1, (_window, value) => {
    const safeValue = copyPlainData(value);
    return dependencies.store.saveLesson(parseStoredLesson(safeValue));
  });

  return {
    dispose() {
      if (disposed) return;
      disposed = true;
      unsubscribe();
      for (const channel of channels)
        dependencies.ipcMain.removeHandler(channel);
    },
  };
}
