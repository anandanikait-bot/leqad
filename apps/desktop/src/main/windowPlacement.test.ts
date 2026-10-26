import { describe, expect, it, vi } from 'vitest';
import {
  clampPanelBounds,
  createWindowPlacementController,
} from './windowPlacement';

const displays = [
  { x: -1920, y: 0, width: 1920, height: 1080 },
  { x: 0, y: 0, width: 1280, height: 720 },
];

describe('native companion placement', () => {
  it('clamps offscreen bounds inside the nearest work area, including negative coordinates', () => {
    const bounds = clampPanelBounds(
      { x: -3000, y: 900, width: 900, height: 900, collapsed: false },
      displays,
      true,
    );

    expect(bounds).toEqual({
      x: -1912,
      y: 312,
      width: 480,
      height: 760,
      collapsed: false,
    });
  });

  it('restores on an available display when the saved display is removed', () => {
    const bounds = clampPanelBounds(
      { x: 4000, y: 3000, width: 365, height: 600, collapsed: false },
      [displays[1]!],
      true,
    );

    expect(bounds.x).toBeGreaterThanOrEqual(8);
    expect(bounds.y).toBeGreaterThanOrEqual(8);
    expect(bounds.x + bounds.width).toBeLessThanOrEqual(1272);
    expect(bounds.y + bounds.height).toBeLessThanOrEqual(712);
  });

  it('preserves the measured first-run outer bounds around the 365x600 content area', async () => {
    const nativeBounds = { x: 8, y: 8, width: 365, height: 628 };
    const setBounds = vi.fn((next: typeof nativeBounds) => {
      Object.assign(nativeBounds, next);
    });
    const savePlacement = vi.fn(async () => undefined);
    const controller = createWindowPlacementController({
      window: {
        getBounds: () => nativeBounds,
        setBounds,
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      getWorkAreas: () => [{ x: 0, y: 0, width: 1440, height: 1000 }],
      loadPlacement: async () => null,
      savePlacement,
      keepVisible: () => true,
    });

    await controller.initialize();

    expect(setBounds).not.toHaveBeenCalled();
    expect(controller.getBounds()).toEqual({
      ...nativeBounds,
      collapsed: false,
    });
    expect(savePlacement).not.toHaveBeenCalled();
    controller.dispose();
  });

  it('resets only the companion bounds and persists safe bounds after native move/resize', async () => {
    let bounds = { x: 4000, y: 3000, width: 365, height: 600 };
    const setBounds = vi.fn((next: typeof bounds) => {
      bounds = next;
    });
    const savePlacement = vi.fn(async () => undefined);
    const controller = createWindowPlacementController({
      window: {
        getBounds: () => bounds,
        setBounds,
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      getWorkAreas: () => [displays[1]!],
      loadPlacement: async () => null,
      savePlacement,
      keepVisible: () => true,
    });

    await controller.resetPosition();
    await controller.applyBounds({ x: 4000, y: 3000, width: 365, height: 600 });

    expect(setBounds).toHaveBeenNthCalledWith(1, {
      x: 8,
      y: 8,
      width: 365,
      height: 600,
    });
    expect(setBounds).toHaveBeenNthCalledWith(2, {
      x: 907,
      y: 112,
      width: 365,
      height: 600,
    });
    expect(savePlacement).toHaveBeenCalledWith(
      expect.objectContaining({ x: 907, y: 112 }),
    );
    expect(controller.getBounds().x).toBe(907);
    controller.dispose();
  });

  it('preserves native size when resetting position without a reported display', async () => {
    let bounds = { x: 500, y: 400, width: 365, height: 628 };
    const setBounds = vi.fn((next: typeof bounds) => {
      bounds = next;
    });
    const controller = createWindowPlacementController({
      window: {
        getBounds: () => bounds,
        setBounds,
        on: vi.fn(),
        removeListener: vi.fn(),
      },
      getWorkAreas: () => [],
      loadPlacement: async () => null,
      savePlacement: async () => undefined,
      keepVisible: () => true,
    });

    await controller.resetPosition();

    expect(setBounds).toHaveBeenCalledWith({
      x: 8,
      y: 8,
      width: 365,
      height: 628,
    });
    expect(controller.getBounds()).toEqual({ ...bounds, collapsed: false });
    controller.dispose();
  });
});
