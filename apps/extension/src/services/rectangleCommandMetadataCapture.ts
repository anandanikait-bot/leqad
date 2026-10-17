import { createMetadataEligibilityInspector } from './rectangleMetadataEligibility';
import type { MetadataEligibility } from './rectangleMetadataEligibility';
export const RECTANGLE_COMMAND_METADATA_VERSION =
  'leqad-rectangle-command-metadata/2' as const;

export type RectangleCommandCaptureState =
  | 'SKETCH_EDITING'
  | 'RECTANGLE_MENU_OPEN'
  | 'OTHER_RECTANGLE_VARIANT'
  | 'EXTRUDE_EDITING';

export type AllowlistedCommandId =
  | 'LINESEGMENT'
  | 'newSketch'
  | 'extrude'
  | 'RECTANGLE_TWO_CORNERS'
  | 'RECTANGLE_CENTER'
  | 'RECTANGLE_ALIGNED';

type Observation = 'PRESENT' | 'ABSENT' | 'AMBIGUOUS' | 'UNKNOWN';
type Identity = 'OBSERVED' | 'MISSING' | 'AMBIGUOUS' | 'UNKNOWN';
type Visibility = MetadataEligibility['visibility'];
type Enabled = 'ENABLED' | 'DISABLED' | 'UNKNOWN';
type CommandLocation = 'TOOLBAR' | 'MENU' | 'OTHER';
type ArrowRelation = 'SAME_PARENT' | 'NONE' | 'AMBIGUOUS';

const ALLOWLISTED_COMMAND_IDS = [
  'LINESEGMENT',
  'newSketch',
  'extrude',
  'RECTANGLE_TWO_CORNERS',
  'RECTANGLE_CENTER',
  'RECTANGLE_ALIGNED',
] as const satisfies readonly AllowlistedCommandId[];

const RECTANGLE_COMMAND_IDS = new Set<AllowlistedCommandId>([
  'RECTANGLE_TWO_CORNERS',
  'RECTANGLE_CENTER',
  'RECTANGLE_ALIGNED',
]);

const LIMITS = {
  regions: 8,
  inspectedCommandElements: 256,
  regionElements: 4096,
  commandRecords: 24,
  arrowRecords: 16,
} as const;

export interface RectangleCommandRecord {
  commandId: AllowlistedCommandId;
  tag: 'button' | 'div' | 'span' | 'other';
  location: CommandLocation;
  visibility: Visibility;
  enabled: Enabled;
  active: 'TRUE' | 'FALSE';
  eligibility: MetadataEligibility['eligibility'];
  hitTest: MetadataEligibility['hitTest'];
}

export interface RectangleArrowOwnershipRecord {
  faceCommandId: AllowlistedCommandId | null;
  arrowRelation: ArrowRelation;
  visibleArrowCount: number;
  parentChildCount: number;
  parentChildCountCapped: boolean;
  assessment?: 'LOCAL_CANDIDATE' | 'AMBIGUOUS' | 'NOT_ESTABLISHED' | 'UNKNOWN';
  visibility?: Visibility;
  enabled?: Enabled;
  eligibility?: MetadataEligibility['eligibility'];
  relativeBounds?: {
    x: number;
    y: number;
    width: number;
    height: number;
  } | null;
  menuAssociation?: 'NOT_ESTABLISHED';
  competingControls?: number;
}

export interface RectangleMetadataInteraction {
  origin: 'NOT_OBSERVED' | 'RECTANGLE_ARROW_CANDIDATE' | 'OTHER' | 'UNKNOWN';
  menuAssociation:
    | 'NOT_OBSERVED'
    | 'LOCAL_TRANSITION_CANDIDATE'
    | 'UNOWNED'
    | 'AMBIGUOUS'
    | 'UNKNOWN';
  outcome: 'SNAPSHOT' | 'CAPTURED' | 'TIMED_OUT' | 'CANCELLED';
  observationLimitReached: boolean;
}

export interface RectangleCommandMetadataSnapshot {
  ownerReportedState: RectangleCommandCaptureState;
  observationGeneration: number;
  toolbarMarkers: number;
  arrowMarkers: number;
  menuMarkers: number;
  menuPlacement: 'NESTED_IN_TOOLBAR' | 'PORTALED' | 'NOT_OBSERVED';
  sketchClue: Observation;
  extrudeClue: Observation;
  identity: Identity;
  activeSketchState: 'UNKNOWN';
  interaction: RectangleMetadataInteraction;
  contextReason:
    | 'COMMAND_CLUES_ONLY'
    | 'CONFLICTING_COMMAND_CLUES'
    | 'INCOMPLETE_OBSERVATION'
    | 'PAGE_RESTRICTED';
  pageSupport: 'SUPPORTED_PART_STUDIO' | 'UNSUPPORTED' | 'UNKNOWN';
  editability: 'READ_ONLY' | 'EDITABLE' | 'UNKNOWN';
  commands: RectangleCommandRecord[];
  ownership: RectangleArrowOwnershipRecord[];
  scan: {
    status: 'COMPLETE' | 'INCOMPLETE';
    scannedElements: number;
    regionElementsVisited: number;
    inspection: 'COMPLETE' | 'INCOMPLETE';
    relevantRegionCoverage: 'COMPLETE' | 'UNKNOWN';
    discoveryWork: 'NATIVE_SELECTOR_ENGINE_NOT_HARD_BOUNDED';
    unallowlistedCommandIds: number;
    unallowlistedCountCapped: boolean;
    reasons: Array<
      | 'REGION_LIMIT_REACHED'
      | 'REGION_TRAVERSAL_LIMIT_REACHED'
      | 'COMMAND_LIMIT_REACHED'
      | 'RECORD_LIMIT_REACHED'
      | 'ARROW_LIMIT_REACHED'
      | 'ANCESTOR_LIMIT_REACHED'
    >;
  };
}

