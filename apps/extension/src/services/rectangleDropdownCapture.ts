import { FEATURE_LIST_CAPTURE_LIMITS } from './featureListStructureCapture';
import { isLeqadOwned } from './semanticTargetDom';
import { RECOGNITION_DIAGNOSTIC_LIMITS } from './recognitionDiagnostics';

export type RectangleDropdownState = 'OPEN' | 'CLOSED' | 'UNKNOWN';
export type RectangleDropdownUserReportedState = 'OPEN' | 'CLOSED';
export type RectangleDropdownLabel =
  | 'Rectangle'
  | 'Corner rectangle'
  | 'Center point rectangle'
  | 'Aligned Rectangle';
export type RectangleDropdownCaptureStatus =
  'CAPTURED' | 'INCOMPLETE' | 'TIMED_OUT' | 'CANCELLED';

export type RectangleDropdownInteractionMode =
  'OBSERVE_MENU' | 'OPEN_THEN_SELECT_RECTANGLE';
export type RectangleDropdownCancelReason =
  | 'USER_STOP'
  | 'REPLACED'
  | 'PANEL_UNMOUNT'
  | 'PAGE_HIDDEN'
  | 'NAVIGATION'
  | 'CONTEXT_CHANGED'
  | 'UNKNOWN';
const WORKFLOW_STATES = [
  'IDLE',
  'WAITING_FOR_MENU_OPEN_INPUT',
  'MENU_INTERACTION_OBSERVED',
  'WAITING_FOR_VARIANT_CLICK',
  'VARIANT_CLICK_OBSERVED',
  'FINISHED',
  'TIMED_OUT',
  'CANCELLED',
] as const;
export type RectangleDropdownWorkflowState = (typeof WORKFLOW_STATES)[number];
const CANCEL_REASONS: readonly RectangleDropdownCancelReason[] = [
  'USER_STOP',
  'REPLACED',
  'PANEL_UNMOUNT',
  'PAGE_HIDDEN',
  'NAVIGATION',
  'CONTEXT_CHANGED',
  'UNKNOWN',
];

export interface RectangleDropdownCaptureLimits {
  scannedElements: number;
  candidateRecords: number;
  capturedAncestors: number;
  siblingRadius: number;
  reportChars: number;
}

export const RECTANGLE_DROPDOWN_CAPTURE_LIMITS: RectangleDropdownCaptureLimits =
  {
    scannedElements: RECOGNITION_DIAGNOSTIC_LIMITS.scannedElements,
    candidateRecords: RECOGNITION_DIAGNOSTIC_LIMITS.candidateRecords,
    capturedAncestors: RECOGNITION_DIAGNOSTIC_LIMITS.capturedAncestors,
    siblingRadius: FEATURE_LIST_CAPTURE_LIMITS.siblingRadius,
    reportChars: RECOGNITION_DIAGNOSTIC_LIMITS.reportChars,
  };

const LABELS = new Map<string, RectangleDropdownLabel>([
  ['rectangle', 'Rectangle'],
  ['corner rectangle', 'Corner rectangle'],
  ['center point rectangle', 'Center point rectangle'],
  ['aligned rectangle', 'Aligned Rectangle'],
]);

const SAFE_TAGS = new Set([
  'a',
  'button',
  'canvas',
  'div',
  'g',
  'input',
  'label',
  'li',
  'main',
  'menu',
  'nav',
  'option',
  'p',
  'section',
  'span',
  'svg',
  'text',
  'ul',
]);

const SAFE_ROLES = new Set([
  'button',
  'dialog',
  'grid',
  'listbox',
  'menu',
  'menuitem',
  'none',
  'other',
  'option',
  'presentation',
  'tab',
  'toolbar',
  'tree',
  'treegrid',
  'treeitem',
]);

type SafeTag = string;
type SafeRole = string;
type RectangleDropdownContext =
  'DIALOG' | 'VIEWPORT' | 'TOOLBAR' | 'OTHER' | 'UNKNOWN';
type SafeBooleanState = 'TRUE' | 'FALSE' | 'ABSENT' | 'OTHER';
type SafePopupValue =
  'MENU' | 'LISTBOX' | 'TREE' | 'GRID' | 'DIALOG' | 'TRUE' | 'ABSENT' | 'OTHER';
type CandidateKind =
  | 'GROUP_LABEL'
  | 'VARIANT_LABEL_DIAGNOSTIC_ONLY'
  | 'DIAGNOSTIC_ONLY_UNVERIFIED'
  | 'UNLABELED_POTENTIAL_TRIGGER'
  | 'UNLISTED_POTENTIAL_TRIGGER'
  | 'INPUT_PATH_STRUCTURE'
  | 'STRUCTURAL_CHANGE';

export interface RectangleDropdownNodeSummary {
  tag: SafeTag;
  role: SafeRole;
  context: RectangleDropdownContext;
  rolePresent: boolean;
  ariaLabelPresent: boolean;
  ariaLabelledByPresent: boolean;
  titlePresent: boolean;
  tabIndexPresent: boolean;
  ariaHasPopup: SafePopupValue;
  ariaExpanded: SafeBooleanState;
  ariaHidden: SafeBooleanState;
  ariaControlsPresent: boolean;
  ariaOwnsPresent: boolean;
  disabledAttributePresent: boolean;
  hiddenAttributePresent: boolean;
  actionableMarkup: 'MARKUP_SIGNAL' | 'NOT_EXPOSED';
  visibility: string;
  connected: boolean;
  enabled: 'ENABLED' | 'DISABLED' | 'UNKNOWN';
}

export interface RectangleDropdownSiblingSummary {
  offset: number;
  node: RectangleDropdownNodeSummary;
  label: RectangleDropdownLabel | null;
}

export interface RectangleDropdownCandidate {
  label: RectangleDropdownLabel | null;
  labelClassification: CandidateKind;
  inputPathMember: boolean;
  inputRelation: {
    kind: 'EVENT_PATH' | 'SIBLING_BRANCH' | 'EXPLICIT_ARIA' | 'UNKNOWN';
    pathDistance: number | null;
    siblingOffset: number | null;
  };
  node: RectangleDropdownNodeSummary;
  ancestors: RectangleDropdownNodeSummary[];
  parentChildCount: number | null;
  parentChildCountCapped: boolean;
  siblings: RectangleDropdownSiblingSummary[];
  relativeGeometry: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
}

export interface RectangleDropdownSnapshot {
  domObservedState: RectangleDropdownState;
  stateBasis: 'ARIA_EXPANDED' | 'SEMANTIC_MENU' | 'UNKNOWN';
  ambiguity: 'DUPLICATE_EXACT_LABELS' | null;
  candidates: RectangleDropdownCandidate[];
  scan: {
    status: 'COMPLETE' | 'INCOMPLETE';
    scannedElements: number;
    unlistedLabelCount: number;
    truncated: boolean;
  };
}

export interface RectangleDropdownManualSnapshot {
  snapshotRole: 'BEFORE' | 'AFTER';
  userReportedState: RectangleDropdownUserReportedState;
  snapshot: RectangleDropdownSnapshot;
}

export interface RectangleDropdownTransition {
  eventCategory: 'POINTER' | 'KEYBOARD' | 'CLICK' | null;
  inputSequence: number;
  scope: 'INPUT_AND_MUTATION_LOCAL';
  inputAssociation: 'UNPROVEN';
  before: RectangleDropdownSnapshot;
  after: RectangleDropdownSnapshot;
  relationship: 'NESTED' | 'SEPARATE_DOCUMENT_BRANCH' | 'AMBIGUOUS' | 'UNKNOWN';
  changedCandidateCount: number;
}

export interface RectangleDropdownInteraction {
  sequence: number;
  eventCategory: RectangleDropdownTransition['eventCategory'];
  clickObserved: boolean;
  clickedLabel: RectangleDropdownLabel | null;
  clickPathMatchesInput: boolean | null;
  path: {
    distance: number;
    label: RectangleDropdownLabel | null;
    node: RectangleDropdownNodeSummary;
  }[];
  pathTruncated: boolean;
  localBefore: RectangleDropdownSnapshot;
}

export interface RectangleDropdownCaptureReport {
  version: 'leqad-rectangle-dropdown/3';
  interactionMode: RectangleDropdownInteractionMode;
  workflowState: RectangleDropdownWorkflowState;
  stateHistory: RectangleDropdownWorkflowState[];
  cancelReason: RectangleDropdownCancelReason | null;
  status: RectangleDropdownCaptureStatus;
  captureMode: 'AUTOMATIC' | 'MANUAL_FALLBACK';
  baseline: RectangleDropdownSnapshot;
  interactions: RectangleDropdownInteraction[];
  transitions: RectangleDropdownTransition[];
  manualSnapshots: RectangleDropdownManualSnapshot[];
  truncated: boolean;
}

export interface RectangleDropdownCaptureResult {
  status: RectangleDropdownCaptureStatus;
  report: RectangleDropdownCaptureReport;
}

