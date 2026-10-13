import {
  EvidenceSchema,
  VerificationDecisionSchema,
  type Evidence,
  type ModelIdentity,
  type VerificationDecision,
} from '@leqad/contracts';
import type { OnshapePageContext } from './onshapePage';
import {
  findSelectedSemanticTarget,
  findSemanticTarget,
} from './semanticTargets';

const DETECTOR_VERSION = 'leqad-foundations-ui/0.2.0';

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

function uiEvidence(
  id: string,
  fact: Record<string, unknown>,
  identity: ModelIdentity,
  observedAt: string,
): Evidence {
  return EvidenceSchema.parse({
    id: `${id}:${identity.documentId}:${identity.elementId}:${observedAt}`,
    fact,
    source: 'UI',
    identity,
    revision: identity.revision,
    observedAt,
    detectorVersion: DETECTOR_VERSION,
    expiresAt: new Date(Date.parse(observedAt) + 5_000).toISOString(),
    level: 'UI_CONFIRMED',
  });
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
      'Return to the supported lesson context, then check progress again.',
    evidence: [],
  });
}

export function evaluateFoundationsSketchProgress(
  page: OnshapePageContext,
  root: ParentNode,
  now: Date = new Date(),
): VerificationDecision {
  const identity = identityForPage(page);
  if (
    !identity ||
    !page.editable ||
    page.modelType !== 'workspace' ||
    !page.workspaceId
  ) {
    return unavailableFoundationsDecision(
      page,
      'Leqad cannot confirm an editable workspace context for this observation.',
      ['A confirmed editable workspace context'],
      now,
    );
  }

  const observedAt = now.toISOString();
  const topPlane = findSemanticTarget(root, 'top-plane');
  const selectedTopPlane = findSelectedSemanticTarget(root, 'top-plane');
  const finishSketchControl = findSemanticTarget(root, 'finish-sketch');
  const fact = {
    topPlaneRecognized: topPlane !== null,
    topPlaneSelected: selectedTopPlane !== null,
    sketchEditingAppearsActive: finishSketchControl !== null,
    activeSketchPlaneAssociationVerified: false,
    sketchGeometryVerified: false,
    committedSketchVerified: false,
  };
  const evidence: Evidence[] = [];
  if (topPlane) {
    evidence.push(
      uiEvidence(
        'top-plane-state',
        {
          semanticTarget: 'top-plane',
          recognized: true,
          selected: selectedTopPlane !== null,
        },
        identity,
        observedAt,
      ),
    );
  }
  if (finishSketchControl) {
    evidence.push(
      uiEvidence(
        'sketch-controls-state',
        {
          semanticTarget: 'finish-sketch',
          visible: true,
          sketchEditingAppearsActive: true,
        },
        identity,
        observedAt,
      ),
    );
  }

  const missingRequirements: string[] = [];
  if (!selectedTopPlane) {
    missingRequirements.push('A selected Top plane control');
  }
  if (!finishSketchControl) {
    missingRequirements.push('Recognized active sketch-editing controls');
  }

  if (missingRequirements.length > 0) {
    return VerificationDecisionSchema.parse({
      status: 'UNKNOWN',
      evidenceLevel: evidence.length > 0 ? 'UI_CONFIRMED' : 'UNKNOWN',
      observedFact: fact,
      identity,
      observedAt,
      revision: identity.revision,
      explanation:
        'The current interface does not expose all supported UI observations for this step.',
      missingRequirements,
      recoveryAction:
        'Select the Top plane and enter sketch editing, then check progress again.',
      evidence,
    });
  }

  return VerificationDecisionSchema.parse({
    status: 'PASS',
    evidenceLevel: 'UI_CONFIRMED',
    observedFact: fact,
    identity,
    observedAt,
    revision: identity.revision,
    explanation:
      'The interface confirms a selected Top plane control and active sketch-editing controls. It does not verify the active sketch plane association, geometry, or committed model state.',
    missingRequirements: [],
    recoveryAction: null,
    evidence,
  });
}
