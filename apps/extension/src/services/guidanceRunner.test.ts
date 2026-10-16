import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  GUIDANCE_REGISTRY,
  type GuidanceAreaTargetId,
  type GuidanceActionDefinition,
  type GuidanceObservedState,
  type GuidanceObservationId,
  type GuidanceRegistry,
  type GuidanceTargetId,
} from './guidanceRegistry';
import {
  createGuidanceRunner,
  type GuidanceRunnerHost,
  type GuidanceTargetResolution,
} from './guidanceRunner';

function createHost(
  options: {
    context?: 'PART_STUDIO' | 'SKETCH_EDITING' | 'UNKNOWN';
    targets?: Partial<
      Record<GuidanceTargetId | GuidanceAreaTargetId, GuidanceTargetResolution>
    >;
    initialObservation?: GuidanceObservedState;
    initialObservations?: Partial<
      Record<GuidanceObservationId, GuidanceObservedState>
    >;
    highlightExpiresAfterMs?: number;
  } = {},
) {
  const callbacks = new Map<
    string,
    Set<(state: GuidanceObservedState) => void>
  >();
  const capturedCallbacks = new Map<
    string,
    Array<(state: GuidanceObservedState) => void>
  >();
  const observedStates = new Map<string, GuidanceObservedState>();
  const calls: string[] = [];
  const host: GuidanceRunnerHost = {
    getContext: () => options.context ?? 'SKETCH_EDITING',
    resolveTarget: (targetId) => {
      calls.push(`resolve:${targetId}`);
      return options.targets?.[targetId] ?? { status: 'FOUND' };
    },
    resolveAreaTarget: (targetId) => {
      calls.push(`resolve-area:${targetId}`);
      return options.targets?.[targetId] ?? { status: 'FOUND' };
    },
    highlightTarget: (targetId) => {
      calls.push(`highlight:${targetId}`);
      if (options.highlightExpiresAfterMs !== undefined) {
        setTimeout(
          () => calls.push(`expired:${targetId}`),
          options.highlightExpiresAfterMs,
        );
      }
      return true;
    },
    highlightArea: (targetId) => {
      calls.push(`area:${targetId}`);
      return true;
    },
    clearHighlight: () => calls.push('clear'),
    observe: (observationId, onState) => {
      calls.push(`observe:${observationId}`);
      const initial =
        options.initialObservations?.[observationId as GuidanceObservationId] ??
        (observationId === 'SKETCH_UI_ACTIVE'
          ? 'OPEN'
          : (options.initialObservation ?? 'CLOSED'));
      if (!observedStates.has(observationId))
        observedStates.set(observationId, initial);
      const listeners = callbacks.get(observationId) ?? new Set();
      listeners.add(onState);
      callbacks.set(observationId, listeners);
      const captured = capturedCallbacks.get(observationId) ?? [];
      captured.push(onState);
      capturedCallbacks.set(observationId, captured);
      let active = true;
      return {
        current: observedStates.get(observationId) ?? 'UNKNOWN',
        unsubscribe: () => {
          if (!active) return;
          active = false;
          calls.push(`unsubscribe:${observationId}`);
          listeners.delete(onState);
        },
      };
    },
  };
  return {
    host,
    calls,
    emit(observationId: string, state: GuidanceObservedState) {
      observedStates.set(observationId, state);
      for (const listener of callbacks.get(observationId) ?? [])
        listener(state);
    },
    listenerCount(observationId: string) {
      return callbacks.get(observationId)?.size ?? 0;
    },
    emitCaptured(
      observationId: string,
      index: number,
      state: GuidanceObservedState,
    ) {
      capturedCallbacks.get(observationId)?.[index]?.(state);
    },
  };
}

function simulatedRecipeRegistry(
  overrides: Partial<GuidanceActionDefinition> = {},
): GuidanceRegistry {
  const action = GUIDANCE_REGISTRY['rectangle-tool-group'];
  return {
    ...GUIDANCE_REGISTRY,
    'rectangle-tool-group': {
      ...action,
      supportedLevels: ['HINT', 'SHOW', 'GUIDE'],
      guideRecipe: [
        { kind: 'HIGHLIGHT', targetId: 'rectangle-tool-group' },
        {
          kind: 'WAIT_FOR_UI_STATE',
          observationId: 'RECTANGLE_MENU_OPEN',
          expected: 'OPEN',
          timeoutMs: 10_000,
        },
        {
          kind: 'HIGHLIGHT',
          // This simulated fixture identity is not in the production registry.
          targetId: 'test-only.simulated-corner-rectangle' as GuidanceTargetId,
        },
      ],
      ...overrides,
    },
  };
}