export interface RectangleDropdownCaptureTask {
  promise: Promise<RectangleDropdownCaptureResult>;
  cancel(reason?: RectangleDropdownCancelReason): void;
  isActive(): boolean;
}

interface InternalCandidate extends CandidatePriorityInput {
  element: Element;
  label: RectangleDropdownLabel | null;
  classification: CandidateKind;
  unlisted: boolean;
  summary: RectangleDropdownCandidate;
}

interface CandidatePriorityInput {
  element: Element;
  label: RectangleDropdownLabel | null;
  inputPathMember: boolean;
  structuralChange: boolean;
}

interface CandidateRecord extends CandidatePriorityInput {
  hasUnlistedName: boolean;
}

interface InspectionOptions {
  limits?: Partial<RectangleDropdownCaptureLimits>;
  inputPath?: readonly Element[];
  structuralChangeElements?: readonly Element[];
  scanRoot?: ParentNode;
  referenceElement?: Element;
  candidateElements?: readonly Element[];
}

// Local work reuses the existing mutation budget; the document cap stays 6000.
const LOCAL_ELEMENT_LIMIT = FEATURE_LIST_CAPTURE_LIMITS.inspectedElements;
const INTERACTION_LIMIT = 4;

function isDropdownStructure(element: Element): boolean {
  return (
    ['menu', 'listbox', 'menuitem', 'option'].includes(safeRole(element)) ||
    element.hasAttribute('aria-haspopup') ||
    element.hasAttribute('aria-controls') ||
    element.hasAttribute('aria-owns')
  );
}

function hasBoundedAncestorRelation(
  left: Element,
  right: Element,
  depthLimit: number,
): boolean {
  const containsWithinLimit = (descendant: Element, ancestor: Element) => {
    let current: Element | null = descendant;
    for (let depth = 0; current && depth <= depthLimit; depth++) {
      if (current === ancestor) return true;
      current = current.parentElement;
    }
    return false;
  };
  return containsWithinLimit(left, right) || containsWithinLimit(right, left);
}

function referencesElement(
  source: Element,
  target: Element,
  attributes: readonly string[] = [
    'aria-controls',
    'aria-owns',
    'aria-labelledby',
  ],
): boolean {
  const targetId = target.getAttribute('id');
  if (!targetId || targetId.length > 64) return false;
  for (const attribute of attributes) {
    const value = source.getAttribute(attribute);
    if (!value || value.length > 128) continue;
    const ids = value.trim().split(/\s+/);
    if (ids.length <= 3 && ids.every((id) => id.length <= 64)) {
      if (ids.includes(targetId)) return true;
    }
  }
  return false;
}

function explicitlyRelated(left: Element, right: Element): boolean {
  return referencesElement(left, right) || referencesElement(right, left);
}

/**
 * Retain useful Rectangle evidence before the candidate cap is applied.
 * Exact allowlisted labels lead, followed by the observed input path and
 * changed nodes. Only bounded DOM/ARIA relationships rank other controls as
 * related; arbitrary actionable controls retain stable document order last.
 */
function prioritizeCandidates<T extends CandidatePriorityInput>(
  candidates: readonly T[],
  depthLimit: number,
): T[] {
  const anchors = candidates.filter((candidate) => candidate.label !== null);
  const priority = (candidate: T): number => {
    if (candidate.label !== null && candidate.inputPathMember) return 0;
    if (candidate.label !== null) return 1;
    if (candidate.inputPathMember) return 2;
    if (candidate.structuralChange) return 3;
    const related = anchors.some((anchor) => {
      if (
        hasBoundedAncestorRelation(
          candidate.element,
          anchor.element,
          depthLimit,
        ) ||
        explicitlyRelated(candidate.element, anchor.element)
      )
        return true;
      return (
        candidate.element.parentElement !== null &&
        candidate.element.parentElement === anchor.element.parentElement &&
        isDropdownStructure(candidate.element)
      );
    });
    if (related) return 4;
    if (anchors.length > 0 && isDropdownStructure(candidate.element)) return 5;
    return 6;
  };

  return candidates
    .map((candidate, index) => ({
      candidate,
      index,
      priority: priority(candidate),
    }))
    .sort(
      (left, right) =>
        left.priority - right.priority || left.index - right.index,
    )
    .map(({ candidate }) => candidate);
}

