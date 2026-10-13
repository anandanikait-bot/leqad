import { describe, expect, it } from 'vitest';
import type { LessonSession } from '@leqad/lesson-engine';
import type { ExtensionStorageArea, LearningHistory } from './progressStore';

const originalIdentity = {
  documentId: 'document-a',
  workspaceId: 'workspace-a',
  elementId: 'element-a',
  revision: 'revision-a',
};

function completedSession(
  overrides: Partial<LessonSession> = {},
): LessonSession {
  return {
    lessonId: 'foundations-first-sketch',
    lessonVersion: '2.0.0',
    currentStepId: 'enter-sketch',
    modelIdentity: originalIdentity,
    modelRevision: 'revision-a',
    modelState: {
      observedUiStates: {
        'enter-sketch': {
          fact: { topPlaneSelected: true },
          observedAt: '2026-10-13T11:59:00.000Z',
          expiresAt: '2026-10-13T12:00:30.000Z',
          evidenceIds: ['ui-1'],
        },
      },
      verifiedModelStates: {
        sketch: {
          status: 'PASS',
          observedAt: '2026-10-13T11:59:00.000Z',
          revision: 'revision-a',
          evidenceIds: ['api-1'],
        },
      },
      evidenceReferences: ['ui-1', 'api-1'],
      evidenceFreshness: 'current',
      uncertaintyReason: null,
    },
    updatedAt: '2026-10-13T12:00:00.000Z',
    steps: {
      'enter-sketch': {
        status: 'COMPLETED',
        hintLevel: 2,
        verification: 'PASS',
        resumeState: null,
        outcome: 'UI_VERIFIED',
      },
    },
    ...overrides,
  };
}

function memoryStorage(): ExtensionStorageArea & {
  values: Map<string, unknown>;
} {
  const values = new Map<string, unknown>();
  return {
    values,
    async get(key: string) {
      return { [key]: values.get(key) };
    },
    async set(entries: Record<string, unknown>) {
      for (const [key, value] of Object.entries(entries)) {
        values.set(key, value);
      }
    },
  };
}

