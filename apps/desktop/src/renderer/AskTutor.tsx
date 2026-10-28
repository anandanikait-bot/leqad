import { useCallback, useEffect, useRef, useState } from 'react';
import type { FormEvent } from 'react';
import {
  EMPTY_LEARNER_PROFILE,
  type ExplanationPreference,
  type TutorMemoryEdit,
  type TutorRequest,
  type TutorReply,
  type TutorSnapshot,
  type TutorTopic,
} from '@leqad/desktop-contracts';

const SUGGESTIONS = [
  'Why use Corner Rectangle?',
  'How do I dimension a rectangle?',
  "I'm still confused.",
] as const;

const PREFERENCES: { value: ExplanationPreference; label: string }[] = [
  { value: 'none', label: 'No preference' },
  { value: 'short', label: 'Short answers' },
  { value: 'step-by-step', label: 'Step by step' },
  { value: 'analogy', label: 'Use analogies' },
];

const TOPIC_LABELS: Record<TutorTopic, string> = {
  sketching: 'Sketching',
  'reference-planes': 'Reference planes',
  rectangles: 'Rectangles',
  dimensioning: 'Dimensioning',
  'finishing-sketch': 'Finishing a sketch',
  practice: 'Practice',
};

const REPLY_ERRORS: Record<Extract<TutorReply, { ok: false }>['code'], string> =
  {
    unavailable: 'AI tutor is unavailable. Your question wasn’t sent.',
    busy: 'Another tutor request is running. Try again shortly.',
    cancelled: 'Request cancelled.',
    timeout: 'The tutor took too long to respond. Try again.',
    'provider-error': 'The tutor couldn’t answer right now. Try again.',
    'invalid-response': 'The tutor returned an unusable response. Try again.',
    'storage-error': 'Your learning history couldn’t be saved. Try again.',
    'invalid-request': 'That question couldn’t be sent. Edit it and try again.',
  };

const EMPTY_UNAVAILABLE_SNAPSHOT: TutorSnapshot = {
  mode: 'unavailable',
  messages: [],
  profile: EMPTY_LEARNER_PROFILE,
};

function eventLabel(topic: TutorTopic, clarification: boolean) {
  return `${TOPIC_LABELS[topic]} · ${clarification ? 'follow-up question' : 'question'}`;
}

type PendingTurn = {
  request: TutorRequest;
  reply: Extract<TutorReply, { ok: true }>;
};

type SnapshotLoadResult = { ok: true; snapshot: TutorSnapshot } | { ok: false };

function snapshotContainsTurn(snapshot: TutorSnapshot, turn: PendingTurn) {
  return snapshot.messages.some((message, index) => {
    const reply = snapshot.messages[index + 1];
    return (
      message.role === 'user' &&
      message.text === turn.request.text &&
      reply?.role === 'assistant' &&
      reply.text === turn.reply.text &&
      reply.source === turn.reply.source
    );
  });
}

type AskTutorProps = { stepIndex: number };

