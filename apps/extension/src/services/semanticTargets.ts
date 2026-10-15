import {
  enabledState,
  isLeqadOwned,
  semanticName,
  visibilityState,
} from './semanticTargetDom';
import {
  isReferencePlaneTarget,
  referencePlaneCandidate,
  referencePlaneCandidates,
} from './referencePlanes';
export type SemanticTargetId =
  | 'top-plane'
  | 'front-plane'
  | 'right-plane'
  | 'sketch'
  | 'rectangle'
  | 'dimension'
  | 'finish-sketch'
  | 'part-studio-tab'
  | 'read-only-indicator';

export const SEMANTIC_HIGHLIGHT_DURATION_MS = 5_000;

export type TargetRecognitionStatus =
  'FOUND' | 'MISSING' | 'AMBIGUOUS' | 'REJECTED';
export type TargetMatchStrategy =
  | 'EXACT_ACCESSIBLE_LABEL'
  | 'EXACT_TOOLTIP_OR_TITLE'
  | 'VALIDATED_STABLE_ATTRIBUTE'
  | 'ROLE_AND_LABEL'
  | 'VALIDATED_CONTEXT'
  | 'STRUCTURAL_FEATURE_LIST'
  | 'WEAK_TEXT';
export type TargetRecognitionConfidence = 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
export type TargetVisibility =
  | 'VISIBLE'
  | 'HIDDEN'
  | 'ZERO_SIZE'
  | 'OFFSCREEN'
  | 'CLIPPED'
  | 'OBSCURED'
  | 'UNKNOWN';
export type TargetEnabledState = 'ENABLED' | 'DISABLED' | 'UNKNOWN';

export interface SemanticTargetRecognition {
  targetId: SemanticTargetId;
  status: TargetRecognitionStatus;
  element: HTMLElement | null;
  matchStrategy: TargetMatchStrategy | null;
  confidence: TargetRecognitionConfidence;
  visibility: TargetVisibility;
  enabled: TargetEnabledState;
  explanation: string;
  candidateCount: number;
}

export interface TargetCandidate {
  contextValid?: boolean;
  context?: string;
  rejectionReason?: string;
  element: HTMLElement;
  strategy: TargetMatchStrategy;
  confidence: Exclude<TargetRecognitionConfidence, 'NONE'>;
  rank: number;
  visibility: TargetVisibility;
  enabled: TargetEnabledState;
  leqadOwned: boolean;
}

const TARGET_LABELS: Record<SemanticTargetId, readonly string[]> = {
  'top-plane': ['top plane'],
  'front-plane': ['front plane'],
  'right-plane': ['right plane'],
  sketch: ['sketch', 'create sketch', 'start sketch'],
  rectangle: ['rectangle', 'corner rectangle', 'center point rectangle'],
  dimension: ['dimension', 'sketch dimension'],
  'finish-sketch': ['finish sketch', 'exit sketch', 'close sketch'],
  'part-studio-tab': ['part studio'],
  'read-only-indicator': ['read only', 'view only'],
};

const CANDIDATE_SELECTOR = [
  'button',
  '[role="button"]',
  '[role="treeitem"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  '[role="status"]',
  '[role="note"]',
  'input',
  '[tabindex]:not([tabindex="-1"])',
  '[aria-label][data-qa]',
  '[title][data-qa]',
].join(',');

const STRATEGY_RANK: Record<TargetMatchStrategy, number> = {
  EXACT_ACCESSIBLE_LABEL: 0,
  EXACT_TOOLTIP_OR_TITLE: 1,
  VALIDATED_STABLE_ATTRIBUTE: 2,
  ROLE_AND_LABEL: 3,
  VALIDATED_CONTEXT: 4,
  STRUCTURAL_FEATURE_LIST: 5,
  WEAK_TEXT: 5,
};

