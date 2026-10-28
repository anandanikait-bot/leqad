import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type {
  ExplanationPreference,
  TutorBridge,
  TutorMessage,
  TutorReply,
  TutorSnapshot,
} from '@leqad/desktop-contracts';
import { AskTutor } from './AskTutor';

const emptySnapshot = (
  mode: TutorSnapshot['mode'] = 'live',
): TutorSnapshot => ({
  mode,
  messages: [],
  profile: { version: 1, preference: 'none', events: [] },
});

function installBridge(
  overrides: Partial<TutorBridge> = {},
  mode: TutorSnapshot['mode'] = 'live',
) {
  const bridge: TutorBridge = {
    snapshot: vi.fn(async () => emptySnapshot(mode)),
    ask: vi.fn(async (): Promise<TutorReply> => ({
      ok: true,
      text: 'A tutor reply.',
      source: 'live',
    })),
    cancel: vi.fn(async () => undefined),
    editMemory: vi.fn(async () => emptySnapshot(mode)),
    ...overrides,
  };
  Object.defineProperty(window, 'leqadTutor', {
    configurable: true,
    value: bridge,
  });
  return bridge;
}

function message(role: TutorMessage['role'], text: string): TutorMessage {
  return { role, text, source: role === 'user' ? 'student' : 'live' };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  Reflect.deleteProperty(window, 'leqadTutor');
});