export interface RectangleCommandMetadataReport {
  version: typeof RECTANGLE_COMMAND_METADATA_VERSION;
  observationClaim: 'OWNER_REPORTED_STATE_WITH_DOM_OBSERVATIONS';
  productionRecognition: 'NOT_RUN';
  permissionEvidence: 'NOT_INSPECTED';
  geometryVerification: 'NOT_RUN';
  snapshots: RectangleCommandMetadataSnapshot[];
}

export type RectangleMenuMetadataCaptureStatus =
  'CAPTURED' | 'TIMED_OUT' | 'CANCELLED';

export interface RectangleMenuMetadataCaptureResult {
  status: RectangleMenuMetadataCaptureStatus;
  snapshot: RectangleCommandMetadataSnapshot;
}

export interface RectangleMenuMetadataCaptureTask {
  promise: Promise<RectangleMenuMetadataCaptureResult>;
  cancel: () => void;
  isActive: () => boolean;
}

function safeTag(element: Element): RectangleCommandRecord['tag'] {
  return element.localName === 'button' ||
    element.localName === 'div' ||
    element.localName === 'span'
    ? element.localName
    : 'other';
}

function locationOf(element: Element): CommandLocation {
  if (element.closest('.os-tool-dropdown-content')) return 'MENU';
  if (element.closest('.os-element-toolbar')) return 'TOOLBAR';
  return 'OTHER';
}

function clueFor(
  records: readonly RectangleCommandRecord[],
  commandId: AllowlistedCommandId,
  incomplete: boolean,
): Observation {
  const matches = records.filter(
    (record) =>
      record.commandId === commandId &&
      record.location === 'TOOLBAR' &&
      record.visibility === 'VISIBLE' &&
      record.enabled === 'ENABLED',
  );
  if (matches.length > 1) return 'AMBIGUOUS';
  if (matches.length === 1) return 'PRESENT';
  return incomplete ? 'UNKNOWN' : 'ABSENT';
}

function cappedCount(value: number, maximum: number) {
  return Number.isFinite(value)
    ? Math.max(0, Math.min(Math.trunc(value), maximum + 1))
    : 0;
}

function isAllowlistedCommandId(value: string): value is AllowlistedCommandId {
  return (ALLOWLISTED_COMMAND_IDS as readonly string[]).includes(value);
}

function boundedClassElements(
  root: Document,
  className: string,
  limit: number,
): { elements: HTMLElement[]; total: number; truncated: boolean } {
  const collection = root.getElementsByClassName(className);
  const elements: HTMLElement[] = [];
  for (let index = 0; index < collection.length && index < limit; index += 1) {
    const element = collection.item(index);
    if (element instanceof HTMLElement) elements.push(element);
  }
  return {
    elements,
    total: collection.length,
    truncated: collection.length > limit,
  };
}

export interface RectangleMetadataPageEvidence {
  pageSupport: 'SUPPORTED_PART_STUDIO' | 'UNSUPPORTED' | 'UNKNOWN';
  editability: 'READ_ONLY' | 'EDITABLE' | 'UNKNOWN';
}

