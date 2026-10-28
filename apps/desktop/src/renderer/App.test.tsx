import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  DEFAULT_PREFERENCES,
  EMPTY_SESSION,
  type WindowCatalog,
  type SessionView,
} from '@leqad/desktop-contracts';
import { App } from './App';
import { DESKTOP_STEP_COPY } from './desktopCopy';
import { FOUNDATIONS_FIRST_SKETCH } from '@leqad/lesson-engine';

const savedLessons: unknown[] = [];

function installBridge(savedLesson: unknown = null) {
  savedLessons.length = 0;
  const bridge = {
    listWindows: vi.fn(async (): Promise<WindowCatalog> => ({
      availability: 'unavailable' as const,
      unavailableReason: 'unsupported' as const,
      windows: [],
      incomplete: false,
    })),
    command: vi.fn(async (command: unknown) => {
      void command;
      return EMPTY_SESSION;
    }),
    subscribe: vi.fn(() => () => undefined),
    loadPreferences: vi.fn(async () => ({ ...DEFAULT_PREFERENCES })),
    savePreferences: vi.fn(async () => undefined),
    loadLesson: vi.fn(async () => savedLesson),
    saveLesson: vi.fn(async (value: unknown) => {
      savedLessons.push(value);
    }),
  };
  Object.defineProperty(window, 'leqad', {
    configurable: true,
    value: bridge,
  });
  return bridge;
}

async function enterWrittenLessons() {
  render(<App />);
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use written lessons' }),
  );
}

function savedSecondStep() {
  return {
    schemaVersion: 1,
    lessonId: 'foundations-first-sketch',
    lessonVersion: '2.0.0',
    currentStep: 1,
    steps: Array.from({ length: 8 }, (_, index) => ({
      status:
        index === 0
          ? 'COMPLETED'
          : index === 1
            ? 'AWAITING_ACTION'
            : 'NOT_STARTED',
      hintLevel: 0,
      verification: index === 0 ? null : index === 1 ? 'UNKNOWN' : null,
      resumeState: null,
      outcome: index === 0 ? 'ACKNOWLEDGED' : 'NONE',
    })),
  };
}

beforeEach(() => installBridge());
afterEach(() => {
  cleanup();
  Reflect.deleteProperty(window, 'leqad');
});

