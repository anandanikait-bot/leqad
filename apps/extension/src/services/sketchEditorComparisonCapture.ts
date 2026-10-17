export type EditorStateClaim = 'SKETCH' | 'EXTRUDE' | 'OTHER_FEATURE_EDITOR';

const LIMITS = {
  elements: 6_000,
  depth: 28,
  ancestors: 5,
  observations: 24,
  regions: 6,
  branches: 6,
  siblings: 10,
  nameNodes: 32,
  nameChars: 128,
  snapshotChars: 12_000,
  comparisonChars: 24_000,
} as const;

const LABELS = [
  'Sketch',
  'Create sketch',
  'Start sketch',
  'Finish Sketch',
  'Exit Sketch',
  'Close Sketch',
  'Sketch plane',
  'Extrude',
  'Rectangle',
  'Corner rectangle',
  'Center point rectangle',
  'Dimension',
  'Accept',
  'Cancel',
] as const;
type Label = (typeof LABELS)[number];
type Visibility =
  | 'VISIBLE'
  | 'HIDDEN'
  | 'ZERO_SIZE'
  | 'OFFSCREEN'
  | 'CLIPPED'
  | 'OBSCURED'
  | 'UNKNOWN';
type Enabled = 'ENABLED' | 'DISABLED' | 'UNKNOWN';
type NameSource =
  | 'TEXT'
  | 'ARIA_LABEL'
  | 'ARIA_LABELLED_BY'
  | 'TITLE'
  | 'DATA_TOOLTIP'
  | 'NONE';
type NameStatus =
  | 'ALLOWLISTED'
  | 'NONE'
  | 'UNLISTED'
  | 'REFERENCED_NAME_NOT_RESOLVED'
  | 'INCOMPLETE';
type Tag =
  | 'body'
  | 'div'
  | 'span'
  | 'section'
  | 'header'
  | 'main'
  | 'button'
  | 'input'
  | 'select'
  | 'textarea'
  | 'a'
  | 'label'
  | 'li'
  | 'ul'
  | 'ol'
  | 'h1'
  | 'h2'
  | 'h3'
  | 'h4'
  | 'dialog'
  | 'svg'
  | 'path'
  | 'use'
  | 'g'
  | 'other';
type Role =
  | 'dialog'
  | 'heading'
  | 'group'
  | 'button'
  | 'toolbar'
  | 'menu'
  | 'menuitem'
  | 'option'
  | 'tab'
  | 'tablist'
  | 'tree'
  | 'treegrid'
  | 'treeitem'
  | 'row'
  | 'gridcell'
  | 'list'
  | 'listitem'
  | 'link'
  | 'combobox'
  | 'status'
  | 'note'
  | 'img'
  | 'presentation'
  | 'none'
  | 'other';

const SAFE_TAGS = new Set<Tag>([
  'body',
  'div',
  'span',
  'section',
  'header',
  'main',
  'button',
  'input',
  'select',
  'textarea',
  'a',
  'label',
  'li',
  'ul',
  'ol',
  'h1',
  'h2',
  'h3',
  'h4',
  'dialog',
  'svg',
  'path',
  'use',
  'g',
]);
const SAFE_ROLES = new Set<Role>([
  'dialog',
  'heading',
  'group',
  'button',
  'toolbar',
  'menu',
  'menuitem',
  'option',
  'tab',
  'tablist',
  'tree',
  'treegrid',
  'treeitem',
  'row',
  'gridcell',
  'list',
  'listitem',
  'link',
  'combobox',
  'status',
  'note',
  'img',
  'presentation',
  'none',
]);
const EDITABLE =
  'input,textarea,select,[contenteditable],[role="textbox"],[role="combobox"],[role="spinbutton"]';
const ACTIONABLE = 'button,input,select,textarea,a[href]';
const ACTION_ROLES = new Set(['button', 'menuitem', 'option', 'tab']);

