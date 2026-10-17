import { RECOGNITION_DIAGNOSTIC_LIMITS } from './recognitionDiagnostics';
import { isLeqadOwned, visibilityState } from './semanticTargetDom';

const LIMITS = {
  dialogs: 8,
  nodes: 128,
  depth: 6,
  nameNodes: 64,
  nameChars: 128,
  labels: 8,
  children: 32,
  ancestors: 32,
} as const;
const EDITABLE =
  'input,textarea,select,[contenteditable],[role="textbox"],[role="combobox"],[role="spinbutton"]';
const TAGS = new Set([
  'div',
  'span',
  'label',
  'h1',
  'h2',
  'h3',
  'h4',
  'section',
  'header',
  'dialog',
  'button',
  'svg',
  'path',
  'use',
  'g',
]);
const ROLES = new Set([
  'dialog',
  'heading',
  'group',
  'button',
  'img',
  'presentation',
  'none',
]);
const structure = (element: Element) => ({
  tag: TAGS.has(element.localName) ? element.localName : 'other',
  role: element.hasAttribute('role')
    ? ROLES.has(element.getAttribute('role')!)
      ? element.getAttribute('role')!
      : 'other'
    : 'none',
});

/** Total visited-node/depth bound, including text and comments; no subtree arrays. */
function walk(
  root: Element,
  nodes: number,
  visit: (node: Node, depth: number) => boolean | void,
) {
  let current: Node | null = root;
  let depth = 0;
  let scanned = 0;
  let incomplete = false;
  while (current) {
    if (scanned >= nodes) {
      incomplete = true;
      break;
    }
    scanned++;
    const descend = visit(current, depth) !== false;
    if (descend && current.firstChild) {
      if (depth >= LIMITS.depth) incomplete = true;
      else {
        current = current.firstChild;
        depth++;
        continue;
      }
    }
    while (current !== root && !current.nextSibling) {
      current = current.parentNode!;
      depth--;
    }
    current = current === root ? null : current.nextSibling;
  }
  return { scanned, incomplete };
}

function knownLabel(value: string | null) {
  if (!value || value.length > LIMITS.nameChars) return null;
  const name = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return name === 'sketch'
    ? ('Sketch' as const)
    : name === 'sketch plane'
      ? ('Sketch plane' as const)
      : null;
}

function staticLabel(element: Element, onIncomplete: () => void) {
  // Do not resolve private identifiers or inspect form values. Descendant label
  // elements can still be observed independently within the same bounded region.
  if (element.hasAttribute('aria-labelledby')) return null;
  if (element.hasAttribute('aria-label')) {
    const label = knownLabel(element.getAttribute('aria-label'));
    return label ? { label, source: 'ARIA_LABEL' as const } : null;
  }
  if (element.hasAttribute('title')) {
    const label = knownLabel(element.getAttribute('title'));
    return label ? { label, source: 'TITLE' as const } : null;
  }
  let text = '';
  let invalid = false;
  const scan = walk(element, LIMITS.nameNodes, (node) => {
    if (node instanceof Element) {
      if (node.matches(EDITABLE)) {
        invalid = true;
        return false;
      }
      if (
        node !== element &&
        (node.hasAttribute('aria-label') ||
          node.hasAttribute('aria-labelledby') ||
          node.hasAttribute('title'))
      ) {
        invalid = true;
        return false;
      }
      if (
        node.localName === 'svg' ||
        node.getAttribute('aria-hidden') === 'true'
      )
        return false;
    }
    if (node.nodeType === Node.TEXT_NODE) {
      const value = node.nodeValue ?? '';
      if (text.length + value.length > LIMITS.nameChars) invalid = true;
      else if (!invalid) text += value;
    }
  });
  if (scan.incomplete) onIncomplete();
  const label = !invalid && !scan.incomplete ? knownLabel(text) : null;
  return label ? { label, source: 'TEXT' as const } : null;
}