function normalizedLabel(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function boundedText(element: Element): { text: string; complete: boolean } {
  const walker = element.ownerDocument.createTreeWalker(
    element,
    0xffffffff, // SHOW_ALL: empty element wrappers count toward the bound too.
  );
  let current = walker.nextNode();
  let text = '';
  let visited = 0;
  while (current) {
    if (++visited > 64) return { text: '', complete: false };
    if (current.nodeType !== 3) {
      current = walker.nextNode();
      continue;
    }
    const parent = current.parentElement;
    if (parent?.closest('[aria-hidden="true"],svg,[data-leqad-root]')) {
      current = walker.nextNode();
      continue;
    }
    text += current.nodeValue ?? '';
    if (text.length > 64) return { text: '', complete: false };
    current = walker.nextNode();
  }
  return { text, complete: true };
}

function referencedLabel(element: Element): string | null {
  const references = element.getAttribute('aria-labelledby');
  if (!references || references.length > 128) return null;
  const ids = references.trim().split(/\s+/);
  if (ids.length > 3 || ids.some((id) => id.length > 64)) return null;
  const names: string[] = [];
  for (const id of ids) {
    const node = element.ownerDocument.getElementById(id);
    if (!node) return null;
    const result = boundedText(node);
    if (!result.complete) return null;
    names.push(result.text);
  }
  return names.join(' ');
}

function labelFor(element: Element): {
  label: RectangleDropdownLabel | null;
  hasUnlistedName: boolean;
} {
  const sources = [
    element.getAttribute('aria-label'),
    referencedLabel(element),
    element.getAttribute('title'),
  ];
  const directText = boundedText(element);
  if (directText.complete) sources.push(directText.text);
  for (const source of sources) {
    if (source === null || source.trim() === '') continue;
    if (source.length > 64) continue;
    const exact = LABELS.get(normalizedLabel(source));
    if (exact) return { label: exact, hasUnlistedName: false };
  }
  const hasName = sources.some((source) => source !== null && source.trim());
  return { label: null, hasUnlistedName: hasName };
}

function safeTag(element: Element): SafeTag {
  return SAFE_TAGS.has(element.localName) ? element.localName : 'other';
}

function safeRole(element: Element): SafeRole {
  const value = normalizedLabel(element.getAttribute('role') ?? '').split(
    ' ',
  )[0];
  if (value) return SAFE_ROLES.has(value) ? value : 'other';
  if (element.localName === 'button') return 'button';
  if (element.localName === 'menu') return 'menu';
  if (element.localName === 'option') return 'option';
  return 'none';
}

function booleanState(value: string | null): SafeBooleanState {
  if (value === null) return 'ABSENT';
  if (value === 'true') return 'TRUE';
  if (value === 'false') return 'FALSE';
  return 'OTHER';
}

function popupValue(value: string | null): SafePopupValue {
  if (value === null) return 'ABSENT';
  const normalized = normalizedLabel(value).toUpperCase();
  if (
    normalized === 'MENU' ||
    normalized === 'LISTBOX' ||
    normalized === 'TREE' ||
    normalized === 'GRID' ||
    normalized === 'DIALOG'
  )
    return normalized;
  if (normalized === 'TRUE') return 'TRUE';
  return 'OTHER';
}

function actionableMarkup(element: Element): boolean {
  return (
    element.matches(
      'button,input,select,textarea,a[href],[role="button"],[role="menuitem"],[role="option"],[role="tab"],[tabindex]:not([tabindex="-1"]),[aria-haspopup]',
    ) ||
    (element.hasAttribute('tabindex') &&
      Number(element.getAttribute('tabindex')) >= 0)
  );
}

function boundedVisibility(element: Element): string {
  const view = element.ownerDocument.defaultView;
  const rect = element.getBoundingClientRect();
  let current: Element | null = element;
  let depth = 0;
  while (current && depth < 12) {
    if (
      !current.isConnected ||
      current.hasAttribute('hidden') ||
      current.getAttribute('aria-hidden') === 'true'
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
    depth++;
  }
  if (current) return 'UNKNOWN';
  if (rect.width <= 0 || rect.height <= 0) return 'ZERO_SIZE';
  const width = view?.innerWidth ?? Infinity;
  const height = view?.innerHeight ?? Infinity;
  if (
    rect.right <= 0 ||
    rect.bottom <= 0 ||
    rect.left >= width ||
    rect.top >= height
  )
    return 'OFFSCREEN';
  if (
    rect.left < 0 ||
    rect.top < 0 ||
    rect.right > width ||
    rect.bottom > height
  )
    return 'CLIPPED';
  return 'VISIBLE';
}

function boundedContext(element: Element): RectangleDropdownContext {
  let current: Element | null = element;
  let depth = 0;
  let viewportSeen = false;
  let toolbarSeen = false;
  while (
    current &&
    depth < RECTANGLE_DROPDOWN_CAPTURE_LIMITS.capturedAncestors
  ) {
    const role = safeRole(current);
    if (role === 'dialog' || current.localName === 'dialog') return 'DIALOG';
    if (
      current.localName === 'canvas' ||
      current.localName === 'svg' ||
      role === 'img'
    )
      viewportSeen = true;
    if (role === 'toolbar') toolbarSeen = true;
    current = current.parentElement;
    depth++;
  }
  if (current) return 'UNKNOWN';
  if (viewportSeen) return 'VIEWPORT';
  if (toolbarSeen) return 'TOOLBAR';
  return 'OTHER';
}

function nodeSummary(element: Element): RectangleDropdownNodeSummary {
  const markup = actionableMarkup(element);
  return {
    tag: safeTag(element),
    role: safeRole(element),
    context: boundedContext(element),
    rolePresent: element.hasAttribute('role'),
    ariaLabelPresent: element.hasAttribute('aria-label'),
    ariaLabelledByPresent: element.hasAttribute('aria-labelledby'),
    titlePresent: element.hasAttribute('title'),
    tabIndexPresent: element.hasAttribute('tabindex'),
    ariaHasPopup: popupValue(element.getAttribute('aria-haspopup')),
    ariaExpanded: booleanState(element.getAttribute('aria-expanded')),
    ariaHidden: booleanState(element.getAttribute('aria-hidden')),
    ariaControlsPresent: element.hasAttribute('aria-controls'),
    ariaOwnsPresent: element.hasAttribute('aria-owns'),
    disabledAttributePresent:
      element.hasAttribute('disabled') ||
      element.getAttribute('aria-disabled') === 'true',
    hiddenAttributePresent: element.hasAttribute('hidden'),
    actionableMarkup: markup ? 'MARKUP_SIGNAL' : 'NOT_EXPOSED',
    visibility: boundedVisibility(element),
    connected: element.isConnected,
    enabled: boundedEnabled(element),
  };
}

function boundedEnabled(
  element: Element,
): RectangleDropdownNodeSummary['enabled'] {
  if (!element.isConnected) return 'UNKNOWN';
  let current: Element | null = element;
  for (let depth = 0; current && depth < 12; depth++) {
    if (
      current.matches(':disabled') ||
      current.getAttribute('aria-disabled') === 'true' ||
      current.hasAttribute('inert')
    )
      return 'DISABLED';
    current = current.parentElement;
  }
  return current ? 'UNKNOWN' : 'ENABLED';
}

function inputRelation(
  element: Element,
  path: readonly Element[],
): RectangleDropdownCandidate['inputRelation'] {
  for (const [distance, branch] of path.entries()) {
    if (branch === element)
      return { kind: 'EVENT_PATH', pathDistance: distance, siblingOffset: 0 };
    if (['body', 'html'].includes(branch.localName)) continue;
    if (explicitlyRelated(element, branch))
      return {
        kind: 'EXPLICIT_ARIA',
        pathDistance: distance,
        siblingOffset: null,
      };
    for (const direction of [-1, 1]) {
      let sibling =
        direction < 0
          ? branch.previousElementSibling
          : branch.nextElementSibling;
      for (
        let offset = 1;
        sibling && offset <= RECTANGLE_DROPDOWN_CAPTURE_LIMITS.siblingRadius;
        offset++
      ) {
        if (sibling === element)
          return {
            kind: 'SIBLING_BRANCH',
            pathDistance: distance,
            siblingOffset: direction * offset,
          };
        sibling =
          direction < 0
            ? sibling.previousElementSibling
            : sibling.nextElementSibling;
      }
    }
  }
  return { kind: 'UNKNOWN', pathDistance: null, siblingOffset: null };
}

function classification(
  label: RectangleDropdownLabel | null,
  hasUnlistedName: boolean,
  markup: boolean,
  inputPathMember: boolean,
  structuralChange: boolean,
): CandidateKind {
  if (label === 'Rectangle') return 'GROUP_LABEL';
  if (label === 'Aligned Rectangle') return 'DIAGNOSTIC_ONLY_UNVERIFIED';
  if (label) return 'VARIANT_LABEL_DIAGNOSTIC_ONLY';
  if (markup && hasUnlistedName) return 'UNLISTED_POTENTIAL_TRIGGER';
  if (markup) return 'UNLABELED_POTENTIAL_TRIGGER';
  if (inputPathMember) return 'INPUT_PATH_STRUCTURE';
  if (structuralChange) return 'STRUCTURAL_CHANGE';
  return 'INPUT_PATH_STRUCTURE';
}

function relativeGeometry(
  element: Element,
  reference: DOMRect | null,
): RectangleDropdownCandidate['relativeGeometry'] {
  if (!reference || reference.width <= 0 || reference.height <= 0) return null;
  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return null;
  const ratio = (value: number) =>
    Math.round(Math.max(-1000, Math.min(1000, value)) * 10) / 10;
  return {
    x: ratio((rect.left - reference.left) / reference.width),
    y: ratio((rect.top - reference.top) / reference.height),
    width: ratio(rect.width / reference.width),
    height: ratio(rect.height / reference.height),
  };
}

function summarizeCandidate(
  element: Element,
  label: RectangleDropdownLabel | null,
  hasUnlistedName: boolean,
  inputPathMember: boolean,
  structuralChange: boolean,
  reference: DOMRect | null,
  limits: RectangleDropdownCaptureLimits,
  inputPath: readonly Element[] = [],
): RectangleDropdownCandidate {
  const markup = actionableMarkup(element);
  const ancestors: RectangleDropdownNodeSummary[] = [];
  let ancestor = element.parentElement;
  while (ancestor && ancestors.length < limits.capturedAncestors) {
    ancestors.push(nodeSummary(ancestor));
    ancestor = ancestor.parentElement;
  }
  const parent = element.parentElement;
  const siblingWindow: RectangleDropdownSiblingSummary[] = [];
  if (parent) {
    const before: Element[] = [];
    let previous = element.previousElementSibling;
    while (previous && before.length < limits.siblingRadius) {
      before.unshift(previous);
      previous = previous.previousElementSibling;
    }
    const after: Element[] = [];
    let next = element.nextElementSibling;
    while (next && after.length < limits.siblingRadius) {
      after.push(next);
      next = next.nextElementSibling;
    }
    [...before, element, ...after].forEach((sibling, index) => {
      const siblingName = labelFor(sibling);
      siblingWindow.push({
        offset: index - before.length,
        node: nodeSummary(sibling),
        label: siblingName.label,
      });
    });
  }
  const parentCount = parent?.childElementCount ?? null;
  return {
    label,
    labelClassification: classification(
      label,
      hasUnlistedName,
      markup,
      inputPathMember,
      structuralChange,
    ),
    inputPathMember,
    inputRelation: inputRelation(element, inputPath),
    node: nodeSummary(element),
    ancestors,
    parentChildCount: parentCount === null ? null : Math.min(parentCount, 100),
    parentChildCountCapped: (parentCount ?? 0) > 100,
    siblings: siblingWindow,
    relativeGeometry: relativeGeometry(element, reference),
  };
}

function defaultLimits(
  overrides: Partial<RectangleDropdownCaptureLimits> = {},
): RectangleDropdownCaptureLimits {
  return {
    scannedElements: Math.max(
      1,
      Math.min(
        overrides.scannedElements ??
          RECTANGLE_DROPDOWN_CAPTURE_LIMITS.scannedElements,
        RECTANGLE_DROPDOWN_CAPTURE_LIMITS.scannedElements,
      ),
    ),
    candidateRecords: Math.max(
      1,
      Math.min(
        overrides.candidateRecords ??
          RECTANGLE_DROPDOWN_CAPTURE_LIMITS.candidateRecords,
        RECTANGLE_DROPDOWN_CAPTURE_LIMITS.candidateRecords,
      ),
    ),
    capturedAncestors: Math.max(
      0,
      Math.min(
        overrides.capturedAncestors ??
          RECTANGLE_DROPDOWN_CAPTURE_LIMITS.capturedAncestors,
        RECTANGLE_DROPDOWN_CAPTURE_LIMITS.capturedAncestors,
      ),
    ),
    siblingRadius: Math.max(
      0,
      Math.min(
        overrides.siblingRadius ??
          RECTANGLE_DROPDOWN_CAPTURE_LIMITS.siblingRadius,
        RECTANGLE_DROPDOWN_CAPTURE_LIMITS.siblingRadius,
      ),
    ),
    reportChars: Math.max(
      1000,
      Math.min(
        overrides.reportChars ?? RECTANGLE_DROPDOWN_CAPTURE_LIMITS.reportChars,
        RECTANGLE_DROPDOWN_CAPTURE_LIMITS.reportChars,
      ),
    ),
  };
}

function isPotentialTrigger(element: Element): boolean {
  return actionableMarkup(element);
}

function isMenuContainer(element: Element): boolean {
  return ['menu', 'listbox'].includes(safeRole(element));
}

function isVisible(element: Element): boolean {
  return nodeSummary(element).visibility === 'VISIBLE';
}

function observedState(
  candidates: readonly InternalCandidate[],
): Pick<RectangleDropdownSnapshot, 'domObservedState' | 'stateBasis'> {
  const usable = ({ element }: InternalCandidate) =>
    isVisible(element) && boundedEnabled(element) === 'ENABLED';
  const rectangles = candidates.filter(
    (candidate) => candidate.label === 'Rectangle' && usable(candidate),
  );
  const visibleMenu = candidates.some(
    ({ element }) =>
      ['menu', 'listbox'].includes(safeRole(element)) && isVisible(element),
  );
  const visibleVariant = candidates.some(
    ({ label, element }) =>
      label !== null && label !== 'Rectangle' && isVisible(element),
  );
  const exactTriggers = candidates.filter(
    ({ label, element }) =>
      label === 'Rectangle' &&
      element.hasAttribute('aria-haspopup') &&
      element.hasAttribute('aria-expanded') &&
      isVisible(element) &&
      boundedEnabled(element) === 'ENABLED',
  );
  const distinctActionRoots = exactTriggers.filter(
    ({ element }) =>
      !exactTriggers.some(
        ({ element: other }) =>
          other !== element &&
          (element.contains(other) || other.contains(element)) &&
          actionableMarkup(other),
      ),
  );
  if (distinctActionRoots.length === 1) {
    const value = distinctActionRoots[0]!.element.getAttribute('aria-expanded');
    if (value === 'true')
      return { domObservedState: 'OPEN', stateBasis: 'ARIA_EXPANDED' };
    if (value === 'false' && visibleMenu && visibleVariant)
      return { domObservedState: 'UNKNOWN', stateBasis: 'UNKNOWN' };
    if (value === 'false')
      return { domObservedState: 'CLOSED', stateBasis: 'ARIA_EXPANDED' };
  }
  if (distinctActionRoots.length > 1)
    return { domObservedState: 'UNKNOWN', stateBasis: 'UNKNOWN' };

  const relatedMenus = candidates.filter(
    (menu) =>
      isMenuContainer(menu.element) &&
      usable(menu) &&
      rectangles.some(
        (trigger) =>
          actionableMarkup(trigger.element) &&
          (trigger.element.contains(menu.element) ||
            referencesElement(trigger.element, menu.element, [
              'aria-controls',
              'aria-owns',
            ])),
      ) &&
      candidates.some(
        (variant) =>
          variant.label !== null &&
          variant.label !== 'Rectangle' &&
          usable(variant) &&
          menu.element.contains(variant.element),
      ),
  );
  if (relatedMenus.length === 1)
    return { domObservedState: 'OPEN', stateBasis: 'SEMANTIC_MENU' };
  return { domObservedState: 'UNKNOWN', stateBasis: 'UNKNOWN' };
}

function duplicateExactLabels(
  candidates: readonly CandidatePriorityInput[],
): boolean {
  return candidates.some(
    (candidate, index) =>
      candidate.label !== null &&
      candidates
        .slice(index + 1)
        .some(
          (other) =>
            other.label === candidate.label &&
            !candidate.element.contains(other.element) &&
            !other.element.contains(candidate.element),
        ),
  );
}

function inspect(
  root: ParentNode,
  options: InspectionOptions = {},
): { snapshot: RectangleDropdownSnapshot; internal: InternalCandidate[] } {
  const limits = defaultLimits(options.limits);
  const inputPath = new Set(options.inputPath ?? []);
  const structuralChange = new Set(options.structuralChangeElements ?? []);
  const rootDocument =
    root instanceof Document ? root : (root.ownerDocument ?? document);
  const rootElement =
    root instanceof Document
      ? root.documentElement
      : root instanceof Element
        ? root
        : null;
  if (!rootElement) {
    const empty: RectangleDropdownSnapshot = {
      domObservedState: 'UNKNOWN',
      stateBasis: 'UNKNOWN',
      ambiguity: null,
      candidates: [],
      scan: {
        status: 'COMPLETE',
        scannedElements: 0,
        unlistedLabelCount: 0,
        truncated: false,
      },
    };
    return { snapshot: empty, internal: [] };
  }

  const scanRoot = options.scanRoot ?? rootElement;
  const walker = rootDocument.createTreeWalker(scanRoot, 1);
  const elements: Element[] = [];
  if (scanRoot instanceof Element) elements.push(scanRoot);
  let current = walker.nextNode();
  let scannedElements = 0;
  let truncated = false;
  const found: CandidateRecord[] = [];
  const inputPathElements = [...inputPath];
  const changeElements = [...structuralChange];

  const addCandidate = (element: Element, structural = false) => {
    if (isLeqadOwned(element)) return;
    if (found.some((candidate) => candidate.element === element)) return;
    const markup = isPotentialTrigger(element);
    const hasNameAttribute =
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby') ||
      element.hasAttribute('title');
    const read =
      markup || hasNameAttribute || element.childElementCount === 0
        ? labelFor(element)
        : { label: null, hasUnlistedName: false };
    const inPath = inputPath.has(element);
    const menuContainer = isMenuContainer(element);
    if (!read.label && !markup && !inPath && !structural && !menuContainer)
      return;
    found.push({
      element,
      label: read.label,
      hasUnlistedName: markup && read.hasUnlistedName,
      inputPathMember: inPath,
      structuralChange: structural || menuContainer,
    });
  };

  if (options.inputPath)
    inputPathElements.forEach((element) => addCandidate(element));
  options.candidateElements?.forEach((element) => addCandidate(element));
  if (options.structuralChangeElements)
    changeElements.forEach((element) => addCandidate(element, true));
  if (scanRoot instanceof Document || !options.scanRoot) {
    while (current) {
      if (scannedElements >= limits.scannedElements) {
        truncated = true;
        break;
      }
      const element = current as Element;
      scannedElements++;
      elements.push(element);
      addCandidate(element);
      current = walker.nextNode();
    }
  } else {
    while (current) {
      if (scannedElements >= limits.scannedElements) {
        truncated = true;
        break;
      }
      const element = current as Element;
      scannedElements++;
      elements.push(element);
      addCandidate(element);
      current = walker.nextNode();
    }
  }
  const prioritized = prioritizeCandidates(found, limits.capturedAncestors);
  if (prioritized.length > limits.candidateRecords) truncated = true;
  const candidatesToSummarize = prioritized.slice(0, limits.candidateRecords);
  const referenceElement =
    options.referenceElement ??
    candidatesToSummarize.find((candidate) => candidate.label === 'Rectangle')
      ?.element ??
    candidatesToSummarize[0]?.element;
  const referenceRect = referenceElement?.getBoundingClientRect() ?? null;
  const internal = candidatesToSummarize.map((candidate) => ({
    ...candidate,
    classification: classification(
      candidate.label,
      candidate.hasUnlistedName,
      isPotentialTrigger(candidate.element),
      candidate.inputPathMember,
      candidate.structuralChange,
    ),
    unlisted: candidate.hasUnlistedName,
    summary: summarizeCandidate(
      candidate.element,
      candidate.label,
      candidate.hasUnlistedName,
      candidate.inputPathMember,
      candidate.structuralChange,
      referenceRect,
      limits,
      inputPathElements,
    ),
  }));
  const duplicateBranches = duplicateExactLabels(prioritized);
  const state = observedState(internal);
  const snapshot: RectangleDropdownSnapshot = {
    ...state,
    ambiguity: duplicateBranches ? 'DUPLICATE_EXACT_LABELS' : null,
    candidates: internal.map((candidate) => candidate.summary),
    scan: {
      status: truncated ? 'INCOMPLETE' : 'COMPLETE',
      scannedElements,
      unlistedLabelCount: internal.filter((candidate) => candidate.unlisted)
        .length,
      truncated,
    },
  };
  if (duplicateBranches) {
    snapshot.domObservedState = 'UNKNOWN';
    snapshot.stateBasis = 'UNKNOWN';
  }
  return { snapshot, internal };
}

/** A single bounded, privacy-sanitized inspection of the supplied document. */
export function inspectRectangleDropdown(
  root: Document,
  limits: Partial<RectangleDropdownCaptureLimits> = {},
): RectangleDropdownSnapshot {
  return inspect(root, { limits }).snapshot;
}

export function captureManualRectangleDropdownSnapshot(
  root: Document,
  snapshotRole: 'BEFORE' | 'AFTER',
  userReportedState: RectangleDropdownUserReportedState,
  limits: Partial<RectangleDropdownCaptureLimits> = {},
): RectangleDropdownManualSnapshot {
  return {
    snapshotRole,
    userReportedState,
    snapshot: inspectRectangleDropdown(root, limits),
  };
}

function cappedReport(
  report: RectangleDropdownCaptureReport,
  limits: RectangleDropdownCaptureLimits,
): RectangleDropdownCaptureReport {
  let output = report; // The caller has already rebuilt every field via sanitization.
  const cappedStatus: RectangleDropdownCaptureStatus =
    report.status === 'CANCELLED' || report.status === 'TIMED_OUT'
      ? report.status
      : 'INCOMPLETE';
  const protectedCandidates = new Set<RectangleDropdownCandidate>();
  for (const transition of output.transitions) {
    const labels = new Set<RectangleDropdownLabel>();
    for (const candidate of transition.after.candidates) {
      if (
        candidate.label &&
        candidate.label !== 'Rectangle' &&
        !labels.has(candidate.label)
      ) {
        labels.add(candidate.label);
        protectedCandidates.add(candidate);
      }
    }
  }
  while (JSON.stringify(output).length > limits.reportChars) {
    // Prefer the actual post-input option evidence over repeated pre-snapshots.
    const snapshots = [
      output.baseline,
      ...output.interactions.map((item) => item.localBefore),
      ...output.transitions.map((item) => item.before),
      ...output.manualSnapshots.map((item) => item.snapshot),
      ...[...output.transitions].reverse().map((item) => item.after),
    ];
    const snapshot = snapshots.find((item) =>
      item.candidates.some((candidate) => !protectedCandidates.has(candidate)),
    );
    if (snapshot) {
      const index = snapshot.candidates.findIndex(
        (candidate) => !protectedCandidates.has(candidate),
      );
      snapshot.candidates.splice(index, 1);
      snapshot.scan.truncated = true;
      snapshot.scan.status = 'INCOMPLETE';
    } else {
      const longest =
        output.interactions.reduce<RectangleDropdownInteraction | null>(
          (result, item) =>
            !result || item.path.length > result.path.length ? item : result,
          null,
        );
      if (longest && longest.path.length > 1) {
        longest.path.pop();
        longest.pathTruncated = true;
        longest.clickPathMatchesInput = null;
      } else {
        const remaining = snapshots.find((item) => item.candidates.length > 0);
        if (!remaining) break; // Fixed metadata plus four one-node paths fits the cap.
        remaining.candidates.pop();
        remaining.scan.truncated = true;
        remaining.scan.status = 'INCOMPLETE';
      }
    }
    output = { ...output, status: cappedStatus, truncated: true };
  }
  return output;
}

function sanitizeBooleanState(value: unknown): SafeBooleanState {
  return value === 'TRUE' || value === 'FALSE' || value === 'OTHER'
    ? value
    : 'ABSENT';
}

function sanitizePopupValue(value: unknown): SafePopupValue {
  return value === 'MENU' ||
    value === 'LISTBOX' ||
    value === 'TREE' ||
    value === 'GRID' ||
    value === 'DIALOG' ||
    value === 'TRUE' ||
    value === 'OTHER'
    ? value
    : 'ABSENT';
}

function sanitizeNodeSummary(
  value: RectangleDropdownNodeSummary,
): RectangleDropdownNodeSummary {
  const tag = SAFE_TAGS.has(value.tag) ? value.tag : 'other';
  const role = SAFE_ROLES.has(value.role) ? value.role : 'other';
  const visibility = [
    'VISIBLE',
    'HIDDEN',
    'CLIPPED',
    'ZERO_SIZE',
    'OFFSCREEN',
    'UNKNOWN',
  ].includes(value.visibility)
    ? value.visibility
    : 'UNKNOWN';
  return {
    tag,
    role,
    context: ['DIALOG', 'VIEWPORT', 'TOOLBAR', 'OTHER'].includes(value.context)
      ? value.context
      : 'UNKNOWN',
    rolePresent: Boolean(value.rolePresent),
    ariaLabelPresent: Boolean(value.ariaLabelPresent),
    ariaLabelledByPresent: Boolean(value.ariaLabelledByPresent),
    titlePresent: Boolean(value.titlePresent),
    tabIndexPresent: Boolean(value.tabIndexPresent),
    ariaHasPopup: sanitizePopupValue(value.ariaHasPopup),
    ariaExpanded: sanitizeBooleanState(value.ariaExpanded),
    ariaHidden: sanitizeBooleanState(value.ariaHidden),
    ariaControlsPresent: Boolean(value.ariaControlsPresent),
    ariaOwnsPresent: Boolean(value.ariaOwnsPresent),
    disabledAttributePresent: Boolean(value.disabledAttributePresent),
    hiddenAttributePresent: Boolean(value.hiddenAttributePresent),
    actionableMarkup:
      value.actionableMarkup === 'MARKUP_SIGNAL'
        ? 'MARKUP_SIGNAL'
        : 'NOT_EXPOSED',
    visibility,
    connected: value.connected === true,
    enabled:
      value.enabled === 'ENABLED' || value.enabled === 'DISABLED'
        ? value.enabled
        : 'UNKNOWN',
  };
}

function sanitizeGeometry(
  value: RectangleDropdownCandidate['relativeGeometry'],
): RectangleDropdownCandidate['relativeGeometry'] {
  if (!value) return null;
  const number = (input: unknown) => {
    if (typeof input !== 'number' || !Number.isFinite(input)) return 0;
    return Math.round(Math.max(-1000, Math.min(1000, input)) * 10) / 10;
  };
  return {
    x: number(value.x),
    y: number(value.y),
    width: number(value.width),
    height: number(value.height),
  };
}

function sanitizeCandidate(
  value: RectangleDropdownCandidate,
): RectangleDropdownCandidate {
  const labels = new Set<RectangleDropdownLabel>(LABELS.values());
  const label = labels.has(value.label as RectangleDropdownLabel)
    ? value.label
    : null;
  const classes: CandidateKind[] = [
    'GROUP_LABEL',
    'VARIANT_LABEL_DIAGNOSTIC_ONLY',
    'DIAGNOSTIC_ONLY_UNVERIFIED',
    'UNLABELED_POTENTIAL_TRIGGER',
    'UNLISTED_POTENTIAL_TRIGGER',
    'INPUT_PATH_STRUCTURE',
    'STRUCTURAL_CHANGE',
  ];
  const labelClassification = classes.includes(value.labelClassification)
    ? value.labelClassification
    : 'STRUCTURAL_CHANGE';
  const siblings = (Array.isArray(value.siblings) ? value.siblings : [])
    .slice(0, RECTANGLE_DROPDOWN_CAPTURE_LIMITS.siblingRadius * 2 + 1)
    .map((sibling) => ({
      offset: Math.max(
        -RECTANGLE_DROPDOWN_CAPTURE_LIMITS.siblingRadius,
        Math.min(
          RECTANGLE_DROPDOWN_CAPTURE_LIMITS.siblingRadius,
          Math.trunc(sibling.offset),
        ),
      ),
      node: sanitizeNodeSummary(sibling.node),
      label: labels.has(sibling.label as RectangleDropdownLabel)
        ? sibling.label
        : null,
    }));
  const childCount =
    value.parentChildCount === null
      ? null
      : Math.max(0, Math.min(100, Math.trunc(value.parentChildCount)));
  return {
    label,
    labelClassification,
    inputPathMember: Boolean(value.inputPathMember),
    inputRelation: sanitizeInputRelation(value.inputRelation),
    node: sanitizeNodeSummary(value.node),
    ancestors: (Array.isArray(value.ancestors) ? value.ancestors : [])
      .slice(0, RECTANGLE_DROPDOWN_CAPTURE_LIMITS.capturedAncestors)
      .map(sanitizeNodeSummary),
    parentChildCount: childCount,
    parentChildCountCapped: Boolean(value.parentChildCountCapped),
    siblings,
    relativeGeometry: sanitizeGeometry(value.relativeGeometry),
  };
}

function sanitizeInputRelation(
  value: RectangleDropdownCandidate['inputRelation'],
): RectangleDropdownCandidate['inputRelation'] {
  const kind =
    value &&
    ['EVENT_PATH', 'SIBLING_BRANCH', 'EXPLICIT_ARIA'].includes(value.kind)
      ? value.kind
      : 'UNKNOWN';
  return {
    kind,
    pathDistance:
      kind !== 'UNKNOWN' && Number.isInteger(value?.pathDistance)
        ? Math.max(0, Math.min(9, value.pathDistance!))
        : null,
    siblingOffset:
      kind !== 'UNKNOWN' && Number.isInteger(value?.siblingOffset)
        ? Math.max(
            -RECTANGLE_DROPDOWN_CAPTURE_LIMITS.siblingRadius,
            Math.min(
              RECTANGLE_DROPDOWN_CAPTURE_LIMITS.siblingRadius,
              value.siblingOffset!,
            ),
          )
        : null,
  };
}

function sanitizeInteraction(
  value: RectangleDropdownInteraction,
  index: number,
): RectangleDropdownInteraction {
  const labels = new Set<RectangleDropdownLabel>(LABELS.values());
  const path = Array.isArray(value.path) ? value.path : [];
  return {
    sequence: index + 1,
    eventCategory: ['POINTER', 'KEYBOARD', 'CLICK'].includes(
      value.eventCategory ?? '',
    )
      ? value.eventCategory
      : null,
    clickObserved: value.clickObserved === true,
    clickedLabel: labels.has(value.clickedLabel!) ? value.clickedLabel : null,
    clickPathMatchesInput:
      !value.pathTruncated &&
      path.length <= RECTANGLE_DROPDOWN_CAPTURE_LIMITS.capturedAncestors &&
      typeof value.clickPathMatchesInput === 'boolean'
        ? value.clickPathMatchesInput
        : null,
    path: path
      .slice(0, RECTANGLE_DROPDOWN_CAPTURE_LIMITS.capturedAncestors)
      .map((item, distance) => ({
        distance,
        label: labels.has(item.label!) ? item.label : null,
        node: sanitizeNodeSummary(item.node),
      })),
    pathTruncated:
      Boolean(value.pathTruncated) ||
      path.length > RECTANGLE_DROPDOWN_CAPTURE_LIMITS.capturedAncestors,
    localBefore: sanitizeSnapshot(value.localBefore),
  };
}

function sanitizeSnapshot(
  value: RectangleDropdownSnapshot,
): RectangleDropdownSnapshot {
  const candidates = (Array.isArray(value.candidates) ? value.candidates : [])
    .slice(0, RECTANGLE_DROPDOWN_CAPTURE_LIMITS.candidateRecords)
    .map(sanitizeCandidate);
  const truncated =
    Boolean(value.scan?.truncated) ||
    (Array.isArray(value.candidates) &&
      value.candidates.length >
        RECTANGLE_DROPDOWN_CAPTURE_LIMITS.candidateRecords);
  const scannedElements = Math.max(
    0,
    Math.min(
      RECTANGLE_DROPDOWN_CAPTURE_LIMITS.scannedElements,
      Math.trunc(value.scan?.scannedElements ?? 0),
    ),
  );
  return {
    domObservedState:
      value.domObservedState === 'OPEN' || value.domObservedState === 'CLOSED'
        ? value.domObservedState
        : 'UNKNOWN',
    stateBasis:
      value.stateBasis === 'ARIA_EXPANDED' ||
      value.stateBasis === 'SEMANTIC_MENU'
        ? value.stateBasis
        : 'UNKNOWN',
    ambiguity:
      value.ambiguity === 'DUPLICATE_EXACT_LABELS' ? value.ambiguity : null,
    candidates,
    scan: {
      status: truncated ? 'INCOMPLETE' : 'COMPLETE',
      scannedElements,
      unlistedLabelCount: Math.max(
        0,
        Math.min(
          RECTANGLE_DROPDOWN_CAPTURE_LIMITS.scannedElements,
          Math.trunc(value.scan?.unlistedLabelCount ?? 0),
        ),
      ),
      truncated,
    },
  };
}

function sanitizeReport(
  report: RectangleDropdownCaptureReport,
): RectangleDropdownCaptureReport {
  const baseline = sanitizeSnapshot(report.baseline);
  const transitions = (
    Array.isArray(report.transitions) ? report.transitions : []
  )
    .slice(0, 4)
    .map((transition) => ({
      eventCategory: ['POINTER', 'KEYBOARD', 'CLICK'].includes(
        transition.eventCategory ?? '',
      )
        ? transition.eventCategory
        : null,
      inputSequence: Number.isInteger(transition.inputSequence)
        ? Math.max(1, Math.min(INTERACTION_LIMIT, transition.inputSequence))
        : 1,
      scope: 'INPUT_AND_MUTATION_LOCAL' as const,
      inputAssociation: 'UNPROVEN' as const,
      before: sanitizeSnapshot(transition.before),
      after: sanitizeSnapshot(transition.after),
      relationship: [
        'NESTED',
        'SEPARATE_DOCUMENT_BRANCH',
        'AMBIGUOUS',
      ].includes(transition.relationship)
        ? transition.relationship
        : 'UNKNOWN',
      changedCandidateCount: Math.max(
        0,
        Math.min(256, Math.trunc(transition.changedCandidateCount)),
      ),
    }));
  const manualSnapshots = (
    Array.isArray(report.manualSnapshots) ? report.manualSnapshots : []
  )
    .filter(
      (snapshot) =>
        snapshot.snapshotRole === 'BEFORE' || snapshot.snapshotRole === 'AFTER',
    )
    .slice(0, 2)
    .map((snapshot) => ({
      snapshotRole: snapshot.snapshotRole,
      userReportedState: (snapshot.userReportedState === 'OPEN'
        ? 'OPEN'
        : 'CLOSED') as RectangleDropdownUserReportedState,
      snapshot: sanitizeSnapshot(snapshot.snapshot),
    }));
  const interactions = (
    Array.isArray(report.interactions) ? report.interactions : []
  )
    .slice(0, INTERACTION_LIMIT)
    .map(sanitizeInteraction);
  const truncated =
    Boolean(report.truncated) ||
    baseline.scan.truncated ||
    interactions.length < (report.interactions?.length ?? 0) ||
    interactions.some(
      (item) => item.pathTruncated || item.localBefore.scan.truncated,
    ) ||
    transitions.length < (report.transitions?.length ?? 0) ||
    manualSnapshots.length < (report.manualSnapshots?.length ?? 0) ||
    transitions.some(
      ({ before, after }) => before.scan.truncated || after.scan.truncated,
    ) ||
    manualSnapshots.some(({ snapshot }) => snapshot.scan.truncated);
  const status = ['CAPTURED', 'INCOMPLETE', 'TIMED_OUT', 'CANCELLED'].includes(
    report.status,
  )
    ? report.status
    : 'INCOMPLETE';
  return {
    version: 'leqad-rectangle-dropdown/3',
    interactionMode:
      report.interactionMode === 'OPEN_THEN_SELECT_RECTANGLE'
        ? 'OPEN_THEN_SELECT_RECTANGLE'
        : 'OBSERVE_MENU',
    workflowState: WORKFLOW_STATES.includes(report.workflowState)
      ? report.workflowState
      : 'IDLE',
    stateHistory: (Array.isArray(report.stateHistory)
      ? report.stateHistory
      : []
    )
      .filter((state) => WORKFLOW_STATES.includes(state))
      .slice(0, 8),
    cancelReason:
      status === 'CANCELLED'
        ? CANCEL_REASONS.includes(report.cancelReason!)
          ? report.cancelReason
          : 'UNKNOWN'
        : null,
    status: truncated && status === 'CAPTURED' ? 'INCOMPLETE' : status,
    captureMode:
      report.captureMode === 'MANUAL_FALLBACK'
        ? 'MANUAL_FALLBACK'
        : 'AUTOMATIC',
    baseline,
    interactions,
    transitions,
    manualSnapshots,
    truncated,
  };
}

/** Serializes only the standalone diagnostic vocabulary and enforces its cap. */
export function serializeRectangleDropdownReport(
  report: RectangleDropdownCaptureReport,
): string {
  const limits = defaultLimits();
  return JSON.stringify(cappedReport(sanitizeReport(report), limits));
}

function relationFor(
  triggerElements: readonly Element[],
  variantElements: readonly Element[],
): RectangleDropdownTransition['relationship'] {
  if (!triggerElements.length || !variantElements.length) return 'UNKNOWN';
  if (
    triggerElements.some((trigger) =>
      variantElements.some((variant) => trigger.contains(variant)),
    )
  )
    return 'NESTED';
  if (triggerElements.length > 1 || variantElements.length > 1)
    return 'AMBIGUOUS';
  return 'SEPARATE_DOCUMENT_BRANCH';
}

function candidateSignature(candidate: RectangleDropdownCandidate): string {
  return JSON.stringify({
    label: candidate.label,
    kind: candidate.labelClassification,
    tag: candidate.node.tag,
    role: candidate.node.role,
    expanded: candidate.node.ariaExpanded,
    visibility: candidate.node.visibility,
    parent: candidate.ancestors[0]?.tag ?? null,
    parentRole: candidate.ancestors[0]?.role ?? null,
  });
}

function changedCount(
  before: RectangleDropdownSnapshot,
  after: RectangleDropdownSnapshot,
): number {
  const unmatched = before.candidates.map(candidateSignature).sort();
  let changed = 0;
  for (const signature of after.candidates.map(candidateSignature).sort()) {
    const index = unmatched.indexOf(signature);
    if (index >= 0) unmatched.splice(index, 1);
    else changed++;
  }
  return changed + unmatched.length;
}

function inspectInputContext(root: Document, inputPath: readonly Element[]) {
  // A bounded parent branch is a diagnostic scope, not an identified command.
  const branch =
    inputPath
      .slice(0, 4)
      .filter((element) => !['body', 'html'].includes(element.localName))
      .at(-1) ?? inputPath[0]!;
  return inspect(root, {
    inputPath,
    scanRoot: branch,
    referenceElement: inputPath[0]!,
    limits: {
      scannedElements: LOCAL_ELEMENT_LIMIT,
      capturedAncestors: 2,
      siblingRadius: 1,
    },
  });
}

function inspectLocalChanges(
  root: Document,
  inputPath: readonly Element[],
  known: readonly Element[],
  changed: readonly Element[],
  incomplete: boolean,
) {
  const elements = [...new Set([...inputPath, ...known, ...changed])];
  const retained = new Set(elements.slice(0, LOCAL_ELEMENT_LIMIT));
  const result = inspect(root, {
    inputPath: inputPath.filter((element) => retained.has(element)),
    candidateElements: known.filter((element) => retained.has(element)),
    structuralChangeElements: changed.filter((element) =>
      retained.has(element),
    ),
    scanRoot: root.createElement('div'),
    referenceElement: inputPath[0]!,
    limits: {
      scannedElements: LOCAL_ELEMENT_LIMIT,
      capturedAncestors: 2,
      siblingRadius: 1,
    },
  });
  const truncated =
    incomplete ||
    elements.length > LOCAL_ELEMENT_LIMIT ||
    result.snapshot.scan.truncated;
  result.snapshot.scan = {
    ...result.snapshot.scan,
    scannedElements: retained.size,
    truncated,
    status: truncated ? 'INCOMPLETE' : 'COMPLETE',
  };
  return result;
}

/**
 * Starts a one-shot passive observation. It captures one bounded baseline,
 * then only changed/added DOM subtrees after user input. It never synthesizes
 * a click or keyboard event.
 */
export function createRectangleDropdownCapture(
  root: Document,
  timeoutMs: number = RECOGNITION_DIAGNOSTIC_LIMITS.captureTimeoutMs,
  interactionMode: RectangleDropdownInteractionMode = 'OBSERVE_MENU',
): RectangleDropdownCaptureTask {
  const view = root.defaultView;
  const baseline = inspect(root).snapshot;
  const initialLocation = root.location.href; // In memory only; never exported.
  let active = true;
  let workflowState: RectangleDropdownWorkflowState = 'IDLE';
  const stateHistory: RectangleDropdownWorkflowState[] = ['IDLE'];
  const setState = (state: RectangleDropdownWorkflowState) => {
    if (workflowState === state) return;
    workflowState = state;
    if (stateHistory.length < 8) stateHistory.push(state);
  };
  setState('WAITING_FOR_MENU_OPEN_INPUT');
  let selectionPending = false;
  let inputPath: Element[] = [];
  let openingPath: Element[] = [];
  let openingNamedBranches: Element[] = [];
  let inputInspection: ReturnType<typeof inspectInputContext> | null = null;
  const interactions: RectangleDropdownInteraction[] = [];
  let currentInput: RectangleDropdownInteraction | null = null;
  let sawClosedAfterOpen = false;
  let truncated = baseline.scan.truncated;
  let localIncomplete = false;
  let pendingFrame: number | null = null;
  let pendingFrameTimer: number | null = null;
  let timeout: number | null = null;
  let pendingRecords: MutationRecord[] = [];
  const transitions: RectangleDropdownTransition[] = [];
  let previous: RectangleDropdownSnapshot | null = null;
  let resolve!: (result: RectangleDropdownCaptureResult) => void;
  const promise = new Promise<RectangleDropdownCaptureResult>((done) => {
    resolve = done;
  });

  const schedule = () => {
    if (pendingFrame !== null || pendingFrameTimer !== null) return;
    if (view?.requestAnimationFrame)
      pendingFrame = view.requestAnimationFrame(processRecords);
    else pendingFrameTimer = view?.setTimeout(processRecords, 16) ?? null;
  };
  const observer = new MutationObserver((records) => {
    if (!active || !currentInput || records.length === 0) return;
    const room = Math.max(0, LOCAL_ELEMENT_LIMIT - pendingRecords.length);
    pendingRecords.push(...records.slice(0, room));
    if (records.length > room) {
      truncated = true;
      localIncomplete = true;
    }
    schedule();
  });
  const navigationEvents = [
    'pagehide',
    'popstate',
    'hashchange',
    'wxt:locationchange',
  ] as const;
  const cleanup = () => {
    root.removeEventListener('pointerdown', onPointer, true);
    root.removeEventListener('click', onClick, true);
    root.removeEventListener('keydown', onKeyboard, true);
    root.removeEventListener('visibilitychange', onVisibility);
    for (const event of navigationEvents)
      view?.removeEventListener(event, onNavigation, true);
    observer.disconnect();
    if (timeout !== null) view?.clearTimeout(timeout);
    if (pendingFrame !== null) view?.cancelAnimationFrame(pendingFrame);
    if (pendingFrameTimer !== null) view?.clearTimeout(pendingFrameTimer);
    timeout = pendingFrame = pendingFrameTimer = null;
    pendingRecords = [];
  };
  const finish = (
    status: RectangleDropdownCaptureStatus,
    cancelReason: RectangleDropdownCancelReason | null = null,
  ) => {
    if (!active) return;
    active = false;
    setState(
      status === 'CANCELLED'
        ? 'CANCELLED'
        : status === 'TIMED_OUT'
          ? 'TIMED_OUT'
          : 'FINISHED',
    );
    cleanup();
    const finalStatus =
      status === 'CAPTURED' && truncated ? 'INCOMPLETE' : status;
    resolve({
      status: finalStatus,
      report: {
        version: 'leqad-rectangle-dropdown/3',
        interactionMode,
        workflowState,
        stateHistory,
        cancelReason:
          status === 'CANCELLED' ? (cancelReason ?? 'UNKNOWN') : null,
        status: finalStatus,
        captureMode: 'AUTOMATIC',
        baseline,
        interactions,
        transitions,
        manualSnapshots: [],
        truncated,
      },
    });
  };
  const eventPathFor = (event: Event) => {
    const path = event.composedPath?.() ?? [event.target];
    const elements: Element[] = [];
    let pathTruncated = false;
    for (const item of path) {
      if (!(item instanceof Element)) continue;
      if (isLeqadOwned(item)) return null;
      if (
        elements.length >= RECTANGLE_DROPDOWN_CAPTURE_LIMITS.capturedAncestors
      ) {
        pathTruncated = true;
        break;
      }
      elements.push(item);
    }
    // Text editors and Leqad controls are outside this diagnostic's purpose.
    if (
      !elements.length ||
      elements.some((element) =>
        element.matches(
          'input,textarea,select,[contenteditable]:not([contenteditable="false"])',
        ),
      )
    )
      return null;
    return { elements, pathTruncated };
  };
  const recordClick = (path: Element[]) => {
    if (!currentInput) return;
    // Inspect names through the nearest independent control boundary. A child
    // label cannot hide a conflicting control name or turn the opener into an option.
    const controlIndex = path.findIndex(
      (element) => nodeSummary(element).actionableMarkup === 'MARKUP_SIGNAL',
    );
    const branch = path
      .slice(0, controlIndex < 0 ? path.length : controlIndex + 1)
      .filter((element) => !['body', 'html'].includes(element.localName));
    const boundary = controlIndex < 0 ? null : path[controlIndex]!;
    const isOpeningControl =
      interactions.length > 1 &&
      ((boundary !== null &&
        (openingPath.includes(boundary) ||
          boundary.hasAttribute('aria-haspopup'))) ||
        openingPath.includes(path[0]!) ||
        branch.some((element) => openingNamedBranches.includes(element)));
    let singleChildChain = true;
    const labels = new Set<RectangleDropdownLabel>();
    for (const [index, element] of branch.entries()) {
      if (index > 0) singleChildChain &&= element.children.length === 1;
      const explicitName =
        element.hasAttribute('aria-label') ||
        element.hasAttribute('aria-labelledby') ||
        element.hasAttribute('title');
      const label = labelFor(element).label;
      if (
        (index === 0 ||
          singleChildChain ||
          explicitName ||
          element === boundary) &&
        label &&
        label !== 'Rectangle'
      )
        labels.add(label);
    }
    const clickedLabel =
      !isOpeningControl && labels.size === 1 ? [...labels][0]! : null;
    currentInput.clickedLabel = clickedLabel;
    if (interactionMode !== 'OPEN_THEN_SELECT_RECTANGLE') return;
    if (
      interactions.length === 1 &&
      workflowState === 'WAITING_FOR_MENU_OPEN_INPUT'
    ) {
      setState('MENU_INTERACTION_OBSERVED');
      setState('WAITING_FOR_VARIANT_CLICK');
    } else if (interactions.length > 1 && clickedLabel !== null) {
      setState('VARIANT_CLICK_OBSERVED');
      selectionPending = true;
      schedule(); // Let the host click handler run, including menu dismissal.
    }
  };
  const noteInput = (
    category: RectangleDropdownTransition['eventCategory'],
    event: Event,
    clickObserved = false,
  ) => {
    if (!active) return;
    if (root.location.href !== initialLocation) {
      finish('CANCELLED', 'NAVIGATION');
      return;
    }
    const path = eventPathFor(event);
    if (!path) return;
    if (
      clickObserved &&
      currentInput &&
      inputPath[0] === path.elements[0] &&
      !currentInput.clickObserved
    ) {
      currentInput.clickObserved = true;
      recordClick(path.elements);
      currentInput.clickPathMatchesInput =
        currentInput.pathTruncated || path.pathTruncated
          ? null
          : inputPath.length === path.elements.length &&
            inputPath.every(
              (element, index) => element === path.elements[index],
            );
      truncated ||= path.pathTruncated;
      return;
    }
    // Finish processing the previous input's mutations before attributing a new
    // batch. Mutations predating the first input cannot establish a transition.
    const queued = observer.takeRecords();
    if (currentInput && (pendingRecords.length || queued.length)) {
      const room = Math.max(0, LOCAL_ELEMENT_LIMIT - pendingRecords.length);
      pendingRecords.push(...queued.slice(0, room));
      localIncomplete ||= queued.length > room;
      processRecords();
      if (!active) return;
    }
    if (interactions.length >= INTERACTION_LIMIT) {
      truncated = true;
      finish('INCOMPLETE');
      return;
    }
    inputPath = path.elements;
    if (!interactions.length) {
      openingPath = [...inputPath];
      // Preserve only bounded exact named branches observed BEFORE opening.
      // Shared body/app ancestors cannot be inferred to be the trigger.
      openingNamedBranches = inputPath.filter((element) => {
        const label = labelFor(element).label;
        return (
          !['body', 'html'].includes(element.localName) &&
          label !== null &&
          label !== 'Rectangle'
        );
      });
    }
    inputInspection = inspectInputContext(root, inputPath);
    currentInput = {
      sequence: interactions.length + 1,
      eventCategory: category,
      clickObserved,
      clickedLabel: clickObserved ? labelFor(inputPath[0]!).label : null,
      clickPathMatchesInput: clickObserved && !path.pathTruncated ? true : null,
      path: inputPath.map((element, distance) => ({
        distance,
        label: labelFor(element).label,
        node: nodeSummary(element),
      })),
      pathTruncated: path.pathTruncated,
      localBefore: inputInspection.snapshot,
    };
    interactions.push(currentInput);
    truncated ||= path.pathTruncated || inputInspection.snapshot.scan.truncated;
    previous = inputInspection.snapshot;
    if (clickObserved) recordClick(inputPath);
  };
  const onPointer = (event: Event) => {
    if (event instanceof MouseEvent && event.button !== 0) return;
    noteInput('POINTER', event);
  };
  const onClick = (event: Event) => noteInput('CLICK', event, true);
  const onKeyboard = (event: Event) => {
    if (
      event instanceof KeyboardEvent &&
      ['Enter', ' ', 'ArrowDown'].includes(event.key)
    )
      noteInput('KEYBOARD', event);
  };
  const onNavigation = () => finish('CANCELLED', 'NAVIGATION');
  const onVisibility = () => {
    if (root.visibilityState === 'hidden') finish('CANCELLED', 'PAGE_HIDDEN');
  };

  const processRecords = () => {
    if (pendingFrame !== null) view?.cancelAnimationFrame(pendingFrame);
    if (pendingFrameTimer !== null) view?.clearTimeout(pendingFrameTimer);
    pendingFrame = pendingFrameTimer = null;
    const records = pendingRecords;
    pendingRecords = [];
    if (!active || !currentInput || !inputInspection || !previous) return;
    if (!records.length) {
      if (selectionPending) finish('CAPTURED');
      return;
    }
    if (root.location.href !== initialLocation) {
      finish('CANCELLED', 'NAVIGATION');
      return;
    }
    const changedElements = new Set<Element>();
    let batchIncomplete = localIncomplete;
    localIncomplete = false;
    let inspectedMutationNodes = 0;
    const add = (element: Element) => {
      inspectedMutationNodes++;
      if (isLeqadOwned(element) || ['body', 'html'].includes(element.localName))
        return;
      if (changedElements.size >= LOCAL_ELEMENT_LIMIT) {
        batchIncomplete = true;
        return;
      }
      changedElements.add(element);
    };
    recordLoop: for (const record of records) {
      if (inspectedMutationNodes >= LOCAL_ELEMENT_LIMIT) {
        batchIncomplete = true;
        break;
      }
      const target =
        record.target instanceof Element
          ? record.target
          : record.target.parentElement;
      if (target) add(target);
      for (const list of [record.addedNodes, record.removedNodes]) {
        for (let index = 0; index < list.length; index++) {
          if (inspectedMutationNodes >= LOCAL_ELEMENT_LIMIT) {
            batchIncomplete = true;
            break recordLoop;
          }
          const node = list[index]!;
          if (!(node instanceof Element) || isLeqadOwned(node)) {
            inspectedMutationNodes++;
            continue;
          }
          const walker = root.createTreeWalker(node, 1);
          let current: Node | null = node;
          while (current && inspectedMutationNodes < LOCAL_ELEMENT_LIMIT) {
            if (current instanceof Element) add(current);
            current = walker.nextNode();
          }
          if (current) batchIncomplete = true;
        }
      }
    }
    const local = inspectLocalChanges(
      root,
      inputPath,
      inputInspection.internal.map(({ element }) => element),
      [...changedElements],
      batchIncomplete,
    );
    const after = local.snapshot;
    truncated ||= after.scan.truncated;
    const delta = changedCount(previous, after);
    const stateChanged = previous.domObservedState !== after.domObservedState;
    // Common app ancestors cannot establish that an unrelated panel changed
    // because of this input. Only the actual indicated subtree is local here.
    const relevantStructure = [...changedElements].some((element) =>
      inputPath[0]?.contains(element),
    );
    const changedLabel = [...changedElements].some(
      (element) => labelFor(element).label !== null,
    );
    // Temporal coincidence is not a trigger/menu association. Unrelated changes
    // must not terminate an UNKNOWN capture or fabricate a menu transition.
    if (
      (!stateChanged && !relevantStructure && !changedLabel) ||
      (!delta && !stateChanged && !relevantStructure)
    ) {
      if (selectionPending) finish('CAPTURED');
      return;
    }
    if (transitions.length >= 4) {
      truncated = true;
      finish('INCOMPLETE');
      return;
    }
    transitions.push({
      eventCategory: currentInput.eventCategory,
      inputSequence: currentInput.sequence,
      scope: 'INPUT_AND_MUTATION_LOCAL',
      inputAssociation: 'UNPROVEN',
      before: previous,
      after,
      relationship: relationFor(
        local.internal
          .filter(({ label }) => label === 'Rectangle')
          .map(({ element }) => element),
        local.internal
          .filter(({ label }) => label !== null && label !== 'Rectangle')
          .map(({ element }) => element),
      ),
      changedCandidateCount: delta,
    });
    previous = after;
    if (interactionMode === 'OPEN_THEN_SELECT_RECTANGLE') {
      if (selectionPending) finish('CAPTURED');
      else if (workflowState === 'WAITING_FOR_MENU_OPEN_INPUT') {
        setState('MENU_INTERACTION_OBSERVED');
        setState('WAITING_FOR_VARIANT_CLICK');
      }
      return;
    }
    if (baseline.domObservedState === 'OPEN') {
      if (!sawClosedAfterOpen && after.domObservedState === 'CLOSED') {
        sawClosedAfterOpen = true;
        return;
      }
      if (sawClosedAfterOpen && after.domObservedState === 'OPEN')
        finish('CAPTURED');
      return;
    }
    if (
      after.domObservedState === 'OPEN' ||
      (after.domObservedState === 'UNKNOWN' &&
        (relevantStructure || changedLabel))
    )
      finish('CAPTURED');
  };

  root.addEventListener('pointerdown', onPointer, {
    capture: true,
    passive: true,
  });
  root.addEventListener('click', onClick, { capture: true, passive: true });
  root.addEventListener('keydown', onKeyboard, {
    capture: true,
    passive: true,
  });
  root.addEventListener('visibilitychange', onVisibility);
  for (const event of navigationEvents)
    view?.addEventListener(event, onNavigation, {
      capture: true,
      passive: true,
    });
  observer.observe(root.documentElement, {
    subtree: true,
    childList: true,
    characterData: true,
    attributes: true,
    attributeFilter: [
      'aria-expanded',
      'aria-hidden',
      'aria-haspopup',
      'aria-label',
      'aria-labelledby',
      'hidden',
      'role',
      'title',
      'tabindex',
      'disabled',
      'aria-disabled',
      'inert',
    ],
  });
  timeout =
    view?.setTimeout(
      () => finish('TIMED_OUT'),
      Math.max(
        1,
        Math.min(timeoutMs, RECOGNITION_DIAGNOSTIC_LIMITS.captureTimeoutMs),
      ),
    ) ?? null;
  return {
    promise,
    cancel: (reason = 'UNKNOWN') => finish('CANCELLED', reason),
    isActive: () => active,
  };
}