function inspectMetadata(
  root: Document,
  ownerReportedState: RectangleCommandCaptureState,
  observationGeneration: number,
  page: RectangleMetadataPageEvidence = {
    pageSupport: 'UNKNOWN',
    editability: 'UNKNOWN',
  },
) {
  const reasons: RectangleCommandMetadataSnapshot['scan']['reasons'] = [];
  const toolbarMatches = boundedClassElements(
    root,
    'os-element-toolbar',
    LIMITS.regions,
  );
  const menuMatches = boundedClassElements(
    root,
    'os-tool-dropdown-content',
    LIMITS.regions,
  );
  const toolbars = toolbarMatches.elements;
  const menus = menuMatches.elements;
  const regions = [...toolbars, ...menus];
  const inspectEligibility = createMetadataEligibilityInspector(root);
  if (toolbarMatches.truncated || menuMatches.truncated)
    reasons.push('REGION_LIMIT_REACHED');
  const candidates = new Set<Element>();
  const priority = new Set<Element>();
  // A fixed number of native identity queries retain useful exact observations
  // even if general command coverage is truncated. They never prove uniqueness.
  for (const region of regions) {
    for (const id of ALLOWLISTED_COMMAND_IDS) {
      const first = region.querySelector(`[command-id="${id}"]`);
      if (first) priority.add(first);
    }
  }
  let unallowlistedCommandIds = 0;
  let coverageTruncated = false;
  let regionElementsVisited = 0;
  const visited = new Set<Element>();
  const actionables = new Set<Element>();
  outer: for (const region of regions) {
    const walker = root.createTreeWalker(region, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node instanceof Element) {
      let skip = visited.has(node);
      if (!skip) {
        if (regionElementsVisited >= LIMITS.regionElements) {
          reasons.push('REGION_TRAVERSAL_LIMIT_REACHED');
          coverageTruncated = true;
          break outer;
        }
        visited.add(node);
        regionElementsVisited++;
        if (node.hasAttribute('command-id')) {
          if (candidates.size >= LIMITS.inspectedCommandElements) {
            coverageTruncated = true;
            break outer;
          }
          candidates.add(node);
          if (!isAllowlistedCommandId(node.getAttribute('command-id') ?? ''))
            unallowlistedCommandIds++;
        }
        if (node.matches('button,[role="button"],[aria-haspopup]')) {
          if (actionables.size >= LIMITS.inspectedCommandElements) {
            reasons.push('REGION_TRAVERSAL_LIMIT_REACHED');
            coverageTruncated = true;
            break outer;
          }
          actionables.add(node);
        }
        // A native first-match existence query avoids walking irrelevant SVG
        // path data, while retaining SVG descendants that carry command evidence.
        skip = node.localName === 'svg' && !node.querySelector('[command-id]');
      }
      if (!skip) {
        node = walker.nextNode();
        continue;
      }
      node = walker.nextSibling();
      while (!node && walker.parentNode() && walker.currentNode !== region)
        node = walker.nextSibling();
    }
  }
  if (coverageTruncated) reasons.push('COMMAND_LIMIT_REACHED');
  const relevant = [...new Set([...priority, ...candidates])].filter(
    (element) =>
      isAllowlistedCommandId(element.getAttribute('command-id') ?? ''),
  );
  if (relevant.length > LIMITS.commandRecords)
    reasons.push('RECORD_LIMIT_REACHED');
  const commandElements = relevant.slice(0, LIMITS.commandRecords);
  const commands: RectangleCommandRecord[] = commandElements.map((element) => {
    const eligibility = inspectEligibility(element);
    if (eligibility.ancestorLimitReached)
      reasons.push('ANCESTOR_LIMIT_REACHED');
    return {
      commandId: element.getAttribute('command-id') as AllowlistedCommandId,
      tag: safeTag(element),
      location: locationOf(element),
      visibility: eligibility.visibility,
      enabled: eligibility.enabled,
      hitTest: eligibility.hitTest,
      eligibility: eligibility.eligibility,
      active: element.classList.contains('is-active') ? 'TRUE' : 'FALSE',
    };
  });
  const arrows: HTMLElement[] = [];
  const seenArrows = new Set<Element>();
  for (const toolbar of toolbars) {
    const collection = toolbar.getElementsByClassName('dropdown-arrow');
    const remaining = LIMITS.arrowRecords - arrows.length;
    if (collection.length > remaining) reasons.push('ARROW_LIMIT_REACHED');
    for (
      let index = 0;
      index < collection.length && index < remaining;
      index++
    ) {
      const arrow = collection.item(index);
      if (arrow instanceof HTMLElement && !seenArrows.has(arrow)) {
        seenArrows.add(arrow);
        arrows.push(arrow);
      }
    }
  }
  const arrowDetails = arrows.map((element) => {
    const group = element.parentElement;
    const count = group?.children.length ?? 0;
    const direct = group
      ? [...Array(Math.min(count, 32)).keys()]
          .map((index) => group.children.item(index)!)
          .filter((child) => child.hasAttribute('command-id'))
      : [];
    const known = direct.filter((child) =>
      isAllowlistedCommandId(child.getAttribute('command-id') ?? ''),
    );
    const face = count <= 32 && known.length === 1 ? known[0]! : null;
    const arrowState = inspectEligibility(element);
    if (arrowState.ancestorLimitReached) reasons.push('ANCESTOR_LIMIT_REACHED');
    const groupCommands = [...candidates].filter((candidate) =>
      group?.contains(candidate),
    );
    const groupFaces = groupCommands.filter(
      (candidate) => !candidate.closest('.os-tool-dropdown-content'),
    ).length;
    const actionable = [...actionables].filter((control) =>
      group?.contains(control),
    );
    const competingControls = actionable.filter(
      (control) =>
        !control.closest('.os-tool-dropdown-content') &&
        !face?.contains(control) &&
        control !== element &&
        !element.contains(control),
    ).length;
    const groupArrows =
      group?.getElementsByClassName('dropdown-arrow').length ?? 0;
    const rectangleFace =
      face &&
      RECTANGLE_COMMAND_IDS.has(
        face.getAttribute('command-id') as AllowlistedCommandId,
      );
    const faceState = face ? inspectEligibility(face) : null;
    const a = element.getBoundingClientRect();
    const g = group?.getBoundingClientRect();
    const f = face?.getBoundingClientRect();
    const contains = (outer: DOMRect, inner: DOMRect) =>
      outer.width > 0 &&
      outer.height > 0 &&
      inner.width > 0 &&
      inner.height > 0 &&
      inner.left >= outer.left &&
      inner.top >= outer.top &&
      inner.right <= outer.right &&
      inner.bottom <= outer.bottom;
    const measured =
      g &&
      f &&
      contains(g, a) &&
      contains(g, f) &&
      (a.right <= f.left ||
        f.right <= a.left ||
        a.bottom <= f.top ||
        f.bottom <= a.top);
    const relativeBounds = measured
      ? {
          x: Math.round((a.left - g.left) * 10) / 10,
          y: Math.round((a.top - g.top) * 10) / 10,
          width: Math.round(a.width * 10) / 10,
          height: Math.round(a.height * 10) / 10,
        }
      : null;
    let assessment: NonNullable<RectangleArrowOwnershipRecord['assessment']> =
      'NOT_ESTABLISHED';
    if (
      count > 32 ||
      coverageTruncated ||
      toolbarMatches.truncated ||
      menuMatches.truncated
    )
      assessment = 'UNKNOWN';
    else if (groupArrows > 1 || groupFaces > 1 || competingControls > 0)
      assessment = 'AMBIGUOUS';
    else if (
      rectangleFace &&
      group &&
      !toolbars.includes(group) &&
      groupFaces === 1 &&
      groupArrows === 1 &&
      relativeBounds &&
      arrowState.visibility === 'VISIBLE' &&
      arrowState.enabled === 'ENABLED' &&
      faceState?.visibility === 'VISIBLE' &&
      faceState.enabled === 'ENABLED'
    )
      assessment = 'LOCAL_CANDIDATE';
    const record: RectangleArrowOwnershipRecord = {
      faceCommandId: face
        ? (face.getAttribute('command-id') as AllowlistedCommandId)
        : null,
      arrowRelation:
        count > 32 || known.length > 1
          ? 'AMBIGUOUS'
          : known.length === 1
            ? 'SAME_PARENT'
            : 'NONE',
      visibleArrowCount: arrowState.visibility === 'VISIBLE' ? 1 : 0,
      parentChildCount: cappedCount(count, 32),
      parentChildCountCapped: count > 32,
      assessment,
      visibility: arrowState.visibility,
      enabled: arrowState.enabled,
      eligibility: arrowState.eligibility,
      relativeBounds,
      menuAssociation: 'NOT_ESTABLISHED',
      competingControls: cappedCount(competingControls, 32),
    };
    return { element, group, face, record };
  });
  const localCandidates = arrowDetails.filter(
    (item) => item.record.assessment === 'LOCAL_CANDIDATE',
  );
  if (localCandidates.length > 1)
    for (const item of localCandidates) item.record.assessment = 'AMBIGUOUS';
  const coverageComplete =
    toolbars.length > 0 &&
    !toolbarMatches.truncated &&
    !menuMatches.truncated &&
    !coverageTruncated;
  const incomplete = reasons.length > 0 || !coverageComplete;
  const rectangleCommands = commands.filter((item) =>
    RECTANGLE_COMMAND_IDS.has(item.commandId),
  );
  const usable = rectangleCommands.filter(
    (item) =>
      item.location === 'TOOLBAR' &&
      item.visibility === 'VISIBLE' &&
      item.enabled === 'ENABLED',
  );
  const duplicate = rectangleCommands.some((item, index) =>
    rectangleCommands.some(
      (other, j) =>
        index !== j &&
        item.commandId === other.commandId &&
        item.location === other.location,
    ),
  );
  const identity: Identity = incomplete
    ? 'UNKNOWN'
    : duplicate || usable.length > 1
      ? 'AMBIGUOUS'
      : usable.length === 1
        ? 'OBSERVED'
        : 'MISSING';
  const sketchClue = clueFor(commands, 'LINESEGMENT', incomplete);
  const extrudeClue = clueFor(commands, 'extrude', incomplete);
  const snapshot: RectangleCommandMetadataSnapshot = {
    ownerReportedState,
    observationGeneration: Math.max(1, Math.trunc(observationGeneration)),
    toolbarMarkers: cappedCount(toolbarMatches.total, LIMITS.regions),
    arrowMarkers: arrows.length,
    menuMarkers: cappedCount(menuMatches.total, LIMITS.regions),
    menuPlacement:
      menus.length === 0
        ? 'NOT_OBSERVED'
        : menus.every((menu) => Boolean(menu.closest('.os-element-toolbar')))
          ? 'NESTED_IN_TOOLBAR'
          : 'PORTALED',
    sketchClue,
    extrudeClue,
    identity,
    activeSketchState: 'UNKNOWN',
    interaction: {
      origin: 'NOT_OBSERVED',
      menuAssociation: 'NOT_OBSERVED',
      outcome: 'SNAPSHOT',
      observationLimitReached: false,
    },
    contextReason:
      page.pageSupport === 'UNSUPPORTED' || page.editability === 'READ_ONLY'
        ? 'PAGE_RESTRICTED'
        : incomplete
          ? 'INCOMPLETE_OBSERVATION'
          : sketchClue === 'PRESENT' &&
              commands.some(
                (item) =>
                  item.commandId === 'extrude' &&
                  item.active === 'TRUE' &&
                  item.visibility === 'VISIBLE',
              )
            ? 'CONFLICTING_COMMAND_CLUES'
            : 'COMMAND_CLUES_ONLY',
    pageSupport: page.pageSupport,
    editability: page.editability,
    commands,
    ownership: arrowDetails.map((item) => item.record),
    scan: {
      status: incomplete ? 'INCOMPLETE' : 'COMPLETE',
      scannedElements: candidates.size,
      regionElementsVisited,
      inspection:
        reasons.includes('RECORD_LIMIT_REACHED') ||
        reasons.includes('ANCESTOR_LIMIT_REACHED')
          ? 'INCOMPLETE'
          : 'COMPLETE',
      relevantRegionCoverage: coverageComplete ? 'COMPLETE' : 'UNKNOWN',
      discoveryWork: 'NATIVE_SELECTOR_ENGINE_NOT_HARD_BOUNDED',
      unallowlistedCommandIds,
      unallowlistedCountCapped: coverageTruncated,
      reasons: [...new Set(reasons)],
    },
  };
  return { snapshot, arrowDetails, menus, commandElements };
}

