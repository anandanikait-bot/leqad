import { describe, expect, it } from 'vitest';
import type { LessonSession } from '@leqad/lesson-engine';

const originalIdentity = {
  documentId: 'document-a',
  workspaceId: 'workspace-a',
  elementId: 'element-a',
  revision: 'revision-a',
};

const completedSession: LessonSession = {
  lessonId: 'foundations-first-sketch',
  lessonVersion: '1.0.0',
  currentStepId: 'enter-sketch',
  modelIdentity: originalIdentity,
  modelRevision: 'revision-a',
  updatedAt: '2026-10-13T12:00:00.000Z',
  steps: {
    'enter-sketch': {
      status: 'COMPLETED',
      hintLevel: 2,
      verification: 'PASS',
      resumeState: null,
    },
  },
};

function memoryStorage() {
  const values = new Map<string, unknown>();
  return {
    values,
    async get(key: string) {
      return { [key]: values.get(key) };
    },
    async set(entries: Record<string, unknown>) {
      for (const [key, value] of Object.entries(entries))
        values.set(key, value);
    },
  };
}

describe('lesson progress persistence', () => {
  it('restores a lesson session only against the same document and revision', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const storage = memoryStorage();
    const store = createLessonProgressStore(storage);
    await store.saveSession(completedSession);

    const restored = await store.restoreSession(
      { ...originalIdentity, revision: 'revision-b' },
      'revision-b',
      new Date('2026-10-13T13:00:00.000Z'),
    );

    expect(restored?.steps['enter-sketch']?.status).toBe('UNKNOWN');
    expect(restored?.steps['enter-sketch']?.verification).toBe('UNKNOWN');
  });

  it('ignores malformed storage instead of resuming invalid progress', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const storage = memoryStorage();
    storage.values.set('leqad:lesson-session', { lessonId: 'untrusted' });
    const store = createLessonProgressStore(storage);

    await expect(
      store.restoreSession(originalIdentity, 'revision-a'),
    ).resolves.toBeNull();
  });

  it('restores panel collapse and position preferences', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    const preferences = {
      collapsed: true,
      position: { left: 24, top: 32 },
    };

    await store.savePanelPreferences(preferences);

    await expect(store.loadPanelPreferences()).resolves.toEqual(preferences);
  });
});
