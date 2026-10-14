import {
  enabledState,
  isLeqadOwned,
  normalizedText,
  semanticName,
  visibilityState,
} from './semanticTargetDom';
import {
  planeIdentity,
  referencePlaneCandidate,
  referencePlaneContext,
  type ReferencePlane,
} from './referencePlanes';

export const RECOGNITION_DIAGNOSTIC_LIMITS = {
  treeRoots: 8,
  landmarkSearchElements: 300,
  scannedElements: 6000,
  candidateRecords: 12,
  capturedAncestors: 10,
  captureTimeoutMs: 20_000,
  reportChars: 16_000,
} as const;

const planes: readonly ReferencePlane[] = ['Top', 'Front', 'Right'];
const treeSelector = '[role="tree"],[role="treegrid"]';
const namedRowSelector = '[role="treeitem"],[role="group"],[role="row"]';
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
]);

type DiagnosticScanStatus =
  | 'COMPLETE'
  | 'INCOMPLETE'
  | 'NO_SEMANTIC_TREE_ROOT'
  | 'TREE_ROOT_LIMIT_REACHED';

export interface TopRowCaptureStructure {
  tag: string;
  role: string;
  ariaLabelPresent: boolean;
  ariaLabelledByPresent: boolean;
  titlePresent: boolean;
  tabIndexPresent: boolean;
  planeMatches: ReferencePlane[];
  defaultGeometryMatch: boolean;
  actionable: boolean;
  visibility: string;
  enabled: string;
  context: string;
}

export interface TopRowCaptureReport {
  status: 'CAPTURED';
  diagnosis: string;
  findings: string[];
  actionableAncestorDistance: number | null;
  structure: TopRowCaptureStructure[];
  assessment: {
    planeCandidateObserved: boolean;
    contextValid: boolean;
    confidence: string;
    rejection: string | null;
  } | null;
}

export type TopRowCaptureResult =
  | { status: 'CAPTURED'; report: TopRowCaptureReport }
  | { status: 'TIMED_OUT' }
  | { status: 'CANCELLED' };

export interface TopRowCaptureTask {
  promise: Promise<TopRowCaptureResult>;
  cancel(): void;
  isActive(): boolean;
}

function treeElements(root: ParentNode): HTMLElement[] {
  const matches = [...root.querySelectorAll<HTMLElement>(treeSelector)];
  if (root instanceof HTMLElement && root.matches(treeSelector))
    matches.unshift(root);
  return matches;
}

