export const CAPTURE_SCHEMA_VERSION = 1 as const;
export const MAX_CAPTURE_BYTES = 32_768;
export const MAX_OBSERVATIONS = 2;
export const MAX_CAPTURE_NODES = 180;
export const MAX_CAPTURE_EVENTS = 32;

export const SCENARIO_IDS = [
  'clean-part-studio',
  'active-sketch',
  'sketch-show',
  'top-plane',
  'rectangle-dropdown',
  'invalid-context',
  'retry-recovery',
] as const;
export type ScenarioId = (typeof SCENARIO_IDS)[number];

export const TARGET_IDS = [
  'none',
  'part-studio-tab',
  'sketch-command',
  'top-plane',
  'rectangle-tool-group',
  'rectangle-variant-candidate',
  'dimension-command',
  'finish-sketch-command',
] as const;
export type TargetId = (typeof TARGET_IDS)[number];

export const ALLOWED_LABELS = [
  'Part Studio',
  'Assembly',
  'Sketch',
  'Start sketch',
  'Create sketch',
  'Finish Sketch',
  'Rectangle',
  'Aligned Rectangle',
  'Dimension',
  'Top',
  'Front',
  'Right',
  'Default geometry',
  'Cancel',
  'Close',
] as const;
export type AllowedLabel = (typeof ALLOWED_LABELS)[number];

export const SAFE_ROLES = [
  'BUTTON',
  'TREE',
  'TREEGRID',
  'TREEITEM',
  'ROW',
  'MENU',
  'MENUITEM',
  'DIALOG',
  'TAB',
  'TABLIST',
  'TOOLBAR',
  'OPTION',
  'CHECKBOX',
  'RADIO',
  'COMBOBOX',
  'TEXTBOX',
  'GENERIC',
  'PRESENTATION',
] as const;
export type SafeRole = (typeof SAFE_ROLES)[number];

export const SAFE_TAGS = [
  'BUTTON',
  'DIV',
  'SPAN',
  'LI',
  'UL',
  'OL',
  'SVG',
  'PATH',
  'A',
  'INPUT',
  'SELECT',
  'OPTION',
  'CANVAS',
  'OTHER',
] as const;
export type SafeTag = (typeof SAFE_TAGS)[number];

export type SafeBoolean = 'TRUE' | 'FALSE' | 'MIXED' | 'UNKNOWN';
export type Visibility =
  'VISIBLE' | 'PARTIAL' | 'OFFSCREEN' | 'HIDDEN' | 'UNKNOWN';
export type Clipping = 'NONE' | 'VIEWPORT' | 'ANCESTOR' | 'UNKNOWN';

export interface SafeBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface CaptureNode {
  nodeIndex: number;
  parentIndex: number | null;
  childIndexes: number[];
  tag: SafeTag;
  label: AllowedLabel | null;
  role: SafeRole | null;
  aria: {
    expanded: SafeBoolean;
    selected: SafeBoolean;
    disabled: SafeBoolean;
    hidden: SafeBoolean;
  };
  accessibility: {
    nameAttributePresent: boolean;
    roleAttributePresent: boolean;
    tabIndexAttributePresent: boolean;
  };
  visibility: Visibility;
  clipping: Clipping;
  bounds: SafeBounds | null;
}

export type HumanState =
  | 'PART_STUDIO_READY'
  | 'SKETCH_ACTIVE'
  | 'SKETCH_INACTIVE'
  | 'TOP_PLANE_VISIBLE'
  | 'RECTANGLE_MENU_CLOSED'
  | 'RECTANGLE_MENU_OPEN'
  | 'ASSEMBLY_ACTIVE'
  | 'INVALID_OR_UNSUPPORTED'
  | 'UNKNOWN';

export type DomState =
  | 'PART_STUDIO_CONTROLS_VISIBLE'
  | 'SKETCH_CONTROLS_VISIBLE'
  | 'SKETCH_COMMAND_VISIBLE'
  | 'TOP_LABEL_VISIBLE'
  | 'RECTANGLE_TRIGGER_VISIBLE'
  | 'MENU_VISIBLE'
  | 'NO_MENU_EVIDENCE'
  | 'UNKNOWN';

export interface CaptureEvent {
  type: 'CLICK' | 'KEYDOWN';
  key: 'ENTER' | 'SPACE' | 'ARROWDOWN' | 'ESCAPE' | null;
  label: AllowedLabel | null;
  offsetMs: number;
}

export interface ScanStatus {
  visitedElements: number;
  recognizedLabelCount: number;
  accessibleNameCount: number;
  roleAttributeCount: number;
  nativeControlCount: number;
  nodeLimitReached: boolean;
  depthLimitReached: boolean;
  outputLimitReached: boolean;
  status: 'COMPLETE' | 'INCOMPLETE_CAPTURE';
}

