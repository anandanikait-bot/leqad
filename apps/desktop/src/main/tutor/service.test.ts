import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  EMPTY_LEARNER_PROFILE,
  type LearnerProfile,
  type StoredLesson,
  type TutorRequest,
} from '@leqad/desktop-contracts';
import { createTutorService } from './service';
import type { TutorProvider, TutorProviderMessage } from './provider';
import type { ProfileStore } from './memory';

function emptyLesson(currentStep = 0): StoredLesson {
  return {
    schemaVersion: 1 as const,
    lessonId: 'foundations-first-sketch' as const,
    lessonVersion: '2.0.0' as const,
    currentStep,
    steps: Array.from({ length: 8 }, () => ({
      status: 'NOT_STARTED' as const,
      hintLevel: 0,
      verification: null,
      resumeState: null,
      outcome: 'NONE' as const,
    })),
  };
}

function memory(initial: LearnerProfile = EMPTY_LEARNER_PROFILE): {
  store: ProfileStore;
  get(): LearnerProfile;
} {
  let value = structuredClone(initial);
  return {
    store: {
      async load() {
        return structuredClone(value);
      },
      async save(profile) {
        value = structuredClone(profile);
      },
    },
    get: () => structuredClone(value),
  };
}

function fixture(
  options: {
    provider?: TutorProvider | null;
    profile?: LearnerProfile;
    loadLesson?: () => Promise<ReturnType<typeof emptyLesson> | null>;
  } = {},
) {
  const store = memory(options.profile);
  const reply = vi.fn<TutorProvider['reply']>(async () => 'A useful answer.');
  const provider =
    options.provider === undefined
      ? ({ mode: 'test', reply } as TutorProvider)
      : options.provider;
  const service = createTutorService({
    provider,
    profileStore: store.store,
    loadLesson: options.loadLesson ?? (async () => emptyLesson()),
  });
  return { service, profileStore: store, reply };
}

const request = (id: string, text: string, stepIndex = 0): TutorRequest => ({
  id,
  text,
  stepIndex,
});

