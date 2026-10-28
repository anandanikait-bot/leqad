export type TutorProviderMessage = Readonly<{
  role: 'system' | 'user' | 'assistant';
  content: string;
}>;

export interface TutorProvider {
  mode: 'live' | 'test';
  reply(
    messages: readonly TutorProviderMessage[],
    signal: AbortSignal,
  ): Promise<string>;
}

export class TutorProviderResponseError extends Error {
  constructor() {
    super('Tutor provider returned an invalid response');
    this.name = 'TutorProviderResponseError';
  }
}

const RESPONSES_ENDPOINT = 'https://api.openai.com/v1/responses';
const DEFAULT_MODEL = 'gpt-4.1-mini';
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_OUTPUT_CHARACTERS = 8000;
const MAX_OUTPUT_TOKENS = 1200;

type JsonObject = Record<string, unknown>;

function isObject(value: unknown): value is JsonObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

async function readBoundedResponse(response: Response): Promise<unknown> {
  const contentLength = response.headers.get('content-length');
  if (contentLength !== null) {
    const declaredLength = Number(contentLength);
    if (
      Number.isFinite(declaredLength) &&
      declaredLength > MAX_RESPONSE_BYTES
    ) {
      throw new TutorProviderResponseError();
    }
  }
  if (!response.body) throw new TutorProviderResponseError();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let totalBytes = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      totalBytes += value.byteLength;
      if (totalBytes > MAX_RESPONSE_BYTES) {
        void reader.cancel().catch(() => undefined);
        throw new TutorProviderResponseError();
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }

  const bytes = new Uint8Array(totalBytes);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  try {
    const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes);
    return JSON.parse(text) as unknown;
  } catch {
    throw new TutorProviderResponseError();
  }
}

function outputText(value: unknown): string {
  if (!isObject(value) || value.status !== 'completed') {
    throw new TutorProviderResponseError();
  }
  if ('output_text' in value) {
    if (typeof value.output_text !== 'string') {
      throw new TutorProviderResponseError();
    }
    if (value.output_text.length > MAX_OUTPUT_CHARACTERS) {
      throw new TutorProviderResponseError();
    }
    return value.output_text;
  }
  if (!Array.isArray(value.output)) throw new TutorProviderResponseError();

  const segments: string[] = [];
  for (const item of value.output) {
    if (!isObject(item) || item.type !== 'message') continue;
    if (!Array.isArray(item.content)) throw new TutorProviderResponseError();
    for (const content of item.content) {
      if (!isObject(content)) throw new TutorProviderResponseError();
      if (content.type === 'output_text') {
        if (typeof content.text !== 'string') {
          throw new TutorProviderResponseError();
        }
        segments.push(content.text);
      }
    }
  }
  const joined = segments.join('');
  if (segments.length === 0 || joined.length > MAX_OUTPUT_CHARACTERS) {
    throw new TutorProviderResponseError();
  }
  return joined;
}

/**
 * Creates a main-process-only provider. OPENAI_MODEL is an optional override;
 * gpt-4.1-mini is the configurable V1 baseline, not a newest-model claim.
 */
export function createOpenAIProvider(
  env: NodeJS.ProcessEnv,
): TutorProvider | null {
  const apiKey = env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const configuredModel = env.OPENAI_MODEL?.trim();
  const model = configuredModel || DEFAULT_MODEL;

  return {
    mode: 'live',
    async reply(messages, signal) {
      let response: Response;
      try {
        response = await fetch(RESPONSES_ENDPOINT, {
          method: 'POST',
          headers: {
            authorization: `Bearer ${apiKey}`,
            'content-type': 'application/json',
          },
          body: JSON.stringify({
            model,
            max_output_tokens: MAX_OUTPUT_TOKENS,
            store: false,
            input: messages.map(({ role, content }) => ({ role, content })),
          }),
          redirect: 'error',
          signal,
        });
      } catch (error) {
        if (error instanceof TutorProviderResponseError) throw error;
        throw new Error('Tutor provider request failed');
      }
      if (
        !Number.isFinite(response.status) ||
        response.status < 200 ||
        response.status >= 300 ||
        response.ok !== true
      ) {
        throw new Error('Tutor provider request failed');
      }
      return outputText(await readBoundedResponse(response));
    },
  };
}
