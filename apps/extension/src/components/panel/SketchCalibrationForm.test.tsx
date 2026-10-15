import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('Sketch calibration percentage editor', () => {
  it('rechecks zoom at Save even if a browser resize event has not arrived', async () => {
    const { SketchCalibrationForm } = await import('./SketchCalibrationForm');
    const onSave = vi.fn();
    render(
      <SketchCalibrationForm
        calibration={null}
        onSave={onSave}
        onPreview={() => true}
        onClear={() => undefined}
        onCancel={() => undefined}
      />,
    );
    vi.stubGlobal('devicePixelRatio', window.devicePixelRatio * 1.5);
    fireEvent.click(screen.getByRole('button', { name: 'Save calibration' }));
    await act(async () => undefined);
    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toContain('Viewport changed');
  });

  it('previews tentative coordinates but prevents saving invalid rectangles and cancels without saving', async () => {
    const { SketchCalibrationForm } = await import('./SketchCalibrationForm');
    const onSave = vi.fn();
    const onPreview = vi.fn(() => true);
    const onClear = vi.fn();
    const onCancel = vi.fn();
    render(
      <SketchCalibrationForm
        calibration={null}
        onSave={onSave}
        onPreview={onPreview}
        onClear={onClear}
        onCancel={onCancel}
      />,
    );
    expect(onPreview).toHaveBeenCalledTimes(1);
    expect(onSave).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Left (%)'), {
      target: { value: '99' },
    });
    expect(
      screen
        .getByRole('button', { name: 'Save calibration' })
        .hasAttribute('disabled'),
    ).toBe(true);
    expect(onClear).toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(onSave).not.toHaveBeenCalled();
    expect(onCancel).toHaveBeenCalledOnce();
  });

  it('requires a fresh preview after a viewport change and saves only the current viewport metadata', async () => {
    const { SketchCalibrationForm } = await import('./SketchCalibrationForm');
    const onSave = vi.fn();
    render(
      <SketchCalibrationForm
        calibration={null}
        onSave={onSave}
        onPreview={() => true}
        onClear={() => undefined}
        onCancel={() => undefined}
      />,
    );
    const resizedWidth = window.innerWidth + 300;
    vi.stubGlobal('innerWidth', resizedWidth);
    fireEvent(window, new Event('resize'));
    expect(
      screen
        .getByRole('button', { name: 'Save calibration' })
        .hasAttribute('disabled'),
    ).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: 'Preview outline' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save calibration' }));
    await act(async () => undefined);
    expect(onSave.mock.lastCall?.[0]).toMatchObject({
      targetId: 'sketch-toolbar-control',
      viewport: { width: resizedWidth },
    });
  });

  it('shows storage failures without claiming that calibration was saved', async () => {
    const { SketchCalibrationForm } = await import('./SketchCalibrationForm');
    render(
      <SketchCalibrationForm
        calibration={null}
        onSave={() => Promise.reject(new Error('unavailable'))}
        onPreview={() => true}
        onClear={() => undefined}
        onCancel={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save calibration' }));
    await act(async () => undefined);
    expect(screen.getByRole('alert').textContent).toContain('could not save');
  });
});
