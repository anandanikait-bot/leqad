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
import { DEFAULT_PREFERENCES, EMPTY_SESSION } from '@leqad/desktop-contracts';
import { App } from './App';
import { DESKTOP_STEP_COPY } from './desktopCopy';
import { FOUNDATIONS_FIRST_SKETCH } from '@leqad/lesson-engine';

const savedLessons: unknown[] = [];

function installBridge(savedLesson: unknown = null) {
  savedLessons.length = 0;
  const bridge = {
    listWindows: vi.fn(async () => ({ windows: [], incomplete: false })),
    command: vi.fn(async () => EMPTY_SESSION),
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
  it('opens directly into the first authored step with capture off', async () => {
    render(<App />);

    expect(
      await screen.findByText('Written lesson · No screen capture'),
    ).toBeTruthy();
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
    expect(screen.getByText('Your First Sketch · Step 1 of 8')).toBeTruthy();
    expect(
      screen.getByRole('heading', { name: 'Before you begin' }),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Got it' })).toBeTruthy();
  });

  it('persists an acknowledgement and only advances through the lesson engine', async () => {
    render(<App />);
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
    render(<App />);

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
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
  });

  it('shows an authored local answer without changing lesson progress', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ask' }));
    expect(screen.getByText('Your First Sketch · Step 1 of 8')).toBeTruthy();
    expect(screen.getByText('Local prototype · no AI')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Why use Corner Rectangle?' }),
    );

    expect(
      screen.getByText(
        /Corner Rectangle lets you draw by clicking two opposite corners\./,
      ),
    ).toBeTruthy();
    expect(
      screen.getByText('Reading answers does not change your progress.'),
    ).toBeTruthy();
    expect(savedLessons).toHaveLength(0);
  });

  it('reveals ordered Help and Escape restores focus to its disclosure', async () => {
    render(<App />);
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
    render(<App />);
    const menuTrigger = await screen.findByLabelText('Open lesson menu');
    fireEvent.click(menuTrigger);
    const settingsInvoker = screen.getByRole('button', { name: 'Settings' });
    fireEvent.click(settingsInvoker);

    const heading = await screen.findByRole('heading', { name: 'Settings' });
    expect(document.activeElement).toBe(heading);
    expect(screen.getByText(/This app can't capture the screen/)).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Choose a CAD window' }),
    ).toHaveProperty('disabled', true);
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
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
    render(<App />);

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
    render(<App />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Resume lesson' }),
    );

    const summary = await screen.findByRole('region', {
      name: 'Eight-step completion summary',
    });
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
    expect(bridge.command).not.toHaveBeenCalled();
  });
});

it('shows all eight desktop steps and five hints with optional Why and original stored outcomes', async () => {
  const original = JSON.stringify(FOUNDATIONS_FIRST_SKETCH);
  const bridge = installBridge();
  render(<App />);
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
  expect(bridge.command).not.toHaveBeenCalled();
});

it('explains that a fresh lesson can replace prior progress when a read failure was temporary', async () => {
  const bridge = installBridge();
  bridge.loadLesson.mockRejectedValueOnce(new Error('temporary read failure'));
  render(<App />);
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
  expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
});

it('focuses the saved-lesson heading and resumes the same step without writing progress', async () => {
  const bridge = installBridge(savedSecondStep());
  render(<App />);
  const heading = await screen.findByRole('heading', {
    name: 'Continue Your First Sketch?',
  });
  expect(document.activeElement).toBe(heading);
  fireEvent.click(screen.getByRole('button', { name: 'Resume lesson' }));
  await waitFor(() =>
    expect(document.activeElement).toBe(
      screen.getByLabelText('Open lesson menu'),
    ),
  );
  expect(screen.getByText('Your First Sketch · Step 2 of 8')).toBeTruthy();
  expect(bridge.saveLesson).not.toHaveBeenCalled();
});