describe('per-document lesson persistence', () => {
  it('restores a same-document session across reload', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    await store.saveSession(completedSession());

    const restored = await store.restoreSession(
      originalIdentity,
      'revision-a',
      { lessonId: 'foundations-first-sketch', lessonVersion: '2.0.0' },
      new Date('2026-10-13T12:00:15.000Z'),
    );

    expect(restored?.steps['enter-sketch']?.status).toBe('COMPLETED');
    expect(restored?.modelState.evidenceReferences).toEqual(['ui-1', 'api-1']);
  });

  it('does not restore UI-verified completion from expired observations', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    await store.saveSession(completedSession());

    const restored = await store.restoreSession(
      originalIdentity,
      'revision-a',
      { lessonId: 'foundations-first-sketch', lessonVersion: '2.0.0' },
      new Date('2026-10-13T13:00:00.000Z'),
    );

    expect(restored?.steps['enter-sketch']).toMatchObject({
      status: 'UNKNOWN',
      verification: 'UNKNOWN',
      outcome: 'UNABLE_TO_VERIFY',
    });
    expect(restored?.modelState.observedUiStates).toEqual({});
    expect(restored?.modelState.evidenceReferences).toEqual(['api-1']);
  });

  it('preserves learning state but invalidates model state when the revision is unknown', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    await store.saveSession(completedSession());

    const restored = await store.restoreSession(
      { ...originalIdentity, revision: null },
      null,
      { lessonId: 'foundations-first-sketch', lessonVersion: '2.0.0' },
    );

    expect(restored?.currentStepId).toBe('enter-sketch');
    expect(restored?.steps['enter-sketch']?.hintLevel).toBe(2);
    expect(restored?.steps['enter-sketch']?.status).toBe('UNKNOWN');
    expect(restored?.modelState.evidenceReferences).toEqual([]);
    expect(restored?.modelState.uncertaintyReason).toContain('unknown');
  });

  it('invalidates model-dependent state after a revision change', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    await store.saveSession(completedSession());

    const restored = await store.restoreSession(
      { ...originalIdentity, revision: 'revision-b' },
      'revision-b',
      { lessonId: 'foundations-first-sketch', lessonVersion: '2.0.0' },
    );

    expect(restored?.steps['enter-sketch']?.status).toBe('UNKNOWN');
    expect(restored?.modelState.verifiedModelStates).toEqual({});
  });

  it.each([
    { documentId: 'document-b' },
    { workspaceId: 'workspace-b' },
    { elementId: 'element-b' },
  ])('does not transfer a session to another context: %o', async (change) => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    await store.saveSession(completedSession());

    const restored = await store.restoreSession(
      { ...originalIdentity, ...change },
      'revision-a',
      { lessonId: 'foundations-first-sketch', lessonVersion: '2.0.0' },
    );

    expect(restored).toBeNull();
  });

  it('restores a paused session after a service-worker restart', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const storage = memoryStorage();
    const paused = completedSession();
    paused.steps['enter-sketch'] = {
      status: 'PAUSED',
      hintLevel: 3,
      verification: null,
      resumeState: 'AWAITING_ACTION',
      outcome: 'NONE',
    };
    await createLessonProgressStore(storage).saveSession(paused);

    const restartedStore = createLessonProgressStore(storage);
    const restored = await restartedStore.restoreSession(
      originalIdentity,
      'revision-a',
      { lessonId: 'foundations-first-sketch', lessonVersion: '2.0.0' },
    );

    expect(restored?.steps['enter-sketch']).toMatchObject({
      status: 'PAUSED',
      hintLevel: 3,
      resumeState: 'AWAITING_ACTION',
    });
  });

  it('does not resume a session from an older lesson version', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    await store.saveSession(completedSession({ lessonVersion: '1.0.0' }));

    await expect(
      store.restoreSession(originalIdentity, 'revision-a', {
        lessonId: 'foundations-first-sketch',
        lessonVersion: '2.0.0',
      }),
    ).resolves.toBeNull();
  });
});

describe('versioned storage and migrations', () => {
  it('ignores malformed and incompatible stored data', async () => {
    const { createLessonProgressStore, modelProgressStorageKey } =
      await import('./progressStore');
    const storage = memoryStorage();
    const key = modelProgressStorageKey(originalIdentity);
    const store = createLessonProgressStore(storage);

    storage.values.set(key, { schemaVersion: 2, session: { lessonId: 42 } });
    await expect(
      store.restoreSession(originalIdentity, 'revision-a'),
    ).resolves.toBeNull();

    storage.values.set(key, {
      schemaVersion: 999,
      session: completedSession(),
    });
    await expect(
      store.restoreSession(originalIdentity, 'revision-a'),
    ).resolves.toBeNull();
  });

  it('migrates the legacy single-session shape without trusting old completion', async () => {
    const { createLessonProgressStore, modelProgressStorageKey } =
      await import('./progressStore');
    const storage = memoryStorage();
    const legacy = completedSession() as unknown as Record<string, unknown>;
    delete legacy.modelState;
    const legacySteps = legacy.steps as Record<string, Record<string, unknown>>;
    delete legacySteps['enter-sketch']?.outcome;
    storage.values.set('leqad:lesson-session', legacy);
    const store = createLessonProgressStore(storage);

    const restored = await store.restoreSession(
      originalIdentity,
      'revision-a',
      { lessonId: 'foundations-first-sketch', lessonVersion: '2.0.0' },
    );

    expect(restored?.steps['enter-sketch']?.status).toBe('UNKNOWN');
    expect(restored?.steps['enter-sketch']?.outcome).toBe('UNABLE_TO_VERIFY');
    expect(
      storage.values.get(modelProgressStorageKey(originalIdentity)),
    ).toMatchObject({ schemaVersion: 2 });
  });
});

