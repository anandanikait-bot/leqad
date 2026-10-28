import { describe, expect, it } from 'vitest';
import {
  TutorRequestSchema,
  LearnerProfileSchema,
  TutorReplySchema,
  TutorMessageSchema,
} from './tutor';
describe('tutor boundaries', () => {
  it('accepts only a bounded student question and known lesson step', () => {
    expect(
      TutorRequestSchema.safeParse({
        id: 'q1',
        text: 'How do I dimension?',
        stepIndex: 5,
      }).success,
    ).toBe(true);
    for (const extra of [
      { apiKey: 'secret' },
      { role: 'system' },
      { verified: true },
      { endpoint: 'https://evil.invalid' },
    ]) {
      expect(
        TutorRequestSchema.safeParse({
          id: 'q1',
          text: 'hi',
          stepIndex: 0,
          ...extra,
        }).success,
      ).toBe(false);
    }
    expect(
      TutorRequestSchema.safeParse({
        id: 'q1',
        text: 'x'.repeat(2001),
        stepIndex: 0,
      }).success,
    ).toBe(false);
    expect(
      TutorRequestSchema.safeParse({ id: 'q1', text: 'hi', stepIndex: 8 })
        .success,
    ).toBe(false);
  });
  it('keeps memory bounded and rejects private or invented ability fields', () => {
    expect(
      LearnerProfileSchema.safeParse({
        version: 1,
        preference: 'none',
        events: [],
      }).success,
    ).toBe(true);
    expect(
      LearnerProfileSchema.safeParse({
        version: 1,
        preference: 'none',
        events: [],
        proficiency: 90,
      }).success,
    ).toBe(false);
    expect(
      LearnerProfileSchema.safeParse({
        version: 1,
        preference: 'none',
        events: Array.from({ length: 31 }, (_, i) => ({
          id: String(i),
          topic: 'dimensioning',
          clarification: false,
        })),
      }).success,
    ).toBe(false);
  });
  it('requires explicit response provenance and closed error codes', () => {
    expect(
      TutorReplySchema.safeParse({ ok: true, text: 'test', source: 'test' })
        .success,
    ).toBe(true);
    expect(TutorReplySchema.safeParse({ ok: true, text: 'test' }).success).toBe(
      false,
    );
    expect(
      TutorReplySchema.safeParse({ ok: false, code: 'API key abc' }).success,
    ).toBe(false);
  });
});

it('does not label student text as an AI response or an AI response as student evidence', () => {
  expect(
    TutorMessageSchema.safeParse({
      role: 'assistant',
      text: 'I see your drawing',
      source: 'student',
    }).success,
  ).toBe(false);
  expect(
    TutorMessageSchema.safeParse({ role: 'user', text: 'hi', source: 'live' })
      .success,
  ).toBe(false);
});
