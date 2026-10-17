export const RECTANGLE_COMMAND_METADATA_VERSION =
  'leqad-rectangle-command-metadata/1' as const;

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
type Visibility = 'VISIBLE' | 'HIDDEN' | 'ZERO_SIZE' | 'UNKNOWN';
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
}

export interface RectangleArrowOwnershipRecord {
  faceCommandId: AllowlistedCommandId | null;
  arrowRelation: ArrowRelation;
  visibleArrowCount: number;
  parentChildCount: number;
  parentChildCountCapped: boolean;
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
  commands: RectangleCommandRecord[];
  ownership: RectangleArrowOwnershipRecord[];
  scan: {
    status: 'COMPLETE' | 'INCOMPLETE';
    scannedElements: number;
    unallowlistedCommandIds: number;
    unallowlistedCountCapped: boolean;
    reasons: Array<
      | 'REGION_LIMIT_REACHED'
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

const ANCESTOR_LIMIT = 16;

function visibility(element: Element): {
  state: Visibility;
  ancestorLimitReached: boolean;
} {
  if (!element.isConnected)
    return { state: 'UNKNOWN', ancestorLimitReached: false };
  let current: Element | null = element;
  for (let depth = 0; current && depth < ANCESTOR_LIMIT; depth += 1) {
    if (
      (current instanceof HTMLElement && current.hidden) ||
      current.getAttribute('aria-hidden') === 'true' ||
      current.ownerDocument.defaultView?.getComputedStyle(current).display ===
        'none' ||
      current.ownerDocument.defaultView?.getComputedStyle(current)
        .visibility === 'hidden'
    )
      return { state: 'HIDDEN', ancestorLimitReached: false };
    current = current.parentElement;
  }
  if (current) return { state: 'UNKNOWN', ancestorLimitReached: true };
  const rect = element.getBoundingClientRect();
  return {
    state: rect.width > 0 && rect.height > 0 ? 'VISIBLE' : 'ZERO_SIZE',
    ancestorLimitReached: false,
  };
}

function enabled(element: Element): {
  state: Enabled;
  ancestorLimitReached: boolean;
} {
  let current: Element | null = element;
  for (let depth = 0; current && depth < ANCESTOR_LIMIT; depth += 1) {
    if (
      current.getAttribute('aria-disabled') === 'true' ||
      current.classList.contains('disabled') ||
      (current instanceof HTMLElement &&
        'disabled' in current &&
        Boolean((current as HTMLButtonElement).disabled))
    )
      return { state: 'DISABLED', ancestorLimitReached: false };
    current = current.parentElement;
  }
  return current
    ? { state: 'UNKNOWN', ancestorLimitReached: true }
    : { state: 'ENABLED', ancestorLimitReached: false };
}

function locationOf(element: Element): CommandLocation {
  if (element.closest('.os-tool-dropdown-content')) return 'MENU';
  if (element.closest('.os-element-toolbar')) return 'TOOLBAR';
  return 'OTHER';
}

function commandRecord(
  element: Element,
  commandId: AllowlistedCommandId,
): { record: RectangleCommandRecord; ancestorLimitReached: boolean } {
  const visible = visibility(element);
  const available = enabled(element);
  return {
    record: {
      commandId,
      tag: safeTag(element),
      location: locationOf(element),
      visibility: visible.state,
      enabled: available.state,
      active: element.classList.contains('is-active') ? 'TRUE' : 'FALSE',
    },
    ancestorLimitReached:
      visible.ancestorLimitReached || available.ancestorLimitReached,
  };
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
  return Math.min(value, maximum + 1);
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

export function captureRectangleCommandMetadata(
  root: Document,
  ownerReportedState: RectangleCommandCaptureState,
  observationGeneration: number,
): RectangleCommandMetadataSnapshot {
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
  if (toolbarMatches.truncated || menuMatches.truncated)
    reasons.push('REGION_LIMIT_REACHED');

  let scannedElements = 0;
  let unallowlistedCommandIds = 0;
  let unallowlistedCountCapped = false;
  const inspectedElements = new Set<Element>();
  const recordedCommandElements = new Set<Element>();
  const commands: RectangleCommandRecord[] = [];
  const recordCommand = (element: Element, commandId: AllowlistedCommandId) => {
    if (recordedCommandElements.has(element)) return;
    if (commands.length >= LIMITS.commandRecords) {
      reasons.push('RECORD_LIMIT_REACHED');
      return;
    }
    recordedCommandElements.add(element);
    const inspected = commandRecord(element, commandId);
    commands.push(inspected.record);
    if (inspected.ancestorLimitReached) reasons.push('ANCESTOR_LIMIT_REACHED');
  };

  // Ask the DOM for at most one exact match per allowlisted identity first.
  // This keeps relevant evidence from being displaced by unrelated controls
  // without materializing an unbounded document-wide match list.
  for (const commandId of ALLOWLISTED_COMMAND_IDS) {
    const first = root.querySelector(`[command-id="${commandId}"]`);
    if (first) recordCommand(first, commandId);
  }

  let inspectionStopped = false;
  for (const region of regions) {
    const walker = root.createTreeWalker(region, NodeFilter.SHOW_ELEMENT);
    let node = walker.nextNode();
    while (node) {
      if (node instanceof Element && !inspectedElements.has(node)) {
        if (scannedElements >= LIMITS.inspectedCommandElements) {
          inspectionStopped = true;
          break;
        }
        inspectedElements.add(node);
        scannedElements += 1;
        if (node.hasAttribute('command-id')) {
          const commandId = node.getAttribute('command-id') ?? '';
          if (isAllowlistedCommandId(commandId)) recordCommand(node, commandId);
          else unallowlistedCommandIds += 1;
        }
      }
      node = walker.nextNode();
    }
    if (inspectionStopped) break;
  }
  if (inspectionStopped) {
    unallowlistedCountCapped = true;
    reasons.push('COMMAND_LIMIT_REACHED');
  }

  const arrows: HTMLElement[] = [];
  const seenArrows = new Set<Element>();
  for (const toolbar of toolbars) {
    const collection = toolbar.getElementsByClassName('dropdown-arrow');
    const remaining = LIMITS.arrowRecords - arrows.length;
    if (collection.length > remaining) reasons.push('ARROW_LIMIT_REACHED');
    for (
      let index = 0;
      index < collection.length && index < remaining;
      index += 1
    ) {
      const arrow = collection.item(index);
      if (!(arrow instanceof HTMLElement) || seenArrows.has(arrow)) continue;
      seenArrows.add(arrow);
      arrows.push(arrow);
    }
  }
  const ownership = arrows.map((arrow) => {
    const parent = arrow.parentElement;
    const commandChildren: HTMLElement[] = [];
    const parentChildCount = parent?.children.length ?? 0;
    for (
      let index = 0;
      parent && index < parent.children.length && index <= 32;
      index += 1
    ) {
      const child = parent.children.item(index);
      if (child instanceof HTMLElement && child.hasAttribute('command-id'))
        commandChildren.push(child);
    }
    const knownFaces = commandChildren
      .map((child) => child.getAttribute('command-id') ?? '')
      .filter(isAllowlistedCommandId);
    const relation: ArrowRelation =
      parentChildCount > 32
        ? 'AMBIGUOUS'
        : knownFaces.length === 1
          ? 'SAME_PARENT'
          : knownFaces.length > 1
            ? 'AMBIGUOUS'
            : 'NONE';
    const arrowVisibility = visibility(arrow);
    if (arrowVisibility.ancestorLimitReached)
      reasons.push('ANCESTOR_LIMIT_REACHED');
    return {
      faceCommandId:
        parentChildCount <= 32 && knownFaces.length === 1
          ? knownFaces[0]!
          : null,
      arrowRelation: relation,
      visibleArrowCount: arrowVisibility.state === 'VISIBLE' ? 1 : 0,
      parentChildCount: cappedCount(parentChildCount, 32),
      parentChildCountCapped: parentChildCount > 32,
    };
  });

  const incomplete = reasons.length > 0;
  const usableRectangleCommands = commands.filter(
    (record) =>
      RECTANGLE_COMMAND_IDS.has(record.commandId) &&
      record.location === 'TOOLBAR' &&
      record.visibility === 'VISIBLE' &&
      record.enabled === 'ENABLED',
  );
  const rectangleCommands = commands.filter((record) =>
    RECTANGLE_COMMAND_IDS.has(record.commandId),
  );
  const duplicateRectangleIdentity = rectangleCommands.some((record, index) =>
    rectangleCommands.some(
      (candidate, candidateIndex) =>
        candidateIndex !== index &&
        candidate.commandId === record.commandId &&
        candidate.location === record.location,
    ),
  );
  const identity: Identity = incomplete
    ? 'UNKNOWN'
    : duplicateRectangleIdentity || usableRectangleCommands.length > 1
      ? 'AMBIGUOUS'
      : usableRectangleCommands.length === 1
        ? 'OBSERVED'
        : 'MISSING';
  const nestedMenu = menus.some((menu) =>
    Boolean(menu.closest('.os-element-toolbar')),
  );

  return {
    ownerReportedState,
    observationGeneration: Math.max(1, Math.trunc(observationGeneration)),
    toolbarMarkers: cappedCount(toolbarMatches.total, LIMITS.regions),
    arrowMarkers: cappedCount(arrows.length, LIMITS.arrowRecords),
    menuMarkers: cappedCount(menuMatches.total, LIMITS.regions),
    menuPlacement:
      menus.length === 0
        ? 'NOT_OBSERVED'
        : nestedMenu
          ? 'NESTED_IN_TOOLBAR'
          : 'PORTALED',
    sketchClue: clueFor(commands, 'LINESEGMENT', incomplete),
    extrudeClue: clueFor(commands, 'extrude', incomplete),
    identity,
    commands,
    ownership,
    scan: {
      status: incomplete ? 'INCOMPLETE' : 'COMPLETE',
      scannedElements,
      unallowlistedCommandIds: cappedCount(
        unallowlistedCommandIds,
        LIMITS.inspectedCommandElements,
      ),
      unallowlistedCountCapped,
      reasons: [...new Set(reasons)],
    },
  };
}

const MENU_CAPTURE_TIMEOUT_MS = 20_000;
const POST_INTERACTION_SETTLE_MS = 500;

function eventComesFromLeqad(event: Event): boolean {
  return event.composedPath().some((target) => {
    if (!(target instanceof Element)) return false;
    return (
      target.localName.startsWith('leqad-') ||
      target.matches('[data-leqad-root], [data-leqad-highlight]')
    );
  });
}

/**
 * Arms a single read-only observation before the owner opens the Rectangle
 * dropdown. The owner click is never cancelled or reproduced by Leqad.
 */
export function createRectangleMenuMetadataCapture(
  root: Document,
  observationGeneration: number,
  timeoutMs = MENU_CAPTURE_TIMEOUT_MS,
): RectangleMenuMetadataCaptureTask {
  const view = root.defaultView;
  const boundedTimeout = Math.max(
    1,
    Math.min(MENU_CAPTURE_TIMEOUT_MS, Math.trunc(timeoutMs)),
  );
  let active = true;
  let listenerInstalled = false;
  let observer: MutationObserver | null = null;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  let settleTimeout: ReturnType<typeof setTimeout> | undefined;
  let resolveResult!: (result: RectangleMenuMetadataCaptureResult) => void;

  const promise = new Promise<RectangleMenuMetadataCaptureResult>((resolve) => {
    resolveResult = resolve;
  });

  const removeListener = () => {
    if (!listenerInstalled) return;
    root.removeEventListener('pointerdown', onPointerDown, true);
    listenerInstalled = false;
  };

  const finish = (status: RectangleMenuMetadataCaptureStatus) => {
    if (!active) return;
    active = false;
    removeListener();
    observer?.disconnect();
    observer = null;
    if (timeout !== undefined) clearTimeout(timeout);
    if (settleTimeout !== undefined) clearTimeout(settleTimeout);
    resolveResult({
      status,
      snapshot: captureRectangleCommandMetadata(
        root,
        'RECTANGLE_MENU_OPEN',
        observationGeneration,
      ),
    });
  };

  const captureIfMenuObserved = () => {
    if (!active) return false;
    const snapshot = captureRectangleCommandMetadata(
      root,
      'RECTANGLE_MENU_OPEN',
      observationGeneration,
    );
    const visibleMenuMarker = boundedClassElements(
      root,
      'os-tool-dropdown-content',
      LIMITS.regions,
    ).elements.some((menu) => visibility(menu).state === 'VISIBLE');
    const visibleMenuCommand = snapshot.commands.some(
      (command) =>
        command.location === 'MENU' && command.visibility === 'VISIBLE',
    );
    if (!visibleMenuMarker && !visibleMenuCommand) return false;
    finish('CAPTURED');
    return true;
  };

  function onPointerDown(event: Event) {
    if (!active || eventComesFromLeqad(event)) return;
    removeListener();
    const Observer = view?.MutationObserver;
    if (Observer && root.documentElement) {
      observer = new Observer(() => {
        captureIfMenuObserved();
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
        ],
      });
    }
    settleTimeout = setTimeout(
      () => finish('CAPTURED'),
      POST_INTERACTION_SETTLE_MS,
    );
  }

  // The arm action itself originates in Leqad. Deferring registration ensures
  // it cannot be mistaken for the owner's next interaction with Onshape.
  queueMicrotask(() => {
    if (!active) return;
    root.addEventListener('pointerdown', onPointerDown, true);
    listenerInstalled = true;
    timeout = setTimeout(() => finish('TIMED_OUT'), boundedTimeout);
  });

  return {
    promise,
    cancel: () => finish('CANCELLED'),
    isActive: () => active,
  };
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
            visibility: ['VISIBLE', 'HIDDEN', 'ZERO_SIZE', 'UNKNOWN'].includes(
              command.visibility,
            )
              ? command.visibility
              : 'UNKNOWN',
            enabled: ['ENABLED', 'DISABLED', 'UNKNOWN'].includes(
              command.enabled,
            )
              ? command.enabled
              : 'UNKNOWN',
            active: command.active === 'TRUE' ? 'TRUE' : 'FALSE',
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
          })),
        scan: {
          status:
            snapshot.scan.status === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE',
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
                'COMMAND_LIMIT_REACHED',
                'RECORD_LIMIT_REACHED',
                'ARROW_LIMIT_REACHED',
                'ANCESTOR_LIMIT_REACHED',
              ].includes(reason),
            )
            .slice(0, 5),
        },
      })),
  );
  return JSON.stringify(safe);
}
