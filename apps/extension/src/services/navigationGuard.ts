export interface NavigationInitializationGuard {
  begin(): number;
  isCurrent(generation: number): boolean;
  invalidate(): void;
}

export function createNavigationInitializationGuard(): NavigationInitializationGuard {
  let currentGeneration = 0;

  return {
    begin() {
      currentGeneration += 1;
      return currentGeneration;
    },
    isCurrent(generation) {
      return generation === currentGeneration;
    },
    invalidate() {
      currentGeneration += 1;
    },
  };
}