interface Shape {
  tag: Tag;
  role: Role;
  childCount: number;
  childCountCapped: boolean;
  ariaLabelPresent: boolean;
  ariaLabelledByPresent: boolean;
  titlePresent: boolean;
  tooltipPresent: boolean;
}
interface PathNode extends Shape {
  childIndex: number | null;
}
interface Name {
  label: Label | null;
  source: NameSource;
  status: NameStatus;
}
interface InternalNode {
  element: Element;
  depth: number;
  shape: Shape;
  name: Name;
  actionable: boolean;
  focusable: boolean;
  inDialog: boolean;
  inToolbar: boolean;
  ariaDisabled: boolean;
  nativeDisabled: boolean;
  inert: boolean;
  actions: number;
  svgs: number;
  labels: Set<Label>;
}
export interface Observation {
  kind:
    | 'STATIC_LABEL_ONLY'
    | 'NATIVE_OR_SEMANTIC'
    | 'FOCUSABLE_MARKUP'
    | 'SVG_STRUCTURE_ONLY';
  label: Label | null;
  nameStatus: NameStatus;
  source: NameSource;
  actionableMarkup: boolean;
  tag: Tag;
  role: Role;
  visibility: Visibility;
  enabled: Enabled;
  ariaDisabled: boolean;
  nativeDisabled: boolean;
  inert: boolean;
  inDialog: boolean;
  inToolbar: boolean;
  ancestry: PathNode[];
  ancestryTruncated: boolean;
}
interface RegionObservation {
  kind: 'SEMANTIC_TOOLBAR' | 'DIALOG_CANDIDATE' | 'STRUCTURAL_CLUSTER';
  shape: Shape;
  visibility: Visibility;
  actions: number;
  svgs: number;
  labels: Label[];
  branches: Array<{
    index: number;
    shape: Shape;
    visibility: Visibility;
    actions: number;
    svgs: number;
    labels: Label[];
  }>;
  branchesTruncated: boolean;
  ancestry: PathNode[];
  ancestryTruncated: boolean;
}

export interface SketchEditorSnapshot {
  version: 'leqad-sketch-editor-snapshot/1';
  ownerReportedState: EditorStateClaim;
  evidenceClass: 'OWNER_REPORTED_STATE_WITH_READ_ONLY_DOM_OBSERVATIONS';
  activeSketchState: 'UNKNOWN';
  productionRecognition: 'NOT_RUN';
  permissionEvidence: 'NOT_INSPECTED';
  lessonProgression: 'NOT_TOUCHED';
  geometryVerification: 'NOT_RUN';
  incomplete: boolean;
  reportTruncated: boolean;
  limits: typeof LIMITS;
  discovery: {
    method: 'BOUNDED_LIGHT_DOM_BODY_SCAN';
    scannedElements: number;
    maxDepthObserved: number;
    semanticToolbarCount: number;
    candidateRegionCount: number;
    regionStatus:
      | 'CANDIDATE_REGIONS_OBSERVED'
      | 'NO_TOOL_REGION_ESTABLISHED'
      | 'AMBIGUOUS_CANDIDATE_REGIONS'
      | 'INCOMPLETE';
    allowlistedCommandCount: number;
    unlistedNameCount: number;
    editableSubtreesSkipped: number;
    nodeLimitReached: boolean;
    depthLimitReached: boolean;
    observationLimitReached: boolean;
    regionLimitReached: boolean;
    ancestryLimitReached: boolean;
    nameInspectionIncomplete: boolean;
  };
  observations: Observation[];
  candidateRegions: RegionObservation[];
  limitations: string[];
}
export interface SketchEditorComparison {
  version: 'leqad-sketch-editor-comparison/1';
  observationClaim: 'OWNER_REPORTED_ONLY';
  activeSketchState: 'UNKNOWN';
  productionRecognition: 'NOT_RUN';
  permissionEvidence: 'NOT_INSPECTED';
  geometryVerification: 'NOT_RUN';
  interpretation: 'DESCRIPTIVE_DIFFERENCES_ONLY_NOT_A_PRODUCTION_DISCRIMINATOR';
  reviewPolicy: {
    signalLocation: 'ALLOWLISTED_LABELS_AND_BOUNDED_STRUCTURE_PATHS';
    visibility: 'REPORTED_PER_SNAPSHOT_WHEN_KNOWN';
    crossStatePresence: 'SHOWN_BY_STATE_ONLY_AND_SHARED_SIGNAL_LISTS';
    editableOrUserContentDependence: 'UNKNOWN_NOT_INSPECTED';
    uniqueness: 'NOT_ESTABLISHED_BY_THIS_PAIR';
    controlOwnership: 'NOT_ESTABLISHED';
    revocationWhenEditingEnds: 'NOT_TESTED';
  };
  stateA: SketchEditorSnapshot;
  stateB: SketchEditorSnapshot;
  signals: {
    stateAOnly: string[];
    stateBOnly: string[];
    shared: string[];
    visibilityChanges: Array<{
      signal: string;
      stateA: Visibility[];
      stateB: Visibility[];
    }>;
    unavailableOrAmbiguous: string[];
  };
  incomplete: boolean;
  reportTruncated: boolean;
}