describe('deterministic guidance runner', () => {
  beforeEach(() => vi.useFakeTimers());
  afterEach(() => vi.useRealTimers());

  it('returns local HINT content without changing lesson state or resolving controls', () => {
    const { host, calls } = createHost();
    const runner = createGuidanceRunner(host);
    const result = runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'HINT',
    });

    expect(result).toMatchObject({
      status: 'READY',
      contentId: 'rectangle-tool-group',
      request: { level: 'HINT' },
    });
    expect(calls).not.toContain('resolve:rectangle-tool-group');
    expect(calls).not.toContain('highlight:rectangle-tool-group');
  });

  it('uses the existing target host for SHOW and reports a ready highlight', () => {
    const { host, calls } = createHost();
    const runner = createGuidanceRunner(host);
    expect(
      runner.request({
        version: 1,
        actionId: 'rectangle-tool-group',
        level: 'SHOW',
      }),
    ).toMatchObject({
      status: 'READY',
      activeTargetId: 'rectangle-tool-group',
    });
    expect(calls).toContain('resolve:rectangle-tool-group');
    expect(calls).toContain('highlight:rectangle-tool-group');
  });

  it('requires the declared current UI observation even when context matches', () => {
    const environment = createHost({
      context: 'SKETCH_EDITING',
      initialObservations: { SKETCH_UI_ACTIVE: 'UNKNOWN' },
    });
    const runner = createGuidanceRunner(environment.host);
    expect(
      runner.request({
        version: 1,
        actionId: 'rectangle-tool-group',
        level: 'SHOW',
      }),
    ).toMatchObject({ status: 'FALLBACK', retryAvailable: false });
    expect(environment.calls).toContain('observe:SKETCH_UI_ACTIVE');
    expect(environment.calls).not.toContain('resolve:rectangle-tool-group');
  });

  it('does not claim a Rectangle outline is still present after independent overlay cleanup (simulated host)', () => {
    const environment = createHost();
    let overlayPresent = false;
    environment.host.highlightTarget = () => {
      overlayPresent = true;
      return true;
    };
    const runner = createGuidanceRunner(environment.host);
    runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'SHOW',
    });
    expect(overlayPresent).toBe(true);
    // Simulate the existing highlighter clearing on a CAD click before the runner timer.
    overlayPresent = false;
    expect(overlayPresent).toBe(false);
    expect(runner.getState().message).toMatch(/temporary highlight was shown/i);
    expect(runner.getState().message).toMatch(
      /may clear when the interface changes/i,
    );
    expect(runner.getState().message).not.toMatch(/control is highlighted/i);
    runner.dispose();
  });

  it('explains a Sketch step already satisfied by observable sketch-editing UI without highlighting', () => {
    const environment = createHost({ context: 'SKETCH_EDITING' });
    const runner = createGuidanceRunner(environment.host);
    const result = runner.request({
      version: 1,
      actionId: 'sketch',
      level: 'SHOW',
    });
    expect(result).toMatchObject({
      status: 'READY',
      activeTargetId: null,
      retryAvailable: false,
    });
    expect(result.message).toMatch(/Sketch editing already appears active/);
    expect(environment.calls).not.toContain('highlight:sketch-toolbar-control');
  });

  it('reports when Retry sees the same unknown context instead of silently repeating the message', () => {
    const environment = createHost({ context: 'UNKNOWN' });
    const runner = createGuidanceRunner(environment.host);
    const first = runner.request({
      version: 1,
      actionId: 'sketch',
      level: 'SHOW',
    });
    expect(first.status).toBe('FALLBACK');
    expect(first.message).toMatch(/mark this step done/);
    const retry = runner.retry();
    expect(retry.status).toBe('FALLBACK');
    expect(retry.message).toMatch(/Checked again/);
    expect(retry.message).toMatch(/No newly recognizable interface state/);
    expect(environment.calls).not.toContain('highlight:sketch-toolbar-control');
  });

  it('supports a registry-validated general toolbar area for a future HINT', () => {
    const registry: GuidanceRegistry = {
      ...GUIDANCE_REGISTRY,
      sketch: {
        ...GUIDANCE_REGISTRY.sketch,
        hintAreaTargetId: 'sketch-toolbar-region',
      },
    };
    const environment = createHost({ context: 'PART_STUDIO' });
    const runner = createGuidanceRunner(environment.host, registry);
    const result = runner.request({
      version: 1,
      actionId: 'sketch',
      level: 'HINT',
    });
    expect(result).toMatchObject({ status: 'READY', contentId: 'sketch' });
    expect(environment.calls).toContain('resolve-area:sketch-toolbar-region');
    expect(environment.calls).toContain('area:sketch-toolbar-region');
  });

  it('keeps a general-area HINT unavailable until its host has a validated resolver', () => {
    const registry: GuidanceRegistry = {
      ...GUIDANCE_REGISTRY,
      sketch: {
        ...GUIDANCE_REGISTRY.sketch,
        hintAreaTargetId: 'sketch-toolbar-region',
      },
    };
    const environment = createHost({ context: 'PART_STUDIO' });
    const host: GuidanceRunnerHost = {
      getContext: environment.host.getContext,
      resolveTarget: environment.host.resolveTarget,
      highlightTarget: environment.host.highlightTarget,
      clearHighlight: environment.host.clearHighlight,
      observe: environment.host.observe,
    };
    const runner = createGuidanceRunner(host, registry);
    const result = runner.request({
      version: 1,
      actionId: 'sketch',
      level: 'HINT',
    });
    expect(result).toMatchObject({ status: 'MISSING', retryAvailable: true });
    expect(environment.calls).not.toContain('area:sketch-toolbar-region');
  });

  it('reports unsupported GUIDE when no registered recipe exists', () => {
    const { host, calls } = createHost();
    const runner = createGuidanceRunner(host);
    expect(
      runner.request({
        version: 1,
        actionId: 'rectangle-tool-group',
        level: 'GUIDE',
      }),
    ).toMatchObject({ status: 'UNSUPPORTED', retryAvailable: false });
    expect(calls).not.toContain('resolve:rectangle-tool-group');
  });

  it('uses a test-only recipe, skips opening when already open, and highlights the exact simulated item', () => {
    const simulatedMenuItem =
      'test-only.simulated-corner-rectangle' as GuidanceTargetId;
    const environment = createHost({ initialObservation: 'OPEN' });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    const result = runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });

    expect(result.status).toBe('READY');
    expect(environment.calls).not.toContain('highlight:rectangle-tool-group');
    expect(environment.calls).toContain('observe:RECTANGLE_MENU_OPEN');
    expect(environment.listenerCount('RECTANGLE_MENU_OPEN')).toBe(1);
    expect(environment.calls).toContain(`highlight:${simulatedMenuItem}`);
  });

  it('treats a keyboard-observed OPEN state as the same guide transition', () => {
    const environment = createHost({ initialObservation: 'CLOSED' });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    const result = runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });
    expect(result.status).toBe('WAITING');
    environment.emit('RECTANGLE_MENU_OPEN', 'OPEN');
    expect(runner.getState()).toMatchObject({
      status: 'READY',
      activeTargetId: 'test-only.simulated-corner-rectangle',
    });
  });

  it('does not renew an expired guide highlight while waiting for a user transition', () => {
    const environment = createHost({
      initialObservation: 'CLOSED',
      highlightExpiresAfterMs: 5_000,
    });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });
    const clearCountBeforeExpiry = environment.calls.filter(
      (call) => call === 'clear',
    ).length;

    vi.advanceTimersByTime(5_000);
    expect(environment.calls).toContain('expired:rectangle-tool-group');
    expect(
      environment.calls.filter((call) => call === 'clear').length,
    ).toBeGreaterThan(clearCountBeforeExpiry);
    expect(
      environment.calls.filter(
        (call) => call === 'highlight:rectangle-tool-group',
      ),
    ).toHaveLength(1);
    expect(runner.getState()).toMatchObject({
      status: 'WAITING',
      activeTargetId: null,
    });
    expect(runner.getState().message).toMatch(/expired after 5 seconds/i);

    vi.advanceTimersByTime(5_000);
    expect(runner.getState().status).toBe('TIMED_OUT');
  });

  it.each([
    ['missing', { status: 'MISSING' } as GuidanceTargetResolution],
    ['ambiguous', { status: 'AMBIGUOUS' } as GuidanceTargetResolution],
  ])(
    'clears the prior highlight and gives a written fallback for %s targets',
    (_name, resolution) => {
      const environment = createHost({
        targets: { 'rectangle-tool-group': resolution },
      });
      const runner = createGuidanceRunner(environment.host);
      const result = runner.request({
        version: 1,
        actionId: 'rectangle-tool-group',
        level: 'SHOW',
      });
      expect(result.status).toBe(resolution.status);
      expect(result.retryAvailable).toBe(false);
      expect(result.message).toBeTruthy();
      expect(environment.calls).toContain('clear');
      expect(environment.calls.indexOf('clear')).toBeLessThan(
        environment.calls.indexOf('resolve:rectangle-tool-group'),
      );
    },
  );

  it('falls back and unsubscribes when the menu closes while the guide is waiting', () => {
    const environment = createHost({ initialObservation: 'CLOSED' });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });
    expect(environment.listenerCount('RECTANGLE_MENU_OPEN')).toBe(1);
    environment.emit('RECTANGLE_MENU_OPEN', 'OPEN');
    expect(runner.getState()).toMatchObject({ status: 'READY' });
    expect(environment.listenerCount('RECTANGLE_MENU_OPEN')).toBe(1);
    environment.emit('RECTANGLE_MENU_OPEN', 'CLOSED');
    expect(runner.getState()).toMatchObject({
      status: 'FALLBACK',
      retryAvailable: true,
    });
    expect(environment.listenerCount('RECTANGLE_MENU_OPEN')).toBe(0);
  });

  it('times out after the registered bound and offers an explicit Retry', () => {
    const environment = createHost({ initialObservation: 'CLOSED' });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });
    vi.advanceTimersByTime(10_000);
    expect(runner.getState()).toMatchObject({
      status: 'TIMED_OUT',
      retryAvailable: true,
    });
    expect(environment.listenerCount('RECTANGLE_MENU_OPEN')).toBe(0);
  });

  it('clears the guide highlight and subscription on cancel and retry replacement', () => {
    const environment = createHost({ initialObservation: 'CLOSED' });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });
    runner.retry();
    expect(environment.listenerCount('RECTANGLE_MENU_OPEN')).toBe(1);
    environment.emit('RECTANGLE_MENU_OPEN', 'OPEN');
    expect(runner.getState().status).toBe('READY');
    runner.cancel();
    expect(runner.getState()).toMatchObject({
      status: 'CANCELLED',
      retryAvailable: false,
    });
    const stateBeforeRetry = runner.getState();
    runner.retry();
    expect(runner.getState()).toBe(stateBeforeRetry);
    expect(
      environment.calls.filter((call) => call === 'clear').length,
    ).toBeGreaterThanOrEqual(2);
  });

  it('ignores an observer callback retained from before a retry', () => {
    const environment = createHost({ initialObservation: 'CLOSED' });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });
    runner.retry();
    environment.emitCaptured('RECTANGLE_MENU_OPEN', 0, 'OPEN');
    expect(runner.getState()).toMatchObject({ status: 'WAITING' });
    environment.emit('RECTANGLE_MENU_OPEN', 'OPEN');
    expect(runner.getState()).toMatchObject({
      status: 'READY',
      activeTargetId: 'test-only.simulated-corner-rectangle',
    });
  });

  it('clears and terminates on SELECTED without updating lesson state', () => {
    const environment = createHost({ initialObservation: 'CLOSED' });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });
    environment.emit('RECTANGLE_MENU_OPEN', 'SELECTED');
    expect(runner.getState()).toMatchObject({
      status: 'READY',
      activeTargetId: null,
    });
    expect(environment.listenerCount('RECTANGLE_MENU_OPEN')).toBe(0);
  });

  it('rejects a context mismatch without attempting recognition', () => {
    const environment = createHost({ context: 'PART_STUDIO' });
    const runner = createGuidanceRunner(environment.host);
    expect(
      runner.request({
        version: 1,
        actionId: 'rectangle-tool-group',
        level: 'SHOW',
      }),
    ).toMatchObject({ status: 'FALLBACK', retryAvailable: false });
    expect(environment.calls.some((call) => call.startsWith('resolve:'))).toBe(
      false,
    );
  });

  it('disposes active UI observers when the runner is replaced', () => {
    const environment = createHost({ initialObservation: 'CLOSED' });
    const runner = createGuidanceRunner(
      environment.host,
      simulatedRecipeRegistry(),
    );
    runner.request({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'GUIDE',
    });
    runner.dispose();
    environment.emit('RECTANGLE_MENU_OPEN', 'OPEN');
    expect(environment.listenerCount('RECTANGLE_MENU_OPEN')).toBe(0);
    expect(runner.getState().status).toBe('CANCELLED');
  });
});

