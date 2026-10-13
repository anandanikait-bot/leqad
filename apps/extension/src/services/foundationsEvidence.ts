import {
  EvidenceSchema,
  VerificationDecisionSchema,
  type Evidence,
  type ModelIdentity,
  type VerificationDecision,
} from '@leqad/contracts';
import type { OnshapePageContext } from './onshapePage';
import {
  findSelectedSemanticTargets,
  findSemanticTarget,
  findSemanticTargets,
} from './semanticTargets';

const DETECTOR_VERSION = 'leqad-foundations-ui/0.3.0';
const UI_EVIDENCE_LIFETIME_MS = 5_000;

export interface FoundationsSketchUiObservation {
  identity: ModelIdentity | null;
  observedAt: string;
  expiresAt: string;
  topPlaneControlCount: number;
  topPlaneSelected: boolean;
  selectedOtherPlanes: Array<'front-plane' | 'right-plane'>;
  sketchEditingAppearsActive: boolean;
  activeSketchPlaneAssociation: 'unknown';
  sketchGeometry: 'unknown';
  committedSketch: 'unknown';
  evidence: Evidence[];
}

function identityForPage(page: OnshapePageContext): ModelIdentity | null {
  if (
    !page.supported ||
    !page.documentId ||
    !page.workspaceId ||
    !page.elementId
  ) {
    return null;
  }

  return {
    documentId: page.documentId,
    workspaceId: page.workspaceId,
    elementId: page.elementId,
    revision: null,
  };
}

function sameDocument(
  left: ModelIdentity | null,
  right: ModelIdentity | null,
): boolean {
  if (!left || !right) return false;
  return (
    left.documentId === right.documentId &&
    left.workspaceId === right.workspaceId &&
    left.elementId === right.elementId
  );
}

function uiEvidence(
  id: string,
  fact: Record<string, unknown>,
  identity: ModelIdentity,
  observedAt: string,
  expiresAt: string,
): Evidence {
  return EvidenceSchema.parse({
    id: `${id}:${identity.documentId}:${identity.elementId}:${observedAt}`,
    fact,
    source: 'UI',
    identity,
    revision: identity.revision,
    observedAt,
    detectorVersion: DETECTOR_VERSION,
    expiresAt,
    level: 'UI_CONFIRMED',
  });
}

function observedFact(
  observation: FoundationsSketchUiObservation,
): Record<string, unknown> {
  return {
    topPlaneControlCount: observation.topPlaneControlCount,
    topPlaneSelected: observation.topPlaneSelected,
    selectedOtherPlanes: observation.selectedOtherPlanes,
    sketchEditingAppearsActive: observation.sketchEditingAppearsActive,
    activeSketchPlaneAssociation: observation.activeSketchPlaneAssociation,
    sketchGeometry: observation.sketchGeometry,
    committedSketch: observation.committedSketch,
  };
}

export function unavailableFoundationsDecision(
  page: OnshapePageContext | undefined,
  explanation: string,
  missingRequirements: string[],
  now: Date = new Date(),
): VerificationDecision {
  const identity = page ? identityForPage(page) : null;
  return VerificationDecisionSchema.parse({
    status: 'UNKNOWN',
    evidenceLevel: 'UNKNOWN',
    observedFact: null,
    identity,
    observedAt: now.toISOString(),
    revision: identity?.revision ?? null,
    explanation,
    missingRequirements,
    recoveryAction:
      'Return to a confirmed editable Part Studio, then check progress again.',
    evidence: [],
  });
}

export function observeFoundationsSketchUi(
  page: OnshapePageContext,
  root: ParentNode,
  now: Date = new Date(),
): FoundationsSketchUiObservation {
  const identity = identityForPage(page);
  const observedAt = now.toISOString();
  const expiresAt = new Date(
    now.getTime() + UI_EVIDENCE_LIFETIME_MS,
  ).toISOString();
  const topPlaneControls = findSemanticTargets(root, 'top-plane');
  const selectedTopPlanes = findSelectedSemanticTargets(root, 'top-plane');
  const selectedOtherPlanes = (['front-plane', 'right-plane'] as const).filter(
    (targetId) => findSelectedSemanticTargets(root, targetId).length > 0,
  );
  const sketchEditingAppearsActive =
    findSemanticTarget(root, 'finish-sketch') !== null;
  const evidence: Evidence[] = [];

  if (identity && topPlaneControls.length > 0) {
    evidence.push(
      uiEvidence(
        'top-plane-state',
        {
          semanticTarget: 'top-plane',
          controlCount: topPlaneControls.length,
          selectedCount: selectedTopPlanes.length,
        },
        identity,
        observedAt,
        expiresAt,
      ),
    );
  }
  if (identity && selectedOtherPlanes.length > 0) {
    evidence.push(
      uiEvidence(
        'other-plane-selection',
        { selectedOtherPlanes },
        identity,
        observedAt,
        expiresAt,
      ),
    );
  }
  if (identity && sketchEditingAppearsActive) {
    evidence.push(
      uiEvidence(
        'sketch-controls-state',
        {
          semanticTarget: 'finish-sketch',
          sketchEditingAppearsActive: true,
        },
        identity,
        observedAt,
        expiresAt,
      ),
    );
  }

  return {
    identity,
    observedAt,
    expiresAt,
    topPlaneControlCount: topPlaneControls.length,
    topPlaneSelected: selectedTopPlanes.length === 1,
    selectedOtherPlanes,
    sketchEditingAppearsActive,
    activeSketchPlaneAssociation: 'unknown',
    sketchGeometry: 'unknown',
    committedSketch: 'unknown',
    evidence,
  };
}