export function captureRectangleCommandMetadata(
  root: Document,
  ownerReportedState: RectangleCommandCaptureState,
  observationGeneration: number,
  page?: RectangleMetadataPageEvidence,
): RectangleCommandMetadataSnapshot {
  return inspectMetadata(root, ownerReportedState, observationGeneration, page)
    .snapshot;
}

const MENU_CAPTURE_TIMEOUT_MS = 20_000;
const MENU_INSPECTION_INTERVAL_MS = 50;
const MAX_TRANSITION_INSPECTIONS = 20;

function eventComesFromLeqad(event: Event): boolean {
  return event
    .composedPath()
    .some(
      (target) =>
        target instanceof Element &&
        (target.localName.startsWith('leqad-') ||
          target.matches('[data-leqad-root], [data-leqad-highlight]')),
    );
}

/** One owner input; read-only observations. No handler cancels or reproduces input. */
export function createRectangleMenuMetadataCapture(
  root: Document,
  observationGeneration: number,
  timeoutMs = MENU_CAPTURE_TIMEOUT_MS,
  page?: RectangleMetadataPageEvidence,
): RectangleMenuMetadataCaptureTask {
  let active = true;
  let listening = false;
  let observer: MutationObserver | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let scheduled: ReturnType<typeof setTimeout> | undefined;
  let resolveResult!: (result: RectangleMenuMetadataCaptureResult) => void;
  let inspections = 0;
  let origin: RectangleMetadataInteraction['origin'] = 'NOT_OBSERVED';
  let clicked:
    ReturnType<typeof inspectMetadata>['arrowDetails'][number] | undefined;
  let clickedCommand: string | null = null;
  let baseline = new Map<Element, string>();
  const promise = new Promise<RectangleMenuMetadataCaptureResult>((resolve) => {
    resolveResult = resolve;
  });
  const inspect = () =>
    inspectMetadata(root, 'RECTANGLE_MENU_OPEN', observationGeneration, page);
  const menuSignature = (
    menu: Element,
    current: ReturnType<typeof inspectMetadata>,
  ) => {
    const visibility =
      createMetadataEligibilityInspector(root)(menu).visibility;
    return (
      visibility +
      ':' +
      current.commandElements
        .map((element, index) =>
          menu.contains(element)
            ? current.snapshot.commands[index]!.commandId +
              ':' +
              current.snapshot.commands[index]!.visibility
            : '',
        )
        .filter(Boolean)
        .sort()
        .join('|')
    );
  };
  const removeInput = () => {
    if (!listening) return;
    root.removeEventListener('pointerdown', onInput, true);
    listening = false;
  };
  const finish = (
    status: RectangleMenuMetadataCaptureStatus,
    current?: ReturnType<typeof inspectMetadata>,
  ) => {
    if (!active) return;
    current ??= inspect();
    active = false;
    removeInput();
    observer?.disconnect();
    observer = null;
    if (timeout !== undefined) clearTimeout(timeout);
    if (scheduled !== undefined) clearTimeout(scheduled);
    root.defaultView?.removeEventListener('pagehide', cancel);
    root.removeEventListener('visibilitychange', onVisibility);
    const eligibility = createMetadataEligibilityInspector(root);
    const changed = current.menus.filter((menu) => {
      const signature = menuSignature(menu, current);
      return (
        signature !== baseline.get(menu) &&
        current.commandElements.some(
          (element, index) =>
            menu.contains(element) &&
            RECTANGLE_COMMAND_IDS.has(
              current.snapshot.commands[index]!.commandId,
            ) &&
            current.snapshot.commands[index]!.visibility === 'VISIBLE',
        )
      );
    });
    const anyVisibleMenu = current.menus.some(
      (menu) => eligibility(menu).visibility === 'VISIBLE',
    );
    let association: RectangleMetadataInteraction['menuAssociation'] =
      anyVisibleMenu ? 'UNOWNED' : 'NOT_OBSERVED';
    if (changed.length > 1) association = 'AMBIGUOUS';
    else if (changed.length === 1) {
      if (origin !== 'RECTANGLE_ARROW_CANDIDATE') association = 'UNOWNED';
      else {
        const stillCurrent =
          current.snapshot.identity === 'OBSERVED' &&
          current.snapshot.scan.relevantRegionCoverage === 'COMPLETE' &&
          current.snapshot.scan.status === 'COMPLETE' &&
          clicked &&
          clicked.element.isConnected &&
          clicked.group?.isConnected &&
          clicked.face?.isConnected &&
          clicked.element.parentElement === clicked.group &&
          clicked.face.parentElement === clicked.group &&
          clicked.face.getAttribute('command-id') === clickedCommand &&
          current.arrowDetails.some(
            (item) =>
              item.element === clicked!.element &&
              item.record.assessment === 'LOCAL_CANDIDATE',
          );
        association =
          stillCurrent && clicked!.group!.contains(changed[0]!)
            ? 'LOCAL_TRANSITION_CANDIDATE'
            : 'UNKNOWN';
      }
    }
    if (inspections >= MAX_TRANSITION_INSPECTIONS) association = 'UNKNOWN';
    current.snapshot.interaction = {
      origin,
      menuAssociation: association,
      outcome: status,
      observationLimitReached: inspections >= MAX_TRANSITION_INSPECTIONS,
    };
    resolveResult({ status, snapshot: current.snapshot });
  };
  function cancel() {
    finish('CANCELLED');
  }
  function onVisibility() {
    if (root.hidden) cancel();
  }
  const inspectTransition = () => {
    scheduled = undefined;
    if (!active) return;
    inspections++;
    const current = inspect();
    const changedRelevantMenu = current.menus.some(
      (menu) =>
        menuSignature(menu, current) !== baseline.get(menu) &&
        current.commandElements.some(
          (element, index) =>
            menu.contains(element) &&
            RECTANGLE_COMMAND_IDS.has(
              current.snapshot.commands[index]!.commandId,
            ) &&
            current.snapshot.commands[index]!.visibility === 'VISIBLE',
        ),
    );
    if (changedRelevantMenu) finish('CAPTURED', current);
    else if (inspections >= MAX_TRANSITION_INSPECTIONS) observer?.disconnect();
  };
  function onInput(event: Event) {
    if (!active || eventComesFromLeqad(event)) return;
    removeInput();
    const before = inspect();
    baseline = new Map(
      before.menus.map((menu) => [menu, menuSignature(menu, before)]),
    );
    const path = event.composedPath();
    const matches = before.arrowDetails.filter((item) =>
      path.includes(item.element),
    );
    clicked = matches.length === 1 ? matches[0] : undefined;
    clickedCommand = clicked?.face?.getAttribute('command-id') ?? null;
    origin =
      matches.length === 0
        ? 'OTHER'
        : clicked?.record.assessment === 'LOCAL_CANDIDATE' &&
            before.snapshot.identity === 'OBSERVED' &&
            before.snapshot.contextReason !== 'PAGE_RESTRICTED'
          ? 'RECTANGLE_ARROW_CANDIDATE'
          : 'UNKNOWN';
    const Observer = root.defaultView?.MutationObserver;
    if (Observer && root.documentElement) {
      observer = new Observer(() => {
        if (
          !active ||
          scheduled !== undefined ||
          inspections >= MAX_TRANSITION_INSPECTIONS
        )
          return;
        scheduled = setTimeout(inspectTransition, MENU_INSPECTION_INTERVAL_MS);
      });
      observer.observe(root.documentElement, {
        subtree: true,
        childList: true,
        attributes: true,
        attributeFilter: [
          'class',
          'command-id',
          'hidden',
          'style',
          'aria-hidden',
          'aria-disabled',
          'disabled',
          'inert',
        ],
      });
    }
    scheduled = setTimeout(inspectTransition, MENU_INSPECTION_INTERVAL_MS);
  }
  queueMicrotask(() => {
    if (!active) return;
    root.addEventListener('pointerdown', onInput, true);
    listening = true;
    root.defaultView?.addEventListener('pagehide', cancel, { once: true });
    root.addEventListener('visibilitychange', onVisibility);
    const bounded = Number.isFinite(timeoutMs)
      ? Math.max(1, Math.min(MENU_CAPTURE_TIMEOUT_MS, Math.trunc(timeoutMs)))
      : MENU_CAPTURE_TIMEOUT_MS;
    timeout = setTimeout(() => finish('TIMED_OUT'), bounded);
  });
  return { promise, cancel, isActive: () => active };
}