it.each(['MISSING', 'AMBIGUOUS'] as const)(
  'gives a precise Corner Rectangle fallback for %s without blind Retry',
  (status) => {
    const environment = createHost({
      targets: { 'rectangle-tool-group': { status } },
    });
    const runner = createGuidanceRunner(environment.host);
    const result = runner.request({
      version: 1,
      level: 'SHOW',
      actionId: 'rectangle-tool-group',
    });
    expect(result.activeTargetId).toBeNull();
    expect(result.message).toMatch(/dropdown arrow/i);
    expect(result.message).toMatch(/Corner Rectangle/);
    expect(result.retryAvailable).toBe(false);
    expect(environment.calls).not.toContain('highlight:rectangle-tool-group');
    runner.dispose();
  },
);
it('describes group-only SHOW without claiming an exact option highlight or selection', () => {
  const environment = createHost();
  const runner = createGuidanceRunner(environment.host);
  const result = runner.request({
    version: 1,
    level: 'SHOW',
    actionId: 'rectangle-tool-group',
  });
  expect(result.message).toMatch(/dropdown/);
  expect(result.message).toMatch(/choose Corner Rectangle/);
  expect(result.message).toMatch(/option.*not.*highlight/i);
  runner.dispose();
});

it.each(['UNKNOWN', 'PART_STUDIO'] as const)(
  'keeps production lookup NOT_RUN when the %s context gate blocks SHOW',
  (context) => {
    const environment = createHost({ context });
    const runner = createGuidanceRunner(environment.host);
    const result = runner.request({
      version: 1,
      level: 'SHOW',
      actionId: 'rectangle-tool-group',
    });
    expect(result.rectangleShowDiagnostic).toMatchObject({
      version: 'leqad-rectangle-show/1',
      stage: 'CONTEXT',
      context,
      productionLookup: 'NOT_RUN',
      reason: 'SKETCH_CONTEXT_UNESTABLISHED',
    });
    expect(result.message).toMatch(/active Sketch context/);
    expect(
      environment.calls.some((value) => value.startsWith('resolve:')),
    ).toBe(false);
    runner.dispose();
  },
);
it('reports target lookup as RUN only when production lookup actually ran', () => {
  const environment = createHost({
    targets: { 'rectangle-tool-group': { status: 'MISSING' } },
  });
  const runner = createGuidanceRunner(environment.host);
  const result = runner.request({
    version: 1,
    level: 'SHOW',
    actionId: 'rectangle-tool-group',
  });
  expect(result.rectangleShowDiagnostic).toMatchObject({
    stage: 'GROUP_LOOKUP',
    productionLookup: 'RUN',
    reason: 'GROUP_LOOKUP_UNESTABLISHED',
  });
  expect(result.message).toMatch(/Sketch context was observed/);
  runner.dispose();
});

