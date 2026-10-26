import {
  PreferencesSchema,
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
  removeListener(channel: string, listener: (event: unknown, value: unknown) => void): void;
}

const actions = new Set([
  'reference.top',
  'sketch.start',
  'rectangle.corner',
  'dimension',
  'sketch.finish',
]);
const reasons = new Set([
  'unsupported',
  'permission-required',
  'window-lost',
  'context-unknown',
  'ambiguous',
  'stale',
  'expired',
  'canceled',
  'invalid-bounds',
  'occluded',
  'provider-failed',
]);

function plainRecord(value: unknown, keys: readonly string[]): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Invalid desktop host response');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) throw new Error('Invalid desktop host response');
  if (Object.getOwnPropertySymbols(value).length > 0) throw new Error('Invalid desktop host response');
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join('|') !== [...keys].sort().join('|')) {
    throw new Error('Invalid desktop host response fields');
  }
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (!descriptor || !('value' in descriptor)) throw new Error('Invalid desktop host response field');
  }
  return record;
}

function parseSessionView(value: unknown): SessionView {
  const item = plainRecord(value, [
    'token',
    'generation',
    'binding',
    'consent',
    'paused',
    'visual',
    'reason',
    'availableActions',
  ]);
  if (
    !(item.token === null || (typeof item.token === 'string' && item.token.length <= 128)) ||
    typeof item.generation !== 'number' || !Number.isSafeInteger(item.generation) || item.generation < 0 ||
    !['unbound', 'selected', 'disconnected'].includes(String(item.binding)) ||
    !['off', 'on-request'].includes(String(item.consent)) ||
    typeof item.paused !== 'boolean' ||
    !['idle', 'waiting', 'inspecting', 'highlighted', 'unavailable'].includes(String(item.visual)) ||
    !(item.reason === null || (typeof item.reason === 'string' && reasons.has(item.reason))) ||
    !Array.isArray(item.availableActions) ||
    item.availableActions.some((action) => typeof action !== 'string' || !actions.has(action))
  ) {
    throw new Error('Invalid desktop session view');
  }
  return Object.freeze({
    token: item.token,
    generation: item.generation,
    binding: item.binding,
    consent: item.consent,
    paused: item.paused,
    visual: item.visual,
    reason: item.reason,
    availableActions: Object.freeze([...item.availableActions]),
  }) as SessionView;
}

function parseWindows(value: unknown): Awaited<ReturnType<DesktopBridge['listWindows']>> {
  const item = plainRecord(value, ['windows', 'incomplete']);
  if (typeof item.incomplete !== 'boolean' || !Array.isArray(item.windows) || item.windows.length > 50) {
    throw new Error('Invalid desktop window list');
  }
  const windows = item.windows.map((window) => {
    const choice = plainRecord(window, ['token', 'label', 'kind']);
    if (
      typeof choice.token !== 'string' || choice.token.length < 1 || choice.token.length > 128 ||
      typeof choice.label !== 'string' || choice.label.length < 1 || choice.label.length > 80 ||
      (choice.kind !== 'browser' && choice.kind !== 'native')
    ) {
      throw new Error('Invalid desktop window choice');
    }
    return Object.freeze({ token: choice.token, label: choice.label, kind: choice.kind });
  });
  return Object.freeze({ windows: Object.freeze(windows), incomplete: item.incomplete });
}

export function createDesktopBridge(ipcRenderer: IpcRendererPort): DesktopBridge {
  return Object.freeze({
    async listWindows() {
      return parseWindows(await ipcRenderer.invoke(DESKTOP_CHANNELS.listWindows));
    },
    async command(value: Command) {
      return parseSessionView(await ipcRenderer.invoke(
        DESKTOP_CHANNELS.command,
        parseCommand(value),
      ));
    },
    subscribe(listener: (view: SessionView) => void) {
      if (typeof listener !== 'function') throw new TypeError('Session subscriber must be a function');
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
      return PreferencesSchema.parse(await ipcRenderer.invoke(DESKTOP_CHANNELS.loadPreferences));
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
      await ipcRenderer.invoke(DESKTOP_CHANNELS.saveLesson, parseStoredLesson(value));
    },
  });
}