describe('AskTutor', () => {
  it('shows loading while a request is pending and cancels without rendering a late reply', async () => {
    let finishAsk: ((reply: TutorReply) => void) | undefined;
    const bridge = installBridge({
      ask: vi.fn(
        () =>
          new Promise<TutorReply>((resolve) => {
            finishAsk = resolve;
          }),
      ),
    });
    render(<AskTutor stepIndex={0} />);
    await screen.findByText('AI tutor');
    const privacyNotice = screen.getByText(
      /Your question, recent tutor conversation, lesson content and saved progress/,
    );
    const questionInput = screen.getByRole('textbox', {
      name: 'Your question',
    });
    expect(
      privacyNotice.compareDocumentPosition(questionInput) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();

    fireEvent.change(questionInput, {
      target: { value: 'How do I dimension a rectangle?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(screen.getByRole('status').textContent).toContain('Thinking');
    expect(
      screen.getByRole('button', { name: 'Why use Corner Rectangle?' }),
    ).toHaveProperty('disabled', true);
    const cancel = screen.getByRole('button', { name: 'Cancel' });

    fireEvent.click(cancel);
    await waitFor(() => expect(bridge.cancel).toHaveBeenCalledTimes(1));
    await act(async () => {
      finishAsk?.({ ok: false, code: 'cancelled' });
    });
    expect(screen.queryByText('A tutor reply.')).toBeNull();
  });

  it('cancels on unmount, snapshots afterward, and ignores the late response', async () => {
    let finishAsk: ((reply: TutorReply) => void) | undefined;
    const bridge = installBridge({
      ask: vi.fn(
        () =>
          new Promise<TutorReply>((resolve) => {
            finishAsk = resolve;
          }),
      ),
    });
    const view = render(<AskTutor stepIndex={0} />);
    await screen.findByText('AI tutor');
    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'How do I draw a rectangle?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    view.unmount();
    await waitFor(() => {
      expect(bridge.cancel).toHaveBeenCalledTimes(1);
      expect(bridge.snapshot).toHaveBeenCalledTimes(2);
    });
    await act(async () => {
      finishAsk?.({
        ok: true,
        text: 'This late response should be ignored.',
        source: 'live',
      });
    });
    expect(document.body.textContent).not.toContain(
      'This late response should be ignored.',
    );
  });

  it('retries a failed question with the same request id and a safe error message', async () => {
    const ask = vi
      .fn<TutorBridge['ask']>()
      .mockResolvedValueOnce({ ok: false, code: 'provider-error' })
      .mockResolvedValueOnce({
        ok: true,
        text: 'Try setting the rectangle width first.',
        source: 'live',
      });
    const snapshots = [
      emptySnapshot(),
      emptySnapshot(),
      {
        ...emptySnapshot(),
        messages: [
          message('user', 'How do I dimension a rectangle?'),
          message('assistant', 'Try setting the rectangle width first.'),
        ],
      },
    ];
    const bridge = installBridge({
      ask,
      snapshot: vi.fn(async () => snapshots.shift() ?? emptySnapshot()),
    });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '10000000-0000-4000-8000-000000000001',
    );
    render(<AskTutor stepIndex={2} />);
    await screen.findByText('AI tutor');

    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'How do I dimension a rectangle?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(
      await screen.findByText(
        'The tutor couldn’t answer right now. Try again.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));

    await screen.findByText('Try setting the rectangle width first.');
    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[0]?.[0]).toEqual({
      id: '10000000-0000-4000-8000-000000000001',
      text: 'How do I dimension a rectangle?',
      stepIndex: 2,
    });
    expect(ask.mock.calls[1]?.[0]).toEqual(ask.mock.calls[0]?.[0]);
    expect(bridge.snapshot).toHaveBeenCalledTimes(3);
    expect(screen.queryByText('provider-error')).toBeNull();
  });

  it('keeps a successful reply visible and the question retryable when the snapshot read fails', async () => {
    const requestId = '10000000-0000-4000-8000-000000000005';
    const ask = vi.fn<TutorBridge['ask']>(async () => ({
      ok: true,
      text: 'Use one horizontal and one vertical dimension.',
      source: 'live',
    }));
    const snapshots = [
      emptySnapshot(),
      new Error('private profile path'),
      {
        ...emptySnapshot(),
        messages: [
          message('user', 'How do I dimension a rectangle?'),
          message(
            'assistant',
            'Use one horizontal and one vertical dimension.',
          ),
        ],
      },
    ];
    const bridge = installBridge({
      ask,
      snapshot: vi.fn(async () => {
        const next = snapshots.shift() ?? emptySnapshot();
        if (next instanceof Error) throw next;
        return next;
      }),
    });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(requestId);
    render(<AskTutor stepIndex={2} />);
    await screen.findByText('AI tutor');
    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'How do I dimension a rectangle?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText('Use one horizontal and one vertical dimension.'),
    ).toBeTruthy();
    expect(
      await screen.findByText(
        'The answer arrived, but chat history could not be refreshed. Retry to reload it.',
      ),
    ).toBeTruthy();
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Your question',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('How do I dimension a rectangle?');
    expect(screen.queryByText('private profile path')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await waitFor(() =>
      expect(
        screen.getAllByText('Use one horizontal and one vertical dimension.'),
      ).toHaveLength(1),
    );
    expect(
      screen.getByRole('textbox', { name: 'Your question' }),
    ).toHaveProperty('value', '');
    expect(bridge.snapshot).toHaveBeenCalledTimes(3);
    expect(ask).toHaveBeenCalledTimes(2);
    expect(ask.mock.calls[0]?.[0]).toEqual({
      id: requestId,
      text: 'How do I dimension a rectangle?',
      stepIndex: 2,
    });
    expect(ask.mock.calls[1]?.[0]).toEqual(ask.mock.calls[0]?.[0]);
  });

  it('loads the main-process conversation for a later turn with the current step index', async () => {
    const snapshots = [
      emptySnapshot('test'),
      {
        ...emptySnapshot('test'),
        messages: [
          message('user', 'Why use a corner rectangle?'),
          {
            ...message('assistant', 'It starts from two opposite corners.'),
            source: 'test',
          },
        ],
      },
      {
        ...emptySnapshot('test'),
        messages: [
          message('user', 'Why use a corner rectangle?'),
          {
            ...message('assistant', 'It starts from two opposite corners.'),
            source: 'test',
          },
          message('user', 'I’m still confused.'),
          {
            ...message('assistant', 'Click two corners to set its size.'),
            source: 'test',
          },
        ],
      },
      {
        ...emptySnapshot('test'),
        messages: [
          message('user', 'Why use a corner rectangle?'),
          {
            ...message('assistant', 'It starts from two opposite corners.'),
            source: 'test',
          },
          message('user', 'I’m still confused.'),
          {
            ...message('assistant', 'Click two corners to set its size.'),
            source: 'test',
          },
        ],
      },
    ] satisfies TutorSnapshot[];
    const bridge = installBridge(
      {
        snapshot: vi.fn(async () => snapshots.shift() ?? emptySnapshot('test')),
        ask: vi.fn<TutorBridge['ask']>(async () => ({
          ok: true,
          text: 'A test answer.',
          source: 'test',
        })),
      },
      'test',
    );
    vi.spyOn(crypto, 'randomUUID')
      .mockReturnValueOnce('10000000-0000-4000-8000-000000000002')
      .mockReturnValueOnce('10000000-0000-4000-8000-000000000003');
    const view = render(<AskTutor stepIndex={0} />);
    await screen.findByText('Test provider · simulated responses');

    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'Why use a corner rectangle?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('It starts from two opposite corners.');

    view.rerender(<AskTutor stepIndex={1} />);
    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'I’m still confused.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    await screen.findByText('Click two corners to set its size.');

    expect(bridge.ask).toHaveBeenNthCalledWith(1, {
      id: '10000000-0000-4000-8000-000000000002',
      text: 'Why use a corner rectangle?',
      stepIndex: 0,
    });
    expect(bridge.ask).toHaveBeenNthCalledWith(2, {
      id: '10000000-0000-4000-8000-000000000003',
      text: 'I’m still confused.',
      stepIndex: 1,
    });
    expect(screen.getByText('Why use a corner rectangle?')).toBeTruthy();

    view.unmount();
    render(<AskTutor stepIndex={1} />);
    await screen.findByText('Click two corners to set its size.');
    expect(screen.getByText('I’m still confused.')).toBeTruthy();
    expect(bridge.snapshot).toHaveBeenCalledTimes(4);
  });

  it('saves a student-selected explanation preference and displays removable learning events', async () => {
    const updated: TutorSnapshot = {
      mode: 'live',
      messages: [],
      profile: {
        version: 1,
        preference: 'step-by-step',
        events: [{ id: 'event-1', topic: 'dimensioning', clarification: true }],
      },
    };
    const bridge = installBridge({
      snapshot: vi.fn(async (): Promise<TutorSnapshot> => ({
        ...emptySnapshot(),
        profile: {
          version: 1,
          preference: 'none',
          events: [
            { id: 'event-1', topic: 'dimensioning', clarification: true },
          ],
        },
      })),
      editMemory: vi.fn(async () => updated),
    });
    render(<AskTutor stepIndex={3} />);
    await screen.findByText('AI tutor');

    fireEvent.click(screen.getByText('Learning history'));
    expect(screen.getByText('Dimensioning · follow-up question')).toBeTruthy();
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Explanation style' }),
      {
        target: { value: 'step-by-step' satisfies ExplanationPreference },
      },
    );

    await waitFor(() =>
      expect(bridge.editMemory).toHaveBeenCalledWith({
        type: 'preference',
        value: 'step-by-step',
      }),
    );
    expect(
      (
        screen.getByRole('combobox', {
          name: 'Explanation style',
        }) as HTMLSelectElement
      ).value,
    ).toBe('step-by-step');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Remove Dimensioning · follow-up question',
      }),
    );
    expect(bridge.editMemory).toHaveBeenCalledWith({
      type: 'remove-event',
      id: 'event-1',
    });
  });

  it('shows no scripted answers and disables sending when the tutor is unavailable', async () => {
    const bridge = installBridge({}, 'unavailable');
    render(<AskTutor stepIndex={0} />);
    await screen.findByText('AI unavailable');

    fireEvent.click(
      screen.getByRole('button', { name: 'Why use Corner Rectangle?' }),
    );
    expect(
      (
        screen.getByRole('textbox', {
          name: 'Your question',
        }) as HTMLTextAreaElement
      ).value,
    ).toBe('Why use Corner Rectangle?');
    expect(screen.getByRole('button', { name: 'Send' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(screen.queryByText('A tutor reply.')).toBeNull();
    expect(bridge.ask).not.toHaveBeenCalled();
  });

  it('allows local profile edits and clearing chat while the provider is unavailable', async () => {
    let current: TutorSnapshot = {
      mode: 'unavailable',
      messages: [message('user', 'How do I sketch a rectangle?')],
      profile: {
        version: 1,
        preference: 'none',
        events: [
          { id: 'rectangles-1', topic: 'rectangles', clarification: false },
        ],
      },
    };
    const editMemory = vi.fn(
      async (edit: Parameters<TutorBridge['editMemory']>[0]) => {
        if (edit.type === 'preference') {
          current = {
            ...current,
            profile: { ...current.profile, preference: edit.value },
          };
        } else if (edit.type === 'remove-event') {
          current = {
            ...current,
            profile: {
              ...current.profile,
              events: current.profile.events.filter(
                (event) => event.id !== edit.id,
              ),
            },
          };
        } else {
          current = emptySnapshot('unavailable');
        }
        return current;
      },
    );
    const bridge = installBridge(
      {
        snapshot: vi.fn(async () => current),
        editMemory,
      },
      'unavailable',
    );
    render(<AskTutor stepIndex={0} />);
    await screen.findByText('AI unavailable');
    fireEvent.click(screen.getByText('Learning history'));

    const preference = screen.getByRole('combobox', {
      name: 'Explanation style',
    });
    expect(preference).toHaveProperty('disabled', false);
    fireEvent.change(preference, { target: { value: 'short' } });
    await waitFor(() =>
      expect(editMemory).toHaveBeenCalledWith({
        type: 'preference',
        value: 'short',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Remove Rectangles · question' }),
    );
    await waitFor(() =>
      expect(screen.queryByText('Rectangles · question')).toBeNull(),
    );
    expect(bridge.editMemory).toHaveBeenCalledWith({
      type: 'remove-event',
      id: 'rectangles-1',
    });

    fireEvent.click(
      screen.getByRole('button', { name: 'Clear learning history and chat' }),
    );
    await waitFor(() =>
      expect(bridge.editMemory).toHaveBeenCalledWith({ type: 'clear' }),
    );
    expect(screen.queryByText('How do I sketch a rectangle?')).toBeNull();
    expect(
      (
        screen.getByRole('combobox', {
          name: 'Explanation style',
        }) as HTMLSelectElement
      ).value,
    ).toBe('none');
  });

  it('shows a fixed history-load error and keeps clear recovery available when snapshots fail', async () => {
    const bridge = installBridge({
      snapshot: vi.fn(async (): Promise<TutorSnapshot> => {
        throw new Error('raw local storage failure');
      }),
      editMemory: vi.fn(async () => emptySnapshot('unavailable')),
    });
    render(<AskTutor stepIndex={0} />);

    expect(
      await screen.findByText(
        'Learning history could not be loaded. You can clear it and try again.',
      ),
    ).toBeTruthy();
    expect(screen.queryByText('raw local storage failure')).toBeNull();
    const clear = screen.getByRole('button', {
      name: 'Clear learning history and chat',
    });
    expect(clear).toHaveProperty('disabled', false);
    fireEvent.click(clear);
    await waitFor(() =>
      expect(bridge.editMemory).toHaveBeenCalledWith({ type: 'clear' }),
    );
    expect(
      screen.queryByText(
        'Learning history could not be loaded. You can clear it and try again.',
      ),
    ).toBeNull();
  });

  it('invalidates the active request when a profile edit cancels it in the host', async () => {
    let finishAsk: ((reply: TutorReply) => void) | undefined;
    const bridge = installBridge({
      ask: vi.fn(
        () =>
          new Promise<TutorReply>((resolve) => {
            finishAsk = resolve;
          }),
      ),
      editMemory: vi.fn<TutorBridge['editMemory']>(async () => ({
        ...emptySnapshot(),
        profile: { version: 1, preference: 'short', events: [] },
      })),
    });
    render(<AskTutor stepIndex={0} />);
    await screen.findByText('AI tutor');
    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'Explain sketching.' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    fireEvent.click(screen.getByText('Learning history'));
    fireEvent.change(
      screen.getByRole('combobox', { name: 'Explanation style' }),
      {
        target: { value: 'short' },
      },
    );
    await waitFor(() =>
      expect(bridge.editMemory).toHaveBeenCalledWith({
        type: 'preference',
        value: 'short',
      }),
    );
    expect(screen.queryByRole('button', { name: 'Cancel' })).toBeNull();
    expect(screen.queryByRole('button', { name: 'Retry' })).toBeNull();
    await act(async () => {
      finishAsk?.({
        ok: true,
        text: 'This late response should be ignored after profile edit.',
        source: 'live',
      });
    });
    expect(
      screen.queryByText(
        'This late response should be ignored after profile edit.',
      ),
    ).toBeNull();
    expect(bridge.snapshot).toHaveBeenCalledTimes(1);
  });

  it('keeps thrown provider details out of the visible error and retries the same question', async () => {
    const ask = vi
      .fn<TutorBridge['ask']>()
      .mockRejectedValueOnce(new Error('Bearer secret-token'))
      .mockResolvedValueOnce({
        ok: true,
        text: 'Try drawing the rectangle first.',
        source: 'live',
      });
    const snapshots = [
      emptySnapshot(),
      emptySnapshot(),
      {
        ...emptySnapshot(),
        messages: [
          message('user', 'How do I draw a rectangle?'),
          message('assistant', 'Try drawing the rectangle first.'),
        ],
      },
    ];
    installBridge({
      ask,
      snapshot: vi.fn(async () => snapshots.shift() ?? emptySnapshot()),
    });
    vi.spyOn(crypto, 'randomUUID').mockReturnValue(
      '10000000-0000-4000-8000-000000000004',
    );
    render(<AskTutor stepIndex={0} />);
    await screen.findByText('AI tutor');
    fireEvent.change(screen.getByRole('textbox', { name: 'Your question' }), {
      target: { value: 'How do I draw a rectangle?' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));

    expect(
      await screen.findByText('Something went wrong. Try again.'),
    ).toBeTruthy();
    expect(screen.queryByText('Bearer secret-token')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Retry' }));
    await screen.findByText('Try drawing the rectangle first.');
    expect(ask.mock.calls[0]?.[0]).toEqual(ask.mock.calls[1]?.[0]);
  });
});
