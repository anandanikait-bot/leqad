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
const NON_ARIA_ANCESTOR_LIMIT = 8;
const NON_ARIA_CHILD_LIMIT = 32;
const NON_ARIA_TEXT_NODE_LIMIT = 64;
const NON_ARIA_TEXT_LENGTH_LIMIT = 128;
const NON_ARIA_EXCLUDED_CONTEXT =
  '[role="tree"],[role="treegrid"],[role="dialog"],dialog,canvas,svg,[role="img"],[role="toolbar"],[role="menu"],[role="menubar"],[role="tablist"],nav,form';
const EXPLICIT_ACTION_MARKUP =
  'button,a[href],input,select,textarea,summary,[role="button"],[role="link"],[role="menuitem"],[role="tab"],[role="option"],[role="treeitem"],[role="row"],[tabindex],[contenteditable="true"]';

interface ElementBounds {
  top: number;
  right: number;
  bottom: number;
  left: number;
  width: number;
  height: number;
}

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

// The authenticated v3 capture exposes plain text inside div wrappers. Keep
// these reads local and bounded; the result is used only for exact allowlisted
// structural names and is never exported.
function boundedPlainText(element: Element): string | null {
  let text = '';
  let visited = 0;
  let incomplete = false;

  const visit = (node: Node): void => {
    if (incomplete) return;
    if (++visited > NON_ARIA_TEXT_NODE_LIMIT) {
      incomplete = true;
      return;
    }
    if (node.nodeType === 3) {
      text += node.nodeValue ?? '';
      if (text.length > NON_ARIA_TEXT_LENGTH_LIMIT) incomplete = true;
      return;
    }
    if (
      node.nodeType === 1 &&
      (node as Element).matches('[aria-hidden="true"],svg')
    )
      return;
    for (const child of node.childNodes) visit(child);
  };

  visit(element);
  return incomplete ? null : text.trim();
}

function hasExplicitActionMarkup(element: Element): boolean {
  return (
    element.matches(EXPLICIT_ACTION_MARKUP) ||
    Boolean(element.querySelector(EXPLICIT_ACTION_MARKUP))
  );
}

function excludedNonAriaContext(element: Element): boolean {
  return Boolean(element.closest(NON_ARIA_EXCLUDED_CONTEXT));
}

function isPlainDiv(element: Element): boolean {
  return (
    element.tagName === 'DIV' &&
    !element.hasAttribute('role') &&
    !element.hasAttribute('tabindex') &&
    !element.matches('[contenteditable="true"]')
  );
}

function readBounds(element: Element): ElementBounds | null {
  const rect = element.getBoundingClientRect();
  const values = [
    rect.top,
    rect.right,
    rect.bottom,
    rect.left,
    rect.width,
    rect.height,
  ];
  if (values.some((value) => !Number.isFinite(value))) return null;
  return {
    top: rect.top,
    right: rect.right,
    bottom: rect.bottom,
    left: rect.left,
    width: rect.width,
    height: rect.height,
  };
}

function containsBounds(container: ElementBounds, content: ElementBounds) {
  return (
    content.width > 0 &&
    content.height > 0 &&
    container.left <= content.left &&
    container.top <= content.top &&
    container.right >= content.right &&
    container.bottom >= content.bottom
  );
}

function overlapsBounds(left: ElementBounds, right: ElementBounds) {
  return (
    Math.min(left.right, right.right) > Math.max(left.left, right.left) &&
    Math.min(left.bottom, right.bottom) > Math.max(left.top, right.top)
  );
}

function exactPlaneSpan(
  row: Element,
  requested: ReferencePlane,
): HTMLElement | null {
  const spans = row.querySelectorAll<HTMLElement>('span');
  if (spans.length > NON_ARIA_TEXT_NODE_LIMIT) return null;
  for (const span of spans) {
    const text = boundedPlainText(span);
    if (
      text !== null &&
      normalizedText(text) === requested.toLowerCase() &&
      (!semanticName(span) ||
        planeIdentity(semanticName(span)) === requested) &&
      visibilityState(span) === 'VISIBLE' &&
      !isLeqadOwned(span)
    )
      return span;
  }
  return null;
}

function exactPlainPlaneBranch(element: Element): ReferencePlane | null {
  if (!isPlainDiv(element) || hasExplicitActionMarkup(element)) return null;
  const text = boundedPlainText(element);
  if (text === null) return null;
  const plane = planeIdentity(text);
  if (!plane) return null;
  const accessibleName = semanticName(element);
  if (accessibleName && planeIdentity(accessibleName) !== plane) return null;
  return exactPlaneSpan(element, plane) ? plane : null;
}

function geometryIdentifiesOneRow(
  row: Element,
  label: Element,
  parent: Element,
  heading: Element,
  siblings: Element[],
): boolean {
  const rowBounds = readBounds(row);
  const labelBounds = readBounds(label);
  const parentBounds = readBounds(parent);
  const headingBounds = readBounds(heading);
  if (!rowBounds || !labelBounds || !parentBounds || !headingBounds)
    return false;
  if (
    rowBounds.width <= 0 ||
    rowBounds.height <= 0 ||
    labelBounds.width <= 0 ||
    labelBounds.height <= 0 ||
    parentBounds.width <= 0 ||
    parentBounds.height <= 0 ||
    headingBounds.width <= 0 ||
    headingBounds.height <= 0 ||
    !containsBounds(rowBounds, labelBounds) ||
    !containsBounds(parentBounds, rowBounds) ||
    !containsBounds(parentBounds, headingBounds)
  )
    return false;

  for (const sibling of siblings) {
    if (sibling === row) continue;
    const siblingBounds = readBounds(sibling);
    if (!siblingBounds) return false;
    if (
      siblingBounds.width > 0 &&
      siblingBounds.height > 0 &&
      overlapsBounds(rowBounds, siblingBounds)
    )
      return false;
  }
  return true;
}