export interface CaptureObservation {
  stateId: 'POINT' | 'BEFORE' | 'AFTER';
  humanState: HumanState;
  domState: DomState;
  nodes: CaptureNode[];
  events: CaptureEvent[];
  scan: ScanStatus;
}

export interface ReferenceCapture {
  schemaVersion: typeof CAPTURE_SCHEMA_VERSION;
  captureId: string;
  capturedAt: string;
  captureSource: 'LOCAL_CHROME' | 'DEVTOOLS';
  captureOrigin: 'OWNER_CAPTURE' | 'SIMULATED_FIXTURE';
  scenarioId: ScenarioId;
  targetId: TargetId;
  reviewStatus: 'PENDING_REVIEW';
  authorization: {
    disposablePartStudioConfirmed: true;
    manualSignInConfirmed: true;
    noGeometryEdited: true;
  };
  browser: {
    name: 'CHROME';
    majorVersion: number | null;
    webgl: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN';
  };
  observations: CaptureObservation[];
}

export type ValidationOutcome =
  'PASS' | 'FAIL' | 'NOT_RUN' | 'INSUFFICIENT_EVIDENCE';
export type EvidenceLevel =
  | 'LIVE_VERIFIED'
  | 'LIVE_OBSERVED'
  | 'CAPTURE_VERIFIED'
  | 'SIMULATED'
  | 'UNVERIFIED';

const HUMAN_STATES: readonly string[] = [
  'PART_STUDIO_READY',
  'SKETCH_ACTIVE',
  'SKETCH_INACTIVE',
  'TOP_PLANE_VISIBLE',
  'RECTANGLE_MENU_CLOSED',
  'RECTANGLE_MENU_OPEN',
  'ASSEMBLY_ACTIVE',
  'INVALID_OR_UNSUPPORTED',
  'UNKNOWN',
];
const DOM_STATES: readonly string[] = [
  'PART_STUDIO_CONTROLS_VISIBLE',
  'SKETCH_CONTROLS_VISIBLE',
  'SKETCH_COMMAND_VISIBLE',
  'TOP_LABEL_VISIBLE',
  'RECTANGLE_TRIGGER_VISIBLE',
  'MENU_VISIBLE',
  'NO_MENU_EVIDENCE',
  'UNKNOWN',
];
const SCENARIO_TARGETS: Record<ScenarioId, TargetId> = {
  'clean-part-studio': 'part-studio-tab',
  'active-sketch': 'finish-sketch-command',
  'sketch-show': 'sketch-command',
  'top-plane': 'top-plane',
  'rectangle-dropdown': 'rectangle-tool-group',
  'invalid-context': 'none',
  'retry-recovery': 'none',
};
const BOOLS: readonly string[] = ['TRUE', 'FALSE', 'MIXED', 'UNKNOWN'];
const VISIBILITIES: readonly string[] = [
  'VISIBLE',
  'PARTIAL',
  'OFFSCREEN',
  'HIDDEN',
  'UNKNOWN',
];
const CLIPPINGS: readonly string[] = [
  'NONE',
  'VIEWPORT',
  'ANCESTOR',
  'UNKNOWN',
];

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(
  value: unknown,
  keys: readonly string[],
): value is Record<string, unknown> {
  return (
    isObject(value) &&
    Object.keys(value).every((key) => keys.includes(key)) &&
    keys.every((key) => Object.hasOwn(value, key))
  );
}

function isBoundedNumber(
  value: unknown,
  minimum = 0,
  maximum = 1,
): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= minimum &&
    value <= maximum
  );
}

function isNode(value: unknown): value is CaptureNode {
  if (
    !hasExactKeys(value, [
      'nodeIndex',
      'parentIndex',
      'childIndexes',
      'tag',
      'label',
      'role',
      'aria',
      'accessibility',
      'visibility',
      'clipping',
      'bounds',
    ])
  )
    return false;
  const node = value;
  if (!Number.isInteger(node.nodeIndex) || (node.nodeIndex as number) < 0)
    return false;
  if (!(
    node.parentIndex === null ||
    (Number.isInteger(node.parentIndex) && (node.parentIndex as number) >= 0)
  ))
    return false;
  if (
    !Array.isArray(node.childIndexes) ||
    node.childIndexes.some((child) => !Number.isInteger(child) || child < 0)
  )
    return false;
  if (!SAFE_TAGS.includes(node.tag as SafeTag)) return false;
  if (!(
    node.label === null || ALLOWED_LABELS.includes(node.label as AllowedLabel)
  ))
    return false;
  if (!(node.role === null || SAFE_ROLES.includes(node.role as SafeRole)))
    return false;
  if (!hasExactKeys(node.aria, ['expanded', 'selected', 'disabled', 'hidden']))
    return false;
  if (Object.values(node.aria).some((state) => !BOOLS.includes(String(state))))
    return false;
  if (
    !hasExactKeys(node.accessibility, [
      'nameAttributePresent',
      'roleAttributePresent',
      'tabIndexAttributePresent',
    ]) ||
    Object.values(node.accessibility).some(
      (present) => typeof present !== 'boolean',
    )
  )
    return false;
  if (
    !VISIBILITIES.includes(String(node.visibility)) ||
    !CLIPPINGS.includes(String(node.clipping))
  )
    return false;
  if (node.bounds === null) return true;
  if (!hasExactKeys(node.bounds, ['x', 'y', 'width', 'height'])) return false;
  return (
    isBoundedNumber(node.bounds.x) &&
    isBoundedNumber(node.bounds.y) &&
    isBoundedNumber(node.bounds.width) &&
    isBoundedNumber(node.bounds.height)
  );
}