function normalizedText(value: string | null | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function exactLabel(
  value: string | null | undefined,
  labels: readonly string[],
) {
  const normalized = normalizedText(value);
  return labels.some((label) => normalized === normalizedText(label));
}

function containsLabel(
  value: string | null | undefined,
  labels: readonly string[],
) {
  const normalized = normalizedText(value);
  return labels.some((label) =>
    ` ${normalized} `.includes(` ${normalizedText(label)} `),
  );
}

function hasRecognizedRole(element: HTMLElement): boolean {
  const explicitRole = element.getAttribute('role');
  if (
    explicitRole &&
    ['button', 'treeitem', 'menuitem', 'option', 'tab'].includes(explicitRole)
  ) {
    return true;
  }
  return element.matches('button, input');
}

function matchStrategy(
  element: HTMLElement,
  labels: readonly string[],
): TargetMatchStrategy | null {
  if (
    element.hasAttribute('aria-label') ||
    element.hasAttribute('aria-labelledby')
  ) {
    // Explicit naming wins over tooltip/text. An unresolved or conflicting
    // name cannot be rescued by a weaker match for a different command.
    return exactLabel(semanticName(element), labels)
      ? 'EXACT_ACCESSIBLE_LABEL'
      : null;
  }
  if (
    exactLabel(element.getAttribute('title'), labels) ||
    exactLabel(element.getAttribute('data-tooltip'), labels)
  ) {
    return 'EXACT_TOOLTIP_OR_TITLE';
  }
  if (hasRecognizedRole(element) && exactLabel(element.textContent, labels)) {
    return 'ROLE_AND_LABEL';
  }
  if (
    containsLabel(element.textContent, labels) ||
    containsLabel(element.getAttribute('title'), labels) ||
    containsLabel(element.getAttribute('data-tooltip'), labels)
  ) {
    return 'WEAK_TEXT';
  }
  return null;
}

function strategyConfidence(
  strategy: TargetMatchStrategy,
): Exclude<TargetRecognitionConfidence, 'NONE'> {
  if (
    strategy === 'EXACT_ACCESSIBLE_LABEL' ||
    strategy === 'EXACT_TOOLTIP_OR_TITLE'
  ) {
    return 'HIGH';
  }
  return strategy === 'ROLE_AND_LABEL' ||
    strategy === 'VALIDATED_STABLE_ATTRIBUTE' ||
    strategy === 'VALIDATED_CONTEXT' ||
    strategy === 'STRUCTURAL_FEATURE_LIST'
    ? 'MEDIUM'
    : 'LOW';
}

/**
 * Narrow fallback for the owner's observed Onshape Sketch command:
 *   <div><div><svg /></div><span>Sketch</span></div>
 * inside a wide, shallow row of multiple command containers.
 *
 * Neither icon nor label exposes actionable semantics. The owner confirmed
 * both are clickable in the live UI, but this heuristic does not establish
 * the DOM's event handler or any CAD operation result. Do not generalize to
 * arbitrary div text or reuse for other commands without separate evidence.
 */
function isStructuralSketchCommand(element: HTMLElement): boolean {
  if (
    element.localName !== 'div' ||
    element.children.length !== 2 ||
    element.hasAttribute('aria-label') ||
    element.hasAttribute('aria-labelledby')
  )
    return false;
  const iconBox = element.firstElementChild;
  const label = element.lastElementChild;
  if (
    iconBox?.localName !== 'div' ||
    iconBox.children.length !== 1 ||
    iconBox.firstElementChild?.localName !== 'svg' ||
    label?.localName !== 'span' ||
    label.children.length !== 0 ||
    label.hasAttribute('aria-label') ||
    label.hasAttribute('aria-labelledby') ||
    !exactLabel(label.textContent, TARGET_LABELS.sketch)
  )
    return false;

  const commandRect = element.getBoundingClientRect();
  if (commandRect.width <= 0 || commandRect.height <= 0) return false;
  let ancestor = element.parentElement;
  for (let depth = 0; ancestor && depth < 6; depth += 1) {
    if (ancestor.children.length >= 3) {
      const rowRect = ancestor.getBoundingClientRect();
      // A narrow toolbar strip is distinct from a text card/grid or the page
      // body. Relative geometry tolerates normal zoom without fixed pixels.
      return (
        rowRect.width >= commandRect.width * 4 &&
        rowRect.height >= commandRect.height * 0.75 &&
        rowRect.height <= commandRect.height * 2.5
      );
    }
    ancestor = ancestor.parentElement;
  }
  return false;
}

function structuralSketchCandidates(root: ParentNode): TargetCandidate[] {
  const candidates: TargetCandidate[] = [];
  for (const label of root.querySelectorAll<HTMLSpanElement>('span')) {
    const command = label.parentElement;
    if (!command || !isStructuralSketchCommand(command)) continue;
    candidates.push({
      element: command,
      strategy: 'VALIDATED_CONTEXT',
      confidence: 'MEDIUM',
      rank: STRATEGY_RANK.VALIDATED_CONTEXT,
      visibility: visibilityState(command),
      enabled: enabledState(command),
      leqadOwned: isLeqadOwned(command),
    });
  }
  return candidates;
}

/** Read-only diagnostic of one node; does not search or establish uniqueness. */
export function inspectSketchCommandMatch(element: HTMLElement) {
  return {
    candidateSelectorMatched: element.matches(CANDIDATE_SELECTOR),
    matchStrategy: matchStrategy(element, TARGET_LABELS.sketch),
  };
}

function candidatesFor(
  root: ParentNode,
  targetId: SemanticTargetId,
): TargetCandidate[] {
  if (isReferencePlaneTarget(targetId))
    return referencePlaneCandidates(root, targetId);
  const candidates: TargetCandidate[] = [];
  const labels = TARGET_LABELS[targetId];
  for (const element of root.querySelectorAll<HTMLElement>(
    CANDIDATE_SELECTOR,
  )) {
    const strategy = matchStrategy(element, labels);
    if (!strategy) continue;
    candidates.push({
      element,
      strategy,
      confidence: strategyConfidence(strategy),
      rank: STRATEGY_RANK[strategy],
      visibility: visibilityState(element),
      enabled: enabledState(element),
      leqadOwned: isLeqadOwned(element),
    });
  }
  if (targetId === 'sketch') {
    for (const structural of structuralSketchCandidates(root)) {
      const previousIndex = candidates.findIndex(
        (candidate) => candidate.element === structural.element,
      );
      if (previousIndex < 0) {
        candidates.push(structural);
      } else if (candidates[previousIndex]!.confidence === 'LOW') {
        candidates[previousIndex] = structural;
      }
    }
  }
  return candidates.sort((left, right) => left.rank - right.rank);
}

function usable(candidate: TargetCandidate): boolean {
  return (
    candidate.confidence !== 'LOW' &&
    candidate.contextValid !== false &&
    candidate.visibility === 'VISIBLE' &&
    (candidate.enabled === 'ENABLED' ||
      (candidate.strategy === 'STRUCTURAL_FEATURE_LIST' &&
        candidate.enabled === 'UNKNOWN')) &&
    !candidate.leqadOwned
  );
}

export function recognizeSemanticTarget(
  root: ParentNode,
  targetId: SemanticTargetId,
): SemanticTargetRecognition {
  return recognitionFromCandidates(targetId, candidatesFor(root, targetId));
}

export function recognitionFromCandidates(
  targetId: SemanticTargetId,
  candidates: TargetCandidate[],
): SemanticTargetRecognition {
  if (candidates.length === 0) {
    return {
      targetId,
      status: 'MISSING',
      element: null,
      matchStrategy: null,
      confidence: 'NONE',
      visibility: 'UNKNOWN',
      enabled: 'UNKNOWN',
      explanation: 'No recognizable control for this target is present.',
      candidateCount: 0,
    };
  }

  const usableCandidates = candidates.filter(usable);
  const representative = usableCandidates[0] ?? candidates[0]!;
  if (usableCandidates.length > 1) {
    return {
      targetId,
      status: 'AMBIGUOUS',
      element: null,
      matchStrategy: representative.strategy,
      confidence: representative.confidence,
      visibility: 'VISIBLE',
      enabled: 'ENABLED',
      explanation: usableCandidates.every(
        (candidate) => candidate.rank === representative.rank,
      )
        ? `${usableCandidates.length} equally strong visible controls match this target.`
        : `${usableCandidates.length} plausible visible controls compete for this target.`,
      candidateCount: usableCandidates.length,
    };
  }
  if (usableCandidates.length === 1) {
    return {
      targetId,
      status: 'FOUND',
      element: representative.element,
      matchStrategy: representative.strategy,
      confidence: representative.confidence,
      visibility: representative.visibility,
      enabled: representative.enabled,
      explanation:
        representative.strategy === 'STRUCTURAL_FEATURE_LIST'
          ? 'Identified the visible reference-plane row from its local feature-list structure. Click handling and selected state are unknown.'
          : `Recognized by ${representative.strategy.toLocaleLowerCase().replaceAll('_', ' ')}.`,
      candidateCount: 1,
    };
  }

  return {
    targetId,
    status: 'REJECTED',
    element: representative.element,
    matchStrategy: representative.strategy,
    confidence: representative.confidence,
    visibility: representative.visibility,
    enabled: representative.enabled,
    explanation: representative.leqadOwned
      ? 'The matching control belongs to Leqad rather than the CAD page.'
      : representative.visibility !== 'VISIBLE'
        ? `The matching control is ${representative.visibility.toLocaleLowerCase().replaceAll('_', ' ')}.`
        : representative.enabled !== 'ENABLED'
          ? 'The matching control is disabled.'
          : 'Only a low-confidence text match was found; Leqad cannot safely identify this control.',
    candidateCount: candidates.length,
  };
}

export function isUsableSemanticTarget(
  element: HTMLElement,
  targetId: SemanticTargetId,
): boolean {
  if (isReferencePlaneTarget(targetId)) {
    const candidate = referencePlaneCandidate(element, targetId);
    return Boolean(
      candidate && candidate.element === element && usable(candidate),
    );
  }
  const strategy =
    targetId === 'sketch' && isStructuralSketchCommand(element)
      ? 'VALIDATED_CONTEXT'
      : matchStrategy(element, TARGET_LABELS[targetId]);
  return Boolean(
    strategy &&
    strategyConfidence(strategy) !== 'LOW' &&
    visibilityState(element) === 'VISIBLE' &&
    enabledState(element) === 'ENABLED' &&
    !isLeqadOwned(element),
  );
}

export function findSemanticTargets(
  root: ParentNode,
  targetId: SemanticTargetId,
): HTMLElement[] {
  const candidates = candidatesFor(root, targetId);
  if (candidates.length === 0) return [];
  return candidates.filter(usable).map(({ element }) => element);
}

export function findSemanticTarget(
  root: ParentNode,
  targetId: SemanticTargetId,
): HTMLElement | null {
  const recognition = recognizeSemanticTarget(root, targetId);
  return recognition.status === 'FOUND' ? recognition.element : null;
}

export function findSelectedSemanticTargets(
  root: ParentNode,
  targetId: SemanticTargetId,
): HTMLElement[] {
  return findSemanticTargets(root, targetId).filter((element) => {
    if (
      isReferencePlaneTarget(targetId) &&
      referencePlaneCandidate(element, targetId)?.strategy ===
        'STRUCTURAL_FEATURE_LIST'
    )
      return false;
    return (
      element.getAttribute('aria-selected') === 'true' ||
      element.getAttribute('aria-pressed') === 'true' ||
      element.getAttribute('aria-checked') === 'true'
    );
  });
}

export function findSelectedSemanticTarget(
  root: ParentNode,
  targetId: SemanticTargetId,
): HTMLElement | null {
  const selected = findSelectedSemanticTargets(root, targetId);
  return selected.length === 1 ? selected[0]! : null;
}

export interface TargetHighlight {
  element: HTMLDivElement;
  refresh(): void;
  remove(): void;
}

/** Shared visual shell; callers separately own geometry, evidence, and cleanup. */
export function createHighlightOutline(document: Document): HTMLDivElement {
  const view = document.defaultView;
  const overlay = document.createElement('div');
  const reducedMotion =
    view?.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
  overlay.dataset.leqadHighlight = 'true';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    boxSizing: 'border-box',
    border: '2px solid #793327',
    borderRadius: '6px',
    boxShadow: '0 0 0 3px rgba(245, 239, 231, 0.9)',
    pointerEvents: 'none',
    zIndex: '2147483646',
    transition: reducedMotion
      ? 'none'
      : 'top 120ms ease, left 120ms ease, width 120ms ease, height 120ms ease',
  });
  return overlay;
}

