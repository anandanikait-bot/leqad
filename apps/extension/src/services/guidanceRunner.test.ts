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
    ).toMatchObject({ status: 'FALLBACK', retryAvailable: true });
    expect(environment.calls).toContain('observe:SKETCH_UI_ACTIVE');
    expect(environment.calls).not.toContain('resolve:rectangle-tool-group');
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
      expect(result.retryAvailable).toBe(true);
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
    ).toMatchObject({ status: 'FALLBACK', retryAvailable: true });
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
