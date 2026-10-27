import {
  EMPTY_SESSION,
  parseCommand,
  type Command,
  type SessionView,
} from '@leqad/desktop-contracts';

export interface SessionDependencies {
  abortActive(): void;
  resetPosition(): Promise<void> | void;
  closeWindow(): void;
}

export interface SessionController {
  getView(): SessionView;
  command(value: unknown): Promise<SessionView>;
  subscribe(listener: (view: SessionView) => void): () => void;
  invalidate(): void;
  dispose(): void;
}

function freezeView(view: SessionView): SessionView {
  return Object.freeze({
    ...view,
    availableActions: Object.freeze([...view.availableActions]),
  });
}

export function createSessionController(
  dependencies: SessionDependencies,
): SessionController {
  let view = freezeView(EMPTY_SESSION);
  let disposed = false;
  const listeners = new Set<(next: SessionView) => void>();

  const abortActive = () => {
    try {
      dependencies.abortActive();
    } catch {
      // Cleanup must continue even if a provider failed while aborting.
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

  const invalidate = () => {
    if (disposed) return;
    abortActive();
    publish({
      ...view,
      generation: view.generation + 1,
      consent: 'off',
      visual: 'unavailable',
      reason: 'canceled',
      availableActions: [],
    });
  };

  const controller: SessionController = {
    getView: () => view,

    async command(value: unknown) {
      const command: Command = parseCommand(value);
      if (disposed) return view;

      switch (command.type) {
        case 'select':
        case 'consent':
        case 'show':
          // This milestone exposes no selector, consent grant, or visual provider.
          return view;
        case 'pause':
          if (command.paused !== view.paused) {
            if (command.paused) abortActive();
            publish({
              ...view,
              paused: command.paused,
              generation: command.paused
                ? view.generation + 1
                : view.generation,
              reason: command.paused ? 'canceled' : view.reason,
            });
          }
          return view;
        case 'cancel':
          invalidate();
          return view;
        case 'revoke':
          abortActive();
          publish({
            ...view,
            generation: view.generation + 1,
            consent: 'off',
            visual: 'unavailable',
            reason: 'unsupported',
            availableActions: [],
          });
          return view;
        case 'disconnect':
          abortActive();
          publish({
            ...view,
            token: null,
            binding: 'disconnected',
            generation: view.generation + 1,
            consent: 'off',
            visual: 'unavailable',
            reason: 'window-lost',
            availableActions: [],
          });
          return view;
        case 'reset-position':
          abortActive();
          publish({
            ...view,
            generation: view.generation + 1,
            visual: 'unavailable',
            reason: 'canceled',
            availableActions: [],
          });
          await dependencies.resetPosition();
          return view;
        case 'close':
          controller.dispose();
          dependencies.closeWindow();
          return view;
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
      view = freezeView({
        ...view,
        generation: view.generation + 1,
        consent: 'off',
        visual: 'unavailable',
        reason: 'canceled',
        availableActions: [],
      });
      disposed = true;
      listeners.clear();
    },
  };

  return controller;
}
