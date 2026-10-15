import { afterEach, describe, expect, it, vi } from 'vitest';

const rectangle = { x: 0.089, y: 0.058, width: 0.065, height: 0.044 };
const viewport = { width: 1000, height: 1000, devicePixelRatio: 1, scale: 1 };

afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('calibrated Sketch highlight (user-supplied coordinates, not DOM evidence)', () => {
  it('keeps one outline when semantic and calibrated highlights replace one another', async () => {
    const {
      createGuidanceHighlighter,
      createSketchHighlightCalibration,
      readCalibrationViewport,
    } = await import('./calibratedHighlight');
    const highlighter = createGuidanceHighlighter(document);
    const target = document.createElement('button');
    target.setAttribute('aria-label', 'Sketch');
    target.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(target);
    const calibration = createSketchHighlightCalibration(
      rectangle,
      readCalibrationViewport(window),
    )!;
    highlighter.showCalibrated(calibration);
    expect(highlighter.show('sketch').status).toBe('FOUND');
    expect(document.querySelectorAll('[data-leqad-highlight]')).toHaveLength(1);
    expect(document.querySelector('[data-leqad-calibrated]')).toBeNull();
    highlighter.showCalibrated(calibration);
    expect(document.querySelectorAll('[data-leqad-highlight]')).toHaveLength(1);
    highlighter.clear();
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
  });

  it('converts normalized rectangles into CSS viewport pixels', async () => {
    const { toViewportRectangle } = await import('./calibratedHighlight');
    expect(toViewportRectangle(rectangle, viewport)).toEqual({
      left: 89,
      top: 58,
      width: 65,
      height: 44,
    });
  });

  it.each([
    { ...rectangle, x: -0.1 },
    { ...rectangle, y: NaN },
    { ...rectangle, width: 0 },
    { ...rectangle, height: Infinity },
    { ...rectangle, x: 0.99 },
    { ...rectangle, y: 0.99 },
  ])('rejects invalid and offscreen rectangles: %o', async (invalid) => {
    const { toViewportRectangle } = await import('./calibratedHighlight');
    expect(toViewportRectangle(invalid, viewport)).toBeNull();
  });

  it('rejects stale viewport, zoom, and display-scale calibration', async () => {
    const { createSketchHighlightCalibration, calibrationMatchesViewport } =
      await import('./calibratedHighlight');
    const calibration = createSketchHighlightCalibration(rectangle, viewport)!;
    expect(
      calibrationMatchesViewport(calibration, { ...viewport, width: 1030 }),
    ).toBe(true);
    for (const changed of [
      { ...viewport, width: 1200 },
      { ...viewport, height: 800 },
      { ...viewport, devicePixelRatio: 1.25 },
      { ...viewport, scale: 1.2 },
    ])
      expect(calibrationMatchesViewport(calibration, changed)).toBe(false);
  });

  it('draws the requested click-through rectangle and expires after five seconds', async () => {
    vi.useFakeTimers();
    const {
      createCalibratedHighlighter,
      createSketchHighlightCalibration,
      readCalibrationViewport,
    } = await import('./calibratedHighlight');
    const highlighter = createCalibratedHighlighter(document);
    const calibration = createSketchHighlightCalibration(
      rectangle,
      readCalibrationViewport(window),
    )!;
    expect(highlighter.show(calibration)).toBe(true);
    const overlay = document.querySelector<HTMLElement>(
      '[data-leqad-highlight]',
    )!;
    expect(overlay.style.position).toBe('fixed');
    expect(overlay.style.pointerEvents).toBe('none');
    expect(parseFloat(overlay.style.left)).toBeCloseTo(
      window.innerWidth * rectangle.x,
    );
    expect(parseFloat(overlay.style.height)).toBeCloseTo(
      window.innerHeight * rectangle.height,
    );
    vi.advanceTimersByTime(4999);
    expect(overlay.isConnected).toBe(true);
    vi.advanceTimersByTime(1);
    expect(overlay.isConnected).toBe(false);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('replaces its previous outline and releases listeners on navigation and explicit cleanup', async () => {
    const {
      createCalibratedHighlighter,
      createSketchHighlightCalibration,
      readCalibrationViewport,
    } = await import('./calibratedHighlight');
    const highlighter = createCalibratedHighlighter(document);
    const calibration = createSketchHighlightCalibration(
      rectangle,
      readCalibrationViewport(window),
    )!;
    const add = vi.spyOn(window, 'addEventListener');
    const remove = vi.spyOn(window, 'removeEventListener');
    highlighter.show(calibration);
    highlighter.show(calibration);
    expect(document.querySelectorAll('[data-leqad-highlight]')).toHaveLength(1);
    window.dispatchEvent(new Event('wxt:locationchange'));
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    highlighter.clear();
    expect(remove.mock.calls.length).toBe(add.mock.calls.length);
  });

  it('clears on resize and refuses a stale calibration on the next SHOW', async () => {
    const {
      createCalibratedHighlighter,
      createSketchHighlightCalibration,
      readCalibrationViewport,
    } = await import('./calibratedHighlight');
    const highlighter = createCalibratedHighlighter(document);
    const calibration = createSketchHighlightCalibration(
      rectangle,
      readCalibrationViewport(window),
    )!;
    highlighter.show(calibration);
    vi.stubGlobal('innerWidth', window.innerWidth * 1.4);
    window.dispatchEvent(new Event('resize'));
    expect(document.querySelector('[data-leqad-highlight]')).toBeNull();
    expect(highlighter.show(calibration)).toBe(false);
  });

  it('uses the existing calm outline styling with reduced motion', async () => {
    vi.stubGlobal(
      'matchMedia',
      vi.fn(() => ({ matches: true })),
    );
    const {
      createCalibratedHighlighter,
      createSketchHighlightCalibration,
      readCalibrationViewport,
    } = await import('./calibratedHighlight');
    const highlighter = createCalibratedHighlighter(document);
    highlighter.show(
      createSketchHighlightCalibration(
        rectangle,
        readCalibrationViewport(window),
      )!,
    );
    expect(
      document.querySelector<HTMLElement>('[data-leqad-highlight]')!.style
        .transition,
    ).toBe('none');
    highlighter.clear();
  });
});