function evaluateFoundationsObservation(
  page: OnshapePageContext,
  observation: FoundationsSketchUiObservation,
  requireSketchEditing: boolean,
  now: Date = new Date(),
): VerificationDecision {
  const activeIdentity = identityForPage(page);
  if (
    !activeIdentity ||
    page.modelType !== 'workspace' ||
    page.editability !== 'editable' ||
    page.elementType !== 'part-studio'
  ) {
    return unavailableFoundationsDecision(
      page,
      'Leqad cannot confirm an editable Part Studio for this observation.',
      ['A confirmed editable Part Studio context'],
      now,
    );
  }

  if (!sameDocument(activeIdentity, observation.identity)) {
    return unavailableFoundationsDecision(
      page,
      'The sketch UI observation belongs to a different document context.',
      ['UI evidence for the active document context'],
      now,
    );
  }

  if (
    !Number.isFinite(now.getTime()) ||
    Date.parse(observation.observedAt) > now.getTime() ||
    Date.parse(observation.expiresAt) <= now.getTime()
  ) {
    return VerificationDecisionSchema.parse({
      status: 'UNKNOWN',
      evidenceLevel: 'UNKNOWN',
      observedFact: observedFact(observation),
      identity: activeIdentity,
      observedAt: observation.observedAt,
      revision: activeIdentity.revision,
      explanation: 'The sketch UI observation is no longer current.',
      missingRequirements: ['Current UI evidence'],
      recoveryAction: 'Check the current interface state again.',
      evidence: [],
    });
  }

  const missingRequirements: string[] = [];
  if (observation.topPlaneControlCount === 0) {
    missingRequirements.push('A recognized Top plane control');
  }
  if (observation.topPlaneControlCount > 1) {
    missingRequirements.push('One unambiguous Top plane control');
  }
  if (!observation.topPlaneSelected) {
    missingRequirements.push('A selected Top plane control');
  }
  if (observation.selectedOtherPlanes.length > 0) {
    missingRequirements.push('No contradictory selected reference plane');
  }
  if (requireSketchEditing && !observation.sketchEditingAppearsActive) {
    missingRequirements.push('Recognized active sketch-editing controls');
  }

  const fact = observedFact(observation);
  if (missingRequirements.length > 0) {
    return VerificationDecisionSchema.parse({
      status: 'UNKNOWN',
      evidenceLevel:
        observation.evidence.length > 0 ? 'UI_CONFIRMED' : 'UNKNOWN',
      observedFact: fact,
      identity: activeIdentity,
      observedAt: observation.observedAt,
      revision: activeIdentity.revision,
      explanation:
        'The current interface does not expose one unambiguous supported UI state for this step.',
      missingRequirements,
      recoveryAction: requireSketchEditing
        ? 'Select only the intended Top plane and enter sketch editing, then check progress again.'
        : 'Select only the intended Top plane, then check progress again.',
      evidence: observation.evidence,
    });
  }

  return VerificationDecisionSchema.parse({
    status: 'PASS',
    evidenceLevel: 'UI_CONFIRMED',
    observedFact: fact,
    identity: activeIdentity,
    observedAt: observation.observedAt,
    revision: activeIdentity.revision,
    explanation: requireSketchEditing
      ? 'The interface confirms one selected Top plane control and active sketch-editing controls. This supported UI state does not verify the active sketch plane association, sketch geometry, or committed model state.'
      : 'The interface confirms one selected Top plane control with no contradictory selected reference plane. This does not claim that sketch editing has started.',
    missingRequirements: [],
    recoveryAction: null,
    evidence: observation.evidence,
  });
}

export function evaluateFoundationsPlaneObservation(
  page: OnshapePageContext,
  observation: FoundationsSketchUiObservation,
  now: Date = new Date(),
): VerificationDecision {
  return evaluateFoundationsObservation(page, observation, false, now);
}

export function evaluateFoundationsSketchObservation(
  page: OnshapePageContext,
  observation: FoundationsSketchUiObservation,
  now: Date = new Date(),
): VerificationDecision {
  return evaluateFoundationsObservation(page, observation, true, now);
}

export function evaluateFoundationsPlaneProgress(
  page: OnshapePageContext,
  root: ParentNode,
  now: Date = new Date(),
): VerificationDecision {
  return evaluateFoundationsPlaneObservation(
    page,
    observeFoundationsSketchUi(page, root, now),
    now,
  );
}

export function evaluateFoundationsSketchProgress(
  page: OnshapePageContext,
  root: ParentNode,
  now: Date = new Date(),
): VerificationDecision {
  return evaluateFoundationsSketchObservation(
    page,
    observeFoundationsSketchUi(page, root, now),
    now,
  );
}
