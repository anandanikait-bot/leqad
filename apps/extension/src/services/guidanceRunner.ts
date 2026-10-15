import { GUIDANCE_REGISTRY, validateGuidanceRequest } from './guidanceRegistry';
import type {
  GuidanceActionDefinition,
  GuidanceAreaTargetId,
  GuidanceContentId,
  GuidanceObservedState,
  GuidanceObservationId,
  GuidanceRecipeStep,
  GuidanceRegistry,
  GuidanceRequest,
  GuidanceTargetId,
  GuidanceUiContext,
} from './guidanceRegistry';
import { SEMANTIC_HIGHLIGHT_DURATION_MS } from './semanticTargets';

export type GuidanceRunnerStatus =
  | 'IDLE'
  | 'READY'
  | 'WAITING'
  | 'UNSUPPORTED'
  | 'MISSING'
  | 'AMBIGUOUS'
  | 'TIMED_OUT'
  | 'FALLBACK'
  | 'CANCELLED';

export interface GuidanceTargetResolution {
  status: 'FOUND' | 'MISSING' | 'AMBIGUOUS';
}

export interface GuidanceObservationSubscription {
  current: GuidanceObservedState;
  unsubscribe: () => void;
}

export interface GuidanceRunnerHost {
  getContext: () => GuidanceUiContext;
  resolveTarget: (targetId: GuidanceTargetId) => GuidanceTargetResolution;
  /** Area highlights require their own validated resolver and bounds adapter. */
  resolveAreaTarget?: (
    targetId: GuidanceAreaTargetId,
  ) => GuidanceTargetResolution;
  highlightTarget: (targetId: GuidanceTargetId) => boolean;
  highlightArea?: (targetId: GuidanceAreaTargetId) => boolean;
  clearHighlight: () => void;
  observe: (
    observationId: GuidanceObservationId,
    onState: (state: GuidanceObservedState) => void,
  ) => GuidanceObservationSubscription;
}

export interface GuidanceRunnerState {
  request: GuidanceRequest | null;
  status: GuidanceRunnerStatus;
  contentId: GuidanceContentId | null;
  activeTargetId: GuidanceTargetId | null;
  message: string;
  retryAvailable: boolean;
}

export interface GuidanceRunner {
  getState: () => GuidanceRunnerState;
  subscribe: (listener: (state: GuidanceRunnerState) => void) => () => void;
  request: (request: unknown) => GuidanceRunnerState;
  retry: () => GuidanceRunnerState;
  cancel: () => GuidanceRunnerState;
  dispose: () => void;
}

interface ActiveObservation {
  id: GuidanceObservationId;
  expected: GuidanceObservedState;
  timer: ReturnType<typeof setTimeout> | null;
  unsubscribe: () => void;
  phase: 'WAITING' | 'MONITORING';
}

function initialState(): GuidanceRunnerState {
  return {
    request: null,
    status: 'IDLE',
    contentId: null,
    activeTargetId: null,
    message: '',
    retryAvailable: false,
  };
}

function writtenFallback(
  request: GuidanceRequest,
  action: GuidanceActionDefinition,
  status: GuidanceRunnerStatus,
  message: string,
): GuidanceRunnerState {
  return {
    request,
    status,
    contentId: action.hintContentId,
    activeTargetId: null,
    message,
    retryAvailable: true,
  };
}

function exactStateMatches(
  actual: GuidanceObservedState,
  expected: GuidanceRecipeStep & { kind: 'WAIT_FOR_UI_STATE' },
): boolean {
  return actual === expected.expected;
}

