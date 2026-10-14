import { normalizedText, semanticName } from './semanticTargetDom';
import { planeIdentity, type ReferencePlane } from './referencePlanes';

export const FEATURE_LIST_CAPTURE_LIMITS = {
  ancestorLevels: 8,
  siblingRadius: 2,
  inspectedElements: 256,
  labelMatches: 24,
  matchesPerSibling: 8,
} as const;

const safeTags = new Set([
  'div',
  'span',
  'button',
  'label',
  'input',
  'svg',
  'text',
  'g',
  'canvas',
  'li',
  'ul',
  'section',
  'a',
  'p',
  'td',
  'tr',
  'table',
  'main',
  'nav',
  'aside',
  'article',
  'h1',
  'h2',
  'h3',
]);
const safeRoles = new Set([
  'tree',
  'treegrid',
  'treeitem',
  'row',
  'group',
  'button',
  'option',
  'dialog',
  'toolbar',
  'img',
  'combobox',
  'status',
  'note',
  'gridcell',
  'list',
  'listitem',
  'menuitem',
  'tab',
  'link',
  'none',
  'presentation',
]);

export interface RelativeGeometry {
  /** Ratios relative to the clicked label's width and height, rounded to 0.1. */
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FeatureListStructureNode {
  tag: string;
  role: string;
  rolePresent: boolean;
  ariaLabelPresent: boolean;
  ariaLabelledByPresent: boolean;
  titlePresent: boolean;
  tabIndexPresent: boolean;
  ariaExpanded: 'TRUE' | 'FALSE' | 'ABSENT';
  ariaHidden: 'TRUE' | 'FALSE' | 'ABSENT';
  hiddenAttributePresent: boolean;
  planeMatches: ReferencePlane[];
  defaultGeometryMatch: boolean;
  actionable: boolean;
  actionabilityEvidence: 'MARKUP_SIGNAL' | 'NOT_EXPOSED';
  visibility: string;
  enabled: string;
  context: string;
  geometryRelativeToClicked: RelativeGeometry | null;
}

export interface FeatureListNestedLabelMatch {
  depth: number;
  label: ReferencePlane | 'Default geometry';
  node: FeatureListStructureNode;
}

export interface FeatureListSiblingObservation {
  offsetFromCapturedBranch: number;
  capturedBranch: boolean;
  node: FeatureListStructureNode;
  nestedLabelMatches: FeatureListNestedLabelMatch[];
  nestedScanTruncated: boolean;
}

export interface FeatureListParentRelationship {
  ancestorDistance: number;
  parent: FeatureListStructureNode;
  parentChildCount: number;
  parentChildCountCapped: boolean;
  omittedSiblingsBefore: boolean;
  omittedSiblingsAfter: boolean;
  siblings: FeatureListSiblingObservation[];
}

export interface FeatureListStructureCapture {
  capturedPath: FeatureListStructureNode[];
  relationships: FeatureListParentRelationship[];
  elementsInspected: number;
  labelMatchesRecorded: number;
  truncated: boolean;
  interactionHandling: 'JAVASCRIPT_HANDLER_NOT_INSPECTED';
}

function safeRole(element: Element): string {
  const role = normalizedText(element.getAttribute('role'));
  if (role) return safeRoles.has(role) ? role : 'other';
  const implicitRole: Record<string, string> = {
    a: 'link',
    button: 'button',
    li: 'listitem',
    ul: 'list',
    tr: 'row',
    td: 'gridcell',
  };
  return implicitRole[element.localName] ?? 'none';
}

function isActionableMarkup(element: Element): boolean {
  return (
    element.matches(
      'button,input,select,textarea,a[href],[role="button"],[role="treeitem"],[role="row"],[role="option"],[role="menuitem"],[role="tab"]',
    ) ||
    (element.hasAttribute('tabindex') &&
      Number(element.getAttribute('tabindex')) >= 0)
  );
}

function relativeGeometry(
  element: Element,
  clickedRect: DOMRect,
): RelativeGeometry | null {
  const rect = element.getBoundingClientRect();
  if (
    clickedRect.width <= 0 ||
    clickedRect.height <= 0 ||
    rect.width <= 0 ||
    rect.height <= 0
  )
    return null;
  const ratio = (value: number) =>
    Math.round(Math.max(-1000, Math.min(1000, value)) * 10) / 10;
  return {
    x: ratio((rect.left - clickedRect.left) / clickedRect.width),
    y: ratio((rect.top - clickedRect.top) / clickedRect.height),
    width: ratio(rect.width / clickedRect.width),
    height: ratio(rect.height / clickedRect.height),
  };
}

function stateAttribute(
  element: Element,
  attribute: 'aria-expanded' | 'aria-hidden',
): 'TRUE' | 'FALSE' | 'ABSENT' {
  const value = element.getAttribute(attribute);
  if (value === 'true') return 'TRUE';
  if (value === 'false') return 'FALSE';
  return 'ABSENT';
}

function boundedContext(element: Element): string {
  let ancestor: Element | null = element;
  let steps = 0;
  let defaultGeometrySeen = false;
  while (ancestor && steps < 12) {
    if (ancestor.matches('[role="dialog"],dialog')) return 'SKETCH_DIALOG';
    if (ancestor.matches('canvas,svg,[role="img"]')) return 'VIEWPORT';
    if (
      ancestor.matches('[role="toolbar"]') &&
      /^(view|camera|orientation)( controls)?$/.test(semanticName(ancestor))
    )
      return 'VIEW_CONTROLS';
    if (
      ancestor !== element &&
      ['group', 'treeitem', 'tree', 'treegrid'].includes(
        normalizedText(ancestor.getAttribute('role')),
      ) &&
      semanticName(ancestor) === 'default geometry'
    )
      defaultGeometrySeen = true;
    if (
      defaultGeometrySeen &&
      ancestor.matches('[role="tree"],[role="treegrid"]')
    ) {
      return 'FEATURE_TREE';
    }
    ancestor = ancestor.parentElement;
    steps++;
  }
  return ancestor ? 'ANCESTOR_DEPTH_LIMIT_REACHED' : 'UNKNOWN';
}

function boundedVisibilityState(element: Element): string {
  const view = element.ownerDocument.defaultView;
  const rect = element.getBoundingClientRect();
  let current: Element | null = element;
  let steps = 0;
  while (current && steps < 12) {
    if (
      !current.isConnected ||
      current.hasAttribute('hidden') ||
      current.getAttribute('aria-hidden') === 'true' ||
      (current !== element &&
        current.matches('[role="group"],[role="treeitem"]') &&
        current.getAttribute('aria-expanded') === 'false')
    )
      return 'HIDDEN';
    const style = view?.getComputedStyle(current);
    if (
      style &&
      (style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        style.opacity === '0')
    )
      return 'HIDDEN';
    if (
      current !== element &&
      style &&
      /(hidden|clip|auto|scroll)/.test(
        `${style.overflow} ${style.overflowX} ${style.overflowY}`,
      )
    ) {
      const clip = current.getBoundingClientRect();
      if (
        clip.width > 0 &&
        clip.height > 0 &&
        (rect.left < clip.left ||
          rect.right > clip.right ||
          rect.top < clip.top ||
          rect.bottom > clip.bottom)
      )
        return 'CLIPPED';
    }
    current = current.parentElement;
    steps++;
  }
  if (current) return 'ANCESTOR_DEPTH_LIMIT_REACHED';
  if (rect.width <= 0 || rect.height <= 0) return 'ZERO_SIZE';
  const width = view?.innerWidth ?? Infinity;
  const height = view?.innerHeight ?? Infinity;
  if (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= height ||
    rect.left >= width
  )
    return 'OFFSCREEN';
  if (
    rect.top < 0 ||
    rect.left < 0 ||
    rect.right > width ||
    rect.bottom > height
  )
    return 'CLIPPED';
  const hit = element.ownerDocument.elementFromPoint?.(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
  if (hit && hit !== element && !element.contains(hit)) return 'OBSCURED';
  return 'VISIBLE';
}

function boundedEnabledState(element: Element): string {
  let current: Element | null = element;
  let steps = 0;
  while (current && steps < 12) {
    if (
      current.getAttribute('aria-disabled') === 'true' ||
      current.hasAttribute('inert') ||
      ('disabled' in current &&
        Boolean((current as HTMLButtonElement).disabled))
    )
      return 'DISABLED';
    current = current.parentElement;
    steps++;
  }
  return current ? 'ANCESTOR_DEPTH_LIMIT_REACHED' : 'ENABLED';
}

function structureNode(
  element: Element,
  clickedRect: DOMRect,
): FeatureListStructureNode {
  const name = semanticName(element);
  const titleName = normalizedText(element.getAttribute('title'));
  const plane = planeIdentity(name) ?? planeIdentity(titleName);
  const actionable = isActionableMarkup(element);
  return {
    tag: safeTags.has(element.localName) ? element.localName : 'other',
    role: safeRole(element),
    rolePresent: element.hasAttribute('role'),
    ariaLabelPresent: element.hasAttribute('aria-label'),
    ariaLabelledByPresent: element.hasAttribute('aria-labelledby'),
    titlePresent: element.hasAttribute('title'),
    tabIndexPresent: element.hasAttribute('tabindex'),
    ariaExpanded: stateAttribute(element, 'aria-expanded'),
    ariaHidden: stateAttribute(element, 'aria-hidden'),
    hiddenAttributePresent: element.hasAttribute('hidden'),
    planeMatches: plane ? [plane] : [],
    defaultGeometryMatch:
      name === 'default geometry' || titleName === 'default geometry',
    actionable,
    actionabilityEvidence: actionable ? 'MARKUP_SIGNAL' : 'NOT_EXPOSED',
    visibility: boundedVisibilityState(element),
    enabled: boundedEnabledState(element),
    context: boundedContext(element),
    geometryRelativeToClicked: relativeGeometry(element, clickedRect),
  };
}

function boundedLabel(
  element: Element,
): ReferencePlane | 'Default geometry' | null {
  const name = semanticName(element);
  const titleName = normalizedText(element.getAttribute('title'));
  const plane = planeIdentity(name) ?? planeIdentity(titleName);
  if (plane) return plane;
  return name === 'default geometry' || titleName === 'default geometry'
    ? 'Default geometry'
    : null;
}

/**
 * Collects a local outline around the clicked element only. It records
 * allowlisted labels and structure, never arbitrary text or attributes.
 */
export function captureFeatureListStructure(
  clickedLabel: HTMLElement,
  path: readonly HTMLElement[],
): FeatureListStructureCapture {
  const clickedRect = clickedLabel.getBoundingClientRect();
  const capturedPath = path.map((element) =>
    structureNode(element, clickedRect),
  );
  const relationships: FeatureListParentRelationship[] = [];
  let elementsInspected = 0;
  let labelMatchesRecorded = 0;
  let truncated = path.length - 1 > FEATURE_LIST_CAPTURE_LIMITS.ancestorLevels;
  const maxLevels = Math.min(
    path.length - 1,
    FEATURE_LIST_CAPTURE_LIMITS.ancestorLevels,
  );
  for (let distance = 0; distance < maxLevels; distance++) {
    const branch = path[distance]!;
    const parent = path[distance + 1]!;
    const before: Element[] = [];
    let previous = branch.previousElementSibling;
    while (
      previous &&
      before.length < FEATURE_LIST_CAPTURE_LIMITS.siblingRadius
    ) {
      before.unshift(previous);
      previous = previous.previousElementSibling;
    }
    const after: Element[] = [];
    let next = branch.nextElementSibling;
    while (next && after.length < FEATURE_LIST_CAPTURE_LIMITS.siblingRadius) {
      after.push(next);
      next = next.nextElementSibling;
    }
    const siblingWindow = [...before, branch, ...after];
    if (previous || next) truncated = true;
    const siblings: FeatureListSiblingObservation[] = [];

    for (let index = 0; index < siblingWindow.length; index++) {
      const sibling = siblingWindow[index]!;
      const node = structureNode(sibling, clickedRect);
      const nestedLabelMatches: FeatureListNestedLabelMatch[] = [];
      let nestedScanTruncated = false;
      const walker = clickedLabel.ownerDocument.createTreeWalker(sibling, 1);
      let current: Node | null = walker.currentNode;
      let depth = 0;
      while (current) {
        if (
          elementsInspected >= FEATURE_LIST_CAPTURE_LIMITS.inspectedElements
        ) {
          nestedScanTruncated = true;
          truncated = true;
          break;
        }
        elementsInspected++;
        const element = current as Element;
        const label = boundedLabel(element);
        if (label) {
          if (
            labelMatchesRecorded < FEATURE_LIST_CAPTURE_LIMITS.labelMatches &&
            nestedLabelMatches.length <
              FEATURE_LIST_CAPTURE_LIMITS.matchesPerSibling
          ) {
            nestedLabelMatches.push({
              depth,
              label,
              node: structureNode(element, clickedRect),
            });
            labelMatchesRecorded++;
          } else {
            nestedScanTruncated = true;
            truncated = true;
          }
        }
        current = walker.nextNode();
        if (current) {
          let ancestor = current.parentElement;
          depth = 1;
          while (
            ancestor &&
            ancestor !== sibling &&
            depth < FEATURE_LIST_CAPTURE_LIMITS.ancestorLevels
          ) {
            depth++;
            ancestor = ancestor.parentElement;
          }
          if (ancestor !== sibling)
            depth = FEATURE_LIST_CAPTURE_LIMITS.ancestorLevels + 1;
        }
      }
      if (nestedScanTruncated) truncated = true;
      siblings.push({
        offsetFromCapturedBranch: index - before.length,
        capturedBranch: sibling === branch,
        node,
        nestedLabelMatches,
        nestedScanTruncated,
      });
    }

    const parentCount = parent.childElementCount;
    relationships.push({
      ancestorDistance: distance,
      parent: structureNode(parent, clickedRect),
      parentChildCount: Math.min(parentCount, 100),
      parentChildCountCapped: parentCount > 100,
      omittedSiblingsBefore: Boolean(previous),
      omittedSiblingsAfter: Boolean(next),
      siblings,
    });
  }

  // The tree walker uses only direct descendants of the selected sibling
  // windows. This explicit count is a diagnostic bound, not a page scan.
  return {
    capturedPath,
    relationships,
    elementsInspected,
    labelMatchesRecorded,
    truncated,
    interactionHandling: 'JAVASCRIPT_HANDLER_NOT_INSPECTED',
  };
}
