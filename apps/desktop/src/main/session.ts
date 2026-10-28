import {
  EMPTY_SESSION,
  parseCommand,
  type Command,
  type SessionView,
} from '@leqad/desktop-contracts';
import type {
  WindowBinding,
  WindowCatalogProvider,
} from './windowCatalogTypes';

export interface SessionDependencies {
  abortActive(): void;
  resetPosition(): Promise<void> | void;
  closeWindow(): void;
  windowCatalog: WindowCatalogProvider;
}

export interface SessionController {
  getView(): SessionView;
  command(value: unknown): Promise<SessionView>;
  checkWindow(): Promise<SessionView>;
  subscribe(listener: (view: SessionView) => void): () => void;
  invalidate(): void;
  dispose(): void;
}

function freezeView(view: SessionView): SessionView {
  return Object.freeze({
    ...view,
    selectedWindow: view.selectedWindow
      ? Object.freeze({ ...view.selectedWindow })
      : null,
    availableActions: Object.freeze([...view.availableActions]),
  });
}

function summaryFor(binding: WindowBinding) {
  return Object.freeze({
    application: binding.application,
    ordinal: binding.ordinal,
    kind: binding.kind,
  });
}

export function createSessionController(
  dependencies: SessionDependencies,
): SessionController {
  let view = freezeView(EMPTY_SESSION);
  let selectedBinding: WindowBinding | null = null;
  let disposed = false;
  const listeners = new Set<(next: SessionView) => void>();

  const abortActive = () => {
    try {
      dependencies.abortActive();
    } catch {
      // Cleanup must continue even if a provider failed while aborting.
    }
  };

  const disposeCatalog = () => {
    try {
      dependencies.windowCatalog.dispose();
    } catch {
      // A provider failure must not prevent the rest of host cleanup.
    }
  };

  const publish = (next: SessionView) => {
    view = freezeView(next);
    for (const listener of [...listeners]) {
      try {
        listener(view);
      } catch {
        // A subscriber cannot interrupt host cleanup or other subscribers.
      }
    }
  };

  const noVisualAccess = (
    base: SessionView,
    changes: Partial<SessionView> = {},
  ): SessionView => ({
    ...base,
    ...changes,
    // The current desktop milestone has no visual provider or grant state.
    token: null,
    visual: 'unavailable',
    availableActions: [],
  });

  const clearBinding = (
    binding: SessionView['binding'],
    reason: SessionView['reason'],
  ) => {
    selectedBinding = null;
    publish(
      noVisualAccess(view, {
        generation: view.generation + 1,
        binding,
        consent: 'off',
        selectedWindow: null,
        paused: false,
        reason,
      }),
    );
  };

  const invalidate = () => {
    if (disposed) return;
    abortActive();
    // Renderer navigation/reload invalidates the native binding as well as
    // any transient authorization; a new renderer must select again.
    clearBinding('disconnected', 'canceled');
  };

  const currentSelection = (generation: number, binding?: WindowBinding) =>
    !disposed &&
    view.generation === generation &&
    (binding === undefined || selectedBinding === binding);

  const disconnectIfCurrent = (
    generation: number,
    binding: WindowBinding,
    reason: 'window-lost' | 'provider-failed',
  ): SessionView => {
    if (!currentSelection(generation, binding)) return view;
    selectedBinding = null;
    publish(
      noVisualAccess(view, {
        generation: view.generation + 1,
        binding: 'disconnected',
        consent: 'off',
        selectedWindow: null,
        reason,
      }),
    );
    abortActive();
    return view;
  };

  const selectWindow = async (windowToken: string): Promise<SessionView> => {
    abortActive();
    selectedBinding = null;
    publish(
      noVisualAccess(view, {
        generation: view.generation + 1,
        binding: 'unbound',
        consent: 'off',
        selectedWindow: null,
        paused: false,
        reason: 'canceled',
      }),
    );
    const selectionGeneration = view.generation;

    let binding: WindowBinding | null;
    try {
      binding = await dependencies.windowCatalog.select(windowToken);
    } catch {
      if (!currentSelection(selectionGeneration)) return view;
      publish(
        noVisualAccess(view, {
          generation: view.generation + 1,
          binding: 'disconnected',
          consent: 'off',
          selectedWindow: null,
          reason: 'provider-failed',
        }),
      );
      return view;
    }

    if (!currentSelection(selectionGeneration)) return view;
    if (!binding || binding.token !== windowToken) {
      publish(
        noVisualAccess(view, {
          generation: view.generation + 1,
          binding: 'disconnected',
          consent: 'off',
          selectedWindow: null,
          reason: 'window-lost',
        }),
      );
      return view;
    }

    let isCurrent: boolean;
    try {
      isCurrent = await dependencies.windowCatalog.isCurrent(binding);
    } catch {
      if (!currentSelection(selectionGeneration)) return view;
      publish(
        noVisualAccess(view, {
          generation: view.generation + 1,
          binding: 'disconnected',
          consent: 'off',
          selectedWindow: null,
          reason: 'provider-failed',
        }),
      );
      return view;
    }

    if (!currentSelection(selectionGeneration)) return view;
    if (!isCurrent) {
      publish(
        noVisualAccess(view, {
          generation: view.generation + 1,
          binding: 'disconnected',
          consent: 'off',
          selectedWindow: null,
          reason: 'window-lost',
        }),
      );
      return view;
    }

    selectedBinding = binding;
    publish(
      noVisualAccess(view, {
        binding: 'selected',
        selectedWindow: summaryFor(binding),
        consent: 'off',
        reason: 'unsupported',
      }),
    );
    return view;
  };

  const controller: SessionController = {
    getView: () => view,

    async command(value: unknown) {
      const command: Command = parseCommand(value);
      if (disposed) return view;

      switch (command.type) {
        case 'select':
          return selectWindow(command.windowToken);
        case 'consent':
          if (!command.allow) {
            abortActive();
            publish(
              noVisualAccess(view, {
                generation: view.generation + 1,
                consent: 'denied',
                reason: 'unsupported',
              }),
            );
          } else {
            // No grant is representable in this milestone, even for an
            // allow=true renderer request.
            abortActive();
            publish(
              noVisualAccess(view, {
                generation: view.generation + 1,
                consent: view.consent,
                reason: 'unsupported',
              }),
            );
          }
          return view;
        case 'use-written':
          abortActive();
          selectedBinding = null;
          publish(
            noVisualAccess(view, {
              generation: view.generation + 1,
              binding: 'unbound',
              consent: 'off',
              selectedWindow: null,
              paused: false,
              reason: 'unsupported',
            }),
          );
          return view;
        case 'show':
          // Visual inspection, recognition, and highlighting are unavailable.
          return noVisualAccess(view, { reason: 'unsupported' });
        case 'pause':
          if (command.paused) {
            // Repeated Pause also invalidates an in-flight resume check.
            abortActive();
            publish(
              noVisualAccess(view, {
                paused: true,
                generation: view.generation + 1,
                reason: 'canceled',
              }),
            );
            return view;
          }

          if (!view.paused) return view;

          const binding = selectedBinding;
          const generation = view.generation;
          if (binding) {
            let isCurrent: boolean;
            try {
              isCurrent = await dependencies.windowCatalog.isCurrent(binding);
            } catch {
              return disconnectIfCurrent(
                generation,
                binding,
                'provider-failed',
              );
            }

            if (!currentSelection(generation, binding)) return view;
            if (!isCurrent)
              return disconnectIfCurrent(generation, binding, 'window-lost');
          }

          publish(
            noVisualAccess(view, {
              paused: false,
              generation: view.generation + 1,
            }),
          );
          return view;
        case 'cancel':
          abortActive();
          publish(
            noVisualAccess(view, {
              generation: view.generation + 1,
              reason: 'canceled',
            }),
          );
          return view;
        case 'revoke':
          abortActive();
          publish(
            noVisualAccess(view, {
              generation: view.generation + 1,
              consent: 'off',
              reason: 'unsupported',
            }),
          );
          return view;
        case 'disconnect':
          abortActive();
          clearBinding('disconnected', 'canceled');
          return view;
        case 'reset-position':
          abortActive();
          publish(
            noVisualAccess(view, {
              generation: view.generation + 1,
              reason: 'canceled',
            }),
          );
          await dependencies.resetPosition();
          return view;
        case 'close':
          controller.dispose();
          dependencies.closeWindow();
          return view;
      }
    },

    async checkWindow() {
      const binding = selectedBinding;
      const generation = view.generation;
      if (disposed || !binding) return view;

      try {
        const isCurrent = await dependencies.windowCatalog.isCurrent(binding);
        if (!currentSelection(generation, binding)) return view;
        if (!isCurrent)
          return disconnectIfCurrent(generation, binding, 'window-lost');
        return view;
      } catch {
        return disconnectIfCurrent(generation, binding, 'provider-failed');
      }
    },

    subscribe(listener) {
      if (disposed) return () => undefined;
      listeners.add(listener);
      let active = true;
      return () => {
        if (!active) return;
        active = false;
        listeners.delete(listener);
      };
    },

    invalidate,

    dispose() {
      if (disposed) return;
      abortActive();
      selectedBinding = null;
      view = freezeView(
        noVisualAccess(view, {
          generation: view.generation + 1,
          binding: 'disconnected',
          consent: 'off',
          selectedWindow: null,
          paused: false,
          reason: 'canceled',
        }),
      );
      disposed = true;
      listeners.clear();
      disposeCatalog();
    },
  };

  return controller;
}