function findDefaultGeometryLandmarks(tree: HTMLElement): HTMLElement[] {
  const document = tree.ownerDocument;
  const walker = document.createTreeWalker(tree, 1);
  const found: HTMLElement[] = [];
  let current = walker.nextNode();
  let visited = 0;
  while (
    current &&
    visited < RECOGNITION_DIAGNOSTIC_LIMITS.landmarkSearchElements
  ) {
    visited++;
    const element = current as HTMLElement;
    if (
      element.matches(namedRowSelector) &&
      semanticName(element) === 'default geometry'
    )
      found.push(element);
    if (found.length >= RECOGNITION_DIAGNOSTIC_LIMITS.candidateRecords) break;
    current = walker.nextNode();
  }
  return found;
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

function actionable(element: HTMLElement): boolean {
  return (
    element.matches(
      'button,input,select,textarea,a[href],[role="button"],[role="treeitem"],[role="row"],[role="option"],[role="menuitem"],[role="tab"],[tabindex]:not([tabindex="-1"])',
    ) || element.tabIndex >= 0
  );
}

function mayHaveRelevantName(element: HTMLElement): boolean {
  return (
    element.hasAttribute('aria-label') ||
    element.hasAttribute('aria-labelledby') ||
    element.hasAttribute('title') ||
    element.childElementCount === 0 ||
    element.matches(
      'button,input,select,textarea,a[href],[role="treeitem"],[role="row"],[role="option"],[role="button"],[tabindex]',
    )
  );
}

function candidateRecord(element: HTMLElement, plane: ReferencePlane) {
  const candidate = referencePlaneCandidate(
    element,
    `${plane.toLowerCase()}-plane` as
      'top-plane' | 'front-plane' | 'right-plane',
  );
  if (!candidate) return null;
  const row = candidate.element;
  const ariaNameAttributePresent = Boolean(
    row.hasAttribute('aria-label') || row.hasAttribute('aria-labelledby'),
  );
  return {
    plane,
    tag: safeTags.has(row.localName) ? row.localName : 'other',
    role: safeRole(row),
    ariaLabelPresent: row.hasAttribute('aria-label'),
    ariaLabelledByPresent: row.hasAttribute('aria-labelledby'),
    ariaNameAttributePresent,
    titlePresent: row.hasAttribute('title'),
    tabIndexPresent: row.hasAttribute('tabindex'),
    actionable: actionable(row),
    context: candidate.context ?? 'UNKNOWN',
    contextValid: candidate.contextValid === true,
    visibility: candidate.visibility,
    enabled: candidate.enabled,
    confidence: candidate.confidence,
    rejection:
      candidate.rejectionReason ??
      (candidate.visibility !== 'VISIBLE'
        ? candidate.visibility
        : candidate.enabled !== 'ENABLED'
          ? candidate.enabled
          : null),
  };
}

/**
 * Explicitly invoked local diagnostic. It scans semantic feature-tree roots,
 * not the whole document. Its result is intentionally separate from the
 * production Show me recognizer, which this function does not execute.
 */
export function collectRecognitionDiagnostics(
  root: ParentNode,
  capturedTopRow?: TopRowCaptureReport,
): string {
  const roots = treeElements(root);
  const rootsToScan = roots.slice(0, RECOGNITION_DIAGNOSTIC_LIMITS.treeRoots);
  const landmarks = rootsToScan.flatMap(findDefaultGeometryLandmarks);
  const regions = landmarks.length ? landmarks : rootsToScan;
  const rowCandidates = new Map<
    ReferencePlane,
    Map<HTMLElement, ReturnType<typeof candidateRecord>>
  >(planes.map((plane) => [plane, new Map()]));
  const records: object[] = [];
  const recordedRows = new Set<HTMLElement>();
  let scannedElements = 0;
  let scanLimitReached = roots.length > rootsToScan.length;
  const maxRecords = RECOGNITION_DIAGNOSTIC_LIMITS.candidateRecords;

  for (const region of regions) {
    if (scannedElements >= RECOGNITION_DIAGNOSTIC_LIMITS.scannedElements) {
      scanLimitReached = true;
      break;
    }
    const walker = region.ownerDocument.createTreeWalker(region, 1);
    let current = walker.nextNode();
    const startCount = scannedElements;
    while (
      current &&
      scannedElements - startCount <
        RECOGNITION_DIAGNOSTIC_LIMITS.scannedElements &&
      scannedElements < RECOGNITION_DIAGNOSTIC_LIMITS.scannedElements
    ) {
      scannedElements++;
      const element = current as HTMLElement;
      if (!isLeqadOwned(element) && mayHaveRelevantName(element)) {
        const name = semanticName(element);
        const plane =
          planeIdentity(name) ??
          planeIdentity(normalizedText(element.getAttribute('title')));
        if (plane) {
          const record = candidateRecord(element, plane);
          if (record) {
            const candidate = referencePlaneCandidate(
              element,
              `${plane.toLowerCase()}-plane` as
                'top-plane' | 'front-plane' | 'right-plane',
            );
            if (candidate)
              rowCandidates.get(plane)!.set(candidate.element, record);
            if (
              candidate &&
              !recordedRows.has(candidate.element) &&
              records.length < maxRecords
            ) {
              recordedRows.add(candidate.element);
              const ancestors: object[] = [];
              for (
                let parent = candidate?.element.parentElement;
                parent && ancestors.length < 4;
                parent = parent.parentElement
              ) {
                ancestors.push({
                  tag: safeTags.has(parent.localName)
                    ? parent.localName
                    : 'other',
                  role: safeRole(parent),
                  ariaLabelPresent: parent.hasAttribute('aria-label'),
                  ariaLabelledByPresent: parent.hasAttribute('aria-labelledby'),
                  titlePresent: parent.hasAttribute('title'),
                  defaultGeometryMatch:
                    semanticName(parent) === 'default geometry',
                });
              }
              records.push({ ...record, ancestors });
            }
          }
        }
      }
      current = walker.nextNode();
    }
    if (current) scanLimitReached = true;
  }

  const scanStatus: DiagnosticScanStatus =
    roots.length === 0
      ? 'NO_SEMANTIC_TREE_ROOT'
      : roots.length > rootsToScan.length
        ? 'TREE_ROOT_LIMIT_REACHED'
        : scanLimitReached
          ? 'INCOMPLETE'
          : 'COMPLETE';
  const observations = Object.fromEntries(
    planes.map((plane) => {
      const matches = [...rowCandidates.get(plane)!.values()];
      const usable = matches.filter(
        (candidate) =>
          candidate?.contextValid &&
          candidate.visibility === 'VISIBLE' &&
          candidate.enabled === 'ENABLED',
      );
      return [
        plane,
        {
          status:
            scanStatus === 'COMPLETE'
              ? matches.length
                ? 'OBSERVED'
                : 'NO_MATCH_IN_SCANNED_REGION'
              : scanStatus === 'NO_SEMANTIC_TREE_ROOT'
                ? 'NO_SEMANTIC_TREE_ROOT'
                : 'INCOMPLETE',
          candidateCount: matches.length,
          contextValidCount: matches.filter(
            (candidate) => candidate?.contextValid,
          ).length,
          usableCount: usable.length,
        },
      ];
    }),
  );

  const report = {
    version: 'leqad-recognition/2',
    scope:
      'local structural observations only; actual Onshape compatibility remains unverified',
    productionRecognition: {
      status: 'NOT_RUN',
      note: 'This report does not run the production Show me candidate query. Its result must be recorded separately.',
    },
    scan: {
      status: scanStatus,
      region: landmarks.length
        ? 'DEFAULT_GEOMETRY'
        : roots.length
          ? 'SEMANTIC_TREE_ROOTS'
          : 'NONE',
      treeRootsFound: roots.length,
      treeRootsScanned: rootsToScan.length,
      landmarkCount: landmarks.length,
      scannedElements,
      elementLimit: RECOGNITION_DIAGNOSTIC_LIMITS.scannedElements,
    },
    scanLimitReached,
    candidateLimitReached: [...rowCandidates.values()].some(
      (rows) => rows.size > maxRecords,
    ),
    observations,
    candidates: records,
    ...(capturedTopRow ? { capturedTopRow } : {}),
  };
  const serialized = JSON.stringify(report);
  return serialized.length <= RECOGNITION_DIAGNOSTIC_LIMITS.reportChars
    ? serialized
    : JSON.stringify({
        ...report,
        candidates: records.slice(0, 4),
        reportTruncated: true,
      });
}

function capturedStructure(element: HTMLElement): TopRowCaptureStructure {
  const name = semanticName(element);
  const titleName = normalizedText(element.getAttribute('title'));
  const plane = planeIdentity(name) ?? planeIdentity(titleName);
  return {
    tag: safeTags.has(element.localName) ? element.localName : 'other',
    role: safeRole(element),
    ariaLabelPresent: element.hasAttribute('aria-label'),
    ariaLabelledByPresent: element.hasAttribute('aria-labelledby'),
    titlePresent: element.hasAttribute('title'),
    tabIndexPresent: element.hasAttribute('tabindex'),
    planeMatches: plane ? [plane] : [],
    defaultGeometryMatch:
      name === 'default geometry' || titleName === 'default geometry',
    actionable: actionable(element),
    visibility: visibilityState(element),
    enabled: enabledState(element),
    context: referencePlaneContext(element),
  };
}

function makeCaptureReport(path: HTMLElement[]): TopRowCaptureReport {
  const structure = path.map(capturedStructure);
  const matchedIndex = structure.findIndex((item) =>
    item.planeMatches.includes('Top'),
  );
  const treeRolePresent = structure.some((item) =>
    ['tree', 'treegrid'].includes(item.role),
  );
  const treeItemRolePresent = structure.some((item) =>
    ['treeitem', 'row', 'group'].includes(item.role),
  );
  const defaultGeometryPresent = structure.some(
    (item) => item.defaultGeometryMatch,
  );
  const actionableAncestorDistance = structure.findIndex(
    (item) => item.actionable,
  );
  const matchedElement = matchedIndex >= 0 ? path[matchedIndex]! : null;
  const candidate = matchedElement
    ? referencePlaneCandidate(matchedElement, 'top-plane')
    : null;
  const labelNode = matchedIndex >= 0 ? structure[matchedIndex]! : null;
  const rowNode = candidate
    ? structure.find((item, index) => path[index] === candidate.element)
    : null;
  const ariaNameAttributePresent = Boolean(
    (labelNode &&
      (labelNode.ariaLabelPresent || labelNode.ariaLabelledByPresent)) ||
    (rowNode && (rowNode.ariaLabelPresent || rowNode.ariaLabelledByPresent)),
  );
  const findings: string[] = [];
  if (matchedIndex < 0) findings.push('NO_BOUNDED_TOP_LABEL_MATCH');
  if (!treeRolePresent) findings.push('TREE_OR_TREEGRID_ROLE_NOT_EXPOSED');
  if (!treeItemRolePresent) findings.push('TREE_ROW_OR_GROUP_ROLE_NOT_EXPOSED');
  if (matchedIndex >= 0 && !ariaNameAttributePresent)
    findings.push('NO_ARIA_NAME_ATTRIBUTE_ON_TOP_LABEL_OR_ROW');
  if (!defaultGeometryPresent)
    findings.push('DEFAULT_GEOMETRY_ANCESTOR_NOT_EXPOSED');
  if (matchedIndex >= 0 && !candidate)
    findings.push('ACTIONABLE_ROW_HIERARCHY_NOT_RECOGNIZED');
  if (candidate && candidate.context !== 'FEATURE_TREE')
    findings.push('TOP_LABEL_OUTSIDE_RECOGNIZED_FEATURE_TREE');
  if (candidate && candidate.visibility !== 'VISIBLE')
    findings.push('TOP_ROW_NOT_VISIBLE');
  if (candidate && candidate.enabled !== 'ENABLED')
    findings.push('TOP_ROW_NOT_ENABLED');
  if (
    candidate?.contextValid &&
    candidate.visibility === 'VISIBLE' &&
    candidate.enabled === 'ENABLED'
  )
    findings.push('STRUCTURE_MATCHES_SUPPORTED_RESOLVER');
  const diagnosis = findings[0] ?? 'STRUCTURE_REQUIRES_REVIEW';
  return {
    status: 'CAPTURED',
    diagnosis,
    findings,
    actionableAncestorDistance:
      actionableAncestorDistance < 0 ? null : actionableAncestorDistance,
    structure,
    assessment: candidate
      ? {
          planeCandidateObserved: true,
          contextValid: candidate.contextValid === true,
          confidence: candidate.confidence,
          rejection:
            candidate.rejectionReason ??
            (candidate.visibility !== 'VISIBLE'
              ? candidate.visibility
              : candidate.enabled !== 'ENABLED'
                ? candidate.enabled
                : null),
        }
      : null,
  };
}

/** Arms one passive click capture; the event continues through Onshape unchanged. */
export function createTopRowCapture(
  root: Document,
  timeoutMs: number = RECOGNITION_DIAGNOSTIC_LIMITS.captureTimeoutMs,
): TopRowCaptureTask {
  let active = true;
  let timeout: number | null = null;
  let resolveResult!: (result: TopRowCaptureResult) => void;
  const promise = new Promise<TopRowCaptureResult>((resolve) => {
    resolveResult = resolve;
  });
  const view = root.defaultView;
  const finish = (result: TopRowCaptureResult) => {
    if (!active) return;
    active = false;
    root.removeEventListener('click', handleClick, true);
    if (timeout !== null && view) view.clearTimeout(timeout);
    timeout = null;
    resolveResult(result);
  };
  const handleClick = (event: MouseEvent) => {
    const viewElement = view?.HTMLElement;
    const path = (event.composedPath?.() ?? [event.target]).filter(
      (item): item is HTMLElement =>
        Boolean(viewElement && item instanceof viewElement),
    );
    const first = path[0];
    if (!first || isLeqadOwned(first)) return;
    const pagePath: HTMLElement[] = [];
    for (const element of path) {
      if (element === root.documentElement.parentElement) break;
      if (isLeqadOwned(element)) break;
      pagePath.push(element);
      if (pagePath.length >= RECOGNITION_DIAGNOSTIC_LIMITS.capturedAncestors)
        break;
    }
    finish({ status: 'CAPTURED', report: makeCaptureReport(pagePath) });
  };
  root.addEventListener('click', handleClick, { capture: true, passive: true });
  timeout =
    view?.setTimeout(
      () => finish({ status: 'TIMED_OUT' }),
      Math.max(1, Math.min(timeoutMs, 30_000)),
    ) ?? null;
  return {
    promise,
    cancel: () => finish({ status: 'CANCELLED' }),
    isActive: () => active,
  };
}
