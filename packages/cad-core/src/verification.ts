import {
  EvidenceSchema,
  FeatureConditionSchema,
  ModelSnapshotSchema,
  type Evidence,
  type EvidenceLevel,
  type FeatureCondition,
  type FeatureParameter,
  type ModelIdentity,
  type ModelSnapshot,
  type NormalizedFeature,
  type VerificationResult,
} from '@leqad/contracts';

const DETECTOR_VERSION = 'leqad-cad-core/0.1.0';

function sameDocument(left: ModelIdentity, right: ModelIdentity): boolean {
  return (
    left.documentId === right.documentId &&
    left.workspaceId === right.workspaceId &&
    left.elementId === right.elementId
  );
}

function unknownResult(
  expected: FeatureCondition,
  explanation: string,
  evidence: Evidence[] = [],
): VerificationResult {
  return {
    status: 'UNKNOWN',
    expected,
    actual: null,
    explanation,
    recoveryAction: 'Refresh the model snapshot and retry verification.',
    evidence,
  };
}

function evidenceFor(
  snapshot: ModelSnapshot,
  feature: NormalizedFeature,
): Evidence {
  const level: EvidenceLevel =
    snapshot.source === 'API'
      ? 'API_CONFIRMED'
      : snapshot.source === 'UI'
        ? 'UI_CONFIRMED'
        : 'INFERRED';

  return EvidenceSchema.parse({
    id: `${feature.id}:${snapshot.identity.revision ?? 'unversioned'}:${snapshot.observedAt}`,
    fact: {
      featureId: feature.id,
      featureType: feature.type,
      committed: feature.committed,
      parameters: feature.parameters,
    },
    source: snapshot.source,
    identity: snapshot.identity,
    revision: snapshot.identity.revision,
    observedAt: snapshot.observedAt,
    detectorVersion: DETECTOR_VERSION,
    expiresAt: snapshot.validUntil,
    level,
  });
}

function parameterComparison(
  actual: FeatureParameter | undefined,
  expected: FeatureParameter,
): 'MATCH' | 'MISMATCH' | 'UNKNOWN' {
  if (!actual) return 'UNKNOWN';
  if (expected.unit !== undefined && actual.unit === undefined)
    return 'UNKNOWN';
  if (expected.unit !== undefined && actual.unit !== expected.unit)
    return 'UNKNOWN';

  return Object.is(actual.value, expected.value) ? 'MATCH' : 'MISMATCH';
}

export function evaluateFeatureCondition(
  snapshotInput: ModelSnapshot,
  conditionInput: FeatureCondition,
  now: Date = new Date(),
): VerificationResult {
  const parsedSnapshot = ModelSnapshotSchema.safeParse(snapshotInput);
  const parsedCondition = FeatureConditionSchema.safeParse(conditionInput);

  if (!parsedSnapshot.success || !parsedCondition.success) {
    return unknownResult(
      conditionInput,
      'The model snapshot or condition is not valid normalized data.',
    );
  }

  const snapshot = parsedSnapshot.data;
  const condition = parsedCondition.data;

  if (!sameDocument(snapshot.identity, condition.identity)) {
    return unknownResult(
      condition,
      'The model snapshot belongs to a different document context.',
    );
  }
  if (
    snapshot.identity.revision === null ||
    condition.identity.revision === null ||
    snapshot.identity.revision !== condition.identity.revision
  ) {
    return unknownResult(
      condition,
      'The model snapshot does not match the active model revision.',
    );
  }
  if (Date.parse(snapshot.observedAt) > now.getTime()) {
    return unknownResult(
      condition,
      'The model snapshot timestamp is in the future.',
    );
  }
  if (
    snapshot.validUntil !== null &&
    Date.parse(snapshot.validUntil) <= now.getTime()
  ) {
    return unknownResult(condition, 'The model snapshot has expired.');
  }

  const matchingFeatures = snapshot.features.filter(
    (feature) => feature.type === condition.featureType && feature.committed,
  );
  if (matchingFeatures.length === 0) {
    if (snapshot.capabilities.completeFeatureList) {
      return {
        status: 'FAIL',
        expected: condition,
        actual: null,
        explanation: `No committed ${condition.featureType} feature was found in the complete feature list.`,
        recoveryAction:
          'Create and commit the required feature, then verify again.',
        evidence: [],
      };
    }
    return unknownResult(
      condition,
      'The feature list is incomplete, so the required feature cannot be confirmed.',
    );
  }

  const candidateEvidence = matchingFeatures.map((feature) =>
    evidenceFor(snapshot, feature),
  );
  let sawUnknown = false;
  let firstMismatch: FeatureParameter | null = null;

  for (const feature of matchingFeatures) {
    let allMatch = true;

    for (const [parameterName, expected] of Object.entries(
      condition.parameters,
    )) {
      const actual = feature.parameters[parameterName];
      const comparison = parameterComparison(actual, expected);

      if (comparison === 'UNKNOWN') {
        sawUnknown = true;
        allMatch = false;
      } else if (comparison === 'MISMATCH') {
        firstMismatch ??= actual ?? null;
        allMatch = false;
      }
    }

    if (allMatch) {
      return {
        status: 'PASS',
        expected: condition,
        actual: null,
        explanation: `A committed ${condition.featureType} feature matches all supported expected parameters.`,
        recoveryAction: null,
        evidence: [evidenceFor(snapshot, feature)],
      };
    }
  }

  if (sawUnknown) {
    return unknownResult(
      condition,
      'At least one expected feature parameter is unavailable or uses an unsupported unit.',
      candidateEvidence,
    );
  }

  return {
    status: 'FAIL',
    expected: condition,
    actual: firstMismatch,
    explanation:
      'The supported feature parameters do not match the expected values.',
    recoveryAction:
      'Review the feature dimensions and try the verification again.',
    evidence: candidateEvidence,
  };
}

export function isEvidenceCurrent(
  evidenceInput: Evidence,
  identityInput: ModelIdentity,
  currentRevision: string | null,
  now: Date = new Date(),
): boolean {
  const parsedEvidence = EvidenceSchema.safeParse(evidenceInput);
  if (!parsedEvidence.success || currentRevision === null) return false;

  const evidence = parsedEvidence.data;
  if (!sameDocument(evidence.identity, identityInput)) return false;
  if (
    identityInput.revision !== currentRevision ||
    evidence.revision !== currentRevision ||
    evidence.identity.revision !== currentRevision
  ) {
    return false;
  }
  if (Date.parse(evidence.observedAt) > now.getTime()) return false;
  if (
    evidence.expiresAt !== null &&
    Date.parse(evidence.expiresAt) <= now.getTime()
  )
    return false;

  return true;
}
