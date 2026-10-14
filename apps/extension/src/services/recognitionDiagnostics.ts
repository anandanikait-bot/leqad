import {
  recognitionFromCandidates,
  type TargetCandidate,
} from './semanticTargets';
import {
  planeIdentity,
  referencePlaneCandidate,
  referencePlaneContext,
  type ReferencePlane,
} from './referencePlanes';
import { isLeqadOwned, semanticName } from './semanticTargetDom';

const MAX_ELEMENTS = 5000;
const MAX_RECORDS = 12;
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
]);
const safeNames = new Set([
  'top',
  'top plane',
  'front',
  'front plane',
  'right',
  'right plane',
  'default geometry',
  'feature tree',
  'view controls',
  'sketch',
  'sketch plane',
]);

function structure(element: Element) {
  const name = semanticName(element);
  const role = element.getAttribute('role') ?? '';
  return {
    tag: safeTags.has(element.localName) ? element.localName : 'other',
    role: safeRoles.has(role) ? role : 'none',
    name: safeNames.has(name) ? name : 'other',
    hasTabIndex: element.hasAttribute('tabindex'),
    hasAccessibleLabel:
      element.hasAttribute('aria-label') ||
      element.hasAttribute('aria-labelledby'),
  };
}

/** Explicitly invoked only. No URL, HTML, IDs, classes, form values, storage or network. */
export function collectRecognitionDiagnostics(root: ParentNode): string {
  const node = root as Node;
  const document =
    node.nodeType === Node.DOCUMENT_NODE
      ? (node as Document)
      : node.ownerDocument!;
  const walker = document.createTreeWalker(node, 1);
  const candidates: object[] = [];
  const byPlane = new Map<ReferencePlane, Map<HTMLElement, TargetCandidate>>([
    ['Top', new Map()],
    ['Front', new Map()],
    ['Right', new Map()],
  ]);
  const seen = new Set<Element>();
  let scannedElements = 0;
  let current = walker.nextNode();
  for (
    ;
    current && scannedElements < MAX_ELEMENTS;
    current = walker.nextNode()
  ) {
    scannedElements++;
    const element = current as HTMLElement;
    if (isLeqadOwned(element)) continue;
    const plane = planeIdentity(semanticName(element));
    if (!plane) continue;
    const targetId = `${plane.toLowerCase()}-plane` as
      'top-plane' | 'front-plane' | 'right-plane';
    const candidate = referencePlaneCandidate(element, targetId);
    if (!candidate) continue;
    byPlane.get(plane)!.set(candidate.element, candidate);
    if (seen.has(candidate.element) || candidates.length >= MAX_RECORDS)
      continue;
    seen.add(candidate.element);
    const ancestors: object[] = [];
    for (
      let parent = candidate.element.parentElement;
      parent && ancestors.length < 4;
      parent = parent.parentElement
    )
      ancestors.push(structure(parent));
    const actionableRow =
      candidate.element.matches(
        '[role="treeitem"],[role="row"],[role="option"],button,[role="button"]',
      ) || candidate.element.tabIndex >= 0;
    candidates.push({
      plane,
      ...structure(candidate.element),
      context: referencePlaneContext(candidate.element),
      actionableRow,
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
      ancestors,
    });
  }
  const recognition = Object.fromEntries(
    [...byPlane].map(([plane, matches]) => {
      const result = recognitionFromCandidates(
        `${plane.toLowerCase()}-plane` as
          'top-plane' | 'front-plane' | 'right-plane',
        [...matches.values()],
      );
      return [
        plane,
        {
          status: result.status,
          confidence: result.confidence,
          candidateCount: result.candidateCount,
          matchedRows: matches.size,
        },
      ];
    }),
  );
  return JSON.stringify({
    version: 'leqad-recognition/1',
    scope:
      'local reference-plane UI only; Onshape structural compatibility unverified',
    scannedElements,
    scanLimitReached: Boolean(current),
    recordLimitReached: seen.size >= MAX_RECORDS,
    recognition,
    candidates,
  });
}
