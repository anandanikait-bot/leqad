import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RectangleCommandMetadataDiagnostic } from './RectangleCommandMetadataDiagnostic';
import { captureRectangleCommandMetadata } from '../../services/rectangleCommandMetadataCapture';
import type { RectangleMenuMetadataCaptureTask } from '../../services/rectangleCommandMetadataCapture';

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
    const captureMenuOpen = vi.fn(
      (generation: number): RectangleMenuMetadataCaptureTask => ({
        promise: Promise.resolve({
          status: 'CAPTURED',
          snapshot: captureRectangleCommandMetadata(
            document,
            'RECTANGLE_MENU_OPEN',
            generation,
          ),
        }),
        cancel: vi.fn(),
        isActive: () => true,
      }),
    );
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: { writeText: () => Promise.reject(new Error('blocked')) },
    });

    render(
      <RectangleCommandMetadataDiagnostic
        onCapture={capture}
        onCaptureMenuOpen={captureMenuOpen}
      />,
    );

    const stateA = screen.getByRole('button', {
      name: 'Record metadata State A — Sketch editing',
    });
    const stateB = screen.getByRole('button', {
      name: 'Arm metadata State B — then open Rectangle dropdown',
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
    expect(captureMenuOpen).toHaveBeenCalledWith(2);
    await waitFor(() =>
      expect((stateC as HTMLButtonElement).disabled).toBe(false),
    );
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
    expect(capture.mock.calls.map((call) => call[1])).toEqual([1, 3, 4]);
    expect(cadClicks).not.toHaveBeenCalled();
  });

  it('labels state claims as owner-reported and offers restart without retaining prior evidence', () => {
    const capture = vi.fn((state, generation) =>
      captureRectangleCommandMetadata(document, state, generation),
    );
    const captureMenuOpen = vi.fn((): RectangleMenuMetadataCaptureTask => ({
      promise: new Promise(() => undefined),
      cancel: vi.fn(),
      isActive: () => true,
    }));
    render(
      <RectangleCommandMetadataDiagnostic
        onCapture={capture}
        onCaptureMenuOpen={captureMenuOpen}
      />,
    );

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

  it('cancels an armed menu observation when the diagnostic unmounts', async () => {
    const cancel = vi.fn();
    const task: RectangleMenuMetadataCaptureTask = {
      promise: new Promise(() => undefined),
      cancel,
      isActive: () => true,
    };
    const capture = vi.fn((state, generation) =>
      captureRectangleCommandMetadata(document, state, generation),
    );
    const view = render(
      <RectangleCommandMetadataDiagnostic
        onCapture={capture}
        onCaptureMenuOpen={() => task}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Record metadata State A — Sketch editing',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Arm metadata State B — then open Rectangle dropdown',
      }),
    );

    await act(async () => view.unmount());
    expect(cancel).toHaveBeenCalledTimes(1);
  });
  it('retains timed-out State B evidence for local review and allows a retry', async () => {
    const capture = (
      state: Parameters<typeof captureRectangleCommandMetadata>[1],
      generation: number,
    ) => captureRectangleCommandMetadata(document, state, generation);
    const timedOut = capture('RECTANGLE_MENU_OPEN', 2);
    timedOut.interaction = {
      origin: 'OTHER',
      menuAssociation: 'UNOWNED',
      outcome: 'TIMED_OUT',
      observationLimitReached: false,
    };
    render(
      <RectangleCommandMetadataDiagnostic
        onCapture={capture}
        onCaptureMenuOpen={() => ({
          promise: Promise.resolve({ status: 'TIMED_OUT', snapshot: timedOut }),
          cancel: vi.fn(),
          isActive: () => false,
        })}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Record metadata State A — Sketch editing',
      }),
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Arm metadata State B — then open Rectangle dropdown',
      }),
    );
    await waitFor(() =>
      expect(screen.getByText(/State B timed out/)).toBeTruthy(),
    );
    expect(
      (
        screen.getByRole('button', {
          name: 'Arm metadata State B — then open Rectangle dropdown',
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(false);
    fireEvent.click(
      screen.getByRole('button', { name: 'Copy command metadata report' }),
    );
    const report = JSON.parse(
      screen.getByLabelText<HTMLTextAreaElement>(
        'Rectangle command metadata diagnostic output',
      ).value,
    );
    expect(report.snapshots[1].interaction).toMatchObject({
      outcome: 'TIMED_OUT',
      origin: 'OTHER',
      menuAssociation: 'UNOWNED',
    });
  });
});