it('does not run lookup when read-only inspection contradicts a permissive host context', () => {
  const environment = createHost();
  const host = {
    ...environment.host,
    inspectRectangleShow: () => ({
      pageGate: 'READ_ONLY' as const,
      target: {
        sketchContext: 'OBSERVED' as const,
        finishControl: 'FOUND' as const,
        dialogPlaneObserved: false,
        readOnlyIndicators: 1,
        lookup: {
          state: 'COMPLETE' as const,
          reason: 'NO_TOOLBAR_SEMANTICS' as const,
          toolbars: 0,
          popupControls: 0,
          exactNames: 0,
        },
        eligibility: {
          state: 'NOT_EVALUATED' as const,
          candidateCount: 0,
          usableCount: 0,
          rejections: [],
        },
      },
    }),
  };
  const runner = createGuidanceRunner(host);
  const result = runner.request({
    version: 1,
    level: 'SHOW',
    actionId: 'rectangle-tool-group',
  });
  expect(result.rectangleShowDiagnostic).toMatchObject({
    reason: 'PAGE_GATE_BLOCKED',
    stage: 'CONTEXT',
    productionLookup: 'NOT_RUN',
  });
  expect(environment.calls.some((value) => value.startsWith('resolve:'))).toBe(
    false,
  );
  runner.dispose();
});

it.each(['context', 'read-only'] as const)(
  'classifies a %s failure discovered during lookup as CONTEXT with lookup RUN',
  async (kind) => {
    const { inspectRectangleDropdownRecognition } =
      await import('./semanticTargets');
    const target = inspectRectangleDropdownRecognition(document);
    if (kind === 'read-only') {
      target.sketchContext = 'OBSERVED';
      target.readOnlyIndicators = 1;
    }
    const environment = createHost({
      targets: {
        'rectangle-tool-group': {
          status: 'MISSING',
          rectangleDiagnostic: target,
        },
      },
    });
    const runner = createGuidanceRunner(environment.host);
    const result = runner.request({
      version: 1,
      level: 'SHOW',
      actionId: 'rectangle-tool-group',
    });
    expect(result.rectangleShowDiagnostic).toMatchObject({
      stage: 'CONTEXT',
      reason:
        kind === 'context'
          ? 'SKETCH_CONTEXT_UNESTABLISHED'
          : 'PAGE_GATE_BLOCKED',
      productionLookup: 'RUN',
    });
    runner.dispose();
  },
);