function visible(element: Element) {
  let ancestor: Element | null = element;
  let count = 0;
  while (ancestor && count < LIMITS.ancestors) {
    count++;
    ancestor = ancestor.parentElement;
  }
  return !ancestor && element instanceof HTMLElement
    ? visibilityState(element)
    : ('UNKNOWN' as const);
}

function relationship(element: Element, dialog: Element) {
  const path: number[] = [];
  const ancestry: Array<ReturnType<typeof structure>> = [];
  let current = element;
  while (current !== dialog && path.length < LIMITS.depth) {
    ancestry.unshift(structure(current));
    const parent = current.parentElement;
    if (!parent) return null;
    let index = 0;
    while (
      index < Math.min(parent.children.length, LIMITS.children) &&
      parent.children[index] !== current
    )
      index++;
    if (index >= LIMITS.children || parent.children[index] !== current)
      return null;
    path.unshift(index);
    current = parent;
  }
  if (current !== dialog) return null;
  ancestry.unshift(structure(dialog));
  return { pathFromDialog: path, ancestry, branchIndex: path[0] ?? null };
}

function editableAncestors(element: Element) {
  let current: Element | null = element;
  let count = 0;
  while (current && count < LIMITS.ancestors) {
    if (current.matches(EDITABLE)) return 'EDITABLE' as const;
    count++;
    current = current.parentElement;
  }
  return current
    ? ('UNKNOWN' as const)
    : ('NO_EDITABLE_MARKUP_OBSERVED' as const);
}

function inspectDialog(dialog: Element) {
  const visibility = visible(dialog);
  const editableContext = editableAncestors(dialog);
  const branches = Array.from(
    { length: Math.min(dialog.children.length, 3) },
    (_, index) => {
      const branch = dialog.children[index]!;
      return {
        index,
        ...structure(branch),
        visibility: visible(branch),
        svgCount: 0,
        childCount: Math.min(branch.childElementCount, LIMITS.children),
        childCountCapped: branch.childElementCount > LIMITS.children,
      };
    },
  );
  const labels: Array<
    ReturnType<typeof structure> & {
      label: 'Sketch' | 'Sketch plane';
      source: 'TEXT' | 'ARIA_LABEL' | 'TITLE';
      visibility: ReturnType<typeof visible>;
      pathFromDialog: number[];
      ancestry: Array<ReturnType<typeof structure>>;
      branchIndex: number | null;
    }
  > = [];
  const sources: Element[] = [];
  let incomplete = visibility === 'UNKNOWN' || editableContext === 'UNKNOWN';
  if (
    dialog.childElementCount !== 3 ||
    editableContext !== 'NO_EDITABLE_MARKUP_OBSERVED'
  )
    return {
      ...structure(dialog),
      visibility,
      editableContext,
      childCount: Math.min(dialog.childElementCount, LIMITS.children),
      childCountCapped: dialog.childElementCount > LIMITS.children,
      branches: [],
      labels,
      scannedNodes: 0,
      incomplete,
    };
  const scan = walk(dialog, LIMITS.nodes, (node) => {
    if (!(node instanceof Element)) return;
    if (isLeqadOwned(node) || node.matches(EDITABLE)) return false;
    const relation = relationship(node, dialog);
    if (!relation) {
      incomplete = true;
      return false;
    }
    if (node.localName === 'svg' && relation.branchIndex !== null)
      branches[relation.branchIndex]!.svgCount++;
    const name = staticLabel(node, () => {
      incomplete = true;
    });
    if (name) {
      const nodeVisibility = visible(node);
      if (nodeVisibility === 'UNKNOWN') incomplete = true;
      labels.push({
        ...structure(node),
        ...name,
        visibility: nodeVisibility,
        ...relation,
      });
      sources.push(node);
    }
  });
  // Keep the smallest source of identical text; aggregate wrappers do not
  // establish additional label identities or a control boundary.
  const smallest = labels.filter(
    (label, index) =>
      label.source !== 'TEXT' ||
      !labels.some(
        (other, otherIndex) =>
          otherIndex !== index &&
          other.source === 'TEXT' &&
          other.label === label.label &&
          sources[index]!.contains(sources[otherIndex]!),
      ),
  );
  if (smallest.length > LIMITS.labels) incomplete = true;
  return {
    ...structure(dialog),
    visibility,
    editableContext,
    childCount: 3,
    childCountCapped: false,
    branches,
    labels: smallest.slice(0, LIMITS.labels),
    scannedNodes: scan.scanned,
    incomplete: incomplete || scan.incomplete,
  };
}

