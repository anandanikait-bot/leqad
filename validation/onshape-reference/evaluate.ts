import {
  validateCapture,
  type EvidenceLevel,
  type ReferenceCapture,
  type ScenarioId,
  type TargetId,
  type ValidationOutcome,
} from './schema.ts';
import { summarizeTransition } from './sanitize.ts';

export type ProductOutcome =
  'RECOGNIZED' | 'MISSING' | 'AMBIGUOUS' | 'UNSUPPORTED' | 'UNKNOWN';
export type ProductHighlight =
  'CORRECT' | 'INCORRECT' | 'UNKNOWN' | 'NOT_APPLICABLE';
export type MenuEvidence =
  'DOM_TRANSITION' | 'CLICK_ONLY' | 'NONE' | 'NOT_APPLICABLE';

export interface ProductObservation {
  scenarioId: ScenarioId;
  outcome: ProductOutcome;
  targetId: TargetId | null;
  menuEvidence: MenuEvidence;
  highlight: ProductHighlight;
}

export interface ComparisonInput {
  capture: unknown;
  product: ProductObservation;
  approval: 'PENDING_REVIEW' | 'APPROVED';
  freshness: 'CURRENT' | 'STALE' | 'UNKNOWN';
}

export interface ComparisonResult {
  status: ValidationOutcome;
  evidenceLevel: EvidenceLevel;
  reason:
    | 'REFERENCE_NOT_APPROVED'
    | 'REFERENCE_STALE'
    | 'REFERENCE_INVALID'
    | 'CAPTURE_INCOMPLETE'
    | 'REFERENCE_AMBIGUOUS'
    | 'WEBGL_UNAVAILABLE'
    | 'SCENARIO_MISMATCH'
    | 'ENVIRONMENT_UNKNOWN'
    | 'TARGET_MISSING'
    | 'TARGET_AMBIGUOUS'
    | 'TARGET_UNSUPPORTED'
    | 'TARGET_WRONG'
    | 'TRANSITION_UNVERIFIED'
    | 'HIGHLIGHT_WRONG'
    | 'TARGET_MATCHED_LOCAL_EVIDENCE_GLOBAL_DEPTH_LIMIT'
    | 'TARGET_MATCHED_LOCAL_EVIDENCE_GLOBAL_SCAN_INCOMPLETE'
    | 'RESULT_UNKNOWN'
    | 'MATCHED';
}

const expectedLabel: Record<Exclude<TargetId, 'none'>, readonly string[]> = {
  'part-studio-tab': ['Part Studio'],
  'sketch-command': ['Sketch', 'Start sketch', 'Create sketch'],
  'top-plane': ['Top'],
  'rectangle-tool-group': ['Rectangle'],
  'rectangle-variant-candidate': ['Aligned Rectangle'],
  'dimension-command': ['Dimension'],
  'finish-sketch-command': ['Finish Sketch'],
};

function result(
  status: ValidationOutcome,
  evidenceLevel: EvidenceLevel,
  reason: ComparisonResult['reason'],
): ComparisonResult {
  return { status, evidenceLevel, reason };
}

function isIncomplete(capture: ReferenceCapture): boolean {
  return capture.observations.some(
    (observation) =>
      observation.scan.status !== 'COMPLETE' &&
      !(
        capture.scenarioId === 'active-sketch' &&
        !observation.scan.nodeLimitReached &&
        !observation.scan.outputLimitReached &&
        !observation.scan.sketchCandidateLimitReached
      ),
  );
}

function hasVisibleLabel(
  observation: ReferenceCapture['observations'][number],
  labels: readonly string[],
): boolean {
  return observation.nodes.some(
    (node) =>
      node.label !== null &&
      labels.includes(node.label) &&
      node.visibility === 'VISIBLE' &&
      node.bounds !== null,
  );
}

function isDescendantOf(
  nodeIndex: number,
  ancestorIndex: number,
  nodes: ReferenceCapture['observations'][number]['nodes'],
): boolean {
  const byId = new Map(nodes.map((node) => [node.nodeIndex, node]));
  let current = byId.get(nodeIndex);
  while (current?.parentIndex !== null && current?.parentIndex !== undefined) {
    if (current.parentIndex === ancestorIndex) return true;
    current = byId.get(current.parentIndex);
  }
  return false;
}

function countDistinctLabelBranches(
  capture: ReferenceCapture,
  labels: readonly string[],
): number {
  const observations =
    capture.scenarioId === 'active-sketch'
      ? capture.observations.filter(
          (observation) => observation.stateId === 'AFTER',
        )
      : capture.observations;
  return Math.max(
    ...observations.map((observation) => {
      const visible = observation.nodes
        .filter(
          (node) =>
            node.label !== null &&
            labels.includes(node.label) &&
            node.visibility !== 'HIDDEN' &&
            node.visibility !== 'OFFSCREEN',
        )
        .map((node) => ({ node, nodes: observation.nodes }));
      const branches = visible.filter(
        (candidate) =>
          !visible.some(
            (other) =>
              other !== candidate &&
              isDescendantOf(
                candidate.node.nodeIndex,
                other.node.nodeIndex,
                candidate.nodes,
              ),
          ),
      );
      return branches.length;
    }),
  );
}

function evidenceFor(capture: ReferenceCapture): EvidenceLevel {
  return capture.captureOrigin === 'SIMULATED_FIXTURE'
    ? 'SIMULATED'
    : 'CAPTURE_VERIFIED';
}

