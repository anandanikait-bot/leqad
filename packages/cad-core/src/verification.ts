import {
  EvidenceRequirementSchema,
  EvidenceSchema,
  FeatureConditionSchema,
  ModelIdentitySchema,
  ModelSnapshotSchema,
  VerificationDecisionSchema,
  VerificationResultSchema,
  type Evidence,
  type EvidenceLevel,
  type EvidenceRequirement,
  type ExpectedFeatureParameter,
  type FeatureCondition,
  type FeatureParameter,
  type ModelIdentity,
  type ModelSnapshot,
  type NormalizedFeature,
  type VerificationDecision,
  type VerificationResult,
} from '@leqad/contracts';

const DETECTOR_VERSION = 'leqad-cad-core/0.2.0';

export interface EvidencePolicy {
  allowMockEvidence: boolean;
}

export const PRODUCTION_EVIDENCE_POLICY: Readonly<EvidencePolicy> = {
  allowMockEvidence: false,
};

const ACCEPTED_LEVELS: Readonly<
  Record<EvidenceRequirement, ReadonlySet<EvidenceLevel>>
> = {
  API_CONFIRMED: new Set(['API_CONFIRMED']),
  UI_CONFIRMED: new Set(['UI_CONFIRMED']),
  INFERRED: new Set(['API_CONFIRMED', 'UI_CONFIRMED', 'INFERRED']),
};

function sameDocument(left: ModelIdentity, right: ModelIdentity): boolean {
  return (
    left.documentId === right.documentId &&
    left.workspaceId === right.workspaceId &&
    left.elementId === right.elementId
  );
}

function evidenceLevelForSnapshot(snapshot: ModelSnapshot): EvidenceLevel {
  if (snapshot.source === 'API') return 'API_CONFIRMED';
  if (snapshot.source === 'UI') return 'UI_CONFIRMED';
  return 'INFERRED';
}

function evidenceForFact(
  snapshot: ModelSnapshot,
  evidenceId: string,
  fact: Record<string, unknown>,
): Evidence {
  return EvidenceSchema.parse({
    id: `${evidenceId}:${snapshot.identity.revision ?? 'unversioned'}:${snapshot.observedAt}`,
    fact,
    source: snapshot.source,
    identity: snapshot.identity,
    revision: snapshot.identity.revision,
    observedAt: snapshot.observedAt,
    detectorVersion: DETECTOR_VERSION,
    expiresAt: snapshot.validUntil,
    level: evidenceLevelForSnapshot(snapshot),
  });
}

function featureFact(feature: NormalizedFeature): Record<string, unknown> {
  return {
    featureId: feature.id,
    featureType: feature.type,
    committed: feature.committed,
    parameters: feature.parameters,
  };
}

function evidenceForFeature(
  snapshot: ModelSnapshot,
  feature: NormalizedFeature,
): Evidence {
  return evidenceForFact(snapshot, feature.id, featureFact(feature));
}

function supportingEvidenceSatisfies(
  evidence: readonly Evidence[],
  evidenceLevel: EvidenceLevel,
  requiredEvidence: EvidenceRequirement,
  policy: EvidencePolicy,
): boolean {
  if (!ACCEPTED_LEVELS[requiredEvidence].has(evidenceLevel)) return false;

  return evidence.some(
    (item) =>
      item.level === evidenceLevel &&
      (policy.allowMockEvidence || item.source !== 'MOCK'),
  );
}

export function evidenceSatisfiesRequirement(
  decisionInput: VerificationDecision,
  requirementInput: EvidenceRequirement,
  evaluatedAt: Date,
  policy: EvidencePolicy = PRODUCTION_EVIDENCE_POLICY,
): boolean {
  const decision = VerificationDecisionSchema.safeParse(decisionInput);
  const requirement = EvidenceRequirementSchema.safeParse(requirementInput);
  if (!decision.success || !requirement.success) return false;
  if (!Number.isFinite(evaluatedAt.getTime())) return false;

  const currentEvidence = decision.data.evidence.filter(
    (evidence) =>
      Date.parse(evidence.observedAt) <= evaluatedAt.getTime() &&
      (evidence.expiresAt === null ||
        Date.parse(evidence.expiresAt) > evaluatedAt.getTime()),
  );

  return supportingEvidenceSatisfies(
    currentEvidence,
    decision.data.evidenceLevel,
    requirement.data,
    policy,
  );
}

interface ResultDetails {
  status: VerificationResult['status'];
  evidenceLevel?: EvidenceLevel;
  observedFact?: Record<string, unknown> | null;
  explanation: string;
  missingRequirements?: string[];
  recoveryAction: string | null;
  evidence?: Evidence[];
  actual?: FeatureParameter | null;
}