describe('learning history and preferences', () => {
  const history: LearningHistory = {
    lessonsVisited: {
      'foundations-first-sketch': {
        lessonVersion: '2.0.0',
        firstVisitedAt: '2026-10-13T10:00:00.000Z',
        lastVisitedAt: '2026-10-13T12:00:00.000Z',
      },
    },
    conceptsIntroduced: ['reference-planes', 'sketches'],
    hintUsage: { 'enter-sketch': 2 },
    practiceAttempts: { 'independent-practice': 1 },
  };

  it('keeps learning history independent from model reconciliation', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    await store.saveLearningHistory(history);
    await store.saveSession(completedSession());
    await store.restoreSession(
      { ...originalIdentity, revision: 'revision-b' },
      'revision-b',
    );

    await expect(store.loadLearningHistory()).resolves.toEqual(history);
  });

  it('restores panel preferences independently', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());
    const preferences = {
      collapsed: true,
      position: { left: 24, top: 32 },
    };

    await store.savePanelPreferences(preferences);

    await expect(store.loadPanelPreferences()).resolves.toEqual({
      ...preferences,
      onboardingComplete: false,
    });
  });

  it('uses first-run onboarding defaults when no preferences exist', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const store = createLessonProgressStore(memoryStorage());

    await expect(store.loadPanelPreferences()).resolves.toEqual({
      collapsed: false,
      position: null,
      onboardingComplete: false,
    });
  });
});

describe('ordered writes', () => {
  it('serializes rapid updates so a delayed older write cannot win', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const base = memoryStorage();
    let releaseFirst: (() => void) | undefined;
    let setCalls = 0;
    const storage: ExtensionStorageArea = {
      get: base.get,
      async set(entries) {
        setCalls += 1;
        if (setCalls === 1) {
          await new Promise<void>((resolve) => {
            releaseFirst = resolve;
          });
        }
        await base.set(entries);
      },
    };
    const store = createLessonProgressStore(storage);
    const older = completedSession({ updatedAt: '2026-10-13T12:00:01.000Z' });
    const newer = completedSession({ updatedAt: '2026-10-13T12:00:02.000Z' });
    newer.steps['enter-sketch'] = {
      ...newer.steps['enter-sketch']!,
      hintLevel: 4,
    };

    const firstSave = store.saveSession(older);
    const secondSave = store.saveSession(newer);
    await new Promise((resolve) => setTimeout(resolve, 0));
    expect(setCalls).toBe(1);
    releaseFirst?.();
    await Promise.all([firstSave, secondSave]);

    const restored = await store.restoreSession(originalIdentity, 'revision-a');
    expect(restored?.steps['enter-sketch']?.hintLevel).toBe(4);
  });

  it('waits for an in-flight save before restoring the same context', async () => {
    const { createLessonProgressStore } = await import('./progressStore');
    const base = memoryStorage();
    let delayNextWrite = false;
    let releaseWrite: (() => void) | undefined;
    const storage: ExtensionStorageArea = {
      get: base.get,
      async set(entries) {
        if (delayNextWrite) {
          delayNextWrite = false;
          await new Promise<void>((resolve) => {
            releaseWrite = resolve;
          });
        }
        await base.set(entries);
      },
    };
    const store = createLessonProgressStore(storage);
    await store.saveSession(
      completedSession({ currentStepId: 'introduction' }),
    );
    const newest = completedSession({ currentStepId: 'draw-rectangle' });
    delayNextWrite = true;

    const save = store.saveSession(newest);
    await new Promise((resolve) => setTimeout(resolve, 0));
    let restoreSettled = false;
    const restore = store
      .restoreSession(originalIdentity, 'revision-a')
      .then((session) => {
        restoreSettled = true;
        return session;
      });
    await new Promise((resolve) => setTimeout(resolve, 0));

    expect(restoreSettled).toBe(false);
    releaseWrite?.();
    await save;
    await expect(restore).resolves.toMatchObject({
      currentStepId: 'draw-rectangle',
    });
  });
});
