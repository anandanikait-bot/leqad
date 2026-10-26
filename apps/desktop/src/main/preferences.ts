import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {
  DEFAULT_PREFERENCES,
  PreferencesSchema,
  parseStoredLesson,
  type DesktopPreferences,
  type StoredLesson,
} from '@leqad/desktop-contracts';

export interface PanelPlacement {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
}

export type DesktopState = {
  schemaVersion: 1;
  preferences: DesktopPreferences;
  lesson: StoredLesson | null;
  placement: PanelPlacement | null;
};

export interface DesktopStateFileSystem {
  readFile(filePath: string): Promise<string>;
  mkdir(directoryPath: string): Promise<void>;
  writeFile(filePath: string, data: string): Promise<void>;
  rename(sourcePath: string, targetPath: string): Promise<void>;
  unlink(filePath: string): Promise<void>;
}

export interface DesktopStateStoreOptions {
  fileSystem?: DesktopStateFileSystem;
  saveAtomic?: (filePath: string, data: string) => Promise<void>;
}

export interface DesktopStateStore {
  loadDesktopState(): Promise<DesktopState>;
  saveDesktopState(value: unknown): Promise<void>;
  loadPreferences(): Promise<DesktopPreferences>;
  savePreferences(value: unknown): Promise<void>;
  loadLesson(): Promise<StoredLesson | null>;
  saveLesson(value: unknown): Promise<void>;
  loadPlacement(): Promise<PanelPlacement | null>;
  savePlacement(value: unknown): Promise<void>;
}

const defaultFileSystem: DesktopStateFileSystem = {
  readFile: (filePath) => fs.readFile(filePath, 'utf8'),
  mkdir: async (directoryPath) => {
    await fs.mkdir(directoryPath, { recursive: true });
  },
  writeFile: async (filePath, data) => {
    await fs.writeFile(filePath, data, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
  },
  rename: (sourcePath, targetPath) => fs.rename(sourcePath, targetPath),
  unlink: (filePath) => fs.unlink(filePath),
};

function emptyState(): DesktopState {
  return {
    schemaVersion: 1,
    preferences: { ...DEFAULT_PREFERENCES },
    lesson: null,
    placement: null,
  };
}

function cloneState(state: DesktopState): DesktopState {
  return JSON.parse(JSON.stringify(state)) as DesktopState;
}

function record(value: unknown): Record<string, unknown> {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new Error('Stored desktop state must be an object');
  }
  const prototype = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== null) {
    throw new Error('Stored desktop state has an unsupported prototype');
  }
  return value as Record<string, unknown>;
}

function exactKeys(
  value: Record<string, unknown>,
  expected: readonly string[],
): void {
  const keys = Object.keys(value).sort();
  const sortedExpected = [...expected].sort();
  if (
    keys.length !== sortedExpected.length ||
    keys.some((key, index) => key !== sortedExpected[index])
  ) {
    throw new Error(
      'Stored desktop state contains unexpected or missing fields',
    );
  }
}

export function parsePanelPlacement(value: unknown): PanelPlacement {
  const item = record(value);
  exactKeys(item, ['x', 'y', 'width', 'height', 'collapsed']);
  const { x, y, width, height, collapsed } = item;
  if (
    typeof x !== 'number' ||
    !Number.isSafeInteger(x) ||
    x < -100_000 ||
    x > 100_000 ||
    typeof y !== 'number' ||
    !Number.isSafeInteger(y) ||
    y < -100_000 ||
    y > 100_000 ||
    typeof width !== 'number' ||
    !Number.isSafeInteger(width) ||
    width < 1 ||
    width > 480 ||
    typeof height !== 'number' ||
    !Number.isSafeInteger(height) ||
    height < 1 ||
    height > 760 ||
    typeof collapsed !== 'boolean'
  ) {
    throw new Error('Stored panel placement is invalid');
  }
  return { x, y, width, height, collapsed };
}

function parseDesktopState(value: unknown): DesktopState {
  const item = record(value);
  exactKeys(item, ['schemaVersion', 'preferences', 'lesson', 'placement']);
  if (item.schemaVersion !== 1)
    throw new Error('Unsupported desktop state version');
  return {
    schemaVersion: 1,
    preferences: PreferencesSchema.parse(item.preferences),
    lesson: item.lesson === null ? null : parseStoredLesson(item.lesson),
    placement:
      item.placement === null ? null : parsePanelPlacement(item.placement),
  };
}

async function atomicWrite(
  filePath: string,
  data: string,
  fileSystem: DesktopStateFileSystem,
): Promise<void> {
  const directory = path.dirname(filePath);
  const temporaryFile = `${filePath}.${randomUUID()}.tmp`;
  await fileSystem.mkdir(directory);
  try {
    await fileSystem.writeFile(temporaryFile, data);
    await fileSystem.rename(temporaryFile, filePath);
  } catch (error) {
    try {
      await fileSystem.unlink(temporaryFile);
    } catch {
      // The final state file remains authoritative if cleanup is interrupted.
    }
    throw error;
  }
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

export function createDesktopStateStore(
  filePath: string,
  options: DesktopStateStoreOptions = {},
): DesktopStateStore {
  const fileSystem = options.fileSystem ?? defaultFileSystem;
  const saveAtomic =
    options.saveAtomic ??
    ((target, data) => atomicWrite(target, data, fileSystem));
  let current: DesktopState | undefined;
  let loadPromise: Promise<DesktopState> | undefined;
  let writeQueue: Promise<void> = Promise.resolve();

  const loadFromDisk = (): Promise<DesktopState> => {
    if (current) return Promise.resolve(current);
    if (loadPromise) return loadPromise;
    loadPromise = (async () => {
      let text: string;
      try {
        text = await fileSystem.readFile(filePath);
      } catch (error) {
        if (!isMissingFile(error)) throw error;
        current = emptyState();
        return current;
      }
      try {
        current = parseDesktopState(JSON.parse(text) as unknown);
        return current;
      } catch {
        throw new Error(
          'Stored desktop state is corrupt or uses an unsupported schema',
        );
      }
    })().finally(() => {
      loadPromise = undefined;
    });
    return loadPromise;
  };

  const transact = (
    mutate: (state: DesktopState) => DesktopState,
  ): Promise<void> => {
    const operation = writeQueue.then(async () => {
      const prior = await loadFromDisk();
      const next = parseDesktopState(mutate(cloneState(prior)));
      // Keep the valid candidate in memory even if the disk write fails, allowing retry.
      current = next;
      await saveAtomic(filePath, JSON.stringify(next));
    });
    writeQueue = operation.catch(() => undefined);
    return operation;
  };

  const snapshot = async (): Promise<DesktopState> => {
    await writeQueue;
    return cloneState(await loadFromDisk());
  };

  return {
    async loadDesktopState() {
      return snapshot();
    },
    async saveDesktopState(value) {
      const parsed = parseDesktopState(value);
      await transact(() => parsed);
    },
    async loadPreferences() {
      return (await snapshot()).preferences;
    },
    async savePreferences(value) {
      const preferences = PreferencesSchema.parse(value);
      await transact((state) => ({ ...state, preferences }));
    },
    async loadLesson() {
      return (await snapshot()).lesson;
    },
    async saveLesson(value) {
      const lesson = parseStoredLesson(value);
      await transact((state) => ({ ...state, lesson }));
    },
    async loadPlacement() {
      return (await snapshot()).placement;
    },
    async savePlacement(value) {
      const placement = value === null ? null : parsePanelPlacement(value);
      await transact((state) => ({ ...state, placement }));
    },
  };
}