function observationIssue(value: unknown): string | null {
  if (
    !hasExactKeys(value, [
      'stateId',
      'humanState',
      'domState',
      'nodes',
      'events',
      'scan',
    ])
  )
    return 'FIELDS';
  if (!['POINT', 'BEFORE', 'AFTER'].includes(String(value.stateId)))
    return 'STATE_ID';
  if (
    !HUMAN_STATES.includes(String(value.humanState)) ||
    !DOM_STATES.includes(String(value.domState))
  )
    return 'STATE_VALUE';
  if (
    !Array.isArray(value.nodes) ||
    value.nodes.length > MAX_CAPTURE_NODES ||
    value.nodes.some((node) => !isNode(node))
  )
    return 'NODES';
  const nodeIds = new Set(
    (value.nodes as CaptureNode[]).map((node) => node.nodeIndex),
  );
  if (nodeIds.size !== value.nodes.length) return 'DUPLICATE_NODE_INDEX';
  for (const node of value.nodes as CaptureNode[]) {
    if (node.parentIndex !== null && !nodeIds.has(node.parentIndex))
      return 'MISSING_PARENT_REFERENCE';
    if (node.childIndexes.some((child) => !nodeIds.has(child)))
      return 'MISSING_CHILD_REFERENCE';
  }
  if (!Array.isArray(value.events) || value.events.length > MAX_CAPTURE_EVENTS)
    return 'EVENTS';
  for (const rawEvent of value.events) {
    if (!hasExactKeys(rawEvent, ['type', 'key', 'label', 'offsetMs']))
      return 'EVENT_FIELDS';
    if (!['CLICK', 'KEYDOWN'].includes(String(rawEvent.type)))
      return 'EVENT_TYPE';
    if (!(
      rawEvent.key === null ||
      ['ENTER', 'SPACE', 'ARROWDOWN', 'ESCAPE'].includes(String(rawEvent.key))
    ))
      return 'EVENT_KEY';
    if (!(
      rawEvent.label === null ||
      ALLOWED_LABELS.includes(rawEvent.label as AllowedLabel)
    ))
      return 'EVENT_LABEL';
    if (
      !Number.isInteger(rawEvent.offsetMs) ||
      (rawEvent.offsetMs as number) < 0 ||
      (rawEvent.offsetMs as number) > 600_000
    )
      return 'EVENT_TIME';
  }
  if (
    !hasExactKeys(value.scan, [
      'visitedElements',
      'recognizedLabelCount',
      'accessibleNameCount',
      'roleAttributeCount',
      'nativeControlCount',
      'nodeLimitReached',
      'depthLimitReached',
      'outputLimitReached',
      'status',
    ])
  )
    return 'SCAN_FIELDS';
  if (
    !Number.isInteger(value.scan.visitedElements) ||
    (value.scan.visitedElements as number) < 0 ||
    (value.scan.visitedElements as number) > 20_000
  )
    return 'SCAN_COUNT';
  for (const count of [
    'recognizedLabelCount',
    'accessibleNameCount',
    'roleAttributeCount',
    'nativeControlCount',
  ]) {
    if (
      !Number.isInteger(value.scan[count]) ||
      (value.scan[count] as number) < 0 ||
      (value.scan[count] as number) > (value.scan.visitedElements as number)
    )
      return 'SCAN_COUNT';
  }
  for (const flag of [
    'nodeLimitReached',
    'depthLimitReached',
    'outputLimitReached',
  ]) {
    if (typeof value.scan[flag] !== 'boolean') return 'SCAN_FLAG';
  }
  if (!['COMPLETE', 'INCOMPLETE_CAPTURE'].includes(String(value.scan.status)))
    return 'SCAN_STATUS';
  const incomplete =
    value.scan.nodeLimitReached ||
    value.scan.depthLimitReached ||
    value.scan.outputLimitReached;
  return value.scan.status === (incomplete ? 'INCOMPLETE_CAPTURE' : 'COMPLETE')
    ? null
    : 'SCAN_STATUS_MISMATCH';
}

