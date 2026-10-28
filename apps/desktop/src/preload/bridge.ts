import {
  PreferencesSchema,
  parseSessionView as validateSessionView,
  parseWindowCatalog as validateWindowCatalog,
  parseCommand,
  parseStoredLesson,
  type Command,
  type DesktopBridge,
  type DesktopPreferences,
  type SessionView,
  type StoredLesson,
} from '@leqad/desktop-contracts';
import { DESKTOP_CHANNELS } from '../main/ipc';

export interface IpcRendererPort {
  invoke(channel: string, ...args: unknown[]): Promise<unknown>;
  on(channel: string, listener: (event: unknown, value: unknown) => void): void;
  removeListener(
    channel: string,
    listener: (event: unknown, value: unknown) => void,
  ): void;
}

function plainRecord(
  value: unknown,
  keys: readonly string[],
): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid desktop host response');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null)
    throw new Error('Invalid desktop host response');
  if (Object.getOwnPropertySymbols(value).length > 0)
    throw new Error('Invalid desktop host response');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join('|') !== [...keys].sort().join('|')) {
    throw new Error('Invalid desktop host response fields');
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor))
      throw new Error('Invalid desktop host response field');
  }
  return record;
}

function parseSessionView(value: unknown): SessionView {
  plainRecord(value, [
    'token',
    'generation',
    'binding',
    'consent',
    'selectedWindow',
    'paused',
    'visual',
    'reason',
    'availableActions',
  ]);
  return validateSessionView(value);
}

function parseWindows(
  value: unknown,
): Awaited<ReturnType<DesktopBridge['listWindows']>> {
  plainRecord(value, [
    'availability',
    'unavailableReason',
    'incomplete',
    'windows',
  ]);
  return validateWindowCatalog(value);
}

export function createDesktopBridge(
  ipcRenderer: IpcRendererPort,
): DesktopBridge {
  return Object.freeze({
    async listWindows() {
      return parseWindows(
        await ipcRenderer.invoke(DESKTOP_CHANNELS.listWindows),
      );
    },
    async command(value: Command) {
      return parseSessionView(
        await ipcRenderer.invoke(DESKTOP_CHANNELS.command, parseCommand(value)),
      );
    },
    subscribe(listener: (view: SessionView) => void) {
      if (typeof listener !== 'function')
        throw new TypeError('Session subscriber must be a function');
      const handler = (_event: unknown, value: unknown) => {
        try {
          listener(parseSessionView(value));
        } catch {
          // Invalid host events are ignored; the next explicit command returns fresh state.
        }
      };
      ipcRenderer.on(DESKTOP_CHANNELS.sessionChanged, handler);
      let subscribed = true;
      return () => {
        if (!subscribed) return;
        subscribed = false;
        ipcRenderer.removeListener(DESKTOP_CHANNELS.sessionChanged, handler);
      };
    },
    async loadPreferences() {
      return PreferencesSchema.parse(
        await ipcRenderer.invoke(DESKTOP_CHANNELS.loadPreferences),
      );
    },
    async savePreferences(value: DesktopPreferences) {
      const preferences = PreferencesSchema.parse(value);
      await ipcRenderer.invoke(DESKTOP_CHANNELS.savePreferences, preferences);
    },
    async loadLesson() {
      const value = await ipcRenderer.invoke(DESKTOP_CHANNELS.loadLesson);
      return value === null ? null : parseStoredLesson(value);
    },
    async saveLesson(value: StoredLesson) {
      await ipcRenderer.invoke(
        DESKTOP_CHANNELS.saveLesson,
        parseStoredLesson(value),
      );
    },
  });
}