describe('main tutor service', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('remembers explicit dimensioning confusion across a return session', async () => {
    const first = fixture();
    await first.service.editMemory({
      type: 'preference',
      value: 'step-by-step',
    });
    const initial = await first.service.ask(
      request('dimension-1', 'How do I dimension this rectangle?', 4),
    );
    expect(initial).toMatchObject({ ok: true, source: 'test' });
    expect(first.profileStore.get().events).toEqual([
      { id: 'dimension-1', topic: 'dimensioning', clarification: false },
    ]);

    const confusion = await first.service.ask(
      request('dimension-2', 'I am still confused. Can you explain again?', 4),
    );
    expect(confusion.ok).toBe(true);
    const clarificationPrompt =
      first.reply.mock.calls[1]?.[0][0]?.content ?? '';
    expect(clarificationPrompt).toContain('Current clarification: true');
    expect(clarificationPrompt).toContain('dimensioning');
    expect(clarificationPrompt).toContain('change explanation approach');
    expect(first.profileStore.get().events).toEqual([
      { id: 'dimension-1', topic: 'dimensioning', clarification: false },
      { id: 'dimension-2', topic: 'dimensioning', clarification: true },
    ]);

    const returning = fixture({ profile: first.profileStore.get() });
    await returning.service.ask(
      request('dimension-3', 'Can we revisit that?', 4),
    );
    const systemPrompt = returning.reply.mock.calls[0]?.[0][0]?.content ?? '';
    expect(systemPrompt).toContain('step-by-step');
    expect(systemPrompt).toContain('dimensioning');
    expect(systemPrompt).not.toContain('How do I dimension this rectangle?');
    expect(JSON.stringify(returning.profileStore.get())).not.toContain(
      'Can we revisit that?',
    );

    first.service.dispose();
    returning.service.dispose();
  });

  it('replays a successful request id without another provider call or event', async () => {
    const { service, reply, profileStore } = fixture();
    const first = await service.ask(request('same-id', 'Explain dimensions.'));
    const replay = await service.ask(request('same-id', 'Explain dimensions.'));

    expect(replay).toEqual(first);
    expect(reply).toHaveBeenCalledTimes(1);
    expect(profileStore.get().events).toHaveLength(1);
    expect((await service.snapshot()).messages).toHaveLength(2);
  });

  it('keeps replay-answer retention aligned with the 10 visible conversation pairs', async () => {
    let count = 0;
    const reply = vi.fn<TutorProvider['reply']>(
      async () => `Answer ${++count}`,
    );
    const { service } = fixture({ provider: { mode: 'test', reply } });
    for (let index = 0; index < 11; index += 1) {
      await service.ask(request(`turn-${index}`, `Question ${index}`));
    }

    await expect(
      service.ask(request('turn-0', 'Question 0')),
    ).resolves.toMatchObject({
      ok: true,
      text: 'Answer 12',
    });
    expect(reply).toHaveBeenCalledTimes(12);
    expect((await service.snapshot()).messages).toHaveLength(20);
    const retryPrompt = reply.mock.calls.at(-1)?.[0] ?? [];
    expect(retryPrompt.some(({ content }) => content === 'Answer 1')).toBe(
      false,
    );
    service.dispose();
  });

  it('allows the same id to retry after a provider failure without duplicating state', async () => {
    const { service, profileStore } = fixture({
      provider: {
        mode: 'test',
        reply: vi
          .fn()
          .mockRejectedValueOnce(new Error('secret token in provider body'))
          .mockResolvedValueOnce(
            'Try one horizontal and one vertical dimension.',
          ),
      },
    });

    await expect(
      service.ask(request('retry-id', 'Help me dimension this.')),
    ).resolves.toEqual({ ok: false, code: 'provider-error' });
    await expect(
      service.ask(request('retry-id', 'Help me dimension this.')),
    ).resolves.toEqual({
      ok: true,
      text: 'Try one horizontal and one vertical dimension.',
      source: 'test',
    });
    expect(profileStore.get().events).toEqual([
      { id: 'retry-id', topic: 'dimensioning', clarification: false },
    ]);
    expect((await service.snapshot()).messages).toHaveLength(2);
  });

  it('returns unavailable without fabricating a response when no provider exists', async () => {
    const { service } = fixture({ provider: null });

    await expect(
      service.ask(request('no-provider', 'What is a sketch?')),
    ).resolves.toEqual({ ok: false, code: 'unavailable' });
    expect((await service.snapshot()).messages).toEqual([]);
  });

  it('allows only one in-flight request and ignores a cancelled late provider reply', async () => {
    let resolveReply!: (text: string) => void;
    const { service } = fixture({
      provider: {
        mode: 'test',
        reply: vi.fn(
          () =>
            new Promise<string>((resolve) => {
              resolveReply = resolve;
            }),
        ),
      },
    });
    const first = service.ask(request('slow', 'Explain rectangles.'));
    await Promise.resolve();
    await expect(
      service.ask(request('busy', 'Explain sketching.')),
    ).resolves.toEqual({ ok: false, code: 'busy' });

    service.cancel();
    await expect(first).resolves.toEqual({ ok: false, code: 'cancelled' });
    resolveReply('A late answer.');
    await Promise.resolve();
    expect((await service.snapshot()).messages).toEqual([]);
    expect((await service.snapshot()).profile.events).toEqual([]);
    service.dispose();
  });

  it('times out after 30 seconds even when the provider ignores abort', async () => {
    vi.useFakeTimers();
    let signal: AbortSignal | undefined;
    const { service } = fixture({
      provider: {
        mode: 'test',
        reply: vi.fn((_messages, receivedSignal) => {
          signal = receivedSignal;
          return new Promise<string>(() => undefined);
        }),
      },
    });
    const pending = service.ask(request('timeout', 'Explain sketching.'));
    await vi.advanceTimersByTimeAsync(30_001);

    await expect(pending).resolves.toEqual({ ok: false, code: 'timeout' });
    expect(signal?.aborted).toBe(true);
    expect((await service.snapshot()).messages).toEqual([]);
    service.dispose();
  });

  it('rejects blank and oversized model output without storing it', async () => {
    const blank = fixture({
      provider: { mode: 'test', reply: vi.fn(async () => '  \n ') },
    });
    await expect(
      blank.service.ask(request('blank', 'Explain sketching.')),
    ).resolves.toEqual({ ok: false, code: 'invalid-response' });
    expect((await blank.service.snapshot()).messages).toEqual([]);

    const oversized = fixture({
      provider: { mode: 'test', reply: vi.fn(async () => 'a'.repeat(8001)) },
    });
    await expect(
      oversized.service.ask(request('long', 'Explain sketching.')),
    ).resolves.toEqual({ ok: false, code: 'invalid-response' });
    expect((await oversized.service.snapshot()).messages).toEqual([]);
  });

  it('builds step-aware prompts from lesson content and exact read-only outcomes', async () => {
    const lesson = emptyLesson(3);
    lesson.steps[2] = {
      status: 'COMPLETED',
      hintLevel: 0,
      verification: 'UNKNOWN',
      resumeState: null,
      outcome: 'SELF_REPORTED',
    };
    lesson.steps[3] = {
      status: 'UNKNOWN',
      hintLevel: 0,
      verification: 'UNKNOWN',
      resumeState: null,
      outcome: 'UNABLE_TO_VERIFY',
    };
    const { service, reply } = fixture({ loadLesson: async () => lesson });

    await service.ask(request('step-aware', 'What should I do now?', 4));
    const messages = reply.mock
      .calls[0]?.[0] as readonly TutorProviderMessage[];
    const prompt = messages[0]?.content ?? '';
    expect(prompt).toContain('apply-dimensions');
    expect(prompt).toContain('40 mm by 30 mm');
    expect(prompt).toContain('Requested step index: 4');
    expect(prompt).toContain('Persisted currentStep: 3');
    expect(prompt).toContain('SELF_REPORTED');
    expect(prompt).toContain('UNABLE_TO_VERIFY');
    expect(prompt).toContain('UNKNOWN');
    expect(prompt).toContain('not verified CAD progress');
    expect(prompt).not.toContain('"outcome":"MODEL_VERIFIED"');
    expect(prompt).toContain('Lesson sequence overview');
    expect(prompt).toContain('Corner Rectangle');
  });

  it('keeps dimensions and Corner Rectangle facts available at an earlier step', async () => {
    const { service, reply } = fixture();
    await service.ask(request('overview', 'How do I set the dimensions?', 0));
    const prompt = reply.mock.calls[0]?.[0][0]?.content ?? '';

    expect(prompt).toContain('40 mm by 30 mm');
    expect(prompt).toContain('Corner Rectangle');
    expect(prompt).toContain('apply-dimensions');
    service.dispose();
  });

  it('uses fresh lesson context on each question while keeping bounded conversation', async () => {
    const lesson = emptyLesson(0);
    const { service, reply } = fixture({ loadLesson: async () => lesson });
    for (let index = 0; index < 12; index += 1) {
      lesson.currentStep = index % 8;
      await service.ask(
        request(`msg-${index}`, `Question ${index}`, index % 8),
      );
    }

    const snapshot = await service.snapshot();
    expect(snapshot.messages).toHaveLength(20);
    expect(snapshot.messages.every((message) => message.text.length > 0)).toBe(
      true,
    );
    const lastPrompt = reply.mock.calls.at(
      -1,
    )?.[0] as readonly TutorProviderMessage[];
    expect(lastPrompt[0]?.content).toContain('current step: draw-rectangle');
    expect(lastPrompt.length).toBeLessThanOrEqual(20);
  });

  it('clears messages and profile and cancels in-flight work without resurrection', async () => {
    let resolveReply!: (text: string) => void;
    let resolveStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const { service } = fixture({
      provider: {
        mode: 'test',
        reply: vi
          .fn()
          .mockResolvedValueOnce('A rectangle uses four sides.')
          .mockImplementationOnce(() => {
            resolveStarted();
            return new Promise<string>((resolve) => {
              resolveReply = resolve;
            });
          }),
      },
    });
    await service.ask(request('old', 'Explain rectangles.'));
    const pending = service.ask(request('in-flight', 'Explain dimensions.'));
    await started;
    const cleared = await service.editMemory({ type: 'clear' });

    await expect(pending).resolves.toEqual({ ok: false, code: 'cancelled' });
    resolveReply('This must not return.');
    expect(cleared.messages).toEqual([]);
    expect(cleared.profile).toEqual(EMPTY_LEARNER_PROFILE);
    expect(await service.snapshot()).toEqual(cleared);
    service.dispose();
  });

  it('clearing memory forgets successful replay answers and prior conversation', async () => {
    let count = 0;
    const reply = vi.fn<TutorProvider['reply']>(
      async () => `Answer ${++count}`,
    );
    const { service } = fixture({
      provider: { mode: 'test', reply },
    });
    const sameRequest = request('reused', 'Explain rectangles.');
    await expect(service.ask(sameRequest)).resolves.toMatchObject({
      ok: true,
      text: 'Answer 1',
    });
    await service.editMemory({ type: 'clear' });
    await expect(service.ask(sameRequest)).resolves.toMatchObject({
      ok: true,
      text: 'Answer 2',
    });
    expect(reply).toHaveBeenCalledTimes(2);
    const secondCall = reply.mock.calls[1]?.[0] ?? [];
    expect(secondCall).toHaveLength(2);
    expect(secondCall.some((message) => message.content === 'Answer 1')).toBe(
      false,
    );
    expect((await service.snapshot()).messages.map(({ text }) => text)).toEqual(
      ['Explain rectangles.', 'Answer 2'],
    );
    service.dispose();
  });

  it('cancels pending answers when a stored topic is corrected or removed', async () => {
    let resolveReply!: (text: string) => void;
    let resolveStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const { service, profileStore } = fixture({
      profile: {
        version: 1,
        preference: 'none',
        events: [
          { id: 'old-topic', topic: 'dimensioning', clarification: true },
        ],
      },
      provider: {
        mode: 'test',
        reply: vi.fn(() => {
          resolveStarted();
          return new Promise<string>((resolve) => {
            resolveReply = resolve;
          });
        }),
      },
    });
    const pending = service.ask(request('pending-edit', 'Explain rectangles.'));
    await started;

    await service.editMemory({ type: 'remove-event', id: 'old-topic' });
    resolveReply('This stale answer must not be shown.');
    await expect(pending).resolves.toEqual({ ok: false, code: 'cancelled' });
    expect(profileStore.get().events).toEqual([]);
    expect((await service.snapshot()).messages).toEqual([]);
    service.dispose();
  });

  it('keeps learning history bounded to the latest 30 unique topic events', async () => {
    const profile: LearnerProfile = {
      version: 1,
      preference: 'none',
      events: Array.from({ length: 30 }, (_, index) => ({
        id: `old-${index}`,
        topic: 'dimensioning',
        clarification: false,
      })),
    };
    const { service, profileStore } = fixture({ profile });
    await service.ask(request('new-topic', 'Explain rectangles.'));

    const events = profileStore.get().events;
    expect(events).toHaveLength(30);
    expect(events.some(({ id }) => id === 'old-0')).toBe(false);
    expect(events.at(-1)).toEqual({
      id: 'new-topic',
      topic: 'rectangles',
      clarification: false,
    });
    service.dispose();
  });

  it('allows clear to recover a corrupt profile without loading it first', async () => {
    let readable = false;
    let stored = EMPTY_LEARNER_PROFILE;
    const service = createTutorService({
      provider: null,
      profileStore: {
        async load() {
          if (!readable) throw new Error('corrupt private file contents');
          return stored;
        },
        async save(profile) {
          stored = profile;
          readable = true;
        },
      },
      loadLesson: async () => null,
    });

    await expect(service.snapshot()).rejects.toThrow(
      'Tutor memory is unavailable',
    );
    const cleared = await service.editMemory({ type: 'clear' });
    expect(cleared.profile).toEqual(EMPTY_LEARNER_PROFILE);
    service.dispose();
  });

  it('rejects invalid request shapes and hides storage/provider error details', async () => {
    const malformed = fixture();
    await expect(
      malformed.service.ask({
        ...request('bad', 'valid text'),
        extra: 'not allowed',
      } as unknown as TutorRequest),
    ).resolves.toEqual({
      ok: false,
      code: 'invalid-request',
    });

    const storageFailure = fixture();
    storageFailure.service.dispose();
    const noSecret = createTutorService({
      provider: { mode: 'live', reply: vi.fn() },
      profileStore: {
        load: async () => {
          throw new Error('path with private text');
        },
        save: async () => {
          throw new Error('path with private text');
        },
      },
      loadLesson: async () => null,
    });
    await expect(
      noSecret.ask(request('storage', 'Explain sketching.')),
    ).resolves.toEqual({ ok: false, code: 'storage-error' });
    await expect(noSecret.snapshot()).rejects.toThrow(
      'Tutor memory is unavailable',
    );
    noSecret.dispose();
  });

  it('disposes by cancelling work and refusing future requests', async () => {
    let resolveReply!: (text: string) => void;
    let resolveStarted!: () => void;
    const started = new Promise<void>((resolve) => {
      resolveStarted = resolve;
    });
    const { service } = fixture({
      provider: {
        mode: 'test',
        reply: vi.fn(() => {
          resolveStarted();
          return new Promise<string>((resolve) => {
            resolveReply = resolve;
          });
        }),
      },
    });
    const pending = service.ask(request('dispose', 'Explain rectangles.'));
    await started;
    service.dispose();
    await expect(pending).resolves.toEqual({ ok: false, code: 'cancelled' });
    resolveReply('Late');
    await expect(
      service.ask(request('after', 'Explain rectangles.')),
    ).resolves.toEqual({ ok: false, code: 'unavailable' });
    await expect(service.snapshot()).resolves.toMatchObject({ messages: [] });
  });
});
