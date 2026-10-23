import { describe, expect, it } from 'vitest';
import {
  decideDesktopOverlay,
  type OverlayInput,
  type OverlayDecision,
} from './overlayPolicy';

function hideReason(decision: OverlayDecision): string | null {
  return decision.visible ? null : decision.reason;
}

function fixture(): OverlayInput {
  return {
    context: {
      selectedWindowId: 'CAD_WINDOW',
      foregroundWindowId: 'CAD_WINDOW',
      windowVisible: true,
      capturePermitted: true,
      guidanceEnabled: true,
      applicationKind: 'native',
      selectedTabId: null,
      activeTabId: null,
    },
    observation: {
      sourceWindowId: 'CAD_WINDOW',
      sourceTabId: null,
      capturedAtMs: 1_000,
      confidence: 0.98,
      unique: true,
      screenshotSize: { width: 1600, height: 900 },
      targetPixels: { x: 200, y: 100, width: 80, height: 32 },
    },
    contentBounds: { x: -800, y: 100, width: 800, height: 450 },
    nowMs: 1_300,
  };
}

function withInput(base: OverlayInput, overrides: Partial<OverlayInput>): OverlayInput {
  return { ...base, ...overrides };
}

describe('desktop overlay visibility policy (simulated evidence only)', () => {
  it('maps screenshot pixels into logical screen space, including negative-monitor coordinates', () => {
    expect(decideDesktopOverlay(fixture())).toEqual({
      visible: true,
      bounds: { x: -700, y: 150, width: 40, height: 16 },
    });
  });

  it('immediately hides when the selected CAD app loses foreground or is minimized', () => {
    const base = fixture();
    expect(decideDesktopOverlay(withInput(base, {
      context: { ...base.context, foregroundWindowId: 'OTHER_APP' },
    }))).toEqual({ visible: false, reason: 'wrong-foreground-window' });
    expect(decideDesktopOverlay(withInput(base, {
      context: { ...base.context, windowVisible: false },
    }))).toEqual({ visible: false, reason: 'window-not-visible' });
  });

  it('never displays highlights without permission or when guidance is paused', () => {
    const base = fixture();
    expect(decideDesktopOverlay(withInput(base, {
      context: { ...base.context, capturePermitted: false },
    }))).toEqual({ visible: false, reason: 'capture-not-authorized' });
    expect(decideDesktopOverlay(withInput(base, {
      context: { ...base.context, guidanceEnabled: false },
    }))).toEqual({ visible: false, reason: 'guidance-paused' });
  });

  it('fails closed when the browser CAD tab is unknown or changed', () => {
    const base = fixture();
    const browser = {
      ...base.context,
      applicationKind: 'browser' as const,
      selectedTabId: 'onshape',
      activeTabId: null,
    };
    expect(decideDesktopOverlay(withInput(base, { context: browser }))).toEqual({
      visible: false, reason: 'browser-tab-unverified-or-changed',
    });
    expect(decideDesktopOverlay(withInput(base, {
      context: { ...browser, activeTabId: 'unrelated-tab' },
    })).visible).toBe(false);
    expect(decideDesktopOverlay(withInput(base, {
      context: { ...browser, activeTabId: 'onshape' },
      observation: { ...base.observation!, sourceTabId: 'previous-tab' },
    }))).toEqual({ visible: false, reason: 'capture-tab-mismatch' });
  });

  it('accepts a positively identified browser tab with matching fresh evidence', () => {
    const base = fixture();
    const outcome = decideDesktopOverlay(withInput(base, {
      context: {
        ...base.context,
        applicationKind: 'browser',
        selectedTabId: 'onshape',
        activeTabId: 'onshape',
      },
      observation: { ...base.observation!, sourceTabId: 'onshape' },
    }));
    expect(outcome.visible).toBe(true);
  });

  it('rejects stale and future-dated observations and wrong captured windows', () => {
    const base = fixture();
    expect(hideReason(decideDesktopOverlay(withInput(base, { nowMs: 1_751 }))).toBe('observation-stale');
    expect(hideReason(decideDesktopOverlay(withInput(base, { nowMs: 999 }))).toBe('observation-stale');
    expect(hideReason(decideDesktopOverlay(withInput(base, {
      observation: { ...base.observation!, sourceWindowId: 'OTHER_WINDOW' },
    }))).toBe('capture-window-mismatch');
  });

  it('never highlights ambiguous, missing or below-threshold targets', () => {
    const base = fixture();
    expect(hideReason(decideDesktopOverlay(withInput(base, {
      observation: { ...base.observation!, unique: false },
    }))).toBe('target-ambiguous-or-low-confidence');
    expect(decideDesktopOverlay(withInput(base, {
      observation: { ...base.observation!, confidence: 0.5 },
    })).visible).toBe(false);
    expect(decideDesktopOverlay(withInput(base, { observation: null })).visible).toBe(false);
  });

  it('rejects out-of-frame boxes, invalid screenshot sizes and non-finite coordinates', () => {
    const base = fixture();
    for (const targetPixels of [
      { x: 1580, y: 30, width: 60, height: 30 },
      { x: -1, y: 30, width: 60, height: 30 },
      { x: 20, y: Number.NaN, width: 60, height: 30 },
      { x: 20, y: 30, width: 0, height: 30 },
    ]) {
      expect(decideDesktopOverlay(withInput(base, {
        observation: { ...base.observation!, targetPixels },
      })).visible).toBe(false);
    }
    expect(decideDesktopOverlay(withInput(base, {
      observation: { ...base.observation!, screenshotSize: { width: 0, height: 900 } },
    })).visible).toBe(false);
  });

  it('uses actual capture content bounds for nonuniform DPI scaling', () => {
    const base = fixture();
    expect(decideDesktopOverlay(withInput(base, {
      contentBounds: { x: 100, y: 60, width: 1200, height: 600 },
    }))).toEqual({
      visible: true,
      bounds: {
        x: 250,
        y: 60 + (100 * 600) / 900,
        width: 60,
        height: (32 * 600) / 900,
      },
    });
  });
});