describe('desktop written teaching workspace', () => {
  it('requires a window choice or explicit written-only choice before opening the lesson', async () => {
    const bridge = installBridge();
    render(<App />);

    expect(
      await screen.findByRole('heading', {
        name: 'Learn alongside your CAD workspace',
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Use written lessons' }),
    ).toBeTruthy();

    fireEvent.click(
      screen.getByRole('button', { name: 'Use written lessons' }),
    );
    expect(bridge.command).toHaveBeenCalledWith({ type: 'use-written' });
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
    expect(savedLessons).toHaveLength(0);
  });

  it('moves focus from window setup to the lesson action after keyboard entry', async () => {
    render(<App />);
    const writtenLessons = await screen.findByRole('button', {
      name: 'Use written lessons',
    });
    writtenLessons.focus();
    fireEvent.click(writtenLessons);

    const primaryAction = await screen.findByRole('button', { name: 'Got it' });
    await waitFor(() => expect(document.activeElement).toBe(primaryAction));
  });

  it('validates a selected window and continues with screen access off when unavailable', async () => {
    const bridge = installBridge();
    const selectedWindow = {
      application: 'Chrome' as const,
      ordinal: 1,
      kind: 'browser' as const,
    };
    bridge.listWindows.mockResolvedValue({
      availability: 'available',
      unavailableReason: null,
      incomplete: false,
      windows: [{ token: 'window-1', ...selectedWindow }],
    });
    const selectedView: SessionView = {
      ...EMPTY_SESSION,
      binding: 'selected',
      selectedWindow,
    };
    bridge.command.mockImplementation(async (rawCommand) => {
      const command = rawCommand as { type: string; allow?: boolean };
      if (command.type === 'select') return selectedView;
      if (command.type === 'consent' && command.allow === false)
        return { ...selectedView, consent: 'denied' };
      return EMPTY_SESSION;
    });
    render(<App />);

    expect(
      await screen.findByRole('radio', { name: 'Chrome · Window 1' }),
    ).toHaveProperty('checked', false);
    fireEvent.click(
      await screen.findByRole('radio', { name: 'Chrome · Window 1' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Use selected window' }),
    );
    expect(bridge.command).toHaveBeenCalledWith({
      type: 'select',
      windowToken: 'window-1',
    });
    expect(
      await screen.findByRole('heading', {
        name: 'Visual help isn’t available in this build',
      }),
    ).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Allow/i })).toBeNull();

    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with written lessons' }),
    );
    expect(bridge.command).toHaveBeenCalledWith({
      type: 'consent',
      allow: false,
    });
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
    expect(savedLessons).toHaveLength(0);
  });

  it('keeps separately saved lesson progress after the user declines screen access', async () => {
    const bridge = installBridge(savedSecondStep());
    bridge.listWindows.mockResolvedValue({
      availability: 'available',
      unavailableReason: null,
      incomplete: false,
      windows: [
        {
          token: 'window-1',
          application: 'Chrome',
          ordinal: 1,
          kind: 'browser',
        },
      ],
    });
    bridge.command.mockImplementation(async (rawCommand) => {
      const command = rawCommand as { type: string; allow?: boolean };
      if (command.type === 'select')
        return {
          ...EMPTY_SESSION,
          binding: 'selected',
          selectedWindow: {
            application: 'Chrome',
            ordinal: 1,
            kind: 'browser',
          },
        };
      if (command.type === 'consent' && command.allow === false)
        return { ...EMPTY_SESSION, consent: 'denied' };
      return EMPTY_SESSION;
    });
    render(<App />);

    fireEvent.click(
      await screen.findByRole('radio', { name: 'Chrome · Window 1' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Use selected window' }),
    );
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Continue with written lessons',
      }),
    );
    expect(
      await screen.findByRole('heading', {
        name: 'Continue Your First Sketch?',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Resume lesson' }));
    expect(screen.getByText('Your First Sketch · Step 2 of 8')).toBeTruthy();
    expect(bridge.saveLesson).not.toHaveBeenCalled();
  });

  it('refuses selection from incomplete metadata and keeps written lessons available', async () => {
    const bridge = installBridge();
    bridge.listWindows.mockResolvedValue({
      availability: 'available',
      unavailableReason: null,
      incomplete: true,
      windows: [
        {
          token: 'partial-window',
          application: 'Chrome',
          ordinal: 1,
          kind: 'browser',
        },
      ],
    });
    render(<App />);

    expect(await screen.findByText(/window list is incomplete/i)).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Use selected window' }),
    ).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Use written lessons' }),
    );
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
    expect(bridge.command).toHaveBeenCalledExactlyOnceWith({
      type: 'use-written',
    });
    expect(savedLessons).toHaveLength(0);
  });

  it('opens the first authored step after the user chooses written lessons', async () => {
    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Use written lessons' }),
    );

    expect(
      await screen.findByText('Written lesson · No window selected'),
    ).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
    expect(screen.getByText('Your First Sketch · Step 1 of 8')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Before you begin' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeTruthy();
  });

  it('persists an acknowledgement and only advances through the lesson engine', async () => {
    await enterWrittenLessons();
    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }));
    fireEvent.click(await screen.findByRole('button', { name: 'Next step' }));

    expect(
      await screen.findByText('Your First Sketch · Step 2 of 8'),
    ).toBeTruthy();
    await waitFor(() => expect(savedLessons.length).toBeGreaterThan(0));
    const saved = savedLessons.at(-1) as {
      schemaVersion: number;
      lessonId: string;
      currentStep: number;
      steps: { status: string; outcome: string }[];
    };
    expect(saved.schemaVersion).toBe(1);
    expect(saved.lessonId).toBe('foundations-first-sketch');
    expect(saved.currentStep).toBe(1);
    expect(saved.steps[0]).toMatchObject({
      status: 'COMPLETED',
      outcome: 'ACKNOWLEDGED',
    });
    expect(JSON.stringify(savedLessons)).not.toContain('MODEL_VERIFIED');
  });

  it('keeps progress available after a save error and retries through the bridge', async () => {
    const bridge = installBridge();
    bridge.saveLesson.mockRejectedValueOnce(new Error('disk full'));
    await enterWrittenLessons();

    fireEvent.click(await screen.findByRole('button', { name: 'Got it' }));
    expect(
      await screen.findByText(
        "We couldn't save your progress. Try saving again before you close Leqad.",
      ),
    ).toBeTruthy();
    expect(screen.getByText('Your First Sketch · Step 1 of 8')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }));
    await waitFor(() => expect(bridge.saveLesson).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByText(
          "We couldn't save your progress. Try saving again before you close Leqad.",
        ),
      ).toBeNull(),
    );
    expect(savedLessons).toHaveLength(1);
  });

  it('waits for the saved lesson before enabling progress actions', async () => {
    const bridge = installBridge();
    let resolveLesson: ((value: unknown) => void) | undefined;
    bridge.loadLesson.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveLesson = resolve;
        }),
    );
    render(<App />);

    expect(screen.getByRole('status').textContent).toContain(
      'Loading your lesson and settings',
    );
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    await act(async () => resolveLesson?.(null));
    fireEvent.click(
      await screen.findByRole('button', { name: 'Use written lessons' }),
    );
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
  });

  it('shows honest tutor unavailability without changing lesson progress', async () => {
    await enterWrittenLessons();
    fireEvent.click(await screen.findByRole('button', { name: 'Ask' }));
    expect(screen.getByText('Your First Sketch · Step 1 of 8')).toBeTruthy();
    expect(await screen.findByText('AI unavailable')).toBeTruthy();
    expect(
      screen.getByText(/Your question, recent tutor conversation/),
    ).toBeTruthy();
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
    expect(screen.queryByText(/Corner Rectangle lets you draw/)).toBeNull();
    expect(
      screen.getByText('Reading answers does not change your progress.'),
    ).toBeTruthy();
    expect(savedLessons).toHaveLength(0);
  });

  it('reveals ordered Help and Escape restores focus to its disclosure', async () => {
    await enterWrittenLessons();
    const disclosure = await screen.findByRole('button', { name: 'Help +' });
    fireEvent.click(disclosure);

    const help = screen.getByRole('region', { name: 'Lesson help' });
    expect(
      screen.getByText(
        'A Part Studio is the Onshape workspace where you create parts.',
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Next hint' }));
    expect(
      screen.getByText(
        'A plane is a flat surface where you can draw a sketch.',
      ),
    ).toBeTruthy();
    help.focus();
    fireEvent.keyDown(help, { key: 'Escape' });
    expect(screen.queryByRole('region', { name: 'Lesson help' })).toBeNull();
    await waitFor(() => expect(document.activeElement).toBe(disclosure));
  });

  it('offers recovery and returns Settings focus to the closed menu trigger', async () => {
    const bridge = installBridge();
    await enterWrittenLessons();
    const menuTrigger = await screen.findByLabelText('Open lesson menu');
    fireEvent.click(menuTrigger);
    const settingsInvoker = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(settingsInvoker);

    const heading = await screen.findByRole('heading', { name: 'Settings' });
    await waitFor(() => expect(document.activeElement).toBe(heading));
    expect(screen.getByText(/This build cannot capture a screen/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Choose a CAD window' }),
    ).toHaveProperty('disabled', false);
    expect(
      screen.getByRole('button', { name: 'Report a misplaced highlight' }),
    ).toHaveProperty('disabled', true);

    fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
    expect(
      document.querySelector('.desktop-app')?.getAttribute('data-appearance'),
    ).toBe('dark');
    await waitFor(() => expect(bridge.savePreferences).toHaveBeenCalled());
    fireEvent.click(screen.getByRole('button', { name: 'Back to lesson' }));
    await waitFor(() => expect(document.activeElement).toBe(menuTrigger));
    expect((menuTrigger.parentElement as HTMLDetailsElement).open).toBe(false);
  });

  it('requires an explicit choice before resuming saved lesson progress', async () => {
    installBridge(savedSecondStep());
    await enterWrittenLessons();

    expect(
      await screen.findByRole('heading', {
        name: 'Continue Your First Sketch?',
      }),
    ).toBeTruthy();
    expect(
      screen.getByText('Step 2 of 8 · 1 step marked complete'),
    ).toBeTruthy();
    expect(
      screen.getByText(
        "This is your saved lesson progress. Leqad hasn't checked your current drawing.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Resume lesson' }));
    expect(screen.getByText('Your First Sketch · Step 2 of 8')).toBeTruthy();
  });

  it('offers a fresh session and save retry when stored progress is unreadable', async () => {
    const bridge = installBridge({ schemaVersion: 'unsupported' });
    bridge.saveLesson.mockRejectedValue(
      new Error('host refused unreadable data'),
    );
    await enterWrittenLessons();

    expect(await screen.findByText(/start fresh for now/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Got it' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(bridge.saveLesson).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Start fresh for now' }),
    );
    expect(
      screen.getByRole('dialog', {
        name: 'Start fresh for now?',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start fresh' }));
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
    expect(
      await screen.findByText(
        "We couldn't save your progress. Try saving again before you close Leqad.",
      ),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Try saving again' }));
    await waitFor(() => expect(bridge.saveLesson).toHaveBeenCalledTimes(2));
    expect(
      screen.getByText(
        "We couldn't save your progress. Try saving again before you close Leqad.",
      ),
    ).toBeTruthy();
    expect(savedLessons).toHaveLength(0);
  });

  it('does not enable progress writes when loading the saved lesson fails', async () => {
    const bridge = installBridge();
    bridge.loadLesson.mockRejectedValueOnce(new Error('disk read failed'));
    await enterWrittenLessons();

    expect(await screen.findByText(/start fresh for now/)).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Got it' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(bridge.saveLesson).not.toHaveBeenCalled();
  });

  it('loads the saved lesson even when reading preferences fails', async () => {
    const bridge = installBridge(savedSecondStep());
    bridge.loadPreferences.mockRejectedValueOnce(
      new Error('preferences unavailable'),
    );
    await enterWrittenLessons();

    expect(
      await screen.findByRole('heading', {
        name: 'Continue Your First Sketch?',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Resume lesson' }));
    expect(screen.getByText('Your First Sketch · Step 2 of 8')).toBeTruthy();
    expect(screen.getByRole('status').textContent).toContain(
      "We couldn't load your settings",
    );
    expect(bridge.saveLesson).not.toHaveBeenCalled();
  });

  it('requires confirmation before replacing saved progress with a fresh lesson', async () => {
    installBridge(savedSecondStep());
    await enterWrittenLessons();

    expect(
      await screen.findByRole('heading', {
        name: 'Continue Your First Sketch?',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start again' }));
    expect(
      screen.getByRole('dialog', { name: 'Start this lesson again?' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(
      screen.getByRole('heading', { name: 'Continue Your First Sketch?' }),
    ).toBeTruthy();
    expect(savedLessons).toHaveLength(0);

    fireEvent.click(screen.getByRole('button', { name: 'Start again' }));
    fireEvent.click(screen.getByRole('button', { name: 'Restart lesson' }));
    expect(
      await screen.findByText('Your First Sketch · Step 1 of 8'),
    ).toBeTruthy();
    await waitFor(() => expect(savedLessons).toHaveLength(1));
    const restarted = savedLessons[0] as {
      currentStep: number;
      steps: { outcome: string }[];
    };
    expect(restarted.currentStep).toBe(0);
    expect(restarted.steps.every(({ outcome }) => outcome === 'NONE')).toBe(
      true,
    );
  });

  it('shows all eight stored outcome categories in the summary without mutating them', async () => {
    const outcomes = [
      'ACKNOWLEDGED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'ACKNOWLEDGED',
      'SELF_REPORTED',
    ];
    const bridge = installBridge({
      schemaVersion: 1,
      lessonId: 'foundations-first-sketch',
      lessonVersion: '2.0.0',
      currentStep: 7,
      steps: Array.from({ length: 8 }, (_, index) => ({
        status: 'COMPLETED',
        hintLevel: 0,
        verification: index === 1 ? 'UNKNOWN' : null,
        resumeState: null,
        outcome: outcomes[index],
      })),
    });
    await enterWrittenLessons();
    fireEvent.click(
      await screen.findByRole('button', { name: 'Resume lesson' }),
    );

    const summary = await screen.findByRole('region', {
      name: 'Eight-step completion summary',
    });
    await act(async () => {
      await new Promise<void>((resolve) =>
        requestAnimationFrame(() => resolve()),
      );
    });
    expect(document.activeElement).toBe(
      screen.getByRole('heading', { name: 'Lesson complete' }),
    );
    expect(summary.querySelectorAll('li')).toHaveLength(8);
    expect(
      screen.getByText(
        '8 steps marked complete. Leqad has not checked your drawing.',
      ),
    ).toBeTruthy();
    expect(screen.getAllByText('You clicked Got it')).toHaveLength(2);
    expect(screen.getAllByText('Marked done by you')).toHaveLength(6);

    const originalRows = Array.from(summary.querySelectorAll('li')).map(
      (item) => item.textContent,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Review steps' }));
    for (let index = 0; index < 7; index += 1) {
      fireEvent.click(await screen.findByRole('button', { name: 'Next step' }));
    }
    expect(screen.getByText('Your First Sketch · Step 8 of 8')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Back to summary' }));
    const reviewedSummary = await screen.findByRole('region', {
      name: 'Eight-step completion summary',
    });
    expect(
      Array.from(reviewedSummary.querySelectorAll('li')).map(
        (item) => item.textContent,
      ),
    ).toEqual(originalRows);
    await waitFor(() => expect(savedLessons.length).toBeGreaterThan(0));
    expect(
      (savedLessons.at(-1) as { steps: { outcome: string }[] }).steps.map(
        ({ outcome }) => outcome,
      ),
    ).toEqual(outcomes);
    expect(bridge.command).toHaveBeenCalledTimes(1);
    expect(bridge.command).toHaveBeenCalledWith({ type: 'use-written' });
  });
});

it('shows all eight desktop steps and five hints with optional Why and original stored outcomes', async () => {
  const original = JSON.stringify(FOUNDATIONS_FIRST_SKETCH);
  const bridge = installBridge();
  await enterWrittenLessons();
  await screen.findByRole('button', { name: 'Got it' });
  for (const [index, definition] of FOUNDATIONS_FIRST_SKETCH.steps.entries()) {
    const copy = DESKTOP_STEP_COPY[definition.id];
    expect(screen.getByRole('heading', { name: copy.heading })).toBeTruthy();
    expect(screen.getByText(copy.action)).toBeTruthy();
    expect(screen.queryByText(copy.explanation)).toBeNull();
    expect(screen.queryByRole('button', { name: 'Why it matters' })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Help +' }));
    const help = screen.getByRole('region', { name: 'Lesson help' });
    for (let hint = 0; hint < 5; hint++) {
      expect(within(help).getByText(copy.hints[hint]!)).toBeTruthy();
      if (hint < 4)
        fireEvent.click(
          within(help).getByRole('button', { name: 'Next hint' }),
        );
    }
    expect(
      within(help).queryByRole('button', { name: 'Next hint' }),
    ).toBeNull();
    fireEvent.click(
      within(help).getByRole('button', { name: 'Why it matters' }),
    );
    expect(within(help).getByText(copy.explanation)).toBeTruthy();
    fireEvent.click(within(help).getByRole('button', { name: 'Step details' }));
    for (const mistake of copy.commonErrors)
      expect(within(help).getByText(mistake)).toBeTruthy();
    for (const recovery of copy.recoveryActions)
      expect(within(help).getByText(recovery)).toBeTruthy();
    if (definition.requiredEvidence) {
      fireEvent.click(
        within(help).getByRole('button', { name: "Why can't Leqad check?" }),
      );
      expect(
        within(help).getByText("This app can't see Onshape."),
      ).toBeTruthy();
    }
    fireEvent.click(screen.getByRole('button', { name: 'Help −' }));
    fireEvent.click(
      screen.getByRole('button', {
        name: index === 0 || index === 6 ? 'Got it' : 'Mark done',
      }),
    );
    if (index < 7)
      fireEvent.click(screen.getByRole('button', { name: 'Next step' }));
  }
  expect(screen.getAllByText('You clicked Got it')).toHaveLength(2);
  expect(screen.getAllByText('Marked done by you')).toHaveLength(6);
  await waitFor(() =>
    expect(
      (savedLessons.at(-1) as { steps: { outcome: string }[] }).steps.map(
        (s) => s.outcome,
      ),
    ).toEqual([
      'ACKNOWLEDGED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'ACKNOWLEDGED',
      'SELF_REPORTED',
    ]),
  );
  expect(JSON.stringify(FOUNDATIONS_FIRST_SKETCH)).toBe(original);
  expect(bridge.command).toHaveBeenCalledTimes(1);
  expect(bridge.command).toHaveBeenCalledWith({ type: 'use-written' });
});

it('explains that a fresh lesson can replace prior progress when a read failure was temporary', async () => {
  const bridge = installBridge();
  bridge.loadLesson.mockRejectedValueOnce(new Error('temporary read failure'));
  await enterWrittenLessons();
  await screen.findByRole('button', { name: 'Start fresh for now' });
  fireEvent.click(screen.getByRole('button', { name: 'Start fresh for now' }));
  const dialog = screen.getByRole('dialog', { name: 'Start fresh for now?' });
  expect(
    within(dialog).getByText(
      /If saving works, it replaces your previous progress/,
    ),
  ).toBeTruthy();
  expect(dialog.textContent).not.toMatch(
    /won't fix or erase|will not fix or erase/,
  );
  fireEvent.click(within(dialog).getByRole('button', { name: 'Start fresh' }));
  await waitFor(() => expect(savedLessons).toHaveLength(1));
  expect(savedLessons[0]).toMatchObject({
    schemaVersion: 1,
    lessonId: 'foundations-first-sketch',
    lessonVersion: '2.0.0',
    currentStep: 0,
  });
  expect(
    (savedLessons[0] as { steps: { outcome: string }[] }).steps.every(
      (s) => s.outcome === 'NONE',
    ),
  ).toBe(true);
});

it('applies saved accessibility preferences while the lesson is still loading without enabling progress', async () => {
  const bridge = installBridge();
  bridge.loadPreferences.mockResolvedValue({
    ...DEFAULT_PREFERENCES,
    appearance: 'dark',
    textScale: 2,
  });
  let release: ((value: unknown) => void) | undefined;
  bridge.loadLesson.mockImplementation(
    () =>
      new Promise((resolve) => {
        release = resolve;
      }),
  );
  render(<App />);
  await waitFor(() =>
    expect(
      document.querySelector('.desktop-app')?.getAttribute('data-appearance'),
    ).toBe('dark'),
  );
  expect(
    document.querySelector('.desktop-app')?.getAttribute('data-text-scale'),
  ).toBe('2');
  expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
  expect(bridge.saveLesson).not.toHaveBeenCalled();
  await act(async () => release?.(null));
  fireEvent.click(
    await screen.findByRole('button', { name: 'Use written lessons' }),
  );
  expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
});

it('focuses the saved-lesson heading and resumes the same step without writing progress', async () => {
  const bridge = installBridge(savedSecondStep());
  await enterWrittenLessons();
  const heading = await screen.findByRole('heading', {
    name: 'Continue Your First Sketch?',
  });
  await waitFor(() => expect(document.activeElement).toBe(heading));
  fireEvent.click(screen.getByRole('button', { name: 'Resume lesson' }));
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByLabelText('Open lesson menu'),
    ),
  );
  expect(screen.getByText('Your First Sketch · Step 2 of 8')).toBeTruthy();
  expect(bridge.saveLesson).not.toHaveBeenCalled();
});
