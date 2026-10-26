import {
  mkdir,
  mkdtemp,
  readFile,
  rename,
  rm,
  unlink,
  writeFile,
} from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createDesktopStateStore } from './preferences';

const temporaryDirectories: string[] = [];
async function makeStatePath() {
  const directory = await mkdtemp(
    path.join(tmpdir(), 'leqad-desktop-state-test-'),
  );
  temporaryDirectories.push(directory);
  return path.join(directory, 'desktop-state.json');
}

function lesson(currentStep = 0) {
  return {
    schemaVersion: 1,
    lessonId: 'foundations-first-sketch',
    lessonVersion: '2.0.0',
    currentStep,
    steps: Array.from({ length: 8 }, () => ({
      status: 'NOT_STARTED',
      hintLevel: 0,
      verification: null,
      resumeState: null,
      outcome: 'NONE',
    })),
  };
}

afterEach(async () => {
  await Promise.all(
    temporaryDirectories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('desktop state persistence', () => {
  it('rejects corrupt stored data instead of silently resetting it', async () => {
    const filePath = await makeStatePath();
    await writeFile(
      filePath,
      '{"schemaVersion":99,"lesson":{"privateTitle":"leak"}}',
      'utf8',
    );
    const store = createDesktopStateStore(filePath);

    await expect(store.loadDesktopState()).rejects.toThrow();
    await expect(readFile(filePath, 'utf8')).resolves.toContain('privateTitle');
  });

  it('validates the persisted envelope and never accepts consent or OS handles', async () => {
    const filePath = await makeStatePath();
    const store = createDesktopStateStore(filePath);
    const valid = {
      schemaVersion: 1,
      preferences: {
        appearance: 'system',
        textScale: 1,
        keepVisible: true,
        reduceMotion: 'system',
      },
      lesson: lesson(),
      placement: null,
    };

    await expect(
      store.saveDesktopState({ ...valid, consent: true }),
    ).rejects.toThrow();
    await expect(
      store.saveDesktopState({ ...valid, windowHandle: 123 }),
    ).rejects.toThrow();
    await expect(store.loadDesktopState()).resolves.toMatchObject({
      lesson: null,
      placement: null,
    });
  });

  it('keeps a failed lesson save in memory for an explicit retry', async () => {
    const filePath = await makeStatePath();
    const saveAtomic = vi
      .fn()
      .mockRejectedValueOnce(new Error('disk full'))
      .mockResolvedValue(undefined);
    const store = createDesktopStateStore(filePath, { saveAtomic });
    const record = lesson(3);

    await expect(store.saveLesson(record)).rejects.toThrow('disk full');
    await expect(store.loadLesson()).resolves.toMatchObject({ currentStep: 3 });
    await store.saveLesson(record);
    await expect(store.loadLesson()).resolves.toMatchObject({ currentStep: 3 });
    expect(saveAtomic).toHaveBeenCalledTimes(2);
  });

  it('leaves the previous state intact when an atomic temporary write is interrupted', async () => {
    const filePath = await makeStatePath();
    const initialStore = createDesktopStateStore(filePath);
    await initialStore.saveLesson(lesson(1));
    const originalFile = await readFile(filePath, 'utf8');
    const interruptedFileSystem = {
      readFile: (target: string) => readFile(target, 'utf8'),
      mkdir: async (target: string) => {
        await mkdir(target, { recursive: true });
      },
      writeFile: async (target: string, data: string) => {
        await writeFile(
          target,
          data.slice(0, Math.max(1, Math.floor(data.length / 2))),
          'utf8',
        );
        throw new Error('interrupted temporary write');
      },
      rename: (source: string, target: string) => rename(source, target),
      unlink: (target: string) => unlink(target),
    };
    const interruptedStore = createDesktopStateStore(filePath, {
      fileSystem: interruptedFileSystem,
    });

    await expect(interruptedStore.saveLesson(lesson(6))).rejects.toThrow(
      'interrupted temporary write',
    );
    await expect(readFile(filePath, 'utf8')).resolves.toBe(originalFile);
    await expect(
      createDesktopStateStore(filePath).loadLesson(),
    ).resolves.toMatchObject({ currentStep: 1 });
  });

  it('persists preferences and the validated lesson across store instances', async () => {
    const filePath = await makeStatePath();
    const store = createDesktopStateStore(filePath);
    await store.savePreferences({
      appearance: 'dark',
      textScale: 1.5,
      keepVisible: false,
      reduceMotion: 'reduce',
    });
    await store.saveLesson(lesson(5));

    const reloaded = createDesktopStateStore(filePath);
    await expect(reloaded.loadPreferences()).resolves.toMatchObject({
      appearance: 'dark',
      keepVisible: false,
    });
    await expect(reloaded.loadLesson()).resolves.toMatchObject({
      currentStep: 5,
    });
  });
});
