/**
 * Pure desktop guidance visibility policy: it neither captures a screen nor
 * draws an overlay. All inputs are evidence from a platform-specific adapter.
 * Unsafe or unknown context fails closed.
 */

export type PixelBox = Readonly<{ x: number; y: number; width: number; height: number }>;

export type CadContext = Readonly<{
  selectedWindowId: string;
  foregroundWindowId: string | null;
  windowVisible: boolean;
  capturePermitted: boolean;
  guidanceEnabled: boolean;
  applicationKind: 'native' | 'browser';
  /** For browser CAD, authoritative fresh tab identity from a validated bridge. */
  selectedTabId: string | null;
  activeTabId: string | null;
}>;

export type VisualObservation = Readonly<{
  sourceWindowId: string;
  sourceTabId: string | null;
  capturedAtMs: number;
  confidence: number;
  unique: boolean;
  screenshotSize: Readonly<{ width: number; height: number }>;
  targetPixels: PixelBox;
}>;

export type OverlayInput = Readonly<{
  context: CadContext;
  observation: VisualObservation | null;
  /** Screen-space content rectangle in logical desktop pixels (not outer window frame). */
  contentBounds: PixelBox | null;
  nowMs: number;
}>;

export type OverlayDecision =
  | Readonly<{ visible: true; bounds: PixelBox }>
  | Readonly<{ visible: false; reason: string }>;

// These are deliberately conservative prototype gates, not calibrated success probabilities.
export const MAX_OBSERVATION_AGE_MS = 750;
export const MIN_UNIQUE_TARGET_CONFIDENCE = 0.9;

function isFiniteNumber(value: number): boolean {
  return Number.isFinite(value);
}

function validBox(box: PixelBox): boolean {
  return (
    [box.x, box.y, box.width, box.height].every(isFiniteNumber) &&
    box.width > 0 &&
    box.height > 0
  );
}

const hide = (reason: string): OverlayDecision => ({ visible: false, reason });

export function decideDesktopOverlay(input: OverlayInput): OverlayDecision {
  const { context, observation, contentBounds, nowMs } = input;

  if (!context.guidanceEnabled) return hide('guidance-paused');
  if (!context.capturePermitted) return hide('capture-not-authorized');
  if (!context.windowVisible) return hide('window-not-visible');
  if (!context.selectedWindowId || context.foregroundWindowId !== context.selectedWindowId) {
    return hide('wrong-foreground-window');
  }

  // Browser focus does not prove which tab is open. Never reuse an older tab result.
  if (
    context.applicationKind === 'browser' &&
    (!context.selectedTabId || !context.activeTabId ||
      context.activeTabId !== context.selectedTabId)
  ) {
    return hide('browser-tab-unverified-or-changed');
  }

  if (!observation || !contentBounds) return hide('no-fresh-observation');
  if (observation.sourceWindowId !== context.selectedWindowId) {
    return hide('capture-window-mismatch');
  }
  if (
    context.applicationKind === 'browser' &&
    observation.sourceTabId !== context.activeTabId
  ) {
    return hide('capture-tab-mismatch');
  }
  if (
    !isFiniteNumber(nowMs) ||
    !isFiniteNumber(observation.capturedAtMs) ||
    observation.capturedAtMs > nowMs ||
    nowMs - observation.capturedAtMs > MAX_OBSERVATION_AGE_MS
  ) {
    return hide('observation-stale');
  }
  if (
    !observation.unique ||
    !isFiniteNumber(observation.confidence) ||
    observation.confidence < MIN_UNIQUE_TARGET_CONFIDENCE ||
    observation.confidence > 1
  ) {
    return hide('target-ambiguous-or-low-confidence');
  }

  const { screenshotSize: size, targetPixels: target } = observation;
  if (
    !validBox(contentBounds) ||
    !isFiniteNumber(size.width) ||
    !isFiniteNumber(size.height) ||
    size.width <= 0 ||
    size.height <= 0 ||
    !validBox(target) ||
    target.x < 0 ||
    target.y < 0 ||
    target.x + target.width > size.width ||
    target.y + target.height > size.height
  ) {
    return hide('invalid-or-out-of-frame-geometry');
  }

  // The host must supply the true captured-content bounds (after titlebar and
  // inset handling). Never guess outer-window frame offsets.
  const scaleX = contentBounds.width / size.width;
  const scaleY = contentBounds.height / size.height;
  const bounds: PixelBox = {
    x: contentBounds.x + target.x * scaleX,
    y: contentBounds.y + target.y * scaleY,
    width: target.width * scaleX,
    height: target.height * scaleY,
  };
  if (!validBox(bounds)) return hide('invalid-projection');
  return { visible: true, bounds };
}
