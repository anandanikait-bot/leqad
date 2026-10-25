import { z } from 'zod';
const Token = z.string().min(1).max(128);
export const ActionSchema = z.enum([
  'reference.top',
  'sketch.start',
  'rectangle.corner',
  'dimension',
  'sketch.finish',
]);
export type ActionId = z.infer<typeof ActionSchema>;
export const CommandSchema = z.discriminatedUnion('type', [
  z.object({ type: z.literal('select'), windowToken: Token }).strict(),
  z.object({ type: z.literal('consent'), allow: z.boolean() }).strict(),
  z.object({ type: z.literal('pause'), paused: z.boolean() }).strict(),
  z
    .object({
      type: z.literal('show'),
      requestId: z.string().min(1).max(64),
      action: ActionSchema,
      generation: z.number().int().nonnegative().safe(),
    })
    .strict(),
  ...(
    ['cancel', 'revoke', 'disconnect', 'reset-position', 'close'] as const
  ).map((type) => z.object({ type: z.literal(type) }).strict()),
]);
export type Command = z.infer<typeof CommandSchema>;
export const parseCommand = (value: unknown): Command =>
  CommandSchema.parse(value);
export const PreferencesSchema = z
  .object({
    appearance: z.enum(['system', 'light', 'dark']),
    textScale: z.union([
      z.literal(1),
      z.literal(1.25),
      z.literal(1.5),
      z.literal(2),
    ]),
    keepVisible: z.boolean(),
    reduceMotion: z.enum(['system', 'reduce']),
  })
  .strict();
export type DesktopPreferences = z.infer<typeof PreferencesSchema>;
export const DEFAULT_PREFERENCES: DesktopPreferences = {
  appearance: 'system',
  textScale: 1,
  keepVisible: true,
  reduceMotion: 'system',
};
const StatusSchema = z.enum([
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
const StepSchema = z
  .object({
    status: StatusSchema,
    hintLevel: z.number().int().min(0).max(5),
    verification: z.enum(['UNKNOWN']).nullable(),
    resumeState: StatusSchema.nullable(),
    outcome: z.enum([
      'NONE',
      'ACKNOWLEDGED',
      'SELF_REPORTED',
      'UNABLE_TO_VERIFY',
    ]),
  })
  .strict()
  .refine(
    (s) =>
      s.status !== 'COMPLETED' ||
      ['ACKNOWLEDGED', 'SELF_REPORTED'].includes(s.outcome),
    'Completed desktop steps must have an honest outcome',
  );
export const StoredLessonSchema = z
  .object({
    schemaVersion: z.literal(1),
    lessonId: z.literal('foundations-first-sketch'),
    lessonVersion: z.literal('2.0.0'),
    currentStep: z.number().int().min(0).max(7),
    steps: z.array(StepSchema).length(8),
  })
  .strict();
export type StoredLesson = z.infer<typeof StoredLessonSchema>;
export const parseStoredLesson = (value: unknown): StoredLesson =>
  StoredLessonSchema.parse(value);
export type SessionView = Readonly<{
  token: string | null;
  generation: number;
  binding: 'unbound' | 'selected' | 'disconnected';
  consent: 'off' | 'on-request';
  paused: boolean;
  visual: 'idle' | 'waiting' | 'inspecting' | 'highlighted' | 'unavailable';
  reason:
    | 'unsupported'
    | 'permission-required'
    | 'window-lost'
    | 'context-unknown'
    | 'ambiguous'
    | 'stale'
    | 'expired'
    | 'canceled'
    | 'invalid-bounds'
    | 'occluded'
    | 'provider-failed'
    | null;
  availableActions: readonly ActionId[];
}>;
export const EMPTY_SESSION: SessionView = Object.freeze({
  token: null,
  generation: 0,
  binding: 'unbound',
  consent: 'off',
  paused: false,
  visual: 'unavailable',
  reason: 'unsupported',
  availableActions: Object.freeze([]),
});
export interface DesktopBridge {
  listWindows(): Promise<
    Readonly<{
      windows: readonly {
        token: string;
        label: string;
        kind: 'browser' | 'native';
      }[];
      incomplete: boolean;
    }>
  >;
  command(value: Command): Promise<SessionView>;
  subscribe(listener: (view: SessionView) => void): () => void;
  loadPreferences(): Promise<DesktopPreferences>;
  savePreferences(value: DesktopPreferences): Promise<void>;
  loadLesson(): Promise<StoredLesson | null>;
  saveLesson(value: StoredLesson): Promise<void>;
}
