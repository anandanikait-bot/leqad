import type { PanelPlacement } from './preferences';

export interface WorkArea {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface PanelBounds {
  x: number;
  y: number;
  width: number;
  height: number;
  collapsed: boolean;
}

export interface NativePanelWindow {
  getBounds(): Omit<PanelBounds, 'collapsed'>;
  setBounds(bounds: Omit<PanelBounds, 'collapsed'>): void;
  on(event: 'move' | 'resize', listener: () => void): void;
  removeListener(event: 'move' | 'resize', listener: () => void): void;
}

export interface WindowPlacementDependencies {
  window: NativePanelWindow;
  getWorkAreas(): readonly WorkArea[];
  loadPlacement(): Promise<PanelPlacement | null>;
  savePlacement(value: PanelPlacement): Promise<void>;
  keepVisible(): boolean;
}

export interface WindowPlacementController {
  initialize(): Promise<void>;
  getBounds(): PanelBounds;
  applyBounds(
    bounds: Omit<PanelBounds, 'collapsed'> | PanelBounds,
  ): Promise<void>;
  resetPosition(): Promise<void>;
  dispose(): void;
}

export const DEFAULT_PANEL_BOUNDS: PanelBounds = Object.freeze({
  x: 8,
  y: 8,
  width: 365,
  height: 600,
  collapsed: false,
});

const COLLAPSED_WIDTH = 280;
const COLLAPSED_HEIGHT = 112;
const MARGIN = 8;

function normalizedSize(
  bounds: PanelBounds,
  area?: WorkArea,
): Pick<PanelBounds, 'width' | 'height' | 'collapsed'> {
  if (bounds.collapsed) {
    return {
      width: Math.min(
        COLLAPSED_WIDTH,
        Math.max(1, (area?.width ?? COLLAPSED_WIDTH) - MARGIN * 2),
      ),
      height: Math.min(
        COLLAPSED_HEIGHT,
        Math.max(1, (area?.height ?? COLLAPSED_HEIGHT) - MARGIN * 2),
      ),
      collapsed: true,
    };
  }
  const availableWidth = Math.max(1, (area?.width ?? 480) - MARGIN * 2);
  const availableHeight = Math.max(1, (area?.height ?? 760) - MARGIN * 2);
  return {
    width: Math.min(
      480,
      availableWidth,
      Math.max(Math.min(320, availableWidth), Math.round(bounds.width)),
    ),
    height: Math.min(
      760,
      availableHeight,
      Math.max(Math.min(400, availableHeight), Math.round(bounds.height)),
    ),
    collapsed: false,
  };
}

function intersectionArea(bounds: PanelBounds, area: WorkArea): number {
  const left = Math.max(bounds.x, area.x);
  const top = Math.max(bounds.y, area.y);
  const right = Math.min(bounds.x + bounds.width, area.x + area.width);
  const bottom = Math.min(bounds.y + bounds.height, area.y + area.height);
  return Math.max(0, right - left) * Math.max(0, bottom - top);
}

function distanceFromCenter(bounds: PanelBounds, area: WorkArea): number {
  const bx = bounds.x + bounds.width / 2;
  const by = bounds.y + bounds.height / 2;
  const ax = area.x + area.width / 2;
  const ay = area.y + area.height / 2;
  return (bx - ax) ** 2 + (by - ay) ** 2;
}

function chooseArea(
  bounds: PanelBounds,
  areas: readonly WorkArea[],
): WorkArea | undefined {
  if (areas.length === 0) return undefined;
  let selected = areas[0]!;
  let bestIntersection = intersectionArea(bounds, selected);
  let bestDistance = distanceFromCenter(bounds, selected);
  for (const area of areas.slice(1)) {
    const overlap = intersectionArea(bounds, area);
    const distance = distanceFromCenter(bounds, area);
    if (
      overlap > bestIntersection ||
      (overlap === bestIntersection && distance < bestDistance)
    ) {
      selected = area;
      bestIntersection = overlap;
      bestDistance = distance;
    }
  }
  return selected;
}

export function clampPanelBounds(
  requested: PanelBounds,
  workAreas: readonly WorkArea[],
  keepVisible: boolean,
): PanelBounds {
  const area = chooseArea(requested, workAreas);
  const size = normalizedSize(requested, area);
  if (!area) {
    return {
      x: Math.round(requested.x),
      y: Math.round(requested.y),
      ...size,
    };
  }
  const minX = keepVisible ? area.x + MARGIN : area.x - size.width + 64;
  const maxX = keepVisible
    ? area.x + area.width - size.width - MARGIN
    : area.x + area.width - 64;
  const minY = keepVisible ? area.y + MARGIN : area.y - size.height + 32;
  const maxY = keepVisible
    ? area.y + area.height - size.height - MARGIN
    : area.y + area.height - 32;
  return {
    x: Math.round(Math.min(Math.max(requested.x, minX), Math.max(minX, maxX))),
    y: Math.round(Math.min(Math.max(requested.y, minY), Math.max(minY, maxY))),
    ...size,
  };
}

function sameBounds(a: PanelBounds, b: PanelBounds): boolean {
  return (
    a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height
  );
}

export function createWindowPlacementController(
  dependencies: WindowPlacementDependencies,
): WindowPlacementController {
  let collapsed = false;
  let disposed = false;
  let initialized = false;

  const getBounds = (): PanelBounds => ({
    ...dependencies.window.getBounds(),
    collapsed,
  });

  const applySafeBounds = async (requested: PanelBounds, persist: boolean) => {
    const next = clampPanelBounds(
      requested,
      dependencies.getWorkAreas(),
      dependencies.keepVisible(),
    );
    collapsed = next.collapsed;
    const current = dependencies.window.getBounds();
    if (!sameBounds(current as PanelBounds, next)) {
      dependencies.window.setBounds({
        x: next.x,
        y: next.y,
        width: next.width,
        height: next.height,
      });
    }
    if (persist) {
      await dependencies.savePlacement(next);
    }
  };

  const syncFromNative = () => {
    if (disposed) return;
    const bounds = dependencies.window.getBounds();
    const isCollapsed =
      bounds.width <= COLLAPSED_WIDTH && bounds.height <= COLLAPSED_HEIGHT;
    const requested: PanelBounds = { ...bounds, collapsed: isCollapsed };
    const safe = clampPanelBounds(
      requested,
      dependencies.getWorkAreas(),
      dependencies.keepVisible(),
    );
    collapsed = safe.collapsed;
    if (!sameBounds(bounds as PanelBounds, safe)) {
      dependencies.window.setBounds({
        x: safe.x,
        y: safe.y,
        width: safe.width,
        height: safe.height,
      });
    }
    void dependencies.savePlacement(safe).catch(() => undefined);
  };

  dependencies.window.on('move', syncFromNative);
  dependencies.window.on('resize', syncFromNative);

  return {
    async initialize() {
      if (initialized || disposed) return;
      initialized = true;
      const saved = await dependencies.loadPlacement();
      // BrowserWindow is created with useContentSize, so its configured 365x600
      // is content geometry while getBounds() reports the larger native frame.
      // Preserve that measured first-run outer size; treating the content
      // height as an outer height would shrink the renderer by the title bar.
      const initialBounds = saved ?? {
        ...dependencies.window.getBounds(),
        collapsed: false,
      };
      await applySafeBounds(initialBounds, saved !== null);
    },
    getBounds,
    async applyBounds(bounds) {
      if (disposed) throw new Error('Window placement controller is disposed');
      const isCollapsed =
        'collapsed' in bounds
          ? bounds.collapsed
          : bounds.width <= COLLAPSED_WIDTH &&
            bounds.height <= COLLAPSED_HEIGHT;
      await applySafeBounds({ ...bounds, collapsed: isCollapsed }, true);
    },
    async resetPosition() {
      if (disposed) throw new Error('Window placement controller is disposed');
      const current = getBounds();
      const targetArea = dependencies.getWorkAreas()[0];
      const requested = targetArea
        ? {
            ...current,
            x: targetArea.x + MARGIN,
            y: targetArea.y + MARGIN,
            collapsed: current.collapsed,
          }
        : {
            ...current,
            x: DEFAULT_PANEL_BOUNDS.x,
            y: DEFAULT_PANEL_BOUNDS.y,
          };
      await applySafeBounds(requested, true);
    },
    dispose() {
      if (disposed) return;
      disposed = true;
      dependencies.window.removeListener('move', syncFromNative);
      dependencies.window.removeListener('resize', syncFromNative);
    },
  };
}