/** Opt-in diagnostic snapshot only. No listeners, clicks, mutation or recognition. */
export function inspectSketchDialogIdentity(root: ParentNode) {
  const found = root.querySelectorAll('[role="dialog"],dialog');
  const dialogs: Array<ReturnType<typeof inspectDialog>> = [];
  let incomplete = found.length > LIMITS.dialogs;
  for (let index = 0; index < Math.min(found.length, LIMITS.dialogs); index++) {
    const dialog = found[index]!;
    if (isLeqadOwned(dialog) || visible(dialog) === 'HIDDEN') continue;
    const record = inspectDialog(dialog);
    dialogs.push(record);
    incomplete ||= record.incomplete;
  }
  const reason = incomplete
    ? 'INSPECTION_INCOMPLETE'
    : dialogs.length > 1
      ? 'AMBIGUOUS_DIALOGS'
      : !dialogs.length
        ? 'NO_VISIBLE_DIALOG'
        : dialogs[0]!.editableContext === 'EDITABLE'
          ? 'EDITABLE_CONTEXT'
          : dialogs[0]!.childCount !== 3
            ? 'UNEXPECTED_STRUCTURE'
            : !dialogs[0]!.labels.some(
                  (label) => label.visibility === 'VISIBLE',
                )
              ? 'NO_STATIC_LABEL'
              : dialogs[0]!.branches.filter(
                    (branch) =>
                      branch.visibility === 'VISIBLE' && branch.svgCount > 0,
                  ).length < 2
                ? 'CONTROL_BRANCH_STRUCTURE_NOT_ESTABLISHED'
                : 'STATIC_LABEL_AND_RELATION_OBSERVED';
  const report = {
    version: 'leqad-sketch-dialog-identity/1',
    observationScope: 'READ_ONLY_SINGLE_SNAPSHOT',
    discovery: {
      method: 'NATIVE_DIALOG_ROLE_QUERY',
      nativeTraversalBound: 'NOT_ENFORCED',
      candidateInspectionLimitReached: found.length > LIMITS.dialogs,
    },
    status:
      reason === 'STATIC_LABEL_AND_RELATION_OBSERVED'
        ? 'CAPTURED'
        : 'NOT_ESTABLISHED',
    reason,
    activeSketchState: 'UNKNOWN',
    staticIdentity: 'NOT_ESTABLISHED',
    editabilityInspection: 'MARKUP_ONLY',
    productionRecognition: 'NOT_RUN',
    uniqueness: 'NOT_EVALUATED_FOR_PRODUCTION',
    branchIdentities: 'UNVERIFIED',
    controlOwnership: 'NOT_INSPECTED',
    cadActions: 'NONE',
    incomplete,
    reportTruncated: false,
    limits: LIMITS,
    inspectedDialogs: Math.min(found.length, LIMITS.dialogs),
    dialogs,
  };
  while (
    JSON.stringify(report).length > RECOGNITION_DIAGNOSTIC_LIMITS.reportChars &&
    report.dialogs.length
  ) {
    report.dialogs.pop();
    report.incomplete = true;
    report.reportTruncated = true;
    report.status = 'NOT_ESTABLISHED';
    report.reason = 'INSPECTION_INCOMPLETE';
  }
  return report;
}

export type SketchDialogIdentityReport = ReturnType<
  typeof inspectSketchDialogIdentity
>;
