import {
  isLeqadOwned,
  normalizedText,
  semanticName,
} from './semanticTargetDom';
import {
  planeIdentity,
  referencePlaneCandidate,
  type ReferencePlane,
} from './referencePlanes';
import {
  captureFeatureListStructure,
  type FeatureListParentRelationship,
  type FeatureListStructureNode,
} from './featureListStructureCapture';

export const RECOGNITION_DIAGNOSTIC_LIMITS = {
  treeRoots: 8,
  landmarkSearchElements: 300,
  scannedElements: 6000,
  candidateRecords: 12,
  capturedAncestors: 10,
  captureTimeoutMs: 20_000,
  reportChars: 24_000,
} as const;

function trimmedCapture(
  capture: TopRowCaptureReport,
  relationshipLimit: number,
  siblingLimit: number,
  labelLimit: number,
  pathLimit: number,
): TopRowCaptureReport {
  return {
    ...capture,
    structure: capture.structure.slice(0, pathLimit),
    relationshipOutline: {
      ...capture.relationshipOutline,
      relationships: capture.relationshipOutline.relationships
        .slice(0, relationshipLimit)
        .map((relationship) => ({
          ...relationship,
          siblings: relationship.siblings
            .slice(0, siblingLimit)
            .map((sibling) => ({
              ...sibling,
              nestedLabelMatches: sibling.nestedLabelMatches.slice(
                0,
                labelLimit,
              ),
              nestedScanTruncated: true,
            })),
        })),
      truncated: true,
    },
  };
}

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

export type TopRowCaptureStructure = FeatureListStructureNode;

export interface TopRowCaptureReport {
  status: 'CAPTURED';
  diagnosis: string;
  findings: string[];
  actionableAncestorDistance: number | null;
  structure: TopRowCaptureStructure[];
  relationshipOutline: {
    relationships: FeatureListParentRelationship[];
    elementsInspected: number;
    labelMatchesRecorded: number;
    truncated: boolean;
    interactionHandling: 'JAVASCRIPT_HANDLER_NOT_INSPECTED';
  };
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
    version: 'leqad-recognition/3',
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
  if (serialized.length <= RECOGNITION_DIAGNOSTIC_LIMITS.reportChars)
    return serialized;
  const trimmed = {
    ...report,
    candidates: records.slice(0, 4),
    ...(capturedTopRow
      ? { capturedTopRow: trimmedCapture(capturedTopRow, 4, 3, 2, 6) }
      : {}),
    reportTruncated: true,
  };
  const trimmedSerialized = JSON.stringify(trimmed);
  if (trimmedSerialized.length <= RECOGNITION_DIAGNOSTIC_LIMITS.reportChars)
    return trimmedSerialized;
  const minimal = {
    ...report,
    candidates: [],
    ...(capturedTopRow
      ? { capturedTopRow: trimmedCapture(capturedTopRow, 0, 0, 0, 4) }
      : {}),
    reportTruncated: true,
  };
  return JSON.stringify(minimal);
}

function makeCaptureReport(path: HTMLElement[]): TopRowCaptureReport {
  const matchedIndex = path.findIndex((element) => {
    const name =
      semanticName(element) || normalizedText(element.getAttribute('title'));
    return planeIdentity(name) === 'Top';
  });
  const matchedElement = matchedIndex >= 0 ? path[matchedIndex]! : path[0]!;
  const outline = captureFeatureListStructure(matchedElement, path);
  const structure = outline.capturedPath;
  const treeRolePresent = structure.some((item) =>
    ['tree', 'treegrid'].includes(item.role),
  );
  const treeItemRolePresent = structure.some((item) =>
    ['treeitem', 'row', 'group'].includes(item.role),
  );
  const defaultGeometryPresent = structure.some(
    (item) => item.defaultGeometryMatch,
  );
  const defaultGeometryInRelationships = outline.relationships.some(
    (relationship) =>
      relationship.parent.defaultGeometryMatch ||
      relationship.siblings.some(
        (sibling) =>
          sibling.node.defaultGeometryMatch ||
          sibling.nestedLabelMatches.some(
            (match) => match.label === 'Default geometry',
          ),
      ),
  );
  const actionableAncestorDistance = structure.findIndex(
    (item) => item.actionable,
  );
  const candidate =
    matchedIndex >= 0
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
    findings.push(
      defaultGeometryInRelationships
        ? 'DEFAULT_GEOMETRY_OBSERVED_OUTSIDE_CAPTURED_ANCESTOR_PATH'
        : 'DEFAULT_GEOMETRY_NOT_OBSERVED_IN_BOUNDED_RELATIONSHIPS',
    );
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
    relationshipOutline: {
      relationships: outline.relationships,
      elementsInspected: outline.elementsInspected,
      labelMatchesRecorded: outline.labelMatchesRecorded,
      truncated: outline.truncated,
      interactionHandling: outline.interactionHandling,
    },
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
