import {
  createHighlightOutline,
  createSemanticHighlighter,
  SEMANTIC_HIGHLIGHT_DURATION_MS,
} from './semanticTargets';
import type { SemanticTargetId } from './semanticTargets';

export interface NormalizedHighlightRectangle {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CalibrationViewport {
  width: number;
  height: number;
  devicePixelRatio: number;
  scale: number;
}

export interface SketchHighlightCalibration {
  version: 1;
  targetId: 'sketch-toolbar-control';
  scope: 'ONSHAPE_WORKSPACE';
  rectangle: NormalizedHighlightRectangle;
  viewport: CalibrationViewport;
}

// Tentative capture coordinates, never an automatically accepted calibration.
export const INITIAL_SKETCH_RECTANGLE: NormalizedHighlightRectangle = {
  x: 0.089,
  y: 0.058,
  width: 0.065,
  height: 0.044,
};

export const CALIBRATED_HIGHLIGHT_MESSAGE =
  'Showing an approximate location based on your calibration. Leqad has not verified this control.';

function hasKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    typeof value === 'object' &&
    value !== null &&
    !Array.isArray(value) &&
    Object.keys(value).length === keys.length &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function finiteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

export function isValidNormalizedRectangle(
  value: unknown,
): value is NormalizedHighlightRectangle {
  if (!hasKeys(value, ['x', 'y', 'width', 'height'])) return false;
  const { x, y, width, height } = value;
  return (
    finiteNumber(x) &&
    finiteNumber(y) &&
    finiteNumber(width) &&
    finiteNumber(height) &&
    x >= 0 &&
    y >= 0 &&
    width > 0 &&
    height > 0 &&
    x + width <= 1 &&
    y + height <= 1
  );
}

function isViewport(value: unknown): value is CalibrationViewport {
  if (!hasKeys(value, ['width', 'height', 'devicePixelRatio', 'scale']))
    return false;
  return Object.values(value).every(
    (number) => finiteNumber(number) && number > 0,
  );
}

export function readCalibrationViewport(view: Window): CalibrationViewport {
  return {
    width: view.innerWidth,
    height: view.innerHeight,
    devicePixelRatio: view.devicePixelRatio,
    scale: view.visualViewport?.scale ?? 1,
  };
}

export function createSketchHighlightCalibration(
  rectangle: NormalizedHighlightRectangle,
  viewport: CalibrationViewport,
): SketchHighlightCalibration | null {
  if (!isValidNormalizedRectangle(rectangle) || !isViewport(viewport))
    return null;
  return {
    version: 1,
    targetId: 'sketch-toolbar-control',
    scope: 'ONSHAPE_WORKSPACE',
    rectangle: { ...rectangle },
    viewport: { ...viewport },
  };
}

export function parseSketchHighlightCalibration(
  value: unknown,
): SketchHighlightCalibration | null {
  if (
    !hasKeys(value, [
      'version',
      'targetId',
      'scope',
      'rectangle',
      'viewport',
    ]) ||
    value.version !== 1 ||
    value.targetId !== 'sketch-toolbar-control' ||
    value.scope !== 'ONSHAPE_WORKSPACE' ||
    !isValidNormalizedRectangle(value.rectangle) ||
    !isViewport(value.viewport)
  )
    return null;
  return createSketchHighlightCalibration(value.rectangle, value.viewport);
}

export function calibrationMatchesViewport(
  calibration: SketchHighlightCalibration,
  viewport: CalibrationViewport,
): boolean {
  if (!parseSketchHighlightCalibration(calibration) || !isViewport(viewport))
    return false;
  const original = calibration.viewport;
  // Small resizes use normalized coordinates. Larger layout or any material
  // zoom/display-scale change requires the user to preview and save again.
  return (
    Math.abs(viewport.width / original.width - 1) <= 0.05 &&
    Math.abs(viewport.height / original.height - 1) <= 0.05 &&
    Math.abs(viewport.devicePixelRatio / original.devicePixelRatio - 1) <=
      0.01 &&
    Math.abs(viewport.scale / original.scale - 1) <= 0.01
  );
}

export function toViewportRectangle(
  rectangle: NormalizedHighlightRectangle,
  viewport: CalibrationViewport,
): { left: number; top: number; width: number; height: number } | null {
  if (!isValidNormalizedRectangle(rectangle) || !isViewport(viewport))
    return null;
  return {
    left: rectangle.x * viewport.width,
    top: rectangle.y * viewport.height,
    width: rectangle.width * viewport.width,
    height: rectangle.height * viewport.height,
  };
}

/** Approximate location only: this service never resolves or interacts with CAD controls. */
export function createCalibratedHighlighter(document: Document) {
  const view = document.defaultView!;
  let overlay: HTMLDivElement | null = null;
  let timer: number | null = null;
  let detach: (() => void) | null = null;
  const clear = () => {
    if (timer !== null) view.clearTimeout(timer);
    timer = null;
    detach?.();
    detach = null;
    overlay?.remove();
    overlay = null;
  };
  return {
    clear,
    show(calibration: SketchHighlightCalibration): boolean {
      clear();
      const viewport = readCalibrationViewport(view);
      if (!calibrationMatchesViewport(calibration, viewport)) return false;
      const bounds = toViewportRectangle(calibration.rectangle, viewport);
      if (!bounds) return false;
      overlay = createHighlightOutline(document);
      overlay.dataset.leqadCalibrated = 'true';
      Object.assign(overlay.style, {
        left: `${bounds.left}px`,
        top: `${bounds.top}px`,
        width: `${bounds.width}px`,
        height: `${bounds.height}px`,
      });
      document.body.append(overlay);
      const events = [
        'resize',
        'popstate',
        'hashchange',
        'pagehide',
        'wxt:locationchange',
      ] as const;
      for (const event of events) view.addEventListener(event, clear);
      view.addEventListener('scroll', clear, true);
      view.visualViewport?.addEventListener('resize', clear);
      view.visualViewport?.addEventListener('scroll', clear);
      detach = () => {
        for (const event of events) view.removeEventListener(event, clear);
        view.removeEventListener('scroll', clear, true);
        view.visualViewport?.removeEventListener('resize', clear);
        view.visualViewport?.removeEventListener('scroll', clear);
      };
      timer = view.setTimeout(clear, SEMANTIC_HIGHLIGHT_DURATION_MS);
      return true;
    },
  };
}

/** One outline across both evidence-based targets and approximate locations. */
export function createGuidanceHighlighter(document: Document) {
  const semantic = createSemanticHighlighter(document);
  const calibrated = createCalibratedHighlighter(document);
  return {
    clear() {
      semantic.clear();
      calibrated.clear();
    },
    show(targetId: SemanticTargetId) {
      calibrated.clear();
      return semantic.show(targetId);
    },
    showCalibrated(calibration: SketchHighlightCalibration) {
      semantic.clear();
      return calibrated.show(calibration);
    },
  };
}
