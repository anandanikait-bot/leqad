import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AssistantPanel } from './AssistantPanel';
import primary from '../../assets/brand/leqad-primary.svg?inline';
import black from '../../assets/brand/leqad-black.svg?inline';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

it('opens settings, switches logos and returns to the previous mode without changing progress', () => {
  const { container } = render(<AssistantPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Projects' }));
  fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
  expect(screen.getByRole('heading', { name: 'Settings' })).toBeTruthy();
  expect(container.querySelector('img')?.getAttribute('src')).toBe(primary);
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  expect(
    container.querySelector('[data-leqad-panel]')?.getAttribute('data-theme'),
  ).toBe('dark');
  expect(container.querySelector('img')?.getAttribute('src')).toBe(black);
  fireEvent.click(screen.getByRole('button', { name: 'Back to Projects' }));
  expect(
    screen
      .getByRole('button', { name: 'Projects' })
      .getAttribute('aria-current'),
  ).toBe('page');
});

it('follows System changes and unsubscribes on unmount', () => {
  let listener: (() => void) | undefined;
  const media = {
    matches: false,
    addEventListener: vi.fn((_event, callback) => {
      listener = callback;
    }),
    removeEventListener: vi.fn(),
  };
  vi.stubGlobal('matchMedia', () => media);
  const view = render(
    <AssistantPanel
      initialPanelPreferences={{
        collapsed: false,
        position: null,
        appearance: 'system',
      }}
    />,
  );
  expect(
    view.container.querySelector('[data-theme]')?.getAttribute('data-theme'),
  ).toBe('light');
  act(() => {
    media.matches = true;
    listener?.();
  });
  expect(view.container.querySelector('img')?.getAttribute('src')).toBe(black);
  view.unmount();
  expect(media.removeEventListener).toHaveBeenCalledWith('change', listener);
});

it('saves the latest full snapshot after rapid changes and flushes before unmount', async () => {
  vi.useFakeTimers();
  const save = vi.fn();
  const view = render(<AssistantPanel onPanelPreferencesChange={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Proactive assistance' }));
  fireEvent.click(screen.getByRole('button', { name: 'Collapse Leqad panel' }));
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  expect(save.mock.lastCall?.[0]).toMatchObject({
    appearance: 'dark',
    assistanceMode: 'proactive',
    collapsed: true,
  });
  fireEvent.click(screen.getByRole('button', { name: 'Expand Leqad panel' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Light' }));
  view.unmount();
  expect(save.mock.lastCall?.[0]).toMatchObject({
    appearance: 'light',
    assistanceMode: 'proactive',
    collapsed: false,
  });
});

it('reports settings save failures and retries the latest preference without changing lesson state', async () => {
  vi.useFakeTimers();
  const save = vi
    .fn()
    .mockRejectedValueOnce(new Error('storage unavailable'))
    .mockResolvedValue(undefined);
  render(<AssistantPanel onPanelPreferencesChange={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  await act(async () => {
    vi.advanceTimersByTime(250);
  });
  expect(
    screen.getByRole('status', { name: 'Settings saving' }).textContent,
  ).toContain('could not be saved');
  fireEvent.click(
    screen.getByRole('button', { name: 'Retry saving settings' }),
  );
  await act(async () => {});
  expect(screen.queryByRole('status', { name: 'Settings saving' })).toBeNull();
  expect(save.mock.lastCall?.[0].appearance).toBe('dark');
  fireEvent.click(screen.getByRole('button', { name: 'Back to Learn' }));
  expect(screen.getByRole('progressbar').getAttribute('aria-valuenow')).toBe(
    '0',
  );
});

it('settings button keyboard events never move the drag handle', () => {
  const view = render(<AssistantPanel />);
  const panel = view.container.querySelector(
    '[data-leqad-panel]',
  ) as HTMLElement;
  const before = panel.style.cssText;
  fireEvent.keyDown(screen.getByRole('button', { name: 'Open Settings' }), {
    key: 'ArrowLeft',
  });
  expect(panel.style.cssText).toBe(before);
  fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
  fireEvent.keyDown(screen.getByRole('radio', { name: 'Dark' }), {
    key: 'Escape',
  });
  expect(screen.queryByRole('heading', { name: 'Settings' })).toBeNull();
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Open Settings' }),
  );
});

it('flushes current preferences on pagehide and does not reset the save deadline on unrelated renders', async () => {
  vi.useFakeTimers();
  const save = vi.fn();
  const view = render(<AssistantPanel onPanelPreferencesChange={save} />);
  fireEvent.click(screen.getByRole('button', { name: 'Open Settings' }));
  fireEvent.click(screen.getByRole('radio', { name: 'Dark' }));
  act(() => {
    vi.advanceTimersByTime(200);
  });
  view.rerender(
    <AssistantPanel onPanelPreferencesChange={(value) => save(value)} />,
  );
  await act(async () => {
    vi.advanceTimersByTime(50);
  });
  expect(save.mock.lastCall?.[0].appearance).toBe('dark');
  fireEvent.click(screen.getByRole('radio', { name: 'System' }));
  fireEvent(window, new Event('pagehide'));
  expect(save.mock.lastCall?.[0].appearance).toBe('system');
});