/** Compare a separately recorded product observation with an approved reference contract. */
export function compareReferenceContract(
  input: ComparisonInput,
): ComparisonResult {
  let capture: ReferenceCapture;
  try {
    capture = validateCapture(input.capture);
  } catch {
    return result('INSUFFICIENT_EVIDENCE', 'UNVERIFIED', 'REFERENCE_INVALID');
  }

  const evidenceLevel = evidenceFor(capture);
  if (input.approval !== 'APPROVED')
    return result('NOT_RUN', evidenceLevel, 'REFERENCE_NOT_APPROVED');
  if (input.freshness !== 'CURRENT')
    return result('NOT_RUN', evidenceLevel, 'REFERENCE_STALE');
  if (capture.browser.webgl === 'UNAVAILABLE')
    return result('NOT_RUN', evidenceLevel, 'WEBGL_UNAVAILABLE');
  if (capture.browser.webgl === 'UNKNOWN')
    return result('NOT_RUN', evidenceLevel, 'ENVIRONMENT_UNKNOWN');
  if (isIncomplete(capture))
    return result('INSUFFICIENT_EVIDENCE', evidenceLevel, 'CAPTURE_INCOMPLETE');
  if (input.product.scenarioId !== capture.scenarioId)
    return result('FAIL', evidenceLevel, 'SCENARIO_MISMATCH');
  const hasGlobalDepthLimit = capture.observations.some(
    (observation) => observation.scan.depthLimitReached,
  );
  const hasGlobalIncompleteScan = capture.observations.some(
    (observation) => observation.scan.status !== 'COMPLETE',
  );
  const localMatchReason = hasGlobalDepthLimit
    ? 'TARGET_MATCHED_LOCAL_EVIDENCE_GLOBAL_DEPTH_LIMIT'
    : hasGlobalIncompleteScan
      ? 'TARGET_MATCHED_LOCAL_EVIDENCE_GLOBAL_SCAN_INCOMPLETE'
      : 'MATCHED';
  if (capture.targetId === 'none') {
    const unsupported =
      input.product.outcome === 'UNSUPPORTED' ||
      input.product.outcome === 'MISSING';
    return unsupported && input.product.targetId === null
      ? result('PASS', evidenceLevel, 'MATCHED')
      : result('FAIL', evidenceLevel, 'TARGET_WRONG');
  }

  if (capture.scenarioId === 'active-sketch') {
    const [before, after] = capture.observations;
    if (
      !before ||
      !after ||
      before.stateId !== 'BEFORE' ||
      after.stateId !== 'AFTER' ||
      before.humanState !== 'PART_STUDIO_READY' ||
      after.humanState !== 'SKETCH_ACTIVE' ||
      before.domState !== 'SKETCH_COMMAND_VISIBLE' ||
      after.domState !== 'SKETCH_CONTROLS_VISIBLE' ||
      !hasVisibleLabel(before, expectedLabel['sketch-command']) ||
      !hasVisibleLabel(after, expectedLabel['finish-sketch-command'])
    ) {
      return result(
        'INSUFFICIENT_EVIDENCE',
        evidenceLevel,
        'TRANSITION_UNVERIFIED',
      );
    }
  }

  const labels = expectedLabel[capture.targetId];
  const labelCount = countDistinctLabelBranches(capture, labels);
  if (labelCount === 0)
    return result('INSUFFICIENT_EVIDENCE', evidenceLevel, 'TARGET_MISSING');
  if (labelCount > 1)
    return result(
      'INSUFFICIENT_EVIDENCE',
      evidenceLevel,
      'REFERENCE_AMBIGUOUS',
    );

  if (capture.scenarioId === 'rectangle-dropdown') {
    if (capture.observations.length !== 2)
      return result(
        'INSUFFICIENT_EVIDENCE',
        evidenceLevel,
        'CAPTURE_INCOMPLETE',
      );
    const [before, after] = capture.observations;
    if (
      !before ||
      !after ||
      before.domState === 'UNKNOWN' ||
      after.domState !== 'MENU_VISIBLE'
    ) {
      return result(
        'INSUFFICIENT_EVIDENCE',
        evidenceLevel,
        'TRANSITION_UNVERIFIED',
      );
    }
    const transition = summarizeTransition(before, after);
    if (transition.status !== 'CONFIRMED')
      return result(
        'INSUFFICIENT_EVIDENCE',
        evidenceLevel,
        'TRANSITION_UNVERIFIED',
      );
    if (input.product.menuEvidence !== 'DOM_TRANSITION')
      return result('FAIL', evidenceLevel, 'TRANSITION_UNVERIFIED');
  }

  if (input.product.outcome === 'UNKNOWN')
    return result('INSUFFICIENT_EVIDENCE', evidenceLevel, 'RESULT_UNKNOWN');
  if (input.product.outcome === 'AMBIGUOUS')
    return result('FAIL', evidenceLevel, 'TARGET_AMBIGUOUS');
  if (input.product.outcome === 'MISSING')
    return result('FAIL', evidenceLevel, 'TARGET_MISSING');
  if (input.product.outcome === 'UNSUPPORTED')
    return result('FAIL', evidenceLevel, 'TARGET_UNSUPPORTED');
  if (input.product.targetId !== capture.targetId)
    return result('FAIL', evidenceLevel, 'TARGET_WRONG');
  if (input.product.highlight === 'INCORRECT')
    return result('FAIL', evidenceLevel, 'HIGHLIGHT_WRONG');
  if (
    capture.scenarioId === 'active-sketch' &&
    input.product.highlight === 'NOT_APPLICABLE'
  ) {
    return result('PASS', evidenceLevel, localMatchReason);
  }
  if (
    input.product.highlight === 'UNKNOWN' ||
    input.product.highlight === 'NOT_APPLICABLE'
  ) {
    return result('INSUFFICIENT_EVIDENCE', evidenceLevel, 'RESULT_UNKNOWN');
  }
  return result(
    'PASS',
    evidenceLevel,
    capture.scenarioId === 'active-sketch' ? localMatchReason : 'MATCHED',
  );
}
