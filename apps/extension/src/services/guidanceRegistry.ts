import type { SemanticTargetId } from './semanticTargets';

export const GUIDANCE_LEVELS = ['HINT', 'SHOW', 'GUIDE'] as const;
export type GuidanceLevel = (typeof GUIDANCE_LEVELS)[number];

export const GUIDANCE_ACTION_IDS = [
  'sketch',
  'rectangle-tool-group',
  'dimension',
  'finish-sketch',
] as const;
export type GuidanceActionId = (typeof GUIDANCE_ACTION_IDS)[number];

export const GUIDANCE_TARGET_IDS = [
  'sketch-toolbar-control',
  'rectangle-tool-group',
  'dimension-control',
  'finish-sketch-control',
] as const;
export type GuidanceTargetId = (typeof GUIDANCE_TARGET_IDS)[number];

export const GUIDANCE_AREA_TARGET_IDS = ['sketch-toolbar-region'] as const;
export type GuidanceAreaTargetId = (typeof GUIDANCE_AREA_TARGET_IDS)[number];

export const GUIDANCE_CONTEXTS = [
  'PART_STUDIO',
  'SKETCH_EDITING',
  'UNKNOWN',
] as const;
export type GuidanceUiContext = (typeof GUIDANCE_CONTEXTS)[number];

export const GUIDANCE_CONTENT_IDS = [
  'sketch',
  'rectangle-tool-group',
  'dimension',
  'finish-sketch',
  'open-rectangle-menu',
  'choose-rectangle-variant',
] as const;
export type GuidanceContentId = (typeof GUIDANCE_CONTENT_IDS)[number];

export const GUIDANCE_OBSERVATION_IDS = [
  'SKETCH_UI_ACTIVE',
  'RECTANGLE_MENU_OPEN',
  'RECTANGLE_VARIANT_SELECTED',
] as const;
export type GuidanceObservationId = (typeof GUIDANCE_OBSERVATION_IDS)[number];

export type GuidanceObservedState = 'OPEN' | 'CLOSED' | 'SELECTED' | 'UNKNOWN';

export interface GuidanceObservationRequirement {
  observationId: GuidanceObservationId;
  expected: Exclude<GuidanceObservedState, 'UNKNOWN'>;
}

export interface GuidanceRequest {
  version: 1;
  level: GuidanceLevel;
  actionId: GuidanceActionId;
}

export type GuidanceRecipeStep =
  | { kind: 'INSTRUCT'; contentId: GuidanceContentId }
  | { kind: 'HIGHLIGHT'; targetId: GuidanceTargetId }
  | {
      kind: 'WAIT_FOR_UI_STATE';
      observationId: GuidanceObservationId;
      expected: 'OPEN' | 'CLOSED' | 'SELECTED';
      timeoutMs: number;
    };

export interface GuidanceActionDefinition {
  actionId: GuidanceActionId;
  targetId: GuidanceTargetId;
  /** Existing semantic recognizer identity used by the closed local adapter. */
  semanticTarget: SemanticTargetId;
  requiredContext: Exclude<GuidanceUiContext, 'UNKNOWN'>;
  supportedLevels: readonly GuidanceLevel[];
  hintContentId: GuidanceContentId;
  /** Optional area hint target; no production region is registered yet. */
  hintAreaTargetId?: GuidanceAreaTargetId;
  /** Interface observations required for guidance eligibility, never completion. */
  requiredObservations: readonly GuidanceObservationRequirement[];
  /** A fixed local recipe. The caller cannot provide or alter one. */
  guideRecipe?: readonly GuidanceRecipeStep[];
}

export type GuidanceRegistry = Record<
  GuidanceActionId,
  GuidanceActionDefinition
>;

export const GUIDANCE_REGISTRY: GuidanceRegistry = {
  sketch: {
    actionId: 'sketch',
    targetId: 'sketch-toolbar-control',
    semanticTarget: 'sketch',
    requiredContext: 'PART_STUDIO',
    supportedLevels: ['HINT', 'SHOW'],
    hintContentId: 'sketch',
    requiredObservations: [],
  },
  'rectangle-tool-group': {
    actionId: 'rectangle-tool-group',
    targetId: 'rectangle-tool-group',
    // Compatibility mapping only: the legacy recognizer does not prove an
    // exact Rectangle variant identity or dropdown relationship.
    semanticTarget: 'rectangle',
    requiredContext: 'SKETCH_EDITING',
    supportedLevels: ['HINT', 'SHOW'],
    hintContentId: 'rectangle-tool-group',
    requiredObservations: [
      { observationId: 'SKETCH_UI_ACTIVE', expected: 'OPEN' },
    ],
  },
  dimension: {
    actionId: 'dimension',
    targetId: 'dimension-control',
    semanticTarget: 'dimension',
    requiredContext: 'SKETCH_EDITING',
    supportedLevels: ['HINT', 'SHOW'],
    hintContentId: 'dimension',
    requiredObservations: [
      { observationId: 'SKETCH_UI_ACTIVE', expected: 'OPEN' },
    ],
  },
  'finish-sketch': {
    actionId: 'finish-sketch',
    targetId: 'finish-sketch-control',
    semanticTarget: 'finish-sketch',
    requiredContext: 'SKETCH_EDITING',
    supportedLevels: ['HINT', 'SHOW'],
    hintContentId: 'finish-sketch',
    requiredObservations: [
      { observationId: 'SKETCH_UI_ACTIVE', expected: 'OPEN' },
    ],
  },
};

const EXPECTED_REQUEST_KEYS = ['actionId', 'level', 'version'] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function validateGuidanceRequest(
  value: unknown,
): GuidanceRequest | null {
  if (!isRecord(value)) return null;
  const keys = Object.keys(value).sort();
  if (
    keys.length !== EXPECTED_REQUEST_KEYS.length ||
    keys.some((key, index) => key !== EXPECTED_REQUEST_KEYS[index])
  ) {
    return null;
  }
  if (
    value.version !== 1 ||
    typeof value.actionId !== 'string' ||
    !GUIDANCE_ACTION_IDS.includes(value.actionId as GuidanceActionId) ||
    typeof value.level !== 'string' ||
    !GUIDANCE_LEVELS.includes(value.level as GuidanceLevel)
  ) {
    return null;
  }
  return {
    version: 1,
    actionId: value.actionId as GuidanceActionId,
    level: value.level as GuidanceLevel,
  };
}

export function guidanceActionForSemanticTarget(
  target: string | null,
): GuidanceActionId | null {
  switch (target) {
    case 'sketch':
      return 'sketch';
    case 'rectangle':
      return 'rectangle-tool-group';
    case 'dimension':
      return 'dimension';
    case 'finish-sketch':
      return 'finish-sketch';
    default:
      return null;
  }
}
