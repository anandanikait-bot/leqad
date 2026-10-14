import type { SemanticTargetId, TargetCandidate } from './semanticTargets';
import {
  enabledState,
  isLeqadOwned,
  normalizedText,
  semanticName,
  visibilityState,
} from './semanticTargetDom';

export type ReferencePlane = 'Top' | 'Front' | 'Right';
export type ReferencePlaneContext =
  'FEATURE_TREE' | 'SKETCH_DIALOG' | 'VIEWPORT' | 'VIEW_CONTROLS' | 'UNKNOWN';

const planeNames = new Map<string, ReferencePlane>([
  ['top', 'Top'],
  ['top plane', 'Top'],
  ['front', 'Front'],
  ['front plane', 'Front'],
  ['right', 'Right'],
  ['right plane', 'Right'],
]);
const ROW_SELECTOR =
  '[role="treeitem"],[role="row"],[role="option"],button,[role="button"],[tabindex]';
const LABEL_SELECTOR = `${ROW_SELECTOR},[aria-label],[aria-labelledby],[title],span,label`;

export function planeIdentity(name: string): ReferencePlane | null {
  return planeNames.get(normalizedText(name)) ?? null;
}

export function isReferencePlaneTarget(
  targetId: SemanticTargetId,
): targetId is 'top-plane' | 'front-plane' | 'right-plane' {
  return (
    targetId === 'top-plane' ||
    targetId === 'front-plane' ||
    targetId === 'right-plane'
  );
}

export function referencePlaneContext(element: Element): ReferencePlaneContext {
  if (element.closest('[role="dialog"],dialog')) return 'SKETCH_DIALOG';
  if (element.closest('canvas,svg,[role="img"]')) return 'VIEWPORT';
  const toolbar = element.closest('[role="toolbar"]');
  if (
    toolbar &&
    /^(view|camera|orientation)( controls)?$/.test(semanticName(toolbar))
  )
    return 'VIEW_CONTROLS';
  if (!element.closest('[role="tree"],[role="treegrid"]')) return 'UNKNOWN';
  for (
    let ancestor: Element | null = element.parentElement;
    ancestor;
    ancestor = ancestor.parentElement
  ) {
    if (
      ancestor.matches(
        '[role="group"],[role="treeitem"],[role="tree"],[role="treegrid"]',
      ) &&
      semanticName(ancestor) === 'default geometry'
    )
      return 'FEATURE_TREE';
  }
  return 'UNKNOWN';
}

export function referencePlaneCandidate(
  seed: HTMLElement,
  targetId: SemanticTargetId,
): TargetCandidate | null {
  const requested = planeIdentity(targetId.replace('-', ' '));
  const name = semanticName(seed) || normalizedText(seed.getAttribute('title'));
  if (
    !requested ||
    (planeIdentity(name) !== requested &&
      !name.includes(`${requested.toLowerCase()} plane`))
  )
    return null;
  const row =
    seed.closest<HTMLElement>(
      '[role="treeitem"],[role="row"],[role="option"]',
    ) ?? seed.closest<HTMLElement>(ROW_SELECTOR);
  // A label nested inside a real semantic row highlights that row, not the span.
  const actionable =
    row &&
    (row.matches('[role="treeitem"],[role="row"],[role="option"]') ||
      row.matches('button,[role="button"]') ||
      row.tabIndex >= 0);
  const element = actionable ? row : seed;
  const context = referencePlaneContext(element);
  const rowName = semanticName(element);
  const contextValid = Boolean(
    actionable &&
    context === 'FEATURE_TREE' &&
    planeIdentity(name) === requested &&
    planeIdentity(rowName) === requested,
  );
  const exactLongLabel =
    contextValid &&
    normalizedText(element.getAttribute('aria-label')) ===
      `${requested.toLowerCase()} plane`;
  return {
    element,
    strategy: contextValid
      ? exactLongLabel
        ? 'EXACT_ACCESSIBLE_LABEL'
        : 'VALIDATED_CONTEXT'
      : 'WEAK_TEXT',
    confidence: contextValid ? (exactLongLabel ? 'HIGH' : 'MEDIUM') : 'LOW',
    rank: contextValid ? (exactLongLabel ? 0 : 4) : 5,
    visibility: visibilityState(element),
    enabled: enabledState(element),
    leqadOwned: isLeqadOwned(element),
    contextValid,
    context,
    ...(contextValid
      ? {}
      : {
          rejectionReason:
            'The plane label has no validated actionable row in the Default geometry feature tree.',
        }),
  };
}

export function referencePlaneCandidates(
  root: ParentNode,
  targetId: SemanticTargetId,
): TargetCandidate[] {
  const rows = new Map<HTMLElement, TargetCandidate>();
  for (const seed of root.querySelectorAll<HTMLElement>(LABEL_SELECTOR)) {
    const candidate = referencePlaneCandidate(seed, targetId);
    if (!candidate) continue;
    const prior = rows.get(candidate.element);
    if (!prior || candidate.rank < prior.rank)
      rows.set(candidate.element, candidate);
  }
  return [...rows.values()].sort((a, b) => a.rank - b.rank);
}

export function observedSketchDialogPlane(
  root: ParentNode,
): ReferencePlane | null {
  const planes = new Set<ReferencePlane>();
  for (const dialog of root.querySelectorAll('[role="dialog"],dialog')) {
    const heading = dialog.querySelector('[role="heading"],h1,h2,h3');
    if (
      !/^sketch(?: \d+)?$/.test(semanticName(dialog)) &&
      (!heading || !/^sketch(?: \d+)?$/.test(semanticName(heading)))
    )
      continue;
    if (visibilityState(dialog as HTMLElement) !== 'VISIBLE') continue;
    for (const field of dialog.querySelectorAll<HTMLElement>(
      '[aria-label],[role="status"],[role="note"],[role="combobox"],label',
    )) {
      const match = semanticName(field).match(
        /^sketch plane (top|front|right)( plane)?$/,
      );
      const plane = match?.[1] ? planeIdentity(match[1]) : null;
      if (plane && visibilityState(field) === 'VISIBLE') planes.add(plane);
    }
  }
  return planes.size === 1 ? [...planes][0]! : null;
}
