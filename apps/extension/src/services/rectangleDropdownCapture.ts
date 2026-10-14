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
  eventCategory: 'POINTER' | 'KEYBOARD' | null;
  before: RectangleDropdownSnapshot;
  after: RectangleDropdownSnapshot;
  relationship: 'NESTED' | 'SEPARATE_DOCUMENT_BRANCH' | 'AMBIGUOUS' | 'UNKNOWN';
  changedCandidateCount: number;
}

export interface RectangleDropdownCaptureReport {
  version: 'leqad-rectangle-dropdown/1';
  status: RectangleDropdownCaptureStatus;
  captureMode: 'AUTOMATIC' | 'MANUAL_FALLBACK';
  baseline: RectangleDropdownSnapshot;
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
  cancel(): void;
  isActive(): boolean;
}

interface InternalCandidate {
  element: Element;
  label: RectangleDropdownLabel | null;
  classification: CandidateKind;
  unlisted: boolean;
  summary: RectangleDropdownCandidate;
}

interface InspectionOptions {
  limits?: Partial<RectangleDropdownCaptureLimits>;
  inputPath?: readonly Element[];
  structuralChangeElements?: readonly Element[];
  scanRoot?: ParentNode;
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
    4, // NodeFilter.SHOW_TEXT
  );
  let current = walker.nextNode();
  let text = '';
  let visited = 0;
  while (current) {
    if (++visited > 64) return { text: '', complete: false };
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
  };
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
  const hasRectangle = candidates.some(({ label }) => label === 'Rectangle');
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
      isVisible(element),
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

  if (hasRectangle && visibleMenu && visibleVariant)
    return { domObservedState: 'OPEN', stateBasis: 'SEMANTIC_MENU' };
  return { domObservedState: 'UNKNOWN', stateBasis: 'UNKNOWN' };
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
  const found: Array<{
    element: Element;
    label: RectangleDropdownLabel | null;
    hasUnlistedName: boolean;
    inputPathMember: boolean;
    structuralChange: boolean;
  }> = [];
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
  if (found.length > limits.candidateRecords) truncated = true;
  const candidatesToSummarize = found.slice(0, limits.candidateRecords);
  const referenceElement =
    candidatesToSummarize.find((candidate) => candidate.label === 'Rectangle')
      ?.element ?? candidatesToSummarize[0]?.element;
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
    ),
  }));
  const visibleRectangles = candidatesToSummarize.filter(
    ({ label }) => label === 'Rectangle',
  );
  const duplicateBranches = visibleRectangles.some((candidate, index) =>
    visibleRectangles
      .slice(index + 1)
      .some(
        ({ element }) =>
          !candidate.element.contains(element) &&
          !element.contains(candidate.element),
      ),
  );
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
  let output = report;
  while (JSON.stringify(output).length > limits.reportChars) {
    const baseline = output.baseline;
    const reduced = {
      ...output,
      status: 'INCOMPLETE' as const,
      baseline: {
        ...baseline,
        candidates: baseline.candidates.slice(
          0,
          Math.max(0, baseline.candidates.length - 1),
        ),
        scan: {
          ...baseline.scan,
          status: 'INCOMPLETE' as const,
          truncated: true,
        },
      },
      transitions: output.transitions.map((transition) => ({
        ...transition,
        before: {
          ...transition.before,
          candidates: transition.before.candidates.slice(
            0,
            Math.max(0, transition.before.candidates.length - 1),
          ),
          scan: {
            ...transition.before.scan,
            status: 'INCOMPLETE' as const,
            truncated: true,
          },
        },
        after: {
          ...transition.after,
          candidates: transition.after.candidates.slice(
            0,
            Math.max(0, transition.after.candidates.length - 1),
          ),
          scan: {
            ...transition.after.scan,
            status: 'INCOMPLETE' as const,
            truncated: true,
          },
        },
      })),
      manualSnapshots: output.manualSnapshots.map((manual) => ({
        ...manual,
        snapshot: {
          ...manual.snapshot,
          candidates: manual.snapshot.candidates.slice(
            0,
            Math.max(0, manual.snapshot.candidates.length - 1),
          ),
          scan: {
            ...manual.snapshot.scan,
            status: 'INCOMPLETE' as const,
            truncated: true,
          },
        },
      })),
      truncated: true,
    };
    if (JSON.stringify(reduced) === JSON.stringify(output)) {
      output = {
        ...output,
        status: 'INCOMPLETE',
        baseline: {
          ...output.baseline,
          candidates: [],
          scan: {
            ...output.baseline.scan,
            status: 'INCOMPLETE',
            truncated: true,
          },
        },
        transitions: [],
        manualSnapshots: [],
        truncated: true,
      };
      break;
    }
    output = reduced;
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
      eventCategory:
        transition.eventCategory === 'POINTER' ||
        transition.eventCategory === 'KEYBOARD'
          ? transition.eventCategory
          : null,
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
  const truncated =
    Boolean(report.truncated) ||
    baseline.scan.truncated ||
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
    version: 'leqad-rectangle-dropdown/1',
    status: truncated && status === 'CAPTURED' ? 'INCOMPLETE' : status,
    captureMode:
      report.captureMode === 'MANUAL_FALLBACK'
        ? 'MANUAL_FALLBACK'
        : 'AUTOMATIC',
    baseline,
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

function withInternalCandidates(
  candidates: InternalCandidate[],
  truncated: boolean,
  scannedElements: number,
): RectangleDropdownSnapshot {
  const state = observedState(candidates);
  const candidateLimitReached =
    candidates.length > RECOGNITION_DIAGNOSTIC_LIMITS.candidateRecords;
  const scanIncomplete = truncated || candidateLimitReached;
  const exact = candidates.filter(({ label }) => label === 'Rectangle');
  const duplicate = exact.some((candidate, index) =>
    exact
      .slice(index + 1)
      .some(
        ({ element }) =>
          !candidate.element.contains(element) &&
          !element.contains(candidate.element),
      ),
  );
  return {
    ...state,
    domObservedState: duplicate ? 'UNKNOWN' : state.domObservedState,
    stateBasis: duplicate ? 'UNKNOWN' : state.stateBasis,
    ambiguity: duplicate ? 'DUPLICATE_EXACT_LABELS' : null,
    candidates: candidates
      .slice(0, RECOGNITION_DIAGNOSTIC_LIMITS.candidateRecords)
      .map(({ summary }) => summary),
    scan: {
      status: scanIncomplete ? 'INCOMPLETE' : 'COMPLETE',
      scannedElements,
      unlistedLabelCount: candidates.filter(({ unlisted }) => unlisted).length,
      truncated: scanIncomplete,
    },
  };
}

/**
 * Starts a one-shot passive observation. It captures one bounded baseline,
 * then only changed/added DOM subtrees after user input. It never synthesizes
 * a click or keyboard event.
 */
export function createRectangleDropdownCapture(
  root: Document,
  timeoutMs: number = RECOGNITION_DIAGNOSTIC_LIMITS.captureTimeoutMs,
): RectangleDropdownCaptureTask {
  const view = root.defaultView;
  const baselineInspection = inspect(root);
  const baseline = baselineInspection.snapshot;
  const initialLocation = root.location.href;
  let active = true;
  let inputCategory: RectangleDropdownTransition['eventCategory'] = null;
  let inputPath: Element[] = [];
  let sawClosedAfterOpen = false;
  let truncated = baseline.scan.truncated;
  let pendingFrame: number | null = null;
  let pendingFrameTimer: number | null = null;
  let timeout: number | null = null;
  let pendingRecords: MutationRecord[] = [];
  let transitions: RectangleDropdownTransition[] = [];
  let previous = baseline;
  let resolve!: (result: RectangleDropdownCaptureResult) => void;
  const promise = new Promise<RectangleDropdownCaptureResult>((done) => {
    resolve = done;
  });
  const observer: MutationObserver = new MutationObserver((records) => {
    if (!active || !inputCategory || records.length === 0) return;
    const room = Math.max(
      0,
      FEATURE_LIST_CAPTURE_LIMITS.inspectedElements - pendingRecords.length,
    );
    pendingRecords.push(...records.slice(0, room));
    if (records.length > room) truncated = true;
    if (pendingFrame !== null || pendingFrameTimer !== null) return;
    if (view?.requestAnimationFrame) {
      pendingFrame = view.requestAnimationFrame(processRecords);
    } else {
      pendingFrameTimer = view?.setTimeout(processRecords, 16) ?? null;
    }
  });

  const cleanup = () => {
    root.removeEventListener('pointerdown', onPointer, true);
    root.removeEventListener('keydown', onKeyboard, true);
    view?.removeEventListener('pagehide', onNavigation, true);
    view?.removeEventListener('popstate', onNavigation, true);
    view?.removeEventListener('hashchange', onNavigation, true);
    observer.disconnect();
    if (timeout !== null) view?.clearTimeout(timeout);
    if (pendingFrame !== null) view?.cancelAnimationFrame(pendingFrame);
    if (pendingFrameTimer !== null) view?.clearTimeout(pendingFrameTimer);
    timeout = null;
    pendingFrame = null;
    pendingFrameTimer = null;
    pendingRecords = [];
  };

  const finish = (status: RectangleDropdownCaptureStatus) => {
    if (!active) return;
    active = false;
    cleanup();
    const finalStatus =
      status === 'CAPTURED' && truncated ? 'INCOMPLETE' : status;
    const report: RectangleDropdownCaptureReport = {
      version: 'leqad-rectangle-dropdown/1',
      status: finalStatus,
      captureMode: 'AUTOMATIC',
      baseline,
      transitions,
      manualSnapshots: [],
      truncated,
    };
    resolve({ status: finalStatus, report });
  };

  const eventPathFor = (event: Event): Element[] => {
    const result: Element[] = [];
    const path = event.composedPath?.() ?? [event.target];
    for (const item of path) {
      if (!(item instanceof Element)) continue;
      if (isLeqadOwned(item)) break;
      result.push(item);
      if (result.length >= RECOGNITION_DIAGNOSTIC_LIMITS.capturedAncestors)
        break;
    }
    return result;
  };

  const noteInput = (category: 'POINTER' | 'KEYBOARD', event: Event) => {
    if (!active) return;
    const target = event.target;
    if (target instanceof Element && isLeqadOwned(target)) return;
    inputCategory = category;
    inputPath = eventPathFor(event);
  };
  const onPointer = (event: Event) => noteInput('POINTER', event);
  const onKeyboard = (event: Event) => noteInput('KEYBOARD', event);
  const onNavigation = () => finish('CANCELLED');

  const processRecords = () => {
    pendingFrame = null;
    pendingFrameTimer = null;
    const records = pendingRecords;
    pendingRecords = [];
    if (!active || !inputCategory || records.length === 0) return;
    if (root.location.href !== initialLocation) {
      finish('CANCELLED');
      return;
    }

    const changedSubtrees: Element[] = [];
    const changedContainers: Element[] = [];
    let changedRecordCount = 0;
    for (const record of records) {
      if (changedRecordCount >= FEATURE_LIST_CAPTURE_LIMITS.inspectedElements) {
        truncated = true;
        break;
      }
      const target =
        record.target instanceof Element
          ? record.target
          : record.target.parentElement;
      if (target && !isLeqadOwned(target)) {
        changedContainers.push(target);
        changedRecordCount++;
      }
      for (const node of record.addedNodes) {
        if (
          node instanceof Element &&
          !isLeqadOwned(node) &&
          changedRecordCount < FEATURE_LIST_CAPTURE_LIMITS.inspectedElements
        ) {
          changedSubtrees.push(node);
          changedRecordCount++;
        } else if (node instanceof Element && !isLeqadOwned(node)) {
          truncated = true;
        }
      }
      for (const node of record.removedNodes) {
        if (
          node instanceof Element &&
          !isLeqadOwned(node) &&
          changedRecordCount < FEATURE_LIST_CAPTURE_LIMITS.inspectedElements
        ) {
          changedSubtrees.push(node);
          changedRecordCount++;
        } else if (node instanceof Element && !isLeqadOwned(node)) {
          truncated = true;
        }
      }
    }
    const roots = changedSubtrees.filter(
      (element, index) =>
        !changedSubtrees.some(
          (other, otherIndex) =>
            index !== otherIndex &&
            other !== element &&
            other.contains(element),
        ),
    );
    const changedElements: Element[] = [...new Set(changedContainers)];
    let remaining = Math.max(
      0,
      FEATURE_LIST_CAPTURE_LIMITS.inspectedElements - changedElements.length,
    );
    for (const changedRoot of roots) {
      const walker = root.createTreeWalker(changedRoot, 1);
      let current: Node | null = changedRoot;
      while (current && remaining > 0) {
        if (current instanceof Element && !isLeqadOwned(current)) {
          changedElements.push(current);
          remaining--;
        }
        current = walker.nextNode();
      }
      if (current) truncated = true;
    }

    // Inspecting this detached root avoids another full-page scan. The
    // observer already enumerated every changed subtree under its 256-node cap.
    const local = inspect(root, {
      inputPath,
      structuralChangeElements: changedElements,
      scanRoot: root.createElement('div'),
      limits: {
        scannedElements: FEATURE_LIST_CAPTURE_LIMITS.inspectedElements,
        candidateRecords: RECOGNITION_DIAGNOSTIC_LIMITS.candidateRecords,
        capturedAncestors: RECOGNITION_DIAGNOSTIC_LIMITS.capturedAncestors,
        siblingRadius: FEATURE_LIST_CAPTURE_LIMITS.siblingRadius,
      },
    });
    truncated ||= local.snapshot.scan.truncated;
    const updated = new Map<Element, InternalCandidate>();
    for (const candidate of local.internal)
      updated.set(candidate.element, candidate);
    const merged = new Map<Element, InternalCandidate>();
    for (const candidate of baselineInspection.internal) {
      if (candidate.element.isConnected)
        merged.set(candidate.element, candidate);
    }
    for (const candidate of updated.values())
      merged.set(candidate.element, candidate);
    const all = [...merged.values()];
    const after = withInternalCandidates(
      all,
      truncated,
      baseline.scan.scannedElements + local.snapshot.scan.scannedElements,
    );
    truncated ||= after.scan.truncated;
    const delta = changedCount(previous, after);
    const stateChanged = previous.domObservedState !== after.domObservedState;
    const structuralMutation = records.some(
      (record) => record.type === 'childList',
    );
    if (delta === 0 && !stateChanged && !structuralMutation) return;

    const transition: RectangleDropdownTransition = {
      eventCategory: inputCategory,
      before: previous,
      after,
      relationship: relationFor(
        all
          .filter(({ label }) => label === 'Rectangle')
          .map(({ element }) => element),
        all
          .filter(({ label }) => label !== null && label !== 'Rectangle')
          .map(({ element }) => element),
      ),
      changedCandidateCount: delta,
    };
    transitions = [...transitions, transition];
    previous = after;

    if (baseline.domObservedState === 'OPEN') {
      if (!sawClosedAfterOpen && after.domObservedState === 'CLOSED') {
        sawClosedAfterOpen = true;
        return;
      }
      if (sawClosedAfterOpen && after.domObservedState === 'OPEN') {
        finish('CAPTURED');
        return;
      }
      return;
    }
    if (baseline.domObservedState === 'CLOSED') {
      if (after.domObservedState === 'OPEN') {
        finish('CAPTURED');
        return;
      }
      if (
        after.domObservedState === 'UNKNOWN' &&
        (delta > 0 || structuralMutation)
      ) {
        finish('CAPTURED');
        return;
      }
      // Continue waiting while an observed control remains closed. Unrelated
      // page mutations cannot stand in for the dropdown's open transition.
      return;
    }
    if (delta > 0 || structuralMutation) finish('CAPTURED');
  };

  root.addEventListener('pointerdown', onPointer, {
    capture: true,
    passive: true,
  });
  root.addEventListener('keydown', onKeyboard, {
    capture: true,
    passive: true,
  });
  view?.addEventListener('pagehide', onNavigation, {
    capture: true,
    passive: true,
  });
  view?.addEventListener('popstate', onNavigation, {
    capture: true,
    passive: true,
  });
  view?.addEventListener('hashchange', onNavigation, {
    capture: true,
    passive: true,
  });
  observer.observe(root.documentElement, {
    subtree: true,
    childList: true,
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
    cancel: () => finish('CANCELLED'),
    isActive: () => active,
  };
}
