import { RECOGNITION_DIAGNOSTIC_LIMITS } from './recognitionDiagnostics';
import {
  enabledState,
  isLeqadOwned,
  normalizedText,
  semanticName,
  visibilityState,
} from './semanticTargetDom';
import { inspectSketchCommandMatch } from './semanticTargets';

// Diagnostic vocabulary only. These labels do not register production targets.
const labels = [
  'Sketch',
  'Create sketch',
  'Start sketch',
  'Finish sketch',
  'Exit sketch',
  'Rectangle',
  'Dimension',
  'Extrude',
  'Cancel',
] as const;
const tags = new Set([
  'html',
  'body',
  'div',
  'span',
  'button',
  'input',
  'a',
  'svg',
  'path',
  'use',
  'g',
  'label',
  'li',
  'ul',
]);
const roles = new Set([
  'button',
  'toolbar',
  'menu',
  'menuitem',
  'tab',
  'treeitem',
  'dialog',
  'img',
  'group',
  'status',
  'note',
  'presentation',
  'none',
]);
const limits = {
  path: 10,
  nodes: 16,
  contextDepth: 32,
  textNodes: 64,
  textChars: 128,
} as const;

function safeLabel(value: string | null) {
  if (!value?.trim()) return 'NONE';
  if (value.length > limits.textChars) return 'UNLISTED';
  return (
    labels.find((label) => normalizedText(label) === normalizedText(value)) ??
    'UNLISTED'
  );
}

function textInspectionComplete(element: Element): boolean {
  const walker = element.ownerDocument.createTreeWalker(
    element,
    NodeFilter.SHOW_ALL,
  );
  let count = 0;
  let chars = 0;
  let node: Node | null;
  while ((node = walker.nextNode())) {
    if (++count > limits.textNodes) return false;
    if (node.nodeType === Node.TEXT_NODE) chars += node.nodeValue?.length ?? 0;
    if (chars > limits.textChars) return false;
  }
  return true;
}

function ancestry(element: Element) {
  let current: Element | null = element;
  let depth = 0;
  let toolbarAncestorDistance: number | null = null;
  let dialogAncestorDistance: number | null = null;
  while (current && depth < limits.contextDepth) {
    if (
      current.getAttribute('role') === 'toolbar' &&
      toolbarAncestorDistance === null
    )
      toolbarAncestorDistance = depth;
    if (
      current.matches('[role="dialog"],dialog') &&
      dialogAncestorDistance === null
    )
      dialogAncestorDistance = depth;
    current = current.parentElement;
    depth++;
  }
  return {
    complete: current === null,
    toolbarAncestorDistance,
    dialogAncestorDistance,
  };
}

function summarize(
  element: Element,
  clicked: Element,
  relation: 'CLICKED' | 'ANCESTOR' | 'SIBLING',
  distance: number,
  siblingOffset: number,
) {
  const context = ancestry(element);
  const textComplete = textInspectionComplete(element);
  const attributeNamesComplete = ['aria-label', 'title', 'data-tooltip'].every(
    (attribute) =>
      (element.getAttribute(attribute)?.length ?? 0) <= limits.textChars,
  );
  const reference = element.getAttribute('aria-labelledby');
  const referencesComplete =
    reference === null ||
    (reference.length <= 384 &&
      reference.trim().split(/\s+/).length <= 3 &&
      reference
        .trim()
        .split(/\s+/)
        .every((id) => {
          const target = element.ownerDocument.getElementById(id);
          return target !== null && textInspectionComplete(target);
        }));
  const nameComplete =
    textComplete && attributeNamesComplete && referencesComplete;
  const html = element instanceof HTMLElement;
  // Production helpers may inspect ancestors/text; run only inside these bounds.
  const match =
    html && nameComplete ? inspectSketchCommandMatch(element) : null;
  const visibility =
    html && context.complete ? visibilityState(element) : 'UNKNOWN';
  const enabled = html && context.complete ? enabledState(element) : 'UNKNOWN';
  const assessment = !html
    ? 'NOT_HTML_CONTROL'
    : !nameComplete || !context.complete
      ? 'INSPECTION_INCOMPLETE'
      : !match?.candidateSelectorMatched
        ? 'EXCLUDED_BY_CANDIDATE_SELECTOR'
        : !match.matchStrategy
          ? 'NO_SUPPORTED_COMMAND_NAME'
          : match.matchStrategy === 'WEAK_TEXT'
            ? 'WEAK_TEXT_ONLY'
            : visibility !== 'VISIBLE'
              ? 'NOT_VISIBLE'
              : enabled !== 'ENABLED'
                ? 'DISABLED'
                : 'LOCALLY_ELIGIBLE';
  const rect = element.getBoundingClientRect();
  const origin = clicked.getBoundingClientRect();
  const ratio = (value: number) =>
    Math.round(Math.max(-1000, Math.min(1000, value)) * 10) / 10;
  const geometryRelativeToClick =
    origin.width > 0 &&
    origin.height > 0 &&
    [
      rect.x,
      rect.y,
      rect.width,
      rect.height,
      origin.x,
      origin.y,
      origin.width,
      origin.height,
    ].every(Number.isFinite)
      ? {
          x: ratio((rect.x - origin.x) / origin.width),
          y: ratio((rect.y - origin.y) / origin.height),
          width: ratio(rect.width / origin.width),
          height: ratio(rect.height / origin.height),
        }
      : null;
  const role = element.getAttribute('role');
  return {
    relation,
    distance,
    siblingOffset,
    tag: tags.has(element.localName) ? element.localName : 'other',
    role: role === null ? 'none' : roles.has(role) ? role : 'other',
    name: nameComplete ? safeLabel(semanticName(element)) : 'UNKNOWN',
    title: safeLabel(element.getAttribute('title')),
    tooltip: safeLabel(element.getAttribute('data-tooltip')),
    ariaLabelPresent: element.hasAttribute('aria-label'),
    ariaLabelledByPresent: element.hasAttribute('aria-labelledby'),
    ariaDisabled: element.getAttribute('aria-disabled') === 'true',
    nativeDisabled: element.matches(':disabled'),
    inertPresent: element.hasAttribute('inert'),
    connected: element.isConnected,
    actionableMarkup:
      element.matches(
        'button,input,select,a[href],[role="button"],[role="menuitem"]',
      ) ||
      (element.hasAttribute('tabindex') &&
        Number(element.getAttribute('tabindex')) >= 0),
    childCount: Math.min(element.childElementCount, limits.textNodes),
    childCountCapped: element.childElementCount > limits.textNodes,
    nameInspectionComplete: nameComplete,
    ancestorInspectionComplete: context.complete,
    toolbarAncestorDistance: context.toolbarAncestorDistance,
    dialogAncestorDistance: context.dialogAncestorDistance,
    candidateSelectorMatched: match?.candidateSelectorMatched ?? null,
    matchStrategy: match?.matchStrategy ?? null,
    visibility,
    enabled,
    assessment,
    geometryRelativeToClick,
  };
}