export function createTargetHighlight(
  target: HTMLElement,
  host: HTMLElement = target.ownerDocument.body,
  targetId?: SemanticTargetId,
): TargetHighlight {
  const document = target.ownerDocument;
  const view = document.defaultView;
  const overlay = createHighlightOutline(document);

  let removed = false;
  let frame: number | null = null;
  let mutationObserver: MutationObserver | null = null;
  let resizeObserver: ResizeObserver | null = null;

  const targetIsHighlightable = () => {
    if (
      !target.isConnected ||
      isLeqadOwned(target) ||
      visibilityState(target) !== 'VISIBLE'
    )
      return false;
    if (targetId === undefined) return enabledState(target) === 'ENABLED';
    const recognition = recognizeSemanticTarget(document, targetId);
    return (
      recognition.status === 'FOUND' &&
      recognition.element === target &&
      recognition.enabled !== 'DISABLED'
    );
  };

  const remove = () => {
    if (removed) return;
    removed = true;
    if (frame !== null) view?.cancelAnimationFrame(frame);
    frame = null;
    mutationObserver?.disconnect();
    resizeObserver?.disconnect();
    view?.removeEventListener('resize', scheduleRefresh);
    view?.removeEventListener('scroll', scheduleRefresh, true);
    overlay.remove();
  };

  const refresh = () => {
    frame = null;
    if (removed) return;
    if (!targetIsHighlightable()) {
      remove();
      return;
    }
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: `${rect.top - 3}px`,
      left: `${rect.left - 3}px`,
      width: `${rect.width + 6}px`,
      height: `${rect.height + 6}px`,
    });
  };

  function scheduleRefresh() {
    if (removed || frame !== null) return;
    if (view?.requestAnimationFrame) {
      frame = view.requestAnimationFrame(refresh);
    } else {
      refresh();
    }
  }

  host.append(overlay);
  view?.addEventListener('resize', scheduleRefresh);
  view?.addEventListener('scroll', scheduleRefresh, true);
  if (view?.MutationObserver) {
    // One observer for the active overlay, never one per candidate. Revalidate at
    // most once per animation frame and ignore Leqad's own style mutations.
    mutationObserver = new view.MutationObserver((records) => {
      if (
        records.some((record) => {
          const element =
            record.target.nodeType === Node.ELEMENT_NODE
              ? (record.target as Element)
              : record.target.parentElement;
          return !element || !isLeqadOwned(element);
        })
      ) {
        if (!targetIsHighlightable()) remove();
        else scheduleRefresh();
      }
    });
    mutationObserver.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true,
      attributes: true,
      attributeFilter: [
        'aria-label',
        'aria-labelledby',
        'id',
        'aria-hidden',
        'aria-disabled',
        'aria-expanded',
        'role',
        'title',
        'data-tooltip',
        'hidden',
        'disabled',
        'inert',
        'class',
        'style',
        'data-layout-revision',
      ],
    });
  }
  if (view?.ResizeObserver) {
    resizeObserver = new view.ResizeObserver(scheduleRefresh);
    resizeObserver.observe(target);
  }
  refresh();

  return { element: overlay, refresh, remove };
}

/** Shared by the real content script and browser fixture; one overlay and timer. */
export function createSemanticHighlighter(root: ParentNode) {
  const node = root as Node;
  const document =
    node.nodeType === Node.DOCUMENT_NODE
      ? (node as Document)
      : node.ownerDocument!;
  const view = document.defaultView!;
  let highlight: TargetHighlight | null = null;
  let timer: number | null = null;
  const clear = () => {
    if (timer !== null) view.clearTimeout(timer);
    timer = null;
    highlight?.remove();
    highlight = null;
  };
  return {
    clear,
    show(targetId: SemanticTargetId): SemanticTargetRecognition {
      clear();
      const recognition = recognizeSemanticTarget(root, targetId);
      if (recognition.status !== 'FOUND' || !recognition.element)
        return recognition;
      highlight = createTargetHighlight(
        recognition.element,
        document.body,
        targetId,
      );
      if (!highlight.element.isConnected) {
        clear();
        return {
          ...recognition,
          status: 'REJECTED',
          element: null,
          explanation:
            'The recognized control became unavailable before highlighting.',
        };
      }
      timer = view.setTimeout(clear, SEMANTIC_HIGHLIGHT_DURATION_MS);
      return recognition;
    },
  };
}