function resultFor(
  snapshot: ModelSnapshot,
  expected: FeatureCondition,
  details: ResultDetails,
): VerificationResult {
  return VerificationResultSchema.parse({
    status: details.status,
    evidenceLevel: details.evidenceLevel ?? 'UNKNOWN',
    observedFact: details.observedFact ?? null,
    identity: expected.identity,
    observedAt: snapshot.observedAt,
    revision: expected.identity.revision,
    explanation: details.explanation,
    missingRequirements: details.missingRequirements ?? [],
    recoveryAction: details.recoveryAction,
    evidence: details.evidence ?? [],
    expected,
    actual: details.actual ?? null,
  });
}

function unknownResult(
  snapshot: ModelSnapshot,
  expected: FeatureCondition,
  explanation: string,
  missingRequirements: string[],
  evidence: Evidence[] = [],
  observedFact: Record<string, unknown> | null = null,
): VerificationResult {
  return resultFor(snapshot, expected, {
    status: 'UNKNOWN',
    evidenceLevel: evidence[0]?.level ?? 'UNKNOWN',
    observedFact,
    explanation,
    missingRequirements,
    recoveryAction: 'Refresh the relevant evidence and retry verification.',
    evidence,
  });
}

function evidenceRequirementLabel(requirement: EvidenceRequirement): string {
  return `${requirement} evidence from a production source`;
}

type ParameterComparison = 'MATCH' | 'MISMATCH' | 'UNKNOWN';

function parameterComparison(
  actual: FeatureParameter | undefined,
  expected: ExpectedFeatureParameter,
): ParameterComparison {
  if (!actual) return 'UNKNOWN';
  if (actual.unit !== expected.unit) return 'UNKNOWN';

  if (typeof actual.value === 'number' && typeof expected.value === 'number') {
    const tolerance = expected.tolerance ?? 0;
    return Math.abs(actual.value - expected.value) <= tolerance
      ? 'MATCH'
      : 'MISMATCH';
  }

  return Object.is(actual.value, expected.value) ? 'MATCH' : 'MISMATCH';
}

interface CandidateEvaluation {
  feature: NormalizedFeature;
  outcome: ParameterComparison;
  firstMismatch: FeatureParameter | null;
}

function evaluateCandidate(
  feature: NormalizedFeature,
  condition: FeatureCondition,
): CandidateEvaluation {
  let outcome: ParameterComparison = 'MATCH';
  let firstMismatch: FeatureParameter | null = null;

  for (const [parameterName, expected] of Object.entries(
    condition.parameters,
  )) {
    const actual = feature.parameters[parameterName];
    const comparison = parameterComparison(actual, expected);
    if (comparison === 'UNKNOWN') outcome = 'UNKNOWN';
    if (comparison === 'MISMATCH' && outcome !== 'UNKNOWN') {
      outcome = 'MISMATCH';
      firstMismatch ??= actual ?? null;
    }
  }

  return { feature, outcome, firstMismatch };
}

function combinedObservedFact(
  candidates: readonly CandidateEvaluation[],
): Record<string, unknown> | null {
  if (candidates.length === 0) return null;
  if (candidates.length === 1) return featureFact(candidates[0]!.feature);
  return { candidates: candidates.map(({ feature }) => featureFact(feature)) };
}

