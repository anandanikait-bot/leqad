import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RectangleCommandMetadataDiagnostic } from './RectangleCommandMetadataDiagnostic';
import { captureRectangleCommandMetadata } from '../../services/rectangleCommandMetadataCapture';

afterEach(() => {
  cleanup();
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

describe('Rectangle command metadata diagnostic', () => {
  it('captures the four owner-reported states in order and copies one sanitized report', async () => {
    const cad = document.createElement('div');
    const cadClicks = vi.fn();
    cad.addEventListener('click', cadClicks);
    document.body.append(cad);
    const capture = vi.fn((state, generation) =>
      captureRectangleCommandMetadata(document, state, generation),
    );
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('blocked')) },
    });

    render(<RectangleCommandMetadataDiagnostic onCapture={capture} />);

    const stateA = screen.getByRole('button', {
      name: 'Record metadata State A — Sketch editing',
    });
    const stateB = screen.getByRole('button', {
      name: 'Record metadata State B — Rectangle dropdown open',
    });
    const stateC = screen.getByRole('button', {
      name: 'Record metadata State C — Another Rectangle variant',
    });
    const stateD = screen.getByRole('button', {
      name: 'Record metadata State D — Extrude editing',
    });
    expect((stateB as HTMLButtonElement).disabled).toBe(true);
    expect((stateC as HTMLButtonElement).disabled).toBe(true);
    expect((stateD as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(stateA);
    expect((stateB as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(stateB);
    expect((stateC as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(stateC);
    expect((stateD as HTMLButtonElement).disabled).toBe(false);
    fireEvent.click(stateD);
    fireEvent.click(
      screen.getByRole('button', { name: 'Copy command metadata report' }),
    );

    await waitFor(() =>
      expect(screen.getByText(/Clipboard unavailable/)).toBeTruthy(),
    );
    const output = screen.getByLabelText<HTMLTextAreaElement>(
      'Rectangle command metadata diagnostic output',
    );
    const report = JSON.parse(output.value);
    expect(
      report.snapshots.map(
        (item: { ownerReportedState: string }) => item.ownerReportedState,
      ),
    ).toEqual([
      'SKETCH_EDITING',
      'RECTANGLE_MENU_OPEN',
      'OTHER_RECTANGLE_VARIANT',
      'EXTRUDE_EDITING',
    ]);
    expect(capture.mock.calls.map((call) => call[1])).toEqual([1, 2, 3, 4]);
    expect(cadClicks).not.toHaveBeenCalled();
  });

  it('labels state claims as owner-reported and offers restart without retaining prior evidence', () => {
    const capture = vi.fn((state, generation) =>
      captureRectangleCommandMetadata(document, state, generation),
    );
    render(<RectangleCommandMetadataDiagnostic onCapture={capture} />);

    fireEvent.click(
      screen.getByRole('button', {
        name: 'Record metadata State A — Sketch editing',
      }),
    );
    expect(screen.getByText(/State A saved as owner-reported/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Restart experiment' }));

    expect(
      screen.queryByRole('button', { name: 'Copy command metadata report' }),
    ).toBeNull();
    expect(
      screen.queryByLabelText('Rectangle command metadata diagnostic output'),
    ).toBeNull();
    expect(capture).toHaveBeenCalledTimes(1);
  });
});
