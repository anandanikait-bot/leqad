import { afterEach, describe, expect, it, vi } from 'vitest';
import { createOpenAIProvider } from './provider';

type FetchMock = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('main OpenAI tutor provider', () => {
  it('is unavailable without a configured API key', () => {
    expect(createOpenAIProvider({})).toBeNull();
    expect(createOpenAIProvider({ OPENAI_API_KEY: '  ' })).toBeNull();
  });

  it('uses the fixed Responses endpoint and configured model with only supplied messages', async () => {
    const fetch = vi.fn<FetchMock>(
      async () =>
        new Response(
          JSON.stringify({
            status: 'completed',
            output: [
              {
                type: 'message',
                content: [
                  {
                    type: 'output_text',
                    text: 'Use one horizontal dimension.',
                  },
                ],
              },
            ],
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const provider = createOpenAIProvider({
      OPENAI_API_KEY: 'main-process-key',
      OPENAI_MODEL: 'gpt-4.1-nano',
    });
    const controller = new AbortController();

    await expect(
      provider?.reply(
        [
          { role: 'system', content: 'Teach with exact lesson context.' },
          { role: 'user', content: 'How do dimensions work?' },
        ],
        controller.signal,
      ),
    ).resolves.toBe('Use one horizontal dimension.');

    expect(fetch).toHaveBeenCalledOnce();
    const [endpoint, options] = fetch.mock.calls[0] as unknown as [
      string,
      RequestInit,
    ];
    expect(endpoint).toBe('https://api.openai.com/v1/responses');
    expect(options.headers).toEqual({
      authorization: 'Bearer main-process-key',
      'content-type': 'application/json',
    });
    expect(options.signal).toBe(controller.signal);
    expect(options.redirect).toBe('error');
    expect(JSON.parse(String(options.body))).toEqual({
      model: 'gpt-4.1-nano',
      max_output_tokens: 1200,
      store: false,
      input: [
        { role: 'system', content: 'Teach with exact lesson context.' },
        { role: 'user', content: 'How do dimensions work?' },
      ],
    });
  });

  it('uses the documented configurable baseline model when none is supplied', async () => {
    const fetch = vi.fn<FetchMock>(
      async () =>
        new Response(
          JSON.stringify({
            status: 'completed',
            output_text: 'Start with one corner.',
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const provider = createOpenAIProvider({ OPENAI_API_KEY: 'key' });
    await provider?.reply([], new AbortController().signal);

    const options = fetch.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(options.body))).toMatchObject({
      model: 'gpt-4.1-mini',
    });
  });

  it('does not expose HTTP response bodies, malformed payloads, or oversized output', async () => {
    const key = 'secret-response-body';
    const httpFetch = vi.fn<FetchMock>(
      async () => new Response(key, { status: 500 }),
    );
    vi.stubGlobal('fetch', httpFetch);
    const provider = createOpenAIProvider({ OPENAI_API_KEY: 'key' });
    await expect(
      provider?.reply([], new AbortController().signal),
    ).rejects.not.toThrow(key);

    const malformedFetch = vi.fn<FetchMock>(
      async () => new Response(`{${key}`, { status: 200 }),
    );
    vi.stubGlobal('fetch', malformedFetch);
    const malformedProvider = createOpenAIProvider({ OPENAI_API_KEY: 'key' });
    await expect(
      malformedProvider?.reply([], new AbortController().signal),
    ).rejects.not.toThrow(key);

    const oversizedFetch = vi.fn<FetchMock>(
      async () =>
        new Response(
          JSON.stringify({
            output_text: 'x'.repeat(100_000),
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', oversizedFetch);
    const oversizedProvider = createOpenAIProvider({ OPENAI_API_KEY: 'key' });
    await expect(
      oversizedProvider?.reply([], new AbortController().signal),
    ).rejects.toThrow();
  });

  it('rejects incomplete Responses even when they contain partial output text', async () => {
    const fetch = vi.fn<FetchMock>(
      async () =>
        new Response(
          JSON.stringify({
            status: 'incomplete',
            output_text: 'This partial answer must not be shown.',
          }),
          { status: 200 },
        ),
    );
    vi.stubGlobal('fetch', fetch);
    const provider = createOpenAIProvider({ OPENAI_API_KEY: 'key' });

    await expect(
      provider?.reply([], new AbortController().signal),
    ).rejects.toThrow();
  });

  it('rejects a nonfinite HTTP status as a safe provider failure', async () => {
    const fetch = vi.fn<FetchMock>(
      async () => ({ status: Number.POSITIVE_INFINITY, ok: true }) as Response,
    );
    vi.stubGlobal('fetch', fetch);
    const provider = createOpenAIProvider({ OPENAI_API_KEY: 'key' });

    await expect(
      provider?.reply([], new AbortController().signal),
    ).rejects.toThrow('Tutor provider request failed');
  });
});