function nonAriaFeatureListCandidate(
  seed: HTMLElement,
  requested: ReferencePlane,
): TargetCandidate | null {
  if (excludedNonAriaContext(seed)) return null;

  let branch: Element | null = seed;
  for (let depth = 0; branch && depth <= NON_ARIA_ANCESTOR_LIMIT; depth += 1) {
    if (
      branch.tagName === 'DIV' &&
      normalizedText(boundedPlainText(branch)) === requested.toLowerCase()
    ) {
      const parent = branch.parentElement;
      if (
        parent &&
        isPlainDiv(branch) &&
        !hasExplicitActionMarkup(branch) &&
        isPlainDiv(parent) &&
        !excludedNonAriaContext(parent) &&
        !isLeqadOwned(branch) &&
        !isLeqadOwned(parent)
      ) {
        const siblings = Array.from(parent.children);
        const rowIndex = siblings.indexOf(branch);
        if (
          siblings.length >= 3 &&
          siblings.length <= NON_ARIA_CHILD_LIMIT &&
          rowIndex >= 0
        ) {
          const headingRows = siblings.filter(
            (sibling) =>
              isPlainDiv(sibling) &&
              normalizedText(boundedPlainText(sibling)) === 'default geometry',
          );
          const heading = headingRows[0];
          const headingIndex = heading ? siblings.indexOf(heading) : -1;
          const label = exactPlaneSpan(branch, requested);
          if (
            headingRows.length === 1 &&
            heading &&
            headingIndex < rowIndex &&
            label &&
            visibilityState(branch as HTMLElement) === 'VISIBLE' &&
            visibilityState(heading as HTMLElement) === 'VISIBLE'
          ) {
            let sawUnlabeledGap = false;
            let validRelationship = true;
            for (const sibling of siblings.slice(headingIndex + 1, rowIndex)) {
              const siblingText = boundedPlainText(sibling);
              if (siblingText === null) {
                validRelationship = false;
                break;
              }
              const siblingName = normalizedText(siblingText);
              if (!siblingName) {
                if (
                  !isPlainDiv(sibling) ||
                  hasExplicitActionMarkup(sibling) ||
                  semanticName(sibling) ||
                  isLeqadOwned(sibling)
                ) {
                  validRelationship = false;
                  break;
                }
                sawUnlabeledGap = true;
                continue;
              }

              // Onshape's built-in Default geometry also contains Origin,
              // immediately before the three reference planes. The v3 live
              // capture showed an unlabeled-to-diagnostics sibling between
              // Default geometry and Top; its exact text was never exported.
              // Accept only the documented Origin label here, not arbitrary
              // intervening feature names. Origin may have its own UI controls.
              if (siblingName === 'origin') {
                if (
                  !isPlainDiv(sibling) ||
                  isLeqadOwned(sibling) ||
                  visibilityState(sibling as HTMLElement) !== 'VISIBLE'
                ) {
                  validRelationship = false;
                  break;
                }
                sawUnlabeledGap = true;
                continue;
              }

              const siblingPlane = exactPlainPlaneBranch(sibling);
              if (
                !siblingPlane ||
                visibilityState(sibling as HTMLElement) !== 'VISIBLE'
              ) {
                validRelationship = false;
                break;
              }
              const siblingLabel = exactPlaneSpan(sibling, siblingPlane);
              if (
                !siblingLabel ||
                !geometryIdentifiesOneRow(
                  sibling,
                  siblingLabel,
                  parent,
                  heading,
                  siblings,
                )
              ) {
                validRelationship = false;
                break;
              }
            }

            if (
              validRelationship &&
              sawUnlabeledGap &&
              enabledState(branch as HTMLElement) !== 'DISABLED' &&
              geometryIdentifiesOneRow(branch, label, parent, heading, siblings)
            ) {
              return {
                element: branch as HTMLElement,
                strategy: 'STRUCTURAL_FEATURE_LIST',
                confidence: 'MEDIUM',
                rank: 5,
                visibility: visibilityState(branch as HTMLElement),
                enabled: 'UNKNOWN',
                leqadOwned: false,
                contextValid: true,
                context: 'NON_ARIA_FEATURE_LIST',
              };
            }
          }
        }
      }
    }
    branch = branch.parentElement;
  }
  return null;
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
  if (contextValid) {
    const exactLongLabel =
      normalizedText(element.getAttribute('aria-label')) ===
      `${requested.toLowerCase()} plane`;
    return {
      element,
      strategy: exactLongLabel ? 'EXACT_ACCESSIBLE_LABEL' : 'VALIDATED_CONTEXT',
      confidence: exactLongLabel ? 'HIGH' : 'MEDIUM',
      rank: exactLongLabel ? 0 : 4,
      visibility: visibilityState(element),
      enabled: enabledState(element),
      leqadOwned: isLeqadOwned(element),
      contextValid: true,
      context,
    };
  }

  const nonAria = nonAriaFeatureListCandidate(seed, requested);
  if (nonAria) return nonAria;

  return {
    element,
    strategy: 'WEAK_TEXT',
    confidence: 'LOW',
    rank: 5,
    visibility: visibilityState(element),
    enabled: enabledState(element),
    leqadOwned: isLeqadOwned(element),
    contextValid: false,
    context,
    rejectionReason:
      'The plane label has no validated row in the Default geometry feature list.',
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
