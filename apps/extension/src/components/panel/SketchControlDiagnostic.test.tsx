import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { SketchControlDiagnostic } from './SketchControlDiagnostic';
import { createSketchControlCapture } from '../../services/sketchControlCapture';

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.useRealTimers();
});

// Simulated controls: these tests do not establish live Onshape compatibility.
describe('Sketch control diagnostic panel', () => {
  it('requires an explicit capture and exposes only the sanitized result', async () => {
    const start = vi.fn(() => createSketchControlCapture(document));
    const button = document.createElement('button');
    button.setAttribute('aria-label', 'private project');
    document.body.append(button);
    render(<SketchControlDiagnostic onCapture={start} />);
    expect(start).not.toHaveBeenCalled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Capture Sketch control' }),
    );
    fireEvent.click(button);
    await waitFor(() =>
      expect(screen.getByLabelText('Sketch diagnostic report')).toBeTruthy(),
    );
    const report = (
      screen.getByLabelText('Sketch diagnostic report') as HTMLTextAreaElement
    ).value;
    expect(report).toContain('NOT_RUN');
    expect(report).not.toContain('private project');
  });
  it('cancels on unmount and ignores late results', () => {
    vi.useFakeTimers();
    const task = createSketchControlCapture(document);
    const { unmount } = render(
      <SketchControlDiagnostic onCapture={() => task} />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Capture Sketch control' }),
    );
    unmount();
    expect(task.isActive()).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });
  it('lets the owner cancel and retry', async () => {
    const start = vi.fn(() => createSketchControlCapture(document));
    render(<SketchControlDiagnostic onCapture={start} />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Capture Sketch control' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel Sketch capture' }),
    );
    await waitFor(() =>
      expect(
        screen.getByText('Capture cancelled. You can retry.'),
      ).toBeTruthy(),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Capture Sketch control' }),
    );
    expect(start).toHaveBeenCalledTimes(2);
  });
});
