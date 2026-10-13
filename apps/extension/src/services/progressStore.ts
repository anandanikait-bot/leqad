import { ModelIdentitySchema } from '@leqad/contracts';
import { reconcileSession } from '@leqad/lesson-engine';
import type { LessonSession, LessonStepState } from '@leqad/lesson-engine';

export interface ExtensionStorageArea {
  get(key: string): Promise<Record<string, unknown>>;
  set(items: Record<string, unknown>): Promise<void>;
}

export interface PanelPreferences {
  collapsed: boolean;
  position: { left: number; top: number } | null;
}

const SESSION_KEY = 'leqad:lesson-session';
const PREFERENCES_KEY = 'leqad:panel-preferences';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isLessonStepState(value: unknown): value is LessonStepState {
  if (!isRecord(value)) return false;
  return (
    typeof value.status === 'string' &&
    STEP_STATUSES.has(value.status) &&
    typeof value.hintLevel === 'number' &&
    Number.isFinite(value.hintLevel) &&
    (value.verification === null ||
      (typeof value.verification === 'string' &&
        VERIFICATION_STATUSES.has(value.verification))) &&
    (value.resumeState === null ||
      (typeof value.resumeState === 'string' &&
        STEP_STATUSES.has(value.resumeState)))
  );
}

function isLessonSession(value: unknown): value is LessonSession {
  if (!isRecord(value)) return false;
  const identity = ModelIdentitySchema.safeParse(value.modelIdentity);
  if (
    !identity.success ||
    typeof value.lessonId !== 'string' ||
    typeof value.lessonVersion !== 'string' ||
    typeof value.currentStepId !== 'string' ||
    !(
      typeof value.modelRevision === 'string' || value.modelRevision === null
    ) ||
    typeof value.updatedAt !== 'string' ||
    !Number.isFinite(Date.parse(value.updatedAt)) ||
    !isRecord(value.steps)
  ) {
    return false;
  }
  return Object.values(value.steps).every(isLessonStepState);
}

function isPanelPreferences(value: unknown): value is PanelPreferences {
  if (!isRecord(value) || typeof value.collapsed !== 'boolean') return false;
  if (value.position === null) return true;
  return (
    isRecord(value.position) &&
    typeof value.position.left === 'number' &&
    Number.isFinite(value.position.left) &&
    typeof value.position.top === 'number' &&
    Number.isFinite(value.position.top)
  );
}

export function createLessonProgressStore(storage: ExtensionStorageArea) {
  return {
    async saveSession(session: LessonSession): Promise<void> {
      await storage.set({ [SESSION_KEY]: session });
    },

    async restoreSession(
      currentIdentity: LessonSession['modelIdentity'],
      currentRevision: string | null,
      now: Date = new Date(),
    ): Promise<LessonSession | null> {
      const result = await storage.get(SESSION_KEY);
      const session = result[SESSION_KEY];
      if (!isLessonSession(session)) return null;
      return reconcileSession(session, currentIdentity, currentRevision, now);
    },

    async savePanelPreferences(preferences: PanelPreferences): Promise<void> {
      await storage.set({ [PREFERENCES_KEY]: preferences });
    },

    async loadPanelPreferences(): Promise<PanelPreferences> {
      const result = await storage.get(PREFERENCES_KEY);
      const preferences = result[PREFERENCES_KEY];
      return isPanelPreferences(preferences)
        ? preferences
        : { collapsed: false, position: null };
    },
  };
}