export function inspectSketchControl(clicked: Element) {
  const nodes: ReturnType<typeof summarize>[] = [];
  const path: Element[] = [];
  let current: Element | null = clicked;
  while (current && path.length < limits.path && !isLeqadOwned(current)) {
    path.push(current);
    current = current.parentElement;
  }
  let incomplete = current !== null;
  path.forEach((element, distance) =>
    nodes.push(
      summarize(
        element,
        clicked,
        distance === 0 ? 'CLICKED' : 'ANCESTOR',
        distance,
        0,
      ),
    ),
  );
  // Click path takes priority over neighboring controls; never scan the document.
  for (const [distance, branch] of path.slice(0, 3).entries()) {
    for (const offset of [-1, 1]) {
      const sibling =
        offset < 0 ? branch.previousElementSibling : branch.nextElementSibling;
      if (!sibling || isLeqadOwned(sibling)) continue;
      if (
        offset < 0 ? sibling.previousElementSibling : sibling.nextElementSibling
      )
        incomplete = true;
      if (nodes.length >= limits.nodes) {
        incomplete = true;
        continue;
      }
      nodes.push(summarize(sibling, clicked, 'SIBLING', distance, offset));
    }
  }
  const report = {
    version: 'leqad-sketch-control/1',
    target: 'sketch-toolbar-control',
    captureSource: 'USER_INDICATED_CONTROL',
    productionRecognition: 'NOT_RUN',
    uniqueness: 'NOT_EVALUATED',
    interactionHandling: 'JAVASCRIPT_HANDLER_NOT_INSPECTED',
    incomplete:
      incomplete ||
      nodes.some(
        (node) =>
          !node.nameInspectionComplete || !node.ancestorInspectionComplete,
      ),
    reportTruncated: false,
    limits,
    nodes,
  };
  while (
    JSON.stringify(report).length > RECOGNITION_DIAGNOSTIC_LIMITS.reportChars &&
    report.nodes.length
  ) {
    report.nodes.pop();
    report.incomplete = true;
    report.reportTruncated = true;
  }
  return report;
}

export type SketchControlReport = ReturnType<typeof inspectSketchControl>;
type CaptureResult =
  | { status: 'CAPTURED'; report: SketchControlReport }
  | { status: 'CANCELLED' | 'TIMED_OUT' };
export interface SketchControlCaptureTask {
  promise: Promise<CaptureResult>;
  cancel(): void;
  isActive(): boolean;
}

/** Passive, one-shot, opt-in click observation; contains no CAD action. */
export function createSketchControlCapture(
  root: Document,
): SketchControlCaptureTask {
  const view = root.defaultView!;
  let active = true;
  let resolve!: (result: CaptureResult) => void;
  const promise = new Promise<CaptureResult>((done) => {
    resolve = done;
  });
  const navigationEvents = [
    'popstate',
    'hashchange',
    'pagehide',
    'wxt:locationchange',
  ] as const;
  const finish = (result: CaptureResult) => {
    if (!active) return;
    active = false;
    root.removeEventListener('click', clicked, true);
    root.removeEventListener('visibilitychange', visibilityChanged);
    for (const event of navigationEvents)
      view.removeEventListener(event, cancel);
    view.clearTimeout(timer);
    resolve(result);
  };
  const cancel = () => finish({ status: 'CANCELLED' });
  const visibilityChanged = () => {
    if (root.visibilityState === 'hidden') cancel();
  };
  const clicked = (event: MouseEvent) => {
    const first = event
      .composedPath()
      .find((item): item is Element => item instanceof Element);
    if (!first || isLeqadOwned(first)) return;
    finish({ status: 'CAPTURED', report: inspectSketchControl(first) });
  };
  const timer = view.setTimeout(
    () => finish({ status: 'TIMED_OUT' }),
    RECOGNITION_DIAGNOSTIC_LIMITS.captureTimeoutMs,
  );
  root.addEventListener('click', clicked, { capture: true, passive: true });
  root.addEventListener('visibilitychange', visibilityChanged);
  for (const event of navigationEvents) view.addEventListener(event, cancel);
  return { promise, cancel, isActive: () => active };
}
