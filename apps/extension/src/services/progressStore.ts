import { ModelIdentitySchema, type ModelIdentity } from '@leqad/contracts';
import {
  createUnknownLessonModelState,
  reconcileSession,
} from '@leqad/lesson-engine';
import type {
  LessonModelState,
  LessonSession,
  LessonStepState,
  StoredModelVerification,
  StoredUiObservation,
} from '@leqad/lesson-engine';

export interface ExtensionStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface PanelPreferences {
  collapsed: boolean;
  position: { left: number; top: number } | null;
  onboardingComplete?: boolean;
}

export interface LearningHistory {
  lessonsVisited: Record<
    string,
    {
      lessonVersion: string;
      firstVisitedAt: string;
      lastVisitedAt: string;
    }
  >;
  conceptsIntroduced: string[];
  hintUsage: Record<string, number>;
  practiceAttempts: Record<string, number>;
}

export interface RestoreLessonRequirement {
  lessonId: string;
  lessonVersion: string;
}

const STORAGE_SCHEMA_VERSION = 2;
const MODEL_PROGRESS_PREFIX = 'leqad:model-progress:v2';
const LEARNING_HISTORY_KEY = 'leqad:learning-history:v2';
const PREFERENCES_KEY = 'leqad:panel-preferences:v2';
const LEGACY_SESSION_KEY = 'leqad:lesson-session';
const LEGACY_PREFERENCES_KEY = 'leqad:panel-preferences';
const STEP_STATUSES = new Set([
  'NOT_STARTED',
  'READY',
  'AWAITING_ACTION',
  'ACTION_OBSERVED',
  'VERIFYING',
  'COMPLETED',
  'NEEDS_CORRECTION',
  'UNKNOWN',
  'PAUSED',
]);
const VERIFICATION_STATUSES = new Set(['PASS', 'WARNING', 'FAIL', 'UNKNOWN']);
const STEP_OUTCOMES = new Set([
  'NONE',
  'ACKNOWLEDGED',
  'UI_VERIFIED',
  'MODEL_VERIFIED',
  'SELF_REPORTED',
  'UNABLE_TO_VERIFY',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isTimestamp(value: unknown): value is string {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return (
    Array.isArray(value) && value.every((item) => typeof item === 'string')
  );
}

function isLessonStepState(value: unknown): value is LessonStepState {
  if (!isRecord(value)) return false;
  return (
    typeof value.status === 'string' &&
    STEP_STATUSES.has(value.status) &&
    typeof value.hintLevel === 'number' &&
    Number.isFinite(value.hintLevel) &&
    value.hintLevel >= 0 &&
    (value.verification === null ||
      (typeof value.verification === 'string' &&
        VERIFICATION_STATUSES.has(value.verification))) &&
    (value.resumeState === null ||
      (typeof value.resumeState === 'string' &&
        STEP_STATUSES.has(value.resumeState))) &&
    typeof value.outcome === 'string' &&
    STEP_OUTCOMES.has(value.outcome)
  );
}

function isStoredUiObservation(value: unknown): value is StoredUiObservation {
  if (!isRecord(value)) return false;
  return (
    isRecord(value.fact) &&
    isTimestamp(value.observedAt) &&
    (value.expiresAt === null || isTimestamp(value.expiresAt)) &&
    isStringArray(value.evidenceIds)
  );
}

function isStoredModelVerification(
  value: unknown,
): value is StoredModelVerification {
  if (!isRecord(value)) return false;
  return (
    typeof value.status === 'string' &&
    VERIFICATION_STATUSES.has(value.status) &&
    isTimestamp(value.observedAt) &&
    (value.revision === null || typeof value.revision === 'string') &&
    isStringArray(value.evidenceIds)
  );
}

function isRecordOf(
  value: unknown,
  predicate: (item: unknown) => boolean,
): value is Record<string, unknown> {
  return isRecord(value) && Object.values(value).every(predicate);
}

function isLessonModelState(value: unknown): value is LessonModelState {
  if (!isRecord(value)) return false;
  return (
    isRecordOf(value.observedUiStates, isStoredUiObservation) &&
    isRecordOf(value.verifiedModelStates, isStoredModelVerification) &&
    isStringArray(value.evidenceReferences) &&
    (value.evidenceFreshness === 'current' ||
      value.evidenceFreshness === 'stale' ||
      value.evidenceFreshness === 'unknown') &&
    (value.uncertaintyReason === null ||
      typeof value.uncertaintyReason === 'string')
  );
}

function isLessonSessionBase(
  value: unknown,
): value is Omit<LessonSession, 'modelState'> & { modelState?: unknown } {
  if (!isRecord(value)) return false;
  const identity = ModelIdentitySchema.safeParse(value.modelIdentity);
  if (
    !identity.success ||
    typeof value.lessonId !== 'string' ||
    value.lessonId.length === 0 ||
    typeof value.lessonVersion !== 'string' ||
    value.lessonVersion.length === 0 ||
    typeof value.currentStepId !== 'string' ||
    value.currentStepId.length === 0 ||
    !(
      typeof value.modelRevision === 'string' || value.modelRevision === null
    ) ||
    !isTimestamp(value.updatedAt) ||
    !isRecordOf(value.steps, isLessonStepState)
  ) {
    return false;
  }
  return true;
}

function isLessonSession(value: unknown): value is LessonSession {
  return isLessonSessionBase(value) && isLessonModelState(value.modelState);
}

function isPanelPreferences(value: unknown): value is PanelPreferences {
  if (!isRecord(value) || typeof value.collapsed !== 'boolean') return false;
  if (
    value.onboardingComplete !== undefined &&
    typeof value.onboardingComplete !== 'boolean'
  ) {
    return false;
  }
  if (value.position === null) return true;
  return (
    isRecord(value.position) &&
    typeof value.position.left === 'number' &&
    Number.isFinite(value.position.left) &&
    typeof value.position.top === 'number' &&
    Number.isFinite(value.position.top)
  );
}

function isNonnegativeIntegerRecord(
  value: unknown,
): value is Record<string, number> {
  return (
    isRecord(value) &&
    Object.values(value).every(
      (item) => typeof item === 'number' && Number.isInteger(item) && item >= 0,
    )
  );
}

function isLearningHistory(value: unknown): value is LearningHistory {
  if (!isRecord(value)) return false;
  return (
    isRecordOf(value.lessonsVisited, (lesson) => {
      if (!isRecord(lesson)) return false;
      return (
        typeof lesson.lessonVersion === 'string' &&
        lesson.lessonVersion.length > 0 &&
        isTimestamp(lesson.firstVisitedAt) &&
        isTimestamp(lesson.lastVisitedAt)
      );
    }) &&
    isStringArray(value.conceptsIntroduced) &&
    isNonnegativeIntegerRecord(value.hintUsage) &&
    isNonnegativeIntegerRecord(value.practiceAttempts)
  );
}

function sameDocument(left: ModelIdentity, right: ModelIdentity): boolean {
  return (
    left.documentId === right.documentId &&
    left.workspaceId === right.workspaceId &&
    left.elementId === right.elementId
  );
}

function encodedId(value: string): string {
  return encodeURIComponent(value);
}

export function modelProgressStorageKey(identity: ModelIdentity): string {
  return [
    MODEL_PROGRESS_PREFIX,
    encodedId(identity.documentId),
    encodedId(identity.workspaceId),
    encodedId(identity.elementId),
  ].join(':');
}

interface ModelProgressEnvelope {
  schemaVersion: typeof STORAGE_SCHEMA_VERSION;
  savedAt: string;
  writeSequence: number;
  session: LessonSession;
}

function isModelProgressEnvelope(
  value: unknown,
): value is ModelProgressEnvelope {
  return (
    isRecord(value) &&
    value.schemaVersion === STORAGE_SCHEMA_VERSION &&
    isTimestamp(value.savedAt) &&
    typeof value.writeSequence === 'number' &&
    Number.isInteger(value.writeSequence) &&
    value.writeSequence >= 0 &&
    isLessonSession(value.session)
  );
}

function migrateLegacySession(value: unknown): LessonSession | null {
  const candidate =
    isRecord(value) && value.schemaVersion === 1 ? value.session : value;
  if (!isRecord(candidate) || !isRecord(candidate.steps)) return null;
  const upgraded = {
    ...candidate,
    steps: Object.fromEntries(
      Object.entries(candidate.steps).map(([stepId, step]) => [
        stepId,
        isRecord(step) && typeof step.outcome === 'string'
          ? step
          : isRecord(step) && step.status === 'COMPLETED'
            ? {
                ...step,
                status: 'UNKNOWN',
                verification: 'UNKNOWN',
                resumeState: null,
                outcome: 'UNABLE_TO_VERIFY',
              }
            : { ...(isRecord(step) ? step : {}), outcome: 'NONE' },
      ]),
    ),
  };
  if (!isLessonSessionBase(upgraded)) return null;

  return {
    ...upgraded,
    modelRevision: null,
    modelState: createUnknownLessonModelState(
      'Legacy progress did not include current evidence and must be checked again.',
    ),
  };
}

export function createEmptyLearningHistory(): LearningHistory {
  return {
    lessonsVisited: {},
    conceptsIntroduced: [],
    hintUsage: {},
    practiceAttempts: {},
  };
}

export function createLessonProgressStore(storage: ExtensionStorageArea) {
  const writeQueues = new Map<string, Promise<void>>();
  const writeSequences = new Map<string, number>();

  const waitForQueuedWrite = async (key: string): Promise<void> => {
    await writeQueues.get(key)?.catch(() => undefined);
  };

  const enqueueWrite = async (
    key: string,
    value: (sequence: number) => unknown,
  ): Promise<void> => {
    const sequence = (writeSequences.get(key) ?? 0) + 1;
    writeSequences.set(key, sequence);
    const prior = writeQueues.get(key) ?? Promise.resolve();
    const write = prior
      .catch(() => undefined)
      .then(() => storage.set({ [key]: value(sequence) }));
    writeQueues.set(key, write);
    try {
      await write;
    } finally {
      if (writeQueues.get(key) === write) writeQueues.delete(key);
    }
  };

  const saveSession = async (session: LessonSession): Promise<void> => {
    if (!isLessonSession(session)) {
      throw new TypeError('Cannot persist an invalid lesson session.');
    }
    const snapshot = structuredClone(session);
    const key = modelProgressStorageKey(snapshot.modelIdentity);
    await enqueueWrite(key, (writeSequence) => ({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      savedAt: snapshot.updatedAt,
      writeSequence,
      session: snapshot,
    }));
  };

  const savePanelPreferences = async (
    preferences: PanelPreferences,
  ): Promise<void> => {
    if (!isPanelPreferences(preferences)) {
      throw new TypeError('Cannot persist invalid panel preferences.');
    }
    const snapshot = structuredClone(preferences);
    await enqueueWrite(PREFERENCES_KEY, (writeSequence) => ({
      schemaVersion: STORAGE_SCHEMA_VERSION,
      savedAt: new Date().toISOString(),
      writeSequence,
      preferences: snapshot,
    }));
  };

  return {
    saveSession,

    async restoreSession(
      currentIdentity: LessonSession['modelIdentity'],
      currentRevision: string | null,
      requirement?: RestoreLessonRequirement,
      now: Date = new Date(),
    ): Promise<LessonSession | null> {
      const parsedIdentity = ModelIdentitySchema.safeParse(currentIdentity);
      if (!parsedIdentity.success || !Number.isFinite(now.getTime()))
        return null;
      const key = modelProgressStorageKey(parsedIdentity.data);
      await waitForQueuedWrite(key);
      const result = await storage.get(key);
      const stored = result[key];
      let session: LessonSession | null = null;
      let migrated = false;

      if (isModelProgressEnvelope(stored)) {
        session = stored.session;
      } else if (stored !== undefined) {
        session = migrateLegacySession(stored);
        migrated = session !== null;
      } else {
        const legacyResult = await storage.get(LEGACY_SESSION_KEY);
        session = migrateLegacySession(legacyResult[LEGACY_SESSION_KEY]);
        migrated = session !== null;
      }

      if (
        !session ||
        !sameDocument(session.modelIdentity, parsedIdentity.data)
      ) {
        return null;
      }
      if (
        requirement &&
        (session.lessonId !== requirement.lessonId ||
          session.lessonVersion !== requirement.lessonVersion)
      ) {
        return null;
      }

      const reconciled = reconcileSession(
        session,
        parsedIdentity.data,
        currentRevision,
        now,
      );
      if (migrated) await saveSession(reconciled);
      return reconciled;
    },

    async saveLearningHistory(history: LearningHistory): Promise<void> {
      if (!isLearningHistory(history)) {
        throw new TypeError('Cannot persist invalid learning history.');
      }
      const snapshot = structuredClone(history);
      await enqueueWrite(LEARNING_HISTORY_KEY, (writeSequence) => ({
        schemaVersion: STORAGE_SCHEMA_VERSION,
        savedAt: new Date().toISOString(),
        writeSequence,
        history: snapshot,
      }));
    },

    async loadLearningHistory(): Promise<LearningHistory> {
      await waitForQueuedWrite(LEARNING_HISTORY_KEY);
      const result = await storage.get(LEARNING_HISTORY_KEY);
      const envelope = result[LEARNING_HISTORY_KEY];
      if (
        isRecord(envelope) &&
        envelope.schemaVersion === STORAGE_SCHEMA_VERSION &&
        isLearningHistory(envelope.history)
      ) {
        return envelope.history;
      }
      return createEmptyLearningHistory();
    },

    savePanelPreferences,

    async loadPanelPreferences(): Promise<PanelPreferences> {
      await waitForQueuedWrite(PREFERENCES_KEY);
      const result = await storage.get(PREFERENCES_KEY);
      const envelope = result[PREFERENCES_KEY];
      if (
        isRecord(envelope) &&
        envelope.schemaVersion === STORAGE_SCHEMA_VERSION &&
        isPanelPreferences(envelope.preferences)
      ) {
        return {
          ...envelope.preferences,
          onboardingComplete: envelope.preferences.onboardingComplete ?? false,
        };
      }

      const legacyResult = await storage.get(LEGACY_PREFERENCES_KEY);
      const legacy = legacyResult[LEGACY_PREFERENCES_KEY];
      if (isPanelPreferences(legacy)) {
        const migrated = {
          ...legacy,
          onboardingComplete: legacy.onboardingComplete ?? false,
        };
        await savePanelPreferences(migrated);
        return migrated;
      }
      return {
        collapsed: false,
        position: null,
        onboardingComplete: false,
      };
    },
  };
}
