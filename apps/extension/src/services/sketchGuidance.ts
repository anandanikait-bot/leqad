import { findSemanticTarget } from './semanticTargets';
import {
  observedSketchDialogPlane,
  type ReferencePlane,
} from './referencePlanes';

export interface SketchGuidanceObservation {
  editingAppearsActive: boolean;
  /** Absence of supported evidence does not establish that Sketch is closed. */
  uiState: 'OPEN' | 'UNKNOWN';
  dialogPlane: ReferencePlane | null;
}

export interface SketchGuidanceMonitor {
  readonly current: SketchGuidanceObservation;
  refresh: () => SketchGuidanceObservation;
  subscribe: (
    listener: (observation: SketchGuidanceObservation) => void,
  ) => () => void;
  disconnect: () => void;
}

export function observeSketchGuidanceUi(
  root: ParentNode,
): SketchGuidanceObservation {
  // A visible, distinctly labeled Sketch dialog with a recognized plane is
  // sufficient to offer help for sketch editing. This observation is *not*
  // model verification and does not establish editing permission.
  const dialogPlane = observedSketchDialogPlane(root);
  const editingAppearsActive =
    findSemanticTarget(root, 'finish-sketch') !== null || dialogPlane !== null;
  return {
    editingAppearsActive,
    uiState: editingAppearsActive ? 'OPEN' : 'UNKNOWN',
    dialogPlane,
  };
}

function sameObservation(
  left: SketchGuidanceObservation,
  right: SketchGuidanceObservation,
): boolean {
  return (
    left.editingAppearsActive === right.editingAppearsActive &&
    left.dialogPlane === right.dialogPlane
  );
}

/**
 * Keep the panel's guidance context current as recognized Sketch UI appears,
 * disappears, or changes visibility. This reports UI evidence only.
 */
export function createSketchGuidanceMonitor(
  root: ParentNode,
): SketchGuidanceMonitor {
  const rootNode = root as Node;
  const document =
    rootNode.nodeType === Node.DOCUMENT_NODE
      ? (rootNode as Document)
      : rootNode.ownerDocument;
  const view = document?.defaultView;
  let current = observeSketchGuidanceUi(root);
  let frame: number | null = null;
  let disconnected = false;
  const listeners = new Set<(observation: SketchGuidanceObservation) => void>();

  const refresh = (): SketchGuidanceObservation => {
    if (disconnected) return current;
    const next = observeSketchGuidanceUi(root);
    if (!sameObservation(current, next)) {
      current = next;
      for (const listener of listeners) listener(current);
    }
    return current;
  };

  const scheduleRefresh = () => {
    if (disconnected || frame !== null) return;
    if (view?.requestAnimationFrame) {
      frame = view.requestAnimationFrame(() => {
        frame = null;
        refresh();
      });
    } else {
      refresh();
    }
  };

  const observer = view?.MutationObserver
    ? new view.MutationObserver(scheduleRefresh)
    : null;
  const observationRoot =
    rootNode.nodeType === Node.DOCUMENT_NODE
      ? document?.documentElement
      : rootNode;
  if (observer && observationRoot) {
    observer.observe(observationRoot, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
      attributeFilter: [
        'aria-disabled',
        'aria-expanded',
        'aria-hidden',
        'aria-label',
        'aria-labelledby',
        'id',
        'class',
        'data-tooltip',
        'disabled',
        'hidden',
        'inert',
        'role',
        'style',
        'title',
      ],
    });
  }
  view?.addEventListener('resize', scheduleRefresh, { passive: true });
  view?.addEventListener('scroll', scheduleRefresh, {
    capture: true,
    passive: true,
  });

  return {
    get current() {
      return current;
    },
    refresh,
    subscribe(listener) {
      if (disconnected) return () => undefined;
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    disconnect() {
      if (disconnected) return;
      disconnected = true;
      observer?.disconnect();
      view?.removeEventListener('resize', scheduleRefresh);
      view?.removeEventListener('scroll', scheduleRefresh, true);
      if (frame !== null) view?.cancelAnimationFrame(frame);
      frame = null;
      listeners.clear();
    },
  };
}