export function createRectangleCommandMetadataReport(
  snapshots: readonly RectangleCommandMetadataSnapshot[],
): RectangleCommandMetadataReport {
  return {
    version: RECTANGLE_COMMAND_METADATA_VERSION,
    observationClaim: 'OWNER_REPORTED_STATE_WITH_DOM_OBSERVATIONS',
    productionRecognition: 'NOT_RUN',
    permissionEvidence: 'NOT_INSPECTED',
    geometryVerification: 'NOT_RUN',
    snapshots: snapshots.slice(0, 4),
  };
}

function safeEnum<T extends string>(
  value: unknown,
  allowed: readonly T[],
  fallback: T,
): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}
function safeBounds(bounds: RectangleArrowOwnershipRecord['relativeBounds']) {
  if (
    !bounds ||
    ![bounds.x, bounds.y, bounds.width, bounds.height].every(
      (value) => Number.isFinite(value) && Math.abs(value) <= 4096,
    ) ||
    bounds.width <= 0 ||
    bounds.height <= 0
  )
    return null;
  return {
    x: bounds.x,
    y: bounds.y,
    width: bounds.width,
    height: bounds.height,
  };
}

export function serializeRectangleCommandMetadataReport(
  report: RectangleCommandMetadataReport,
): string {
  const states: readonly RectangleCommandCaptureState[] = [
    'SKETCH_EDITING',
    'RECTANGLE_MENU_OPEN',
    'OTHER_RECTANGLE_VARIANT',
    'EXTRUDE_EDITING',
  ];
  const isState = (value: unknown): value is RectangleCommandCaptureState =>
    states.includes(value as RectangleCommandCaptureState);
  const safe = createRectangleCommandMetadataReport(
    report.snapshots
      .filter((snapshot) => isState(snapshot.ownerReportedState))
      .map((snapshot) => ({
        ownerReportedState: snapshot.ownerReportedState,
        observationGeneration: Math.max(
          1,
          Math.min(4, Math.trunc(snapshot.observationGeneration)),
        ),
        toolbarMarkers: cappedCount(snapshot.toolbarMarkers, LIMITS.regions),
        arrowMarkers: cappedCount(snapshot.arrowMarkers, LIMITS.arrowRecords),
        menuMarkers: cappedCount(snapshot.menuMarkers, LIMITS.regions),
        menuPlacement: [
          'NESTED_IN_TOOLBAR',
          'PORTALED',
          'NOT_OBSERVED',
        ].includes(snapshot.menuPlacement)
          ? snapshot.menuPlacement
          : 'NOT_OBSERVED',
        sketchClue: ['PRESENT', 'ABSENT', 'AMBIGUOUS', 'UNKNOWN'].includes(
          snapshot.sketchClue,
        )
          ? snapshot.sketchClue
          : 'UNKNOWN',
        extrudeClue: ['PRESENT', 'ABSENT', 'AMBIGUOUS', 'UNKNOWN'].includes(
          snapshot.extrudeClue,
        )
          ? snapshot.extrudeClue
          : 'UNKNOWN',
        activeSketchState: 'UNKNOWN',
        contextReason: safeEnum(
          snapshot.contextReason,
          [
            'COMMAND_CLUES_ONLY',
            'CONFLICTING_COMMAND_CLUES',
            'INCOMPLETE_OBSERVATION',
            'PAGE_RESTRICTED',
          ],
          'INCOMPLETE_OBSERVATION',
        ),
        pageSupport: safeEnum(
          snapshot.pageSupport,
          ['SUPPORTED_PART_STUDIO', 'UNSUPPORTED', 'UNKNOWN'],
          'UNKNOWN',
        ),
        editability: safeEnum(
          snapshot.editability,
          ['READ_ONLY', 'EDITABLE', 'UNKNOWN'],
          'UNKNOWN',
        ),
        interaction: {
          origin: safeEnum(
            snapshot.interaction?.origin,
            ['NOT_OBSERVED', 'RECTANGLE_ARROW_CANDIDATE', 'OTHER', 'UNKNOWN'],
            'UNKNOWN',
          ),
          menuAssociation: safeEnum(
            snapshot.interaction?.menuAssociation,
            [
              'NOT_OBSERVED',
              'LOCAL_TRANSITION_CANDIDATE',
              'UNOWNED',
              'AMBIGUOUS',
              'UNKNOWN',
            ],
            'UNKNOWN',
          ),
          outcome: safeEnum(
            snapshot.interaction?.outcome,
            ['SNAPSHOT', 'CAPTURED', 'TIMED_OUT', 'CANCELLED'],
            'SNAPSHOT',
          ),
          observationLimitReached:
            snapshot.interaction?.observationLimitReached === true,
        },
        identity: ['OBSERVED', 'MISSING', 'AMBIGUOUS', 'UNKNOWN'].includes(
          snapshot.identity,
        )
          ? snapshot.identity
          : 'UNKNOWN',
        commands: snapshot.commands
          .filter((command) => isAllowlistedCommandId(command.commandId))
          .slice(0, LIMITS.commandRecords)
          .map((command) => ({
            commandId: command.commandId,
            tag: ['button', 'div', 'span', 'other'].includes(command.tag)
              ? command.tag
              : 'other',
            location: ['TOOLBAR', 'MENU', 'OTHER'].includes(command.location)
              ? command.location
              : 'OTHER',
            visibility: [
              'VISIBLE',
              'HIDDEN',
              'ZERO_SIZE',
              'OFFSCREEN',
              'CLIPPED',
              'UNKNOWN',
            ].includes(command.visibility)
              ? command.visibility
              : 'UNKNOWN',
            enabled: ['ENABLED', 'DISABLED', 'UNKNOWN'].includes(
              command.enabled,
            )
              ? command.enabled
              : 'UNKNOWN',
            active: command.active === 'TRUE' ? 'TRUE' : 'FALSE',
            eligibility: safeEnum(
              command.eligibility,
              ['ELIGIBLE', 'REJECTED', 'UNKNOWN'],
              'UNKNOWN',
            ),
            hitTest: safeEnum(
              command.hitTest,
              ['TARGET', 'OTHER', 'UNKNOWN'],
              'UNKNOWN',
            ),
          })),
        ownership: snapshot.ownership
          .slice(0, LIMITS.arrowRecords)
          .map((relationship) => ({
            faceCommandId:
              relationship.faceCommandId !== null &&
              isAllowlistedCommandId(relationship.faceCommandId)
                ? relationship.faceCommandId
                : null,
            arrowRelation: ['SAME_PARENT', 'NONE', 'AMBIGUOUS'].includes(
              relationship.arrowRelation,
            )
              ? relationship.arrowRelation
              : 'NONE',
            visibleArrowCount: relationship.visibleArrowCount === 1 ? 1 : 0,
            parentChildCount: cappedCount(relationship.parentChildCount, 32),
            parentChildCountCapped: Boolean(
              relationship.parentChildCountCapped,
            ),
            assessment: safeEnum(
              relationship.assessment,
              ['LOCAL_CANDIDATE', 'AMBIGUOUS', 'NOT_ESTABLISHED', 'UNKNOWN'],
              'UNKNOWN',
            ),
            visibility: safeEnum(
              relationship.visibility,
              [
                'VISIBLE',
                'HIDDEN',
                'ZERO_SIZE',
                'OFFSCREEN',
                'CLIPPED',
                'UNKNOWN',
              ],
              'UNKNOWN',
            ),
            enabled: safeEnum(
              relationship.enabled,
              ['ENABLED', 'DISABLED', 'UNKNOWN'],
              'UNKNOWN',
            ),
            eligibility: safeEnum(
              relationship.eligibility,
              ['ELIGIBLE', 'REJECTED', 'UNKNOWN'],
              'UNKNOWN',
            ),
            relativeBounds: safeBounds(relationship.relativeBounds),
            menuAssociation: 'NOT_ESTABLISHED',
            competingControls: cappedCount(
              relationship.competingControls ?? 0,
              32,
            ),
          })),
        scan: {
          inspection:
            snapshot.scan.inspection === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE',
          relevantRegionCoverage:
            snapshot.scan.relevantRegionCoverage === 'COMPLETE'
              ? 'COMPLETE'
              : 'UNKNOWN',
          discoveryWork: 'NATIVE_SELECTOR_ENGINE_NOT_HARD_BOUNDED',
          status:
            snapshot.scan.status === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE',
          regionElementsVisited: cappedCount(
            snapshot.scan.regionElementsVisited,
            LIMITS.regionElements,
          ),
          scannedElements: cappedCount(
            snapshot.scan.scannedElements,
            LIMITS.inspectedCommandElements,
          ),
          unallowlistedCommandIds: cappedCount(
            snapshot.scan.unallowlistedCommandIds,
            LIMITS.inspectedCommandElements,
          ),
          unallowlistedCountCapped: Boolean(
            snapshot.scan.unallowlistedCountCapped,
          ),
          reasons: snapshot.scan.reasons
            .filter((reason) =>
              [
                'REGION_LIMIT_REACHED',
                'REGION_TRAVERSAL_LIMIT_REACHED',
                'COMMAND_LIMIT_REACHED',
                'RECORD_LIMIT_REACHED',
                'ARROW_LIMIT_REACHED',
                'ANCESTOR_LIMIT_REACHED',
              ].includes(reason),
            )
            .slice(0, 6),
        },
      })),
  );
  return JSON.stringify(safe);
}