export function AskTutor({ stepIndex }: AskTutorProps) {
  const [snapshot, setSnapshot] = useState<TutorSnapshot>(
    EMPTY_UNAVAILABLE_SNAPSHOT,
  );
  const [snapshotLoading, setSnapshotLoading] = useState(true);
  const [question, setQuestion] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyLoadError, setHistoryLoadError] = useState(false);
  const [pendingTurns, setPendingTurns] = useState<PendingTurn[]>([]);
  const [status, setStatus] = useState('');
  const [memorySaving, setMemorySaving] = useState(false);
  const mountedRef = useRef(false);
  const attemptRef = useRef(0);
  const snapshotRevisionRef = useRef(0);
  const activeRequestRef = useRef<TutorRequest | null>(null);
  const retryRequestRef = useRef<TutorRequest | null>(null);
  const questionRef = useRef<HTMLTextAreaElement>(null);

  const loadSnapshot = useCallback(
    async (
      revision = snapshotRevisionRef.current,
    ): Promise<SnapshotLoadResult> => {
      const bridge = window.leqadTutor;
      if (!bridge) {
        if (mountedRef.current && revision === snapshotRevisionRef.current) {
          setSnapshot(EMPTY_UNAVAILABLE_SNAPSHOT);
          setHistoryLoadError(false);
        }
        return { ok: false };
      }
      try {
        const next = await bridge.snapshot();
        if (mountedRef.current && revision === snapshotRevisionRef.current) {
          setSnapshot(next);
          setHistoryLoadError(false);
          setPendingTurns((current) =>
            current.filter((turn) => !snapshotContainsTurn(next, turn)),
          );
        }
        return { ok: true, snapshot: next };
      } catch {
        if (mountedRef.current && revision === snapshotRevisionRef.current) {
          setHistoryLoadError(true);
        }
        return { ok: false };
      }
    },
    [],
  );

  useEffect(() => {
    mountedRef.current = true;
    void loadSnapshot().finally(() => {
      if (mountedRef.current) setSnapshotLoading(false);
    });
    return () => {
      mountedRef.current = false;
      attemptRef.current += 1;
      if (activeRequestRef.current) {
        activeRequestRef.current = null;
        const bridge = window.leqadTutor;
        if (bridge) {
          void bridge
            .cancel()
            .then(() => bridge.snapshot())
            .catch(() => undefined);
        }
      }
    };
  }, [loadSnapshot]);

  const runRequest = useCallback(
    async (request: TutorRequest) => {
      const bridge = window.leqadTutor;
      if (!bridge || snapshot.mode === 'unavailable') return;

      const attempt = ++attemptRef.current;
      const snapshotRevision = ++snapshotRevisionRef.current;
      activeRequestRef.current = request;
      retryRequestRef.current = request;
      setLoading(true);
      setError(null);
      setStatus('');

      try {
        const reply = await bridge.ask(request);
        if (!mountedRef.current || attempt !== attemptRef.current) return;
        activeRequestRef.current = null;
        const snapshotResult = await loadSnapshot(snapshotRevision);
        if (!mountedRef.current || attempt !== attemptRef.current) return;
        if (reply.ok) {
          if (snapshotResult.ok) {
            retryRequestRef.current = null;
            setQuestion((current) =>
              current.trim() === request.text ? '' : current,
            );
            setStatus('Response received.');
          } else {
            const turn = { request, reply };
            setPendingTurns((current) => [...current.slice(-9), turn]);
            setError(
              'The answer arrived, but chat history could not be refreshed. Retry to reload it.',
            );
          }
        } else {
          setError(REPLY_ERRORS[reply.code]);
        }
      } catch {
        if (!mountedRef.current || attempt !== attemptRef.current) return;
        activeRequestRef.current = null;
        await loadSnapshot(snapshotRevision);
        if (!mountedRef.current || attempt !== attemptRef.current) return;
        setError('Something went wrong. Try again.');
      } finally {
        if (mountedRef.current && attempt === attemptRef.current)
          setLoading(false);
      }
    },
    [loadSnapshot, snapshot.mode],
  );

  const submitQuestion = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || loading || memorySaving || snapshot.mode === 'unavailable')
      return;
    const request: TutorRequest = {
      id: crypto.randomUUID(),
      text,
      stepIndex,
    };
    retryRequestRef.current = request;
    void runRequest(request);
  };

  const retryQuestion = () => {
    const request = retryRequestRef.current;
    if (!request || loading || snapshot.mode === 'unavailable') return;
    void runRequest(request);
  };

  const cancelRequest = async () => {
    const bridge = window.leqadTutor;
    if (!bridge || !activeRequestRef.current) return;
    attemptRef.current += 1;
    const snapshotRevision = ++snapshotRevisionRef.current;
    activeRequestRef.current = null;
    retryRequestRef.current = null;
    setLoading(false);
    setError(null);
    setStatus('Request cancelled.');
    await bridge.cancel().catch(() => undefined);
    await loadSnapshot(snapshotRevision);
  };

  const editMemory = async (edit: TutorMemoryEdit) => {
    const bridge = window.leqadTutor;
    if (!bridge || memorySaving) return;
    const requestWasActive = activeRequestRef.current !== null || loading;
    attemptRef.current += 1;
    activeRequestRef.current = null;
    retryRequestRef.current = null;
    const snapshotRevision = ++snapshotRevisionRef.current;
    setLoading(false);
    setMemorySaving(true);
    setError(null);
    setStatus('');
    if (requestWasActive)
      setStatus('Request cancelled because your learning history changed.');
    try {
      const next = await bridge.editMemory(edit);
      if (
        mountedRef.current &&
        snapshotRevision === snapshotRevisionRef.current
      ) {
        setSnapshot(next);
        setHistoryLoadError(false);
        if (edit.type === 'clear') setPendingTurns([]);
        else
          setPendingTurns((current) =>
            current.filter((turn) => !snapshotContainsTurn(next, turn)),
          );
      }
    } catch {
      if (
        mountedRef.current &&
        snapshotRevision === snapshotRevisionRef.current
      )
        setError('Learning history couldn’t be updated. Try again.');
    } finally {
      if (mountedRef.current) setMemorySaving(false);
    }
  };

  const setPreference = (value: ExplanationPreference) => {
    void editMemory({ type: 'preference', value });
  };

  const modeLabel =
    snapshot.mode === 'live'
      ? 'AI tutor'
      : snapshot.mode === 'test'
        ? 'Test provider · simulated responses'
        : 'AI unavailable';
  const memoryControlsAvailable = Boolean(window.leqadTutor);

  return (
    <section className="ask-tutor" aria-label="Ask">
      <div className="ask-heading-row">
        <h2 id="ask-title">Ask</h2>
        <span className="tutor-mode" aria-live="polite">
          {snapshotLoading ? 'Checking AI availability…' : modeLabel}
        </span>
      </div>

      <p className="ask-step-context">{`Step ${stepIndex + 1} of 8`}</p>

      <div
        className="tutor-conversation"
        aria-label="Conversation"
        aria-live="polite"
      >
        {snapshot.messages.map((item, index) => (
          <article
            className={`tutor-message tutor-message-${item.role}`}
            key={`${index}-${item.role}`}
          >
            <h3>{item.role === 'user' ? 'You' : 'Tutor'}</h3>
            <p>{item.text}</p>
          </article>
        ))}
        {pendingTurns.map((turn) => (
          <article
            className="tutor-message tutor-message-assistant"
            key={`pending-${turn.request.id}`}
          >
            <h3>Tutor</h3>
            <p>{turn.reply.text}</p>
          </article>
        ))}
        {loading ? (
          <p className="tutor-status" role="status">
            Thinking…
          </p>
        ) : null}
        {status ? (
          <p className="tutor-status" role="status">
            {status}
          </p>
        ) : null}
        {error ? (
          <div className="tutor-error" role="alert">
            <p>{error}</p>
            {retryRequestRef.current ? (
              <button
                className="text-action"
                disabled={snapshot.mode === 'unavailable'}
                onClick={retryQuestion}
                type="button"
              >
                Retry
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
      {historyLoadError ? (
        <p className="tutor-error" role="alert">
          Learning history could not be loaded. You can clear it and try again.
        </p>
      ) : null}

      {snapshot.mode === 'unavailable' && !snapshotLoading ? (
        <p className="tutor-unavailable" role="status">
          AI tutoring isn’t available right now. No answer was generated.
        </p>
      ) : null}

      <div className="tutor-suggestions" aria-label="Suggested questions">
        {SUGGESTIONS.map((suggestion) => (
          <button
            className="secondary-button tutor-suggestion"
            disabled={loading || memorySaving}
            key={suggestion}
            onClick={() => {
              setQuestion(suggestion);
              retryRequestRef.current = null;
              setError(null);
              questionRef.current?.focus();
            }}
            type="button"
          >
            {suggestion}
          </button>
        ))}
      </div>

      <p className="tutor-privacy-note">
        Your question, recent tutor conversation, lesson content and saved
        progress, and your explanation preference and topic/follow-up history go
        to the AI provider. Don’t include private CAD data. The tutor cannot see
        or verify your drawing.
      </p>

      <form className="tutor-composer" onSubmit={submitQuestion}>
        <label htmlFor="tutor-question">Your question</label>
        <textarea
          ref={questionRef}
          id="tutor-question"
          maxLength={2000}
          disabled={
            snapshot.mode === 'unavailable' ||
            snapshotLoading ||
            loading ||
            memorySaving
          }
          onChange={(event) => {
            setQuestion(event.currentTarget.value);
            retryRequestRef.current = null;
            setError(null);
          }}
          value={question}
        />
        <div className="tutor-composer-meta">
          <span>{`${question.length}/2000`}</span>
          {loading ? (
            <button
              className="text-action"
              onClick={() => void cancelRequest()}
              type="button"
            >
              Cancel
            </button>
          ) : (
            <button
              className="primary-button"
              disabled={
                snapshot.mode === 'unavailable' ||
                snapshotLoading ||
                memorySaving ||
                question.trim().length === 0
              }
              type="submit"
            >
              Send
            </button>
          )}
        </div>
      </form>

      <details className="tutor-history">
        <summary>Learning history</summary>
        <div className="tutor-history-body">
          <label htmlFor="tutor-preference">Explanation style</label>
          <select
            id="tutor-preference"
            disabled={memorySaving || !memoryControlsAvailable}
            onChange={(event) =>
              setPreference(event.currentTarget.value as ExplanationPreference)
            }
            value={snapshot.profile.preference}
          >
            {PREFERENCES.map((preference) => (
              <option key={preference.value} value={preference.value}>
                {preference.label}
              </option>
            ))}
          </select>
          {snapshot.profile.events.length ? (
            <ul className="tutor-events">
              {snapshot.profile.events.map((item) => {
                const label = eventLabel(item.topic, item.clarification);
                return (
                  <li key={item.id}>
                    <span>{label}</span>
                    <button
                      aria-label={`Remove ${label}`}
                      className="text-action"
                      disabled={memorySaving || !memoryControlsAvailable}
                      onClick={() =>
                        void editMemory({ type: 'remove-event', id: item.id })
                      }
                      type="button"
                    >
                      Remove
                    </button>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="muted-copy">No learning history yet.</p>
          )}
          <button
            className="text-action"
            disabled={memorySaving || !memoryControlsAvailable}
            onClick={() => void editMemory({ type: 'clear' })}
            type="button"
          >
            Clear learning history and chat
          </button>
        </div>
      </details>
    </section>
  );
}
