import { z } from 'zod';
export const TutorTopicSchema = z.enum([
  'sketching',
  'reference-planes',
  'rectangles',
  'dimensioning',
  'finishing-sketch',
  'practice',
]);
export type TutorTopic = z.infer<typeof TutorTopicSchema>;
export const ExplanationPreferenceSchema = z.enum([
  'none',
  'short',
  'step-by-step',
  'analogy',
]);
export type ExplanationPreference = z.infer<typeof ExplanationPreferenceSchema>;
export const TutorRequestSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    text: z.string().trim().min(1).max(2000),
    stepIndex: z.number().int().min(0).max(7),
  })
  .strict();
export type TutorRequest = z.infer<typeof TutorRequestSchema>;
export const LearnerEventSchema = z
  .object({
    id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    topic: TutorTopicSchema,
    clarification: z.boolean(),
  })
  .strict();
export const LearnerProfileSchema = z
  .object({
    version: z.literal(1),
    preference: ExplanationPreferenceSchema,
    events: z.array(LearnerEventSchema).max(30),
  })
  .strict();
export type LearnerProfile = z.infer<typeof LearnerProfileSchema>;
export const EMPTY_LEARNER_PROFILE: LearnerProfile = {
  version: 1,
  preference: 'none',
  events: [],
};
export const TutorMessageSchema = z
  .object({
    role: z.enum(['user', 'assistant']),
    text: z.string().min(1).max(8000),
    source: z.enum(['student', 'live', 'test']),
  })
  .strict()
  .refine(
    (message) => (message.role === 'user') === (message.source === 'student'),
    'Message source must match its role',
  );
export type TutorMessage = z.infer<typeof TutorMessageSchema>;
export const TutorSnapshotSchema = z
  .object({
    mode: z.enum(['unavailable', 'live', 'test']),
    messages: z.array(TutorMessageSchema).max(20),
    profile: LearnerProfileSchema,
  })
  .strict();
export type TutorSnapshot = z.infer<typeof TutorSnapshotSchema>;
export const TutorReplySchema = z.discriminatedUnion('ok', [
  z
    .object({
      ok: z.literal(true),
      text: z.string().min(1).max(8000),
      source: z.enum(['live', 'test']),
    })
    .strict(),
  z
    .object({
      ok: z.literal(false),
      code: z.enum([
        'unavailable',
        'busy',
        'cancelled',
        'timeout',
        'provider-error',
        'invalid-response',
        'storage-error',
        'invalid-request',
      ]),
    })
    .strict(),
]);
export type TutorReply = z.infer<typeof TutorReplySchema>;
export const TutorMemoryEditSchema = z.discriminatedUnion('type', [
  z
    .object({
      type: z.literal('preference'),
      value: ExplanationPreferenceSchema,
    })
    .strict(),
  z
    .object({
      type: z.literal('remove-event'),
      id: z.string().regex(/^[a-zA-Z0-9_-]{1,64}$/),
    })
    .strict(),
  z.object({ type: z.literal('clear') }).strict(),
]);
export type TutorMemoryEdit = z.infer<typeof TutorMemoryEditSchema>;
export const TUTOR_CHANNELS = Object.freeze({
  snapshot: 'tutor:snapshot',
  ask: 'tutor:ask',
  cancel: 'tutor:cancel',
  editMemory: 'tutor:edit-memory',
});
export interface TutorBridge {
  snapshot(): Promise<TutorSnapshot>;
  ask(request: TutorRequest): Promise<TutorReply>;
  cancel(): Promise<void>;
  editMemory(edit: TutorMemoryEdit): Promise<TutorSnapshot>;
}