export function evaluateFeatureCondition(
  snapshotInput: ModelSnapshot,
  conditionInput: FeatureCondition,
  now: Date = new Date(),
  policy: EvidencePolicy = PRODUCTION_EVIDENCE_POLICY,
): VerificationResult {
  const snapshot = ModelSnapshotSchema.parse(snapshotInput);
  const condition = FeatureConditionSchema.parse(conditionInput);

  if (!Number.isFinite(now.getTime())) {
    return unknownResult(
      snapshot,
      condition,
      'Evidence freshness cannot be checked without a valid evaluation time.',
      ['A valid evaluation time'],
    );
  }

  if (!sameDocument(snapshot.identity, condition.identity)) {
    return unknownResult(
      snapshot,
      condition,
      'The model snapshot belongs to a different document context.',
      ['Evidence for the active document context'],
    );
  }
  if (
    snapshot.identity.revision === null ||
    condition.identity.revision === null ||
    snapshot.identity.revision !== condition.identity.revision
  ) {
    return unknownResult(
      snapshot,
      condition,
      'The model snapshot does not match the active model revision.',
      ['Evidence for the active model revision'],
    );
  }
  if (Date.parse(snapshot.observedAt) > now.getTime()) {
    return unknownResult(
      snapshot,
      condition,
      'The model snapshot timestamp is in the future.',
      ['A current observation timestamp'],
    );
  }
  if (
    snapshot.validUntil !== null &&
    Date.parse(snapshot.validUntil) <= now.getTime()
  ) {
    return unknownResult(
      snapshot,
      condition,
      'The model snapshot has expired.',
      ['Current, unexpired evidence'],
    );
  }

  const sameType = snapshot.features.filter(
    (feature) => feature.type === condition.featureType && feature.committed,
  );
  const matchingFeatures =
    condition.featureId === null
      ? sameType
      : sameType.filter((feature) => feature.id === condition.featureId);

  if (matchingFeatures.length === 0) {
    if (!snapshot.capabilities.completeFeatureList) {
      return unknownResult(
        snapshot,
        condition,
        'The feature list is incomplete, so the required feature cannot be confirmed.',
        ['A complete feature list'],
      );
    }

    const fact = {
      requestedFeatureId: condition.featureId,
      requestedFeatureType: condition.featureType,
      featurePresent: false,
      completeFeatureList: true,
    };
    const evidence = [evidenceForFact(snapshot, 'feature-list', fact)];
    const level = evidence[0]!.level;
    if (
      !supportingEvidenceSatisfies(
        evidence,
        level,
        condition.requiredEvidence,
        policy,
      )
    ) {
      return unknownResult(
        snapshot,
        condition,
        'The available feature-list evidence does not satisfy the required evidence policy.',
        [evidenceRequirementLabel(condition.requiredEvidence)],
        evidence,
        fact,
      );
    }

    return resultFor(snapshot, condition, {
      status: 'FAIL',
      evidenceLevel: level,
      observedFact: fact,
      explanation: `No committed ${condition.featureType} feature with the required identity was found in the complete feature list.`,
      recoveryAction:
        'Create and commit the intended feature, then verify it again.',
      evidence,
    });
  }

  const candidates = matchingFeatures.map((feature) =>
    evaluateCandidate(feature, condition),
  );
  const evidence = candidates.map(({ feature }) =>
    evidenceForFeature(snapshot, feature),
  );
  const evidenceLevel = evidence[0]!.level;
  const observedFact = combinedObservedFact(candidates);

  if (
    !supportingEvidenceSatisfies(
      evidence,
      evidenceLevel,
      condition.requiredEvidence,
      policy,
    )
  ) {
    return unknownResult(
      snapshot,
      condition,
      'The observed feature does not satisfy the required evidence policy.',
      [evidenceRequirementLabel(condition.requiredEvidence)],
      evidence,
      observedFact,
    );
  }

  const outcomes = new Set(candidates.map(({ outcome }) => outcome));
  if (
    condition.featureId === null &&
    candidates.length > 1 &&
    outcomes.size > 1
  ) {
    return unknownResult(
      snapshot,
      condition,
      'Multiple same-type features provide contradictory or incomplete evidence; identify the intended feature before completing the condition.',
      ['The identity of the intended feature'],
      evidence,
      observedFact,
    );
  }

  if (outcomes.has('UNKNOWN')) {
    return unknownResult(
      snapshot,
      condition,
      'At least one expected feature parameter is unavailable or uses an unsupported unit.',
      ['Comparable values in the same supported unit'],
      evidence,
      observedFact,
    );
  }

  if (outcomes.size === 1 && outcomes.has('MATCH')) {
    return resultFor(snapshot, condition, {
      status: 'PASS',
      evidenceLevel,
      observedFact,
      explanation: `The committed ${condition.featureType} feature matches all supported expected parameters.`,
      recoveryAction: null,
      evidence,
    });
  }

  return resultFor(snapshot, condition, {
    status: 'FAIL',
    evidenceLevel,
    observedFact,
    explanation:
      'The supported feature parameters do not match the expected values.',
    recoveryAction:
      'Review the intended feature dimensions and try the verification again.',
    evidence,
    actual:
      candidates.find(({ firstMismatch }) => firstMismatch !== null)
        ?.firstMismatch ?? null,
  });
}

export function isEvidenceCurrent(
  evidenceInput: Evidence,
  identityInput: ModelIdentity,
  currentRevision: string | null,
  now: Date = new Date(),
): boolean {
  const parsedEvidence = EvidenceSchema.safeParse(evidenceInput);
  const parsedIdentity = ModelIdentitySchema.safeParse(identityInput);
  if (
    !parsedEvidence.success ||
    !parsedIdentity.success ||
    currentRevision === null ||
    !Number.isFinite(now.getTime())
  ) {
    return false;
  }

  const evidence = parsedEvidence.data;
  const identity = parsedIdentity.data;
  if (!sameDocument(evidence.identity, identity)) return false;
  if (
    identity.revision !== currentRevision ||
    evidence.revision !== currentRevision ||
    evidence.identity.revision !== currentRevision
  ) {
    return false;
  }
  if (Date.parse(evidence.observedAt) > now.getTime()) return false;
  if (
    evidence.expiresAt !== null &&
    Date.parse(evidence.expiresAt) <= now.getTime()
  ) {
    return false;
  }

  return true;
}