function isObservation(value: unknown): value is CaptureObservation {
  return observationIssue(value) === null;
}

export function validateCapture(value: unknown): ReferenceCapture {
  if (
    !hasExactKeys(value, [
      'schemaVersion',
      'captureId',
      'capturedAt',
      'captureSource',
      'captureOrigin',
      'scenarioId',
      'targetId',
      'reviewStatus',
      'authorization',
      'browser',
      'observations',
    ])
  )
    throw new Error('Capture has unknown or missing fields.');
  const capture = value;
  if (capture.schemaVersion !== CAPTURE_SCHEMA_VERSION)
    throw new Error('Unsupported capture schema version.');
  if (
    typeof capture.captureId !== 'string' ||
    !/^cap_[a-zA-Z0-9_-]{6,80}$/.test(capture.captureId)
  )
    throw new Error('Invalid local capture ID.');
  if (
    typeof capture.capturedAt !== 'string' ||
    Number.isNaN(Date.parse(capture.capturedAt)) ||
    !capture.capturedAt.endsWith('Z')
  )
    throw new Error('Invalid UTC capture timestamp.');
  if (!['LOCAL_CHROME', 'DEVTOOLS'].includes(String(capture.captureSource)))
    throw new Error('Invalid capture source.');
  if (
    !['OWNER_CAPTURE', 'SIMULATED_FIXTURE'].includes(
      String(capture.captureOrigin),
    )
  )
    throw new Error('Invalid capture origin.');
  if (
    !SCENARIO_IDS.includes(capture.scenarioId as ScenarioId) ||
    !TARGET_IDS.includes(capture.targetId as TargetId)
  )
    throw new Error('Unknown scenario or target identity.');
  if (SCENARIO_TARGETS[capture.scenarioId as ScenarioId] !== capture.targetId)
    throw new Error('Scenario and target identities do not match.');
  if (capture.reviewStatus !== 'PENDING_REVIEW')
    throw new Error('Captures must enter as pending review.');
  if (
    !hasExactKeys(capture.authorization, [
      'disposablePartStudioConfirmed',
      'manualSignInConfirmed',
      'noGeometryEdited',
    ]) ||
    Object.values(capture.authorization).some((value) => value !== true)
  )
    throw new Error('Required human authorization confirmations are missing.');
  if (!hasExactKeys(capture.browser, ['name', 'majorVersion', 'webgl']))
    throw new Error('Browser metadata is incomplete.');
  if (
    capture.browser.name !== 'CHROME' ||
    !(
      capture.browser.majorVersion === null ||
      (Number.isInteger(capture.browser.majorVersion) &&
        (capture.browser.majorVersion as number) >= 1)
    )
  )
    throw new Error('Unsupported browser metadata.');
  if (
    !['AVAILABLE', 'UNAVAILABLE', 'UNKNOWN'].includes(
      String(capture.browser.webgl),
    )
  )
    throw new Error('Invalid WebGL capability state.');
  if (
    !Array.isArray(capture.observations) ||
    capture.observations.length < 1 ||
    capture.observations.length > MAX_OBSERVATIONS
  )
    throw new Error('Invalid or unbounded observations.');
  const invalidObservation = capture.observations.findIndex(
    (observation) => !isObservation(observation),
  );
  if (invalidObservation >= 0)
    throw new Error(
      `Invalid observation ${invalidObservation}: ${observationIssue(capture.observations[invalidObservation]) ?? 'UNKNOWN'}.`,
    );
  if (
    ['rectangle-dropdown', 'active-sketch'].includes(
      capture.scenarioId as string,
    ) &&
    capture.observations.length !== 2
  )
    throw new Error('This scenario requires before and after observations.');
  if (
    !['rectangle-dropdown', 'active-sketch'].includes(
      capture.scenarioId as string,
    ) &&
    capture.observations.length !== 1
  )
    throw new Error('This scenario must have one bounded snapshot.');
  if (
    capture.observations.length === 2 &&
    (capture.observations[0]?.stateId !== 'BEFORE' ||
      capture.observations[1]?.stateId !== 'AFTER')
  )
    throw new Error(
      'Transition observations must be ordered before then after.',
    );
  const serialized = JSON.stringify(capture);
  if (new TextEncoder().encode(serialized).byteLength > MAX_CAPTURE_BYTES)
    throw new Error('Capture exceeds the maximum report size.');
  return capture as unknown as ReferenceCapture;
}

export function isValidCapture(value: unknown): value is ReferenceCapture {
  try {
    validateCapture(value);
    return true;
  } catch {
    return false;
  }
}