function allowedLabel(value: string): Label | null {
  const normalized = value.trim().replace(/\s+/g, ' ').toLowerCase();
  return LABELS.find((label) => label.toLowerCase() === normalized) ?? null;
}
function shape(element: Element): Shape {
  const role = element.getAttribute('role');
  return {
    tag: SAFE_TAGS.has(element.localName as Tag)
      ? (element.localName as Tag)
      : 'other',
    role: role
      ? SAFE_ROLES.has(role as Role)
        ? (role as Role)
        : 'other'
      : 'none',
    childCount: Math.min(element.childElementCount, LIMITS.siblings),
    childCountCapped: element.childElementCount > LIMITS.siblings,
    ariaLabelPresent: element.hasAttribute('aria-label'),
    ariaLabelledByPresent: element.hasAttribute('aria-labelledby'),
    titlePresent: element.hasAttribute('title'),
    tooltipPresent: element.hasAttribute('data-tooltip'),
  };
}
function name(element: Element): Name {
  if (element.hasAttribute('aria-labelledby'))
    return {
      label: null,
      source: 'ARIA_LABELLED_BY',
      status: 'REFERENCED_NAME_NOT_RESOLVED',
    };
  for (const [attribute, source] of [
    ['aria-label', 'ARIA_LABEL'],
    ['title', 'TITLE'],
    ['data-tooltip', 'DATA_TOOLTIP'],
  ] as const) {
    if (!element.hasAttribute(attribute)) continue;
    const raw = element.getAttribute(attribute) ?? '';
    const label = raw.length <= LIMITS.nameChars ? allowedLabel(raw) : null;
    return { label, source, status: label ? 'ALLOWLISTED' : 'UNLISTED' };
  }
  let text = '';
  let count = 0;
  for (const child of element.childNodes) {
    if (++count > LIMITS.nameNodes)
      return { label: null, source: 'TEXT', status: 'INCOMPLETE' };
    if (
      child instanceof Element &&
      (child.matches(EDITABLE) ||
        child.hasAttribute('aria-label') ||
        child.hasAttribute('aria-labelledby') ||
        child.hasAttribute('title') ||
        child.hasAttribute('data-tooltip'))
    )
      return { label: null, source: 'TEXT', status: 'INCOMPLETE' };
    if (child.nodeType === 3) {
      text += child.nodeValue ?? '';
      if (text.length > LIMITS.nameChars)
        return { label: null, source: 'TEXT', status: 'INCOMPLETE' };
    }
  }
  if (!text.trim()) return { label: null, source: 'NONE', status: 'NONE' };
  const label = allowedLabel(text);
  return { label, source: 'TEXT', status: label ? 'ALLOWLISTED' : 'UNLISTED' };
}
function isLeqad(element: Element) {
  let current: Element | null = element;
  let depth = 0;
  while (current && depth++ < LIMITS.depth) {
    if (
      current.hasAttribute('data-leqad-root') ||
      current.hasAttribute('data-leqad-highlight')
    )
      return true;
    current = current.parentElement;
  }
  if (current) return false;
  const root = element.getRootNode();
  return (
    root instanceof ShadowRoot &&
    (root.host.hasAttribute('data-leqad-root') ||
      root.host.localName.startsWith('leqad-'))
  );
}
function isHtml(element: Element): element is HTMLElement {
  return (
    Boolean(element.ownerDocument.defaultView) &&
    element instanceof element.ownerDocument.defaultView!.HTMLElement
  );
}
function visibility(element: Element): Visibility {
  if (!isHtml(element)) return 'UNKNOWN';
  const view = element.ownerDocument.defaultView;
  const rect = element.getBoundingClientRect();
  let current: HTMLElement | null = element;
  let depth = 0;
  while (current && depth++ < LIMITS.ancestors) {
    if (
      !current.isConnected ||
      current.hidden ||
      current.getAttribute('aria-hidden') === 'true'
    )
      return 'HIDDEN';
    const css = view?.getComputedStyle(current);
    if (
      css &&
      (css.display === 'none' ||
        css.visibility === 'hidden' ||
        css.visibility === 'collapse' ||
        css.opacity === '0')
    )
      return 'HIDDEN';
    if (
      depth > 1 &&
      css &&
      /(hidden|clip|auto|scroll)/.test(
        `${css.overflow} ${css.overflowX} ${css.overflowY}`,
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
  }
  if (current) return 'UNKNOWN';
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
  return hit && hit !== element && !element.contains(hit)
    ? 'OBSCURED'
    : 'VISIBLE';
}
function enabled(element: Element): Enabled {
  if (!isHtml(element)) return 'UNKNOWN';
  let current: HTMLElement | null = element;
  let depth = 0;
  let nativeButtonEvidence = false;
  while (current && depth++ < LIMITS.ancestors) {
    if (
      current.getAttribute('aria-disabled') === 'true' ||
      current.hasAttribute('inert')
    )
      return 'DISABLED';
    if (current.localName === 'button') {
      const button = current as HTMLButtonElement;
      if (button.disabled) return 'DISABLED';
      nativeButtonEvidence = true;
    }
    current = current.parentElement;
  }
  if (current || !nativeButtonEvidence) return 'UNKNOWN';
  return 'ENABLED';
}
function ancestry(element: Element, root: Element) {
  const items: PathNode[] = [];
  let current: Element | null = element;
  while (current && items.length < LIMITS.ancestors) {
    const node: Element = current;
    let childIndex: number | null = null;
    const parent = node.parentElement;
    if (parent) {
      let index = 0;
      while (index < LIMITS.siblings && parent.children[index] !== node)
        index++;
      if (index < LIMITS.siblings) childIndex = index;
    }
    items.push({ ...shape(node), childIndex });
    if (node === root) break;
    current = parent;
  }
  return { items, truncated: current !== null && current !== root };
}
function walk(
  root: Element,
  visit: (element: Element, depth: number) => boolean | void,
) {
  let current: Element | null = root;
  let depth = 0,
    scanned = 0,
    maxDepth = 0,
    nodeLimit = false,
    depthLimit = false;
  while (current) {
    if (scanned >= LIMITS.elements) {
      nodeLimit = true;
      break;
    }
    scanned++;
    maxDepth = Math.max(maxDepth, depth);
    const descend = visit(current, depth) !== false;
    if (descend && current.firstElementChild && !isLeqad(current)) {
      if (depth >= LIMITS.depth) depthLimit = true;
      else {
        current = current.firstElementChild;
        depth++;
        continue;
      }
    }
    let moving: Element | null = current;
    while (moving && moving !== root && !moving.nextElementSibling) {
      moving = moving.parentElement;
      depth--;
    }
    current = !moving || moving === root ? null : moving.nextElementSibling;
  }
  return { scanned, maxDepth, nodeLimit, depthLimit };
}

function capture(
  root: ParentNode,
  state: EditorStateClaim,
): SketchEditorSnapshot {
  const node = root as Node;
  const scanRoot =
    node.nodeType === 9
      ? ((root as Document).body ?? (root as Document).documentElement)
      : (root as Element);
  const records = new Map<Element, InternalNode>();
  let editableSubtreesSkipped = 0;
  const scan = walk(scanRoot, (element, depth) => {
    if (element !== scanRoot && isLeqad(element)) return false;
    if (['script', 'style', 'template', 'noscript'].includes(element.localName))
      return false;
    const parent = element.parentElement
      ? records.get(element.parentElement)
      : undefined;
    const editable = element.matches(EDITABLE);
    if (editable) editableSubtreesSkipped++;
    if (editable) return false;
    const label = name(element);
    const roleValue = element.getAttribute('role');
    const role = roleValue
      ? SAFE_ROLES.has(roleValue as Role)
        ? (roleValue as Role)
        : 'other'
      : 'none';
    const actionable =
      element.matches(ACTIONABLE) ||
      (roleValue !== null && ACTION_ROLES.has(roleValue));
    const tabindex = element.getAttribute('tabindex');
    const focusable = tabindex !== null && Number(tabindex) >= 0;
    const entry: InternalNode = {
      element,
      depth,
      shape: shape(element),
      name: label,
      actionable,
      focusable,
      inDialog: Boolean(
        parent?.inDialog || role === 'dialog' || element.localName === 'dialog',
      ),
      inToolbar: Boolean(parent?.inToolbar || role === 'toolbar'),
      ariaDisabled: element.getAttribute('aria-disabled') === 'true',
      nativeDisabled:
        isHtml(element) &&
        element.matches(ACTIONABLE) &&
        'disabled' in element &&
        Boolean((element as HTMLButtonElement).disabled),
      inert: element.hasAttribute('inert'),
      actions: Number(actionable || focusable),
      svgs: Number(element.localName === 'svg'),
      labels: new Set(label.label ? [label.label] : []),
    };
    records.set(element, entry);
    let ancestor = element.parentElement,
      distance = 0;
    while (ancestor && distance++ < LIMITS.ancestors) {
      const summary = records.get(ancestor);
      if (summary) {
        summary.actions += Number(actionable || focusable);
        if (element.localName === 'svg') summary.svgs++;
        if (label.label) summary.labels.add(label.label);
      }
      ancestor = ancestor.parentElement;
    }
  });
  const all = [...records.values()];
  const labelNodes = all.filter((item) => item.name.label);
  const priority = (item: InternalNode) =>
    [
      'Sketch',
      'Create sketch',
      'Start sketch',
      'Sketch plane',
      'Finish Sketch',
      'Exit Sketch',
      'Close Sketch',
    ].includes(item.name.label ?? '')
      ? 100
      : item.name.label === 'Extrude'
        ? 80
        : 10;
  const wrappers = all.filter(
    (item) =>
      item.shape.tag !== 'svg' &&
      item.shape.tag !== 'path' &&
      item.svgs > 0 &&
      (item.element.parentElement === scanRoot ||
        records.get(item.element.parentElement!)?.svgs !== item.svgs),
  );
  const controlMap = new Map<Element, InternalNode>();
  for (const item of all)
    if (item.actionable || item.focusable) controlMap.set(item.element, item);
  for (const item of wrappers) controlMap.set(item.element, item);
  const observationNodes = new Map<Element, InternalNode>();
  for (const item of labelNodes) observationNodes.set(item.element, item);
  for (const item of controlMap.values())
    observationNodes.set(item.element, item);
  const selectedNodes = [...observationNodes.values()];
  const observationPriority = (item: InternalNode) =>
    (item.name.label ? priority(item) : 0) +
    (item.inDialog ? 8 : 0) +
    (item.inToolbar ? 8 : 0) +
    (item.actionable ? 4 : 0) +
    (item.focusable ? 2 : 0);
  const observations = selectedNodes
    .sort(
      (a, b) =>
        observationPriority(b) - observationPriority(a) || a.depth - b.depth,
    )
    .slice(0, LIMITS.observations)
    .map((item): Observation => {
      const path = ancestry(item.element, scanRoot);
      return {
        kind: item.actionable
          ? 'NATIVE_OR_SEMANTIC'
          : item.focusable
            ? 'FOCUSABLE_MARKUP'
            : item.name.label
              ? 'STATIC_LABEL_ONLY'
              : 'SVG_STRUCTURE_ONLY',
        label: item.name.label,
        nameStatus: item.name.status,
        source: item.name.source,
        actionableMarkup: item.actionable || item.focusable,
        tag: item.shape.tag,
        role: item.shape.role,
        visibility: visibility(item.element),
        enabled: enabled(item.element),
        ariaDisabled: item.ariaDisabled,
        nativeDisabled: item.nativeDisabled,
        inert: item.inert,
        inDialog: item.inDialog,
        inToolbar: item.inToolbar,
        ancestry: path.items,
        ancestryTruncated: path.truncated,
      };
    });
  const toolbars = all.filter((item) => item.shape.role === 'toolbar');
  const dialogs = all.filter(
    (item) =>
      item.shape.role === 'dialog' || item.element.localName === 'dialog',
  );
  const clusters = all.filter(
    (item) =>
      item.element !== scanRoot &&
      item.element.childElementCount >= 2 &&
      item.element.childElementCount <= LIMITS.siblings &&
      (item.actions >= 3 || item.svgs >= 3) &&
      (item.labels.size > 0 || item.svgs >= 3),
  );
  const regionMap = new Map<
    Element,
    { item: InternalNode; kind: RegionObservation['kind'] }
  >();
  for (const item of toolbars)
    regionMap.set(item.element, { item, kind: 'SEMANTIC_TOOLBAR' });
  for (const item of dialogs)
    regionMap.set(item.element, { item, kind: 'DIALOG_CANDIDATE' });
  for (const item of clusters)
    if (!regionMap.has(item.element))
      regionMap.set(item.element, { item, kind: 'STRUCTURAL_CLUSTER' });
  const regions = [...regionMap.values()].sort(
    (a, b) =>
      Number(b.item.labels.has('Sketch')) -
        Number(a.item.labels.has('Sketch')) ||
      Number(b.item.labels.has('Extrude')) -
        Number(a.item.labels.has('Extrude')) ||
      a.item.element.childElementCount - b.item.element.childElementCount ||
      b.item.depth - a.item.depth,
  );
  const candidateRegions = regions
    .slice(0, LIMITS.regions)
    .map(({ item, kind }): RegionObservation => {
      const path = ancestry(item.element, scanRoot);
      const branches = [];
      for (
        let index = 0;
        index < Math.min(item.element.children.length, LIMITS.branches);
        index++
      ) {
        const child = item.element.children[index]!;
        const childRecord = records.get(child);
        branches.push({
          index,
          shape: shape(child),
          visibility: visibility(child),
          actions: childRecord?.actions ?? 0,
          svgs: childRecord?.svgs ?? 0,
          labels: childRecord ? [...childRecord.labels].slice(0, 6) : [],
        });
      }
      return {
        kind,
        shape: item.shape,
        visibility: visibility(item.element),
        actions: item.actions,
        svgs: item.svgs,
        labels: [...item.labels].slice(0, 8),
        branches,
        branchesTruncated: item.element.children.length > LIMITS.branches,
        ancestry: path.items,
        ancestryTruncated: path.truncated,
      };
    });
  const ancestryLimitReached = [...observations, ...candidateRegions].some(
    (item) => item.ancestryTruncated,
  );
  const nameInspectionIncomplete = all.some(
    (item) => item.name.status === 'INCOMPLETE',
  );
  const observationLimitReached = selectedNodes.length > LIMITS.observations;
  const regionLimitReached = regions.length > LIMITS.regions;
  const incomplete =
    scan.nodeLimit ||
    scan.depthLimit ||
    ancestryLimitReached ||
    nameInspectionIncomplete ||
    observationLimitReached ||
    regionLimitReached;
  const codes = [
    ...(toolbars.length ? [] : ['NO_SEMANTIC_TOOLBAR_OBSERVED']),
    ...(regions.length ? [] : ['NO_TOOL_REGION_ESTABLISHED']),
    ...(scan.nodeLimit ? ['NODE_LIMIT_REACHED'] : []),
    ...(scan.depthLimit ? ['DEPTH_LIMIT_REACHED'] : []),
    ...(observationLimitReached ? ['OBSERVATION_LIMIT_REACHED'] : []),
    ...(ancestryLimitReached ? ['ANCESTRY_LIMIT_REACHED'] : []),
    ...(nameInspectionIncomplete ? ['LOCAL_NAME_INSPECTION_INCOMPLETE'] : []),
    ...(regions.length > 1 ? ['MULTIPLE_CANDIDATE_REGIONS'] : []),
    'EDITOR_STATE_IDENTITY_NOT_ESTABLISHED',
  ];
  const regionStatus = incomplete
    ? 'INCOMPLETE'
    : regions.length === 0
      ? 'NO_TOOL_REGION_ESTABLISHED'
      : regions.length === 1
        ? 'CANDIDATE_REGIONS_OBSERVED'
        : 'AMBIGUOUS_CANDIDATE_REGIONS';
  let report: SketchEditorSnapshot = {
    version: 'leqad-sketch-editor-snapshot/1',
    ownerReportedState: state,
    evidenceClass: 'OWNER_REPORTED_STATE_WITH_READ_ONLY_DOM_OBSERVATIONS',
    activeSketchState: 'UNKNOWN',
    productionRecognition: 'NOT_RUN',
    permissionEvidence: 'NOT_INSPECTED',
    lessonProgression: 'NOT_TOUCHED',
    geometryVerification: 'NOT_RUN',
    incomplete,
    reportTruncated: false,
    limits: LIMITS,
    discovery: {
      method: 'BOUNDED_LIGHT_DOM_BODY_SCAN',
      scannedElements: scan.scanned,
      maxDepthObserved: scan.maxDepth,
      semanticToolbarCount: toolbars.length,
      candidateRegionCount: regions.length,
      regionStatus,
      allowlistedCommandCount: labelNodes.length,
      unlistedNameCount: Math.min(
        all.filter((item) => item.name.status === 'UNLISTED').length,
        LIMITS.elements,
      ),
      editableSubtreesSkipped,
      nodeLimitReached: scan.nodeLimit,
      depthLimitReached: scan.depthLimit,
      observationLimitReached,
      regionLimitReached,
      ancestryLimitReached,
      nameInspectionIncomplete,
    },
    observations,
    candidateRegions,
    limitations: [
      'EDITOR_STATE_IS_OWNER_REPORTED_ONLY',
      'SHADOW_DOM_NOT_TRAVERSED',
      'STRUCTURAL_CLUSTERS_ARE_CANDIDATES_NOT_VERIFIED_TOOLBARS',
      ...codes,
      'NO_CAD_ACTION_OR_GEOMETRY_CHECK_WAS_PERFORMED',
    ],
  };
  while (JSON.stringify(report).length > LIMITS.snapshotChars) {
    const field = (['observations', 'candidateRegions'] as const).find(
      (key) => report[key].length > 0,
    );
    if (!field) break;
    report = {
      ...report,
      [field]: report[field].slice(0, Math.floor(report[field].length / 2)),
      incomplete: true,
      reportTruncated: true,
      discovery: { ...report.discovery, regionStatus: 'INCOMPLETE' },
      limitations: [...report.limitations, 'REPORT_SIZE_LIMIT_REACHED'],
    };
  }
  if (JSON.stringify(report).length > LIMITS.snapshotChars)
    report = {
      ...report,
      observations: [],
      candidateRegions: [],
      incomplete: true,
      reportTruncated: true,
      discovery: { ...report.discovery, regionStatus: 'INCOMPLETE' },
      limitations: [
        'REPORT_SIZE_LIMIT_REACHED',
        'OBSERVATIONS_OMITTED_FOR_SIZE',
      ],
    };
  return report;
}

export function captureSketchEditorSnapshot(
  root: ParentNode,
  state: EditorStateClaim,
) {
  return capture(root, state);
}

function observationSignal(item: Observation) {
  return `OBSERVATION:${item.kind}:${item.label ?? item.nameStatus}:${item.tag}:${item.role}:${item.source}:${item.ancestry
    .slice(0, 3)
    .map((p) => `${p.tag}/${p.role}/${p.childIndex ?? '?'}`)
    .join('>')}`;
}
function regionSignal(item: RegionObservation) {
  return `REGION:${item.kind}:${item.shape.tag}:${item.shape.role}:children=${item.shape.childCount}:actions=${item.actions}:labels=${item.labels.join(',')}:branches=${item.branches.map((b) => `${b.shape.tag}/${b.shape.role}/${b.shape.childCount}`).join(',')}`;
}
function diff(left: string[], right: string[]) {
  const counts = new Map<string, number>();
  for (const value of right) counts.set(value, (counts.get(value) ?? 0) + 1);
  return left.filter((value) => {
    const count = counts.get(value) ?? 0;
    if (count) counts.set(value, count - 1);
    return !count;
  });
}
function visibilities(snapshot: SketchEditorSnapshot) {
  const values = new Map<string, Set<Visibility>>();
  const add = (key: string, value: Visibility) => {
    const set = values.get(key) ?? new Set<Visibility>();
    set.add(value);
    values.set(key, set);
  };
  for (const item of snapshot.observations)
    add(observationSignal(item), item.visibility);
  for (const item of snapshot.candidateRegions)
    add(regionSignal(item), item.visibility);
  return values;
}
export function compareSketchEditorSnapshots(
  stateA: SketchEditorSnapshot,
  stateB: SketchEditorSnapshot,
): SketchEditorComparison {
  const signals = (item: SketchEditorSnapshot) => [
    ...item.observations.map(observationSignal),
    ...item.candidateRegions.map(regionSignal),
  ];
  const a = signals(stateA),
    b = signals(stateB),
    va = visibilities(stateA),
    vb = visibilities(stateB);
  const visibilityChanges: SketchEditorComparison['signals']['visibilityChanges'] =
    [];
  for (const key of new Set([...va.keys(), ...vb.keys()])) {
    const left = [...(va.get(key) ?? [])].sort(),
      right = [...(vb.get(key) ?? [])].sort();
    if (JSON.stringify(left) !== JSON.stringify(right))
      visibilityChanges.push({ signal: key, stateA: left, stateB: right });
  }
  const unavailableOrAmbiguous = [
    'EDITOR_IDENTITIES_OWNER_REPORTED_ONLY',
    'SINGLE_PAIR_CANNOT_ESTABLISH_PRODUCTION_SAFE_SIGNAL',
  ];
  for (const [label, item] of [
    ['STATE_A', stateA],
    ['STATE_B', stateB],
  ] as const) {
    if (item.incomplete)
      unavailableOrAmbiguous.push(`${label}_CAPTURE_INCOMPLETE`);
    if (!item.discovery.semanticToolbarCount)
      unavailableOrAmbiguous.push(`${label}_NO_SEMANTIC_TOOLBAR_OBSERVED`);
    if (!item.discovery.candidateRegionCount)
      unavailableOrAmbiguous.push(`${label}_TOOL_REGION_NOT_ESTABLISHED`);
    if (item.discovery.candidateRegionCount > 1)
      unavailableOrAmbiguous.push(`${label}_MULTIPLE_CANDIDATE_REGIONS`);
    if (!item.discovery.allowlistedCommandCount)
      unavailableOrAmbiguous.push(
        `${label}_NO_ALLOWLISTED_STATIC_COMMAND_LABELS`,
      );
    if (
      item.candidateRegions.some((region) => region.kind === 'DIALOG_CANDIDATE')
    )
      unavailableOrAmbiguous.push(`${label}_DIALOG_IDENTITY_NOT_ESTABLISHED`);
  }
  return {
    version: 'leqad-sketch-editor-comparison/1',
    observationClaim: 'OWNER_REPORTED_ONLY',
    activeSketchState: 'UNKNOWN',
    productionRecognition: 'NOT_RUN',
    permissionEvidence: 'NOT_INSPECTED',
    geometryVerification: 'NOT_RUN',
    interpretation:
      'DESCRIPTIVE_DIFFERENCES_ONLY_NOT_A_PRODUCTION_DISCRIMINATOR',
    reviewPolicy: {
      signalLocation: 'ALLOWLISTED_LABELS_AND_BOUNDED_STRUCTURE_PATHS',
      visibility: 'REPORTED_PER_SNAPSHOT_WHEN_KNOWN',
      crossStatePresence: 'SHOWN_BY_STATE_ONLY_AND_SHARED_SIGNAL_LISTS',
      editableOrUserContentDependence: 'UNKNOWN_NOT_INSPECTED',
      uniqueness: 'NOT_ESTABLISHED_BY_THIS_PAIR',
      controlOwnership: 'NOT_ESTABLISHED',
      revocationWhenEditingEnds: 'NOT_TESTED',
    },
    stateA,
    stateB,
    signals: {
      stateAOnly: diff(a, b),
      stateBOnly: diff(b, a),
      shared: diff(a, diff(a, b)),
      visibilityChanges,
      unavailableOrAmbiguous,
    },
    incomplete: stateA.incomplete || stateB.incomplete,
    reportTruncated: false,
  };
}
export function serializeSketchEditorComparison(
  comparison: SketchEditorComparison,
) {
  let report = comparison,
    output = JSON.stringify(comparison);
  while (output.length > LIMITS.comparisonChars) {
    const key =
      JSON.stringify(report.stateA).length >=
      JSON.stringify(report.stateB).length
        ? 'stateA'
        : 'stateB';
    const source = report[key];
    report = {
      ...report,
      [key]: {
        ...source,
        observations: source.observations.slice(
          0,
          Math.max(0, source.observations.length - 4),
        ),
        candidateRegions: source.candidateRegions.slice(
          0,
          Math.max(0, source.candidateRegions.length - 2),
        ),
        incomplete: true,
        reportTruncated: true,
        discovery: { ...source.discovery, regionStatus: 'INCOMPLETE' },
      },
      incomplete: true,
      reportTruncated: true,
    };
    output = JSON.stringify(report);
    if (
      !report.stateA.observations.length &&
      !report.stateA.candidateRegions.length &&
      !report.stateB.observations.length &&
      !report.stateB.candidateRegions.length
    )
      break;
  }
  if (output.length > LIMITS.comparisonChars) {
    const minimal = (item: SketchEditorSnapshot): SketchEditorSnapshot => ({
      ...item,
      observations: [],
      candidateRegions: [],
      incomplete: true,
      reportTruncated: true,
      discovery: { ...item.discovery, regionStatus: 'INCOMPLETE' },
      limitations: [
        'REPORT_SIZE_LIMIT_REACHED',
        'OBSERVATIONS_OMITTED_FOR_SIZE',
      ],
    });
    report = {
      ...report,
      stateA: minimal(report.stateA),
      stateB: minimal(report.stateB),
      signals: {
        stateAOnly: [],
        stateBOnly: [],
        shared: [],
        visibilityChanges: [],
        unavailableOrAmbiguous: ['REPORT_SIZE_LIMIT_REACHED'],
      },
      incomplete: true,
      reportTruncated: true,
    };
    output = JSON.stringify(report);
  }
  return output;
}
