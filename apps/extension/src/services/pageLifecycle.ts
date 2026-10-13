export interface RemovablePageResource {
  remove(): void;
}

export interface PageInitializationAttempt {
  generation: number;
  contextKey: string;
}

export interface PageLifecycleCoordinator {
  begin(contextKey: string): PageInitializationAttempt | null;
  isCurrent(attempt: PageInitializationAttempt): boolean;
  activate(
    attempt: PageInitializationAttempt,
    resource: RemovablePageResource,
  ): boolean;
  abandon(attempt: PageInitializationAttempt): void;
  invalidate(): void;
}

export function createPageLifecycleCoordinator(): PageLifecycleCoordinator {
  let generation = 0;
  let pendingContextKey: string | null = null;
  let activeContextKey: string | null = null;
  let activeResource: RemovablePageResource | null = null;

  const disposeActive = () => {
    activeResource?.remove();
    activeResource = null;
    activeContextKey = null;
  };

  const isCurrent = (attempt: PageInitializationAttempt) =>
    attempt.generation === generation &&
    attempt.contextKey === pendingContextKey;

  return {
    begin(contextKey) {
      if (contextKey === activeContextKey || contextKey === pendingContextKey) {
        return null;
      }
      generation += 1;
      pendingContextKey = contextKey;
      disposeActive();
      return { generation, contextKey };
    },
    isCurrent,
    activate(attempt, resource) {
      if (!isCurrent(attempt)) {
        resource.remove();
        return false;
      }
      disposeActive();
      activeResource = resource;
      activeContextKey = attempt.contextKey;
      pendingContextKey = null;
      return true;
    },
    abandon(attempt) {
      if (!isCurrent(attempt)) return;
      pendingContextKey = null;
    },
    invalidate() {
      generation += 1;
      pendingContextKey = null;
      disposeActive();
    },
  };
}