export function createGuidanceRunner(
  host: GuidanceRunnerHost,
  registry: GuidanceRegistry = GUIDANCE_REGISTRY,
): GuidanceRunner {
  const listeners = new Set<(state: GuidanceRunnerState) => void>();
  let state = initialState();
  let lastRequest: GuidanceRequest | null = null;
  let activeObservation: ActiveObservation | null = null;
  let highlightExpirationTimer: ReturnType<typeof setTimeout> | null = null;
  let generation = 0;
  let disposed = false;
  let cleaned = true;

  const publish = (next: GuidanceRunnerState) => {
    state = next;
    for (const listener of listeners) listener(state);
    return state;
  };

  const cleanupObservation = () => {
    const prior = activeObservation;
    activeObservation = null;
    if (!prior) return;
    if (prior.timer !== null) clearTimeout(prior.timer);
    prior.timer = null;
    prior.unsubscribe();
  };

  const clearActiveHighlight = (force = false) => {
    if (highlightExpirationTimer !== null)
      clearTimeout(highlightExpirationTimer);
    highlightExpirationTimer = null;
    if (force || !cleaned) host.clearHighlight();
    cleaned = true;
  };

  const clearTransientUi = (force = false) => {
    cleanupObservation();
    clearActiveHighlight(force);
  };

  const armHighlightExpiration = (
    runGeneration: number,
    targetId: GuidanceTargetId | null,
  ) => {
    if (highlightExpirationTimer !== null)
      clearTimeout(highlightExpirationTimer);
    highlightExpirationTimer = setTimeout(() => {
      highlightExpirationTimer = null;
      if (generation !== runGeneration || cleaned) return;
      host.clearHighlight();
      cleaned = true;
      if (state.activeTargetId === targetId) {
        publish({
          ...state,
          activeTargetId: null,
          message:
            state.status === 'WAITING'
              ? 'The temporary highlight expired after 5 seconds. Leqad is still waiting for your interface action.'
              : 'The temporary highlight expired after 5 seconds. Use SHOW again if you need to locate the control.',
          retryAvailable: true,
        });
      }
    }, SEMANTIC_HIGHLIGHT_DURATION_MS);
  };

  const showTarget = (
    request: GuidanceRequest,
    action: GuidanceActionDefinition,
    targetId: GuidanceTargetId,
    message: string,
    runGeneration: number,
  ): boolean => {
    if (generation !== runGeneration) return false;
    const resolution = host.resolveTarget(targetId);
    if (resolution.status !== 'FOUND') {
      clearTransientUi();
      const status =
        resolution.status === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'MISSING';
      publish(
        writtenFallback(
          request,
          action,
          status,
          resolution.status === 'AMBIGUOUS'
            ? 'More than one control could match. Follow the written instruction and retry when only the intended control is visible.'
            : 'The control is not available in the current interface. Follow the written instruction and retry when it is visible.',
        ),
      );
      return false;
    }
    if (!host.highlightTarget(targetId)) {
      clearTransientUi();
      publish(
        writtenFallback(
          request,
          action,
          'FALLBACK',
          'The control could not be highlighted safely. Follow the written instruction and retry.',
        ),
      );
      return false;
    }
    cleaned = false;
    armHighlightExpiration(runGeneration, targetId);
    publish({
      request,
      status: 'READY',
      contentId: action.hintContentId,
      activeTargetId: targetId,
      message,
      retryAvailable: false,
    });
    return true;
  };

  const finishAfterSelection = (
    request: GuidanceRequest,
    action: GuidanceActionDefinition,
  ) => {
    clearTransientUi(true);
    publish({
      request,
      status: 'READY',
      contentId: action.hintContentId,
      activeTargetId: null,
      message:
        'The interface reports a tool selection change. Continue with the written action; this does not verify model geometry or lesson completion.',
      retryAvailable: false,
    });
  };

  const beginWait = (
    request: GuidanceRequest,
    action: GuidanceActionDefinition,
    step: Extract<GuidanceRecipeStep, { kind: 'WAIT_FOR_UI_STATE' }>,
    nextIndex: number,
    recipe: readonly GuidanceRecipeStep[],
    runGeneration: number,
  ) => {
    const onState = (observed: GuidanceObservedState) => {
      if (generation !== runGeneration || !activeObservation) return;
      const observation = activeObservation;
      if (observation.phase === 'WAITING') {
        if (exactStateMatches(observed, step)) {
          if (observation.timer !== null) clearTimeout(observation.timer);
          observation.timer = null;
          observation.phase = 'MONITORING';
          observation.expected = step.expected;
          clearActiveHighlight();
          cleaned = true;
          if (step.expected === 'OPEN') {
            runRecipe(request, action, recipe, nextIndex, runGeneration);
          } else {
            cleanupObservation();
            publish({
              request,
              status: 'READY',
              contentId: action.hintContentId,
              activeTargetId: null,
              message: 'The requested interface transition was observed.',
              retryAvailable: false,
            });
          }
          return;
        }
        if (observed === 'SELECTED') {
          finishAfterSelection(request, action);
          return;
        }
        if (
          observed !== 'UNKNOWN' &&
          observed !== step.expected &&
          !(observed === 'CLOSED' && step.expected === 'OPEN')
        ) {
          clearTransientUi();
          publish(
            writtenFallback(
              request,
              action,
              'FALLBACK',
              'The interface changed in an unexpected way. Follow the written instruction and retry.',
            ),
          );
        }
        return;
      }

      if (observed === observation.expected) return;
      if (observed === 'SELECTED') {
        finishAfterSelection(request, action);
        return;
      }
      clearTransientUi();
      publish(
        writtenFallback(
          request,
          action,
          'FALLBACK',
          observed === 'CLOSED'
            ? 'The menu closed, so the temporary highlight was cleared. Follow the written instruction or reopen the menu and retry.'
            : 'The menu state became uncertain, so the temporary highlight was cleared. Follow the written instruction and retry.',
        ),
      );
    };

    const subscription = host.observe(step.observationId, onState);
    const active: ActiveObservation = {
      id: step.observationId,
      expected: step.expected,
      timer: null,
      unsubscribe: subscription.unsubscribe,
      phase: 'WAITING',
    };
    activeObservation = active;

    if (subscription.current === 'SELECTED') {
      finishAfterSelection(request, action);
      return;
    }
    if (subscription.current === step.expected) {
      active.phase = 'MONITORING';
      clearActiveHighlight();
      cleaned = true;
      if (step.expected === 'OPEN') {
        runRecipe(request, action, recipe, nextIndex, runGeneration);
      } else {
        cleanupObservation();
        publish({
          request,
          status: 'READY',
          contentId: action.hintContentId,
          activeTargetId: null,
          message: 'The requested interface transition was observed.',
          retryAvailable: false,
        });
      }
      return;
    }
    if (
      subscription.current !== 'UNKNOWN' &&
      !(subscription.current === 'CLOSED' && step.expected === 'OPEN')
    ) {
      clearTransientUi();
      publish(
        writtenFallback(
          request,
          action,
          'FALLBACK',
          'The interface is in an unexpected state. Follow the written instruction and retry.',
        ),
      );
      return;
    }

    publish({
      request,
      status: 'WAITING',
      contentId: action.hintContentId,
      activeTargetId: state.activeTargetId,
      message:
        step.expected === 'OPEN'
          ? 'Waiting for you to open the menu. Use the pointer or keyboard; Leqad will not click it.'
          : 'Waiting for the requested interface transition.',
      retryAvailable: true,
    });
    active.timer = setTimeout(
      () => {
        if (generation !== runGeneration || activeObservation !== active)
          return;
        clearTransientUi();
        publish(
          writtenFallback(
            request,
            action,
            'TIMED_OUT',
            'The interface transition was not observed before the wait ended. Follow the written instruction and retry when ready.',
          ),
        );
      },
      Number.isFinite(step.timeoutMs)
        ? Math.min(Math.max(step.timeoutMs, 1), 10_000)
        : 10_000,
    );
  };

  const runRecipe = (
    request: GuidanceRequest,
    action: GuidanceActionDefinition,
    recipe: readonly GuidanceRecipeStep[],
    startIndex: number,
    runGeneration: number,
  ): GuidanceRunnerState => {
    for (let index = startIndex; index < recipe.length; index += 1) {
      if (generation !== runGeneration) return state;
      const step = recipe[index]!;
      if (step.kind === 'INSTRUCT') {
        publish({
          request,
          status: 'READY',
          contentId: step.contentId,
          activeTargetId: null,
          message:
            'Follow this instruction, then continue when the interface changes.',
          retryAvailable: false,
        });
        continue;
      }
      if (step.kind === 'HIGHLIGHT') {
        if (
          !showTarget(
            request,
            action,
            step.targetId,
            'The highlighted control is ready for you to use.',
            runGeneration,
          )
        ) {
          return state;
        }
        continue;
      }
      beginWait(request, action, step, index + 1, recipe, runGeneration);
      return state;
    }
    return publish({
      request,
      status: 'READY',
      contentId: action.hintContentId,
      activeTargetId: state.activeTargetId,
      message: 'This guidance step is ready. Continue with the written action.',
      retryAvailable: false,
    });
  };

  const start = (rawRequest: unknown): GuidanceRunnerState => {
    if (disposed) return state;
    generation += 1;
    clearTransientUi(true);
    const request = validateGuidanceRequest(rawRequest);
    if (!request) {
      lastRequest = null;
      return publish({
        request: null,
        status: 'UNSUPPORTED',
        contentId: null,
        activeTargetId: null,
        message: 'This guidance request is not supported.',
        retryAvailable: false,
      });
    }
    lastRequest = request;
    const action = registry[request.actionId];
    if (!action || !action.supportedLevels.includes(request.level)) {
      return publish({
        request,
        status: 'UNSUPPORTED',
        contentId: action?.hintContentId ?? null,
        activeTargetId: null,
        message:
          request.level === 'GUIDE'
            ? 'Step-by-step guidance for this action is not available yet. Follow the written lesson action.'
            : 'This guidance level is not available for this action.',
        retryAvailable: false,
      });
    }

    const context = host.getContext();
    if (request.actionId === 'sketch' && context === 'SKETCH_EDITING') {
      return publish({
        request,
        status: 'READY',
        contentId: action.hintContentId,
        activeTargetId: null,
        message:
          'Sketch editing already appears active. No Sketch button needs highlighting now. If you entered this sketch, mark the step done and continue; geometry is not verified.',
        retryAvailable: false,
      });
    }
    if (context !== action.requiredContext) {
      return publish(
        writtenFallback(
          request,
          action,
          'FALLBACK',
          context === 'UNKNOWN'
            ? request.actionId === 'sketch'
              ? 'Leqad cannot identify the Sketch toolbar or a supported active-sketch control. If the Sketch dialog is already open, mark this step done and continue. Otherwise, make the Sketch toolbar visible and choose SHOW again.'
              : 'Leqad cannot identify the required Onshape editing controls. Make the relevant toolbar visible and choose SHOW again; repeating Retry without a UI change cannot reveal an unidentified control.'
            : `This action needs the ${action.requiredContext === 'PART_STUDIO' ? 'Part Studio' : 'active sketch'} interface. Follow the written instructions and retry there.`,
        ),
      );
    }

    for (const requirement of action.requiredObservations) {
      const observation = host.observe(
        requirement.observationId,
        () => undefined,
      );
      observation.unsubscribe();
      if (observation.current !== requirement.expected) {
        return publish(
          writtenFallback(
            request,
            action,
            'FALLBACK',
            observation.current === 'UNKNOWN'
              ? 'A required interface state cannot be observed right now. Follow the written instruction and retry when the UI is clear.'
              : 'The required interface state is not currently present. Follow the written instruction and retry in the matching UI state.',
          ),
        );
      }
    }

    if (request.level === 'HINT') {
      const areaTarget = action.hintAreaTargetId;
      let message = 'Use the written hint for this action.';
      if (areaTarget) {
        const areaResolution = host.resolveAreaTarget?.(areaTarget) ?? {
          status: 'MISSING' as const,
        };
        if (
          areaResolution.status === 'FOUND' &&
          host.highlightArea?.(areaTarget)
        ) {
          cleaned = false;
          armHighlightExpiration(generation, null);
          message =
            'The general toolbar region is highlighted. Find the named tool there.';
        } else {
          clearTransientUi();
          return publish(
            writtenFallback(
              request,
              action,
              areaResolution.status === 'AMBIGUOUS' ? 'AMBIGUOUS' : 'MISSING',
              'The general toolbar region could not be highlighted safely. Follow the written hint and retry.',
            ),
          );
        }
      }
      return publish({
        request,
        status: 'READY',
        contentId: action.hintContentId,
        activeTargetId: null,
        message,
        retryAvailable: false,
      });
    }

    if (request.level === 'SHOW') {
      showTarget(
        request,
        action,
        action.targetId,
        'The highlighted control is ready for you to use.',
        generation,
      );
      return state;
    }

    if (!action.guideRecipe) {
      return publish({
        request,
        status: 'UNSUPPORTED',
        contentId: action.hintContentId,
        activeTargetId: null,
        message:
          'Step-by-step guidance is not enabled for this action yet. Follow the written lesson action.',
        retryAvailable: false,
      });
    }

    // If the first wait condition is already true, skip preceding trigger
    // highlights and opening instructions. Start a fresh bounded observer
    // from that state so a later menu close still clears the item highlight.
    const firstWaitIndex = action.guideRecipe.findIndex(
      (step) => step.kind === 'WAIT_FOR_UI_STATE',
    );
    if (firstWaitIndex >= 0) {
      const firstWait = action.guideRecipe[firstWaitIndex]!;
      if (firstWait.kind === 'WAIT_FOR_UI_STATE') {
        const observation = host.observe(
          firstWait.observationId,
          () => undefined,
        );
        observation.unsubscribe();
        if (observation.current === firstWait.expected) {
          beginWait(
            request,
            action,
            firstWait,
            firstWaitIndex + 1,
            action.guideRecipe,
            generation,
          );
          return state;
        }
      }
    }
    runRecipe(request, action, action.guideRecipe, 0, generation);
    return state;
  };

  const cancel = (): GuidanceRunnerState => {
    generation += 1;
    clearTransientUi(true);
    lastRequest = null;
    return publish({
      request: state.request,
      status: 'CANCELLED',
      contentId: state.contentId,
      activeTargetId: null,
      message: 'Guidance was stopped. Continue with the written instruction.',
      retryAvailable: false,
    });
  };

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    request: start,
    retry() {
      if (!lastRequest || !state.retryAvailable) return state;
      const prior = state;
      const next = start(lastRequest);
      if (
        next.retryAvailable &&
        next.status === prior.status &&
        next.contentId === prior.contentId &&
        (prior.message === next.message ||
          prior.message.startsWith(`Checked again: ${next.message}`))
      ) {
        return publish({
          ...next,
          message: `Checked again: ${next.message} No newly recognizable interface state was detected; try again after the Onshape UI changes.`,
        });
      }
      return next;
    },
    cancel,
    dispose() {
      if (disposed) return;
      cancel();
      disposed = true;
      listeners.clear();
    },
  };
}
