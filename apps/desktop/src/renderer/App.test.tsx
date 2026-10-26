import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_PREFERENCES, EMPTY_SESSION } from '@leqad/desktop-contracts';
import { App } from './App';

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
      await screen.findByText('Written lessons · Capture off'),
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
      await screen.findByText('Progress couldn’t be saved on this device.'),
    ).toBeTruthy();
    expect(screen.getByText('Your First Sketch · Step 1 of 8')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(bridge.saveLesson).toHaveBeenCalledTimes(2));
    await waitFor(() =>
      expect(
        screen.queryByText('Progress couldn’t be saved on this device.'),
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
      'Loading saved lesson and settings',
    );
    expect(screen.queryByRole('button', { name: 'Got it' })).toBeNull();
    await act(async () => resolveLesson?.(null));
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
  });

  it('shows an authored local answer without changing lesson progress', async () => {
    render(<App />);
    fireEvent.click(await screen.findByRole('button', { name: 'Ask' }));
    expect(screen.getByText('Your First Sketch · Step 1 of 8')).toBeTruthy();
    expect(screen.getByText('Local prototype · no AI connected')).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Why use Corner Rectangle?' }),
    );

    expect(
      screen.getByText(/Corner Rectangle uses two opposite corners\./),
    ).toBeTruthy();
    expect(
      screen.getByText('Local examples do not change progress.'),
    ).toBeTruthy();
    expect(savedLessons).toHaveLength(0);
  });

  it('reveals ordered Help and Escape restores focus to its disclosure', async () => {
    render(<App />);
    const disclosure = await screen.findByRole('button', { name: 'Help +' });
    fireEvent.click(disclosure);

    const help = screen.getByRole('region', { name: 'Lesson help' });
    expect(
      screen.getByText('A sketch starts as geometry on one flat reference.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'More help' }));
    expect(
      screen.getByText(
        'Reference planes provide stable places to begin a sketch.',
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
    expect(
      screen.getByText(/Visual help isn’t available in this build/),
    ).toBeTruthy();
    expect(
      screen.getByRole('button', { name: 'Change window' }),
    ).toHaveProperty('disabled', true);
    expect(
      screen.getByRole('button', { name: 'Report misaligned highlight' }),
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
    expect(screen.getByText('Step 2 of 8 · 1 step completed')).toBeTruthy();
    expect(
      screen.getByText(
        'Saved lesson progress does not describe your current CAD model.',
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

    expect(
      await screen.findByText(/fresh lesson in this session/),
    ).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Got it' })).toHaveProperty(
      'disabled',
      true,
    );
    expect(bridge.saveLesson).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByRole('button', { name: 'Start fresh in this session' }),
    );
    expect(
      screen.getByRole('dialog', {
        name: 'Start a fresh lesson in this session?',
      }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Start fresh' }));
    expect(await screen.findByRole('button', { name: 'Got it' })).toBeTruthy();
    expect(
      await screen.findByText('Progress couldn’t be saved on this device.'),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Retry save' }));
    await waitFor(() => expect(bridge.saveLesson).toHaveBeenCalledTimes(2));
    expect(
      screen.getByText('Progress couldn’t be saved on this device.'),
    ).toBeTruthy();
    expect(savedLessons).toHaveLength(0);
  });

  it('does not enable progress writes when loading the saved lesson fails', async () => {
    const bridge = installBridge();
    bridge.loadLesson.mockRejectedValueOnce(new Error('disk read failed'));
    render(<App />);

    expect(
      await screen.findByText(/fresh lesson in this session/),
    ).toBeTruthy();
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
      'Settings could not be loaded',
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
    fireEvent.click(screen.getByRole('button', { name: 'Reset lesson' }));
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
        '8 steps completed. CAD work is not independently verified.',
      ),
    ).toBeTruthy();
    expect(screen.getAllByText('Instruction acknowledged')).toHaveLength(2);
    expect(
      screen.getAllByText('Marked done by you · CAD work unverified'),
    ).toHaveLength(6);

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
