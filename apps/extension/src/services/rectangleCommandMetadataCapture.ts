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

function safeTag(element: Element): RectangleCommandRecord['tag'] {
  return element.localName === 'button' ||
    element.localName === 'div' ||
    element.localName === 'span'
    ? element.localName
    : 'other';
}

const ANCESTOR_LIMIT = 16;

function visibility(element: HTMLElement): {
  state: Visibility;
  ancestorLimitReached: boolean;
} {
  if (!element.isConnected)
    return { state: 'UNKNOWN', ancestorLimitReached: false };
  let current: HTMLElement | null = element;
  for (let depth = 0; current && depth < ANCESTOR_LIMIT; depth += 1) {
    if (
      current.hidden ||
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

function enabled(element: HTMLElement): {
  state: Enabled;
  ancestorLimitReached: boolean;
} {
  let current: HTMLElement | null = element;
  for (let depth = 0; current && depth < ANCESTOR_LIMIT; depth += 1) {
    if (
      current.getAttribute('aria-disabled') === 'true' ||
      current.classList.contains('disabled') ||
      ('disabled' in current &&
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
  element: HTMLElement,
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

export function captureRectangleCommandMetadata(
  root: Document,
  ownerReportedState: RectangleCommandCaptureState,
  observationGeneration: number,
): RectangleCommandMetadataSnapshot {
  const reasons: RectangleCommandMetadataSnapshot['scan']['reasons'] = [];
  const toolbars = [
    ...root.querySelectorAll<HTMLElement>('.os-element-toolbar'),
  ];
  const menus = [
    ...root.querySelectorAll<HTMLElement>('.os-tool-dropdown-content'),
  ];
  const regions = [...toolbars, ...menus];
  if (regions.length > LIMITS.regions) reasons.push('REGION_LIMIT_REACHED');

  let scannedElements = 0;
  let unallowlistedCommandIds = 0;
  let unallowlistedCountCapped = false;
  for (const region of regions.slice(0, LIMITS.regions)) {
    const elements = region.querySelectorAll<HTMLElement>('[command-id]');
    for (const element of elements) {
      if (scannedElements >= LIMITS.inspectedCommandElements) {
        unallowlistedCountCapped = true;
        break;
      }
      scannedElements += 1;
      const commandId = element.getAttribute('command-id') ?? '';
      if (!isAllowlistedCommandId(commandId)) unallowlistedCommandIds += 1;
    }
    if (scannedElements >= LIMITS.inspectedCommandElements) break;
  }
  const regionCommandCount = regions
    .slice(0, LIMITS.regions)
    .reduce(
      (count, region) => count + region.querySelectorAll('[command-id]').length,
      0,
    );
  if (
    regionCommandCount > LIMITS.inspectedCommandElements ||
    unallowlistedCountCapped
  )
    reasons.push('COMMAND_LIMIT_REACHED');

  const commands: RectangleCommandRecord[] = [];
  for (const commandId of ALLOWLISTED_COMMAND_IDS) {
    const matches = root.querySelectorAll<HTMLElement>(
      `[command-id="${commandId}"]`,
    );
    for (const element of matches) {
      if (commands.length >= LIMITS.commandRecords) {
        reasons.push('RECORD_LIMIT_REACHED');
        break;
      }
      const inspected = commandRecord(element, commandId);
      commands.push(inspected.record);
      if (inspected.ancestorLimitReached)
        reasons.push('ANCESTOR_LIMIT_REACHED');
    }
    if (commands.length >= LIMITS.commandRecords) break;
  }

  const arrows = [
    ...new Set(
      toolbars.flatMap((toolbar) => [
        ...toolbar.querySelectorAll<HTMLElement>('.dropdown-arrow'),
      ]),
    ),
  ];
  if (arrows.length > LIMITS.arrowRecords) reasons.push('ARROW_LIMIT_REACHED');
  const ownership = arrows.slice(0, LIMITS.arrowRecords).map((arrow) => {
    const parent = arrow.parentElement;
    const commandChildren = parent
      ? [...parent.children].filter(
          (child): child is HTMLElement =>
            child instanceof HTMLElement && child.hasAttribute('command-id'),
        )
      : [];
    const knownFaces = commandChildren
      .map((child) => child.getAttribute('command-id') ?? '')
      .filter(isAllowlistedCommandId);
    const relation: ArrowRelation =
      knownFaces.length === 1
        ? 'SAME_PARENT'
        : knownFaces.length > 1
          ? 'AMBIGUOUS'
          : 'NONE';
    const arrowVisibility = visibility(arrow);
    if (arrowVisibility.ancestorLimitReached)
      reasons.push('ANCESTOR_LIMIT_REACHED');
    return {
      faceCommandId: knownFaces.length === 1 ? knownFaces[0]! : null,
      arrowRelation: relation,
      visibleArrowCount: arrowVisibility.state === 'VISIBLE' ? 1 : 0,
      parentChildCount: cappedCount(parent?.children.length ?? 0, 32),
      parentChildCountCapped: (parent?.children.length ?? 0) > 32,
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
  const duplicateRectangleIdentity = commands.some((record, index) =>
    commands.some(
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
    toolbarMarkers: cappedCount(toolbars.length, LIMITS.regions),
    arrowMarkers: cappedCount(arrows.length, LIMITS.arrowRecords),
    menuMarkers: cappedCount(menus.length, LIMITS.regions),
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
