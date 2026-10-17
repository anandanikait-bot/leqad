import type { OnshapePageContext } from './onshapePage';
import type { GuidanceUiContext } from './guidanceRegistry';
import type { TargetRecognitionStatus } from './semanticTargets';

export const RECTANGLE_LOOKUP_REASONS = [
  'NO_TOOLBAR_SEMANTICS',
  'NO_POPUP_CONTROLS',
  'NO_EXACT_GROUP_NAME',
  'CANDIDATES_INSPECTED',
  'LOOKUP_LIMIT_REACHED',
] as const;
export const RECTANGLE_REJECTIONS = [
  'HIDDEN',
  'ZERO_SIZE',
  'OFFSCREEN',
  'CLIPPED',
  'OBSCURED',
  'VISIBILITY_UNKNOWN',
  'DISABLED',
  'ENABLED_UNKNOWN',
  'INVALID_CONTEXT',
  'ANCESTOR_LIMIT',
  'CONFLICTING_ROLE',
  'AGGREGATE_CONTROL',
  'POPUP_NOT_MENU',
] as const;
export interface RectangleDropdownDiagnostic {
  sketchContext: 'OBSERVED' | 'UNESTABLISHED';
  finishControl: TargetRecognitionStatus;
  dialogPlaneObserved: boolean;
  readOnlyIndicators: number;
  lookup: {
    state: 'COMPLETE' | 'INCOMPLETE';
    reason: (typeof RECTANGLE_LOOKUP_REASONS)[number];
    toolbars: number;
    popupControls: number;
    exactNames: number;
  };
  eligibility: {
    state: 'NOT_EVALUATED' | 'REJECTED' | 'UNIQUE_USABLE' | 'AMBIGUOUS';
    candidateCount: number;
    usableCount: number;
    rejections: Array<(typeof RECTANGLE_REJECTIONS)[number]>;
  };
}
export const RECTANGLE_PAGE_GATES = [
  'ALLOWED',
  'READ_ONLY',
  'NON_WORKSPACE',
  'WRONG_ELEMENT',
  'UNSUPPORTED_PAGE',
  'STALE_PAGE',
  'UNKNOWN',
] as const;
export type RectanglePageGate = (typeof RECTANGLE_PAGE_GATES)[number];
export interface RectangleShowInspection {
  pageGate: RectanglePageGate;
  target: RectangleDropdownDiagnostic;
}
export const RECTANGLE_SHOW_REASONS = [
  'SKETCH_CONTEXT_UNESTABLISHED',
  'PAGE_GATE_BLOCKED',
  'SKETCH_OBSERVATION_UNESTABLISHED',
  'GROUP_LOOKUP_UNESTABLISHED',
  'NO_TOOLBAR_SEMANTICS',
  'NO_POPUP_CONTROLS',
  'NO_EXACT_GROUP_NAME',
  'LOOKUP_LIMIT_REACHED',
  'TARGET_INELIGIBLE',
  'AMBIGUOUS_GROUP',
  'TARGET_CHANGED_BEFORE_HIGHLIGHT',
  'FOUND',
] as const;
export const RECTANGLE_SHOW_STAGES = [
  'CONTEXT',
  'SKETCH_OBSERVATION',
  'GROUP_LOOKUP',
  'TARGET_ELIGIBILITY',
  'HIGHLIGHT',
  'READY',
] as const;
export interface RectangleShowDiagnostic {
  version: 'leqad-rectangle-show/1';
  observationScope: 'SHOW_REQUEST_SNAPSHOT';
  stage: (typeof RECTANGLE_SHOW_STAGES)[number];
  reason: (typeof RECTANGLE_SHOW_REASONS)[number];
  context: GuidanceUiContext;
  productionLookup: 'RUN' | 'NOT_RUN';
  inspection: RectangleShowInspection | null;
}
export function rectangleShowPageGate(
  page: OnshapePageContext,
  isCurrent = true,
): RectanglePageGate {
  if (!isCurrent) return 'STALE_PAGE';
  if (!page.supported) return 'UNSUPPORTED_PAGE';
  if (page.editability === 'read-only') return 'READ_ONLY';
  if (page.modelType !== 'workspace') return 'NON_WORKSPACE';
  if (page.elementType === 'other') return 'WRONG_ELEMENT';
  return 'ALLOWED';
}
export function rectangleShowTargetReason(
  target: RectangleDropdownDiagnostic | null,
): RectangleShowDiagnostic['reason'] {
  if (!target) return 'GROUP_LOOKUP_UNESTABLISHED';
  if (target.readOnlyIndicators > 0) return 'PAGE_GATE_BLOCKED';
  if (target.sketchContext === 'UNESTABLISHED')
    return 'SKETCH_CONTEXT_UNESTABLISHED';
  if (target.lookup.reason !== 'CANDIDATES_INSPECTED')
    return target.lookup.reason;
  if (target.eligibility.state === 'AMBIGUOUS') return 'AMBIGUOUS_GROUP';
  return target.eligibility.state === 'UNIQUE_USABLE'
    ? 'FOUND'
    : 'TARGET_INELIGIBLE';
}
export function rectangleShowFailureMessage(
  reason: RectangleShowDiagnostic['reason'],
): string {
  const descriptions: Record<RectangleShowDiagnostic['reason'], string> = {
    SKETCH_CONTEXT_UNESTABLISHED:
      'Leqad has not established the active Sketch context.',
    PAGE_GATE_BLOCKED:
      'This page is not eligible for editing guidance, or read-only evidence is present.',
    SKETCH_OBSERVATION_UNESTABLISHED:
      'The required active Sketch observation is unavailable or no longer current.',
    GROUP_LOOKUP_UNESTABLISHED:
      'Sketch context was observed, but the Rectangle group lookup did not identify a target.',
    NO_TOOLBAR_SEMANTICS:
      'Sketch context was observed, but no supported toolbar structure was found. The captured nonsemantic Rectangle control is not supported by this matcher.',
    NO_POPUP_CONTROLS:
      'Sketch context was observed, but the toolbar exposes no supported dropdown control markup.',
    NO_EXACT_GROUP_NAME:
      'Sketch context was observed, but no dropdown has a supported exact Rectangle group name.',
    LOOKUP_LIMIT_REACHED:
      'The bounded group inspection was incomplete; uniqueness cannot be established.',
    TARGET_INELIGIBLE:
      'Sketch context was observed and group candidates were found, but none passed the visibility, enabled-state and context checks.',
    AMBIGUOUS_GROUP:
      'Multiple usable Rectangle groups remain; Leqad will not choose one.',
    TARGET_CHANGED_BEFORE_HIGHLIGHT:
      'The identified group changed or became unavailable before highlighting.',
    FOUND: 'The group was identified.',
  };
  return `${descriptions[reason]} Manually open the Rectangle dropdown arrow and choose Corner Rectangle. Exact option highlighting is not available; the current menu relationship is unverified. Use SHOW again only after the interface changes.`;
}
function count(value: unknown, max = 512) {
  return typeof value === 'number' && Number.isFinite(value)
    ? Math.max(0, Math.min(max, Math.trunc(value)))
    : 0;
}
function safeTarget(
  value: RectangleDropdownDiagnostic,
): RectangleDropdownDiagnostic {
  return {
    sketchContext:
      value.sketchContext === 'OBSERVED' ? 'OBSERVED' : 'UNESTABLISHED',
    finishControl: ['FOUND', 'MISSING', 'AMBIGUOUS', 'REJECTED'].includes(
      value.finishControl,
    )
      ? value.finishControl
      : 'MISSING',
    dialogPlaneObserved: value.dialogPlaneObserved === true,
    readOnlyIndicators: count(value.readOnlyIndicators),
    lookup: {
      state: value.lookup?.state === 'COMPLETE' ? 'COMPLETE' : 'INCOMPLETE',
      reason: RECTANGLE_LOOKUP_REASONS.includes(value.lookup?.reason)
        ? value.lookup.reason
        : 'LOOKUP_LIMIT_REACHED',
      toolbars: count(value.lookup?.toolbars, 17),
      popupControls: count(value.lookup?.popupControls, 513),
      exactNames: count(value.lookup?.exactNames),
    },
    eligibility: {
      state: [
        'NOT_EVALUATED',
        'REJECTED',
        'UNIQUE_USABLE',
        'AMBIGUOUS',
      ].includes(value.eligibility?.state)
        ? value.eligibility.state
        : 'NOT_EVALUATED',
      candidateCount: count(value.eligibility?.candidateCount),
      usableCount: count(value.eligibility?.usableCount),
      rejections: [
        ...new Set(
          (Array.isArray(value.eligibility?.rejections)
            ? value.eligibility.rejections
            : []
          )
            .slice(0, RECTANGLE_REJECTIONS.length * 2)
            .filter((item) => RECTANGLE_REJECTIONS.includes(item)),
        ),
      ].slice(0, RECTANGLE_REJECTIONS.length),
    },
  };
}
/** Allowlisted scalar metadata only. No DOM references, text, URLs or IDs. */
export function serializeRectangleShowDiagnostic(
  value: RectangleShowDiagnostic,
): string {
  const report: RectangleShowDiagnostic = {
    version: 'leqad-rectangle-show/1',
    observationScope: 'SHOW_REQUEST_SNAPSHOT',
    stage: RECTANGLE_SHOW_STAGES.includes(value.stage)
      ? value.stage
      : 'CONTEXT',
    reason: RECTANGLE_SHOW_REASONS.includes(value.reason)
      ? value.reason
      : 'GROUP_LOOKUP_UNESTABLISHED',
    context: ['UNKNOWN', 'PART_STUDIO', 'SKETCH_EDITING'].includes(
      value.context,
    )
      ? value.context
      : 'UNKNOWN',
    productionLookup: value.productionLookup === 'RUN' ? 'RUN' : 'NOT_RUN',
    inspection: value.inspection
      ? {
          pageGate: RECTANGLE_PAGE_GATES.includes(value.inspection.pageGate)
            ? value.inspection.pageGate
            : 'UNKNOWN',
          target: safeTarget(value.inspection.target),
        }
      : null,
  };
  return JSON.stringify(report);
}
