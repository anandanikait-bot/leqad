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
  z.object({ type: z.literal('use-written') }).strict(),
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
export const WindowApplicationSchema = z.enum([
  'Chrome',
  'Microsoft Edge',
  'Firefox',
  'SOLIDWORKS',
  'Autodesk Fusion',
  'FreeCAD',
  'Other app',
]);
export type WindowApplication = z.infer<typeof WindowApplicationSchema>;
export const WindowKindSchema = z.enum(['browser', 'native', 'other']);
export type WindowKind = z.infer<typeof WindowKindSchema>;
export const WindowSummarySchema = z
  .object({
    application: WindowApplicationSchema,
    ordinal: z.number().int().min(1).max(50),
    kind: WindowKindSchema,
  })
  .strict();
export type WindowSummary = z.infer<typeof WindowSummarySchema>;
export const WindowChoiceSchema = WindowSummarySchema.extend({
  token: Token,
}).strict();
export type WindowChoice = z.infer<typeof WindowChoiceSchema>;
export const WindowCatalogSchema = z
  .object({
    availability: z.enum(['available', 'unavailable']),
    unavailableReason: z.enum(['unsupported', 'provider-failed']).nullable(),
    incomplete: z.boolean(),
    windows: z.array(WindowChoiceSchema).max(50),
  })
  .strict()
  .superRefine((catalog, context) => {
    if (
      catalog.availability === 'available' &&
      catalog.unavailableReason !== null
    ) {
      context.addIssue({
        code: 'custom',
        path: ['unavailableReason'],
        message: 'An available catalog cannot have an unavailable reason',
      });
    }
    if (
      catalog.availability === 'unavailable' &&
      (catalog.unavailableReason === null ||
        catalog.incomplete ||
        catalog.windows.length > 0)
    ) {
      context.addIssue({
        code: 'custom',
        message: 'Unavailable catalogs must be empty and complete',
      });
    }
    const tokens = new Set<string>();
    const ordinals = new Set<string>();
    catalog.windows.forEach((window, index) => {
      const ordinalKey = `${window.application}:${window.ordinal}`;
      if (tokens.has(window.token)) {
        context.addIssue({
          code: 'custom',
          path: ['windows', index, 'token'],
          message: 'Window tokens must be unique',
        });
      }
      if (ordinals.has(ordinalKey)) {
        context.addIssue({
          code: 'custom',
          path: ['windows', index, 'ordinal'],
          message: 'Application ordinals must be unique',
        });
      }
      tokens.add(window.token);
      ordinals.add(ordinalKey);
    });
  });
export type WindowCatalog = Readonly<{
  availability: 'available' | 'unavailable';
  unavailableReason: 'unsupported' | 'provider-failed' | null;
  incomplete: boolean;
  windows: readonly WindowChoice[];
}>;
export const parseWindowCatalog = (value: unknown): WindowCatalog => {
  const catalog = WindowCatalogSchema.parse(value);
  return Object.freeze({
    ...catalog,
    windows: Object.freeze(
      catalog.windows.map((window) => Object.freeze({ ...window })),
    ),
  });
};
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
const SessionViewSchema = z
  .object({
    token: Token.nullable(),
    generation: z.number().int().nonnegative().safe(),
    binding: z.enum(['unbound', 'selected', 'disconnected']),
    consent: z.enum(['off', 'denied']),
    selectedWindow: WindowSummarySchema.nullable(),
    paused: z.boolean(),
    visual: z.enum([
      'idle',
      'waiting',
      'inspecting',
      'highlighted',
      'unavailable',
    ]),
    reason: z
      .enum([
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
      ])
      .nullable(),
    availableActions: z.array(ActionSchema).max(5),
  })
  .strict();
export type SessionView = Readonly<{
  token: string | null;
  generation: number;
  binding: 'unbound' | 'selected' | 'disconnected';
  consent: 'off' | 'denied';
  selectedWindow: WindowSummary | null;
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
export const parseSessionView = (value: unknown): SessionView => {
  const view = SessionViewSchema.parse(value);
  return Object.freeze({
    ...view,
    selectedWindow: view.selectedWindow
      ? Object.freeze({ ...view.selectedWindow })
      : null,
    availableActions: Object.freeze([...view.availableActions]),
  });
};
export const EMPTY_SESSION: SessionView = Object.freeze({
  token: null,
  generation: 0,
  binding: 'unbound',
  consent: 'off',
  selectedWindow: null,
  paused: false,
  visual: 'unavailable',
  reason: 'unsupported',
  availableActions: Object.freeze([]),
});
export interface DesktopBridge {
  listWindows(): Promise<WindowCatalog>;
  command(value: Command): Promise<SessionView>;
  subscribe(listener: (view: SessionView) => void): () => void;
  loadPreferences(): Promise<DesktopPreferences>;
  savePreferences(value: DesktopPreferences): Promise<void>;
  loadLesson(): Promise<StoredLesson | null>;
  saveLesson(value: StoredLesson): Promise<void>;
}

export * from './tutor';
