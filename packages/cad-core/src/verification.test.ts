import { describe, expect, it } from 'vitest';
import type {
  Evidence,
  FeatureCondition,
  ModelIdentity,
  ModelSnapshot,
  VerificationDecision,
} from '@leqad/contracts';

const activeIdentity: ModelIdentity = {
  documentId: 'document-a',
  workspaceId: 'workspace-a',
  elementId: 'element-a',
  revision: 'revision-a',
};
const currentTime = new Date('2026-10-13T12:00:00.000Z');

function snapshot(overrides: Partial<ModelSnapshot> = {}): ModelSnapshot {
  return {
    identity: activeIdentity,
    observedAt: '2026-10-13T11:59:00.000Z',
    validUntil: '2026-10-13T12:00:30.000Z',
    source: 'API',
    features: [
      {
        id: 'extrude-1',
        type: 'Extrusion',
        committed: true,
        parameters: { depth: { value: 5, unit: 'mm' } },
      },
    ],
    warnings: [],
    capabilities: { completeFeatureList: true },
    ...overrides,
  };
}

function condition(
  overrides: Partial<FeatureCondition> = {},
): FeatureCondition {
  return {
    identity: activeIdentity,
    featureId: 'extrude-1',
    featureType: 'Extrusion',
    requiredEvidence: 'API_CONFIRMED',
    parameters: { depth: { value: 5, unit: 'mm' } },
    ...overrides,
  };
}

describe('evaluateFeatureCondition trust boundaries', () => {
  it('does not let mock evidence satisfy an API-confirmed production requirement', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const result = evaluateFeatureCondition(
      snapshot({ source: 'MOCK' }),
      condition(),
      currentTime,
    );

    expect(result.status).toBe('UNKNOWN');
    expect(result.evidenceLevel).toBe('INFERRED');
    expect(result.missingRequirements).toContain(
      'API_CONFIRMED evidence from a production source',
    );
  });

  it('does not let UI evidence satisfy an API-confirmed requirement', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const result = evaluateFeatureCondition(
      snapshot({ source: 'UI' }),
      condition(),
      currentTime,
    );

    expect(result.status).toBe('UNKNOWN');
    expect(result.evidenceLevel).toBe('UI_CONFIRMED');
  });

  it.each(['UI_CONFIRMED', 'API_CONFIRMED'] as const)(
    'does not let inferred evidence satisfy a %s requirement',
    async (requiredEvidence) => {
      const { evaluateFeatureCondition } = await import('./verification');
      const result = evaluateFeatureCondition(
        snapshot({ source: 'INFERRED' }),
        condition({ requiredEvidence }),
        currentTime,
      );

      expect(result.status).toBe('UNKNOWN');
      expect(result.evidenceLevel).toBe('INFERRED');
    },
  );

  it('allows mock evidence only under an explicit fixture policy and only at inferred level', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const result = evaluateFeatureCondition(
      snapshot({ source: 'MOCK' }),
      condition({ requiredEvidence: 'INFERRED' }),
      currentTime,
      { allowMockEvidence: true },
    );

    expect(result.status).toBe('PASS');
    expect(result.evidence[0]).toMatchObject({
      source: 'MOCK',
      level: 'INFERRED',
    });
  });

  it('returns unknown when normalized evidence is missing', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const result = evaluateFeatureCondition(
      snapshot({
        features: [],
        capabilities: { completeFeatureList: false },
      }),
      condition(),
      currentTime,
    );

    expect(result.status).toBe('UNKNOWN');
    expect(result.evidenceLevel).toBe('UNKNOWN');
    expect(result.observedFact).toBeNull();
    expect(result.missingRequirements).not.toHaveLength(0);
  });

  it('returns unknown for stale, wrong-document, and wrong-revision evidence', async () => {
    const { evaluateFeatureCondition } = await import('./verification');

    expect(
      evaluateFeatureCondition(
        snapshot(),
        condition(),
        new Date('2026-10-13T12:00:31.000Z'),
      ).status,
    ).toBe('UNKNOWN');
    expect(
      evaluateFeatureCondition(
        snapshot({
          identity: { ...activeIdentity, documentId: 'document-b' },
        }),
        condition(),
        currentTime,
      ).missingRequirements,
    ).toContain('Evidence for the active document context');
    expect(
      evaluateFeatureCondition(
        snapshot({
          identity: { ...activeIdentity, revision: 'revision-old' },
        }),
        condition(),
        currentTime,
      ).missingRequirements,
    ).toContain('Evidence for the active model revision');
  });
});

describe('evaluateFeatureCondition matching', () => {
  it('passes matching supported normalized evidence with a complete decision', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const result = evaluateFeatureCondition(
      snapshot(),
      condition(),
      currentTime,
    );

    expect(result).toMatchObject({
      status: 'PASS',
      evidenceLevel: 'API_CONFIRMED',
      identity: activeIdentity,
      observedAt: '2026-10-13T11:59:00.000Z',
      revision: 'revision-a',
      missingRequirements: [],
      recoveryAction: null,
      observedFact: { featureId: 'extrude-1', featureType: 'Extrusion' },
    });
  });

  it('does not satisfy a feature-specific condition with a different feature', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const result = evaluateFeatureCondition(
      snapshot(),
      condition({ featureId: 'extrude-intended' }),
      currentTime,
    );

    expect(result.status).toBe('FAIL');
    expect(result.observedFact).toMatchObject({
      requestedFeatureId: 'extrude-intended',
      featurePresent: false,
    });
  });

  it('does not choose success when same-type evidence contradicts it', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const result = evaluateFeatureCondition(
      snapshot({
        features: [
          {
            id: 'extrude-1',
            type: 'Extrusion',
            committed: true,
            parameters: { depth: { value: 5, unit: 'mm' } },
          },
          {
            id: 'extrude-2',
            type: 'Extrusion',
            committed: true,
            parameters: { depth: { value: 8, unit: 'mm' } },
          },
        ],
      }),
      condition({ featureId: null }),
      currentTime,
    );

    expect(result.status).toBe('UNKNOWN');
    expect(result.explanation).toContain('contradictory');
  });

  it('keeps unsupported units and missing parameters unknown', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const unsupportedUnit = evaluateFeatureCondition(
      snapshot(),
      condition({ parameters: { depth: { value: 0.5, unit: 'cm' } } }),
      currentTime,
    );
    const missingParameter = evaluateFeatureCondition(
      snapshot({
        features: [
          {
            id: 'extrude-1',
            type: 'Extrusion',
            committed: true,
            parameters: {},
          },
        ],
      }),
      condition(),
      currentTime,
    );

    expect(unsupportedUnit.status).toBe('UNKNOWN');
    expect(unsupportedUnit.missingRequirements).toContain(
      'Comparable values in the same supported unit',
    );
    expect(missingParameter.status).toBe('UNKNOWN');
  });

  it('uses only an explicitly declared numerical tolerance', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const model = snapshot({
      features: [
        {
          id: 'extrude-1',
          type: 'Extrusion',
          committed: true,
          parameters: { depth: { value: 5.0004, unit: 'mm' } },
        },
      ],
    });

    expect(
      evaluateFeatureCondition(model, condition(), currentTime).status,
    ).toBe('FAIL');
    expect(
      evaluateFeatureCondition(
        model,
        condition({
          parameters: { depth: { value: 5, unit: 'mm', tolerance: 0.001 } },
        }),
        currentTime,
      ).status,
    ).toBe('PASS');
  });
});

describe('evidenceSatisfiesRequirement', () => {
  function decision(
    level: VerificationDecision['evidenceLevel'],
    source: Evidence['source'],
  ): VerificationDecision {
    const supportingEvidence: Evidence = {
      id: 'evidence-1',
      fact: { selected: true },
      source,
      identity: activeIdentity,
      revision: 'revision-a',
      observedAt: '2026-10-13T11:59:00.000Z',
      detectorVersion: 'test/1.0.0',
      expiresAt: '2026-10-13T12:00:30.000Z',
      level,
    };
    return {
      status: 'PASS',
      evidenceLevel: level,
      observedFact: supportingEvidence.fact,
      identity: activeIdentity,
      observedAt: supportingEvidence.observedAt,
      revision: 'revision-a',
      explanation: 'The supported observation matches.',
      missingRequirements: [],
      recoveryAction: null,
      evidence: [supportingEvidence],
    };
  }

  it('uses a deliberate level policy and rejects missing support', async () => {
    const { evidenceSatisfiesRequirement } = await import('./verification');
    const uiDecision = decision('UI_CONFIRMED', 'UI');

    expect(
      evidenceSatisfiesRequirement(uiDecision, 'UI_CONFIRMED', currentTime),
    ).toBe(true);
    expect(
      evidenceSatisfiesRequirement(uiDecision, 'API_CONFIRMED', currentTime),
    ).toBe(false);
    expect(
      evidenceSatisfiesRequirement(
        decision('INFERRED', 'INFERRED'),
        'UI_CONFIRMED',
        currentTime,
      ),
    ).toBe(false);
    expect(
      evidenceSatisfiesRequirement(
        { ...uiDecision, evidence: [] },
        'UI_CONFIRMED',
        currentTime,
      ),
    ).toBe(false);
  });
});

describe('isEvidenceCurrent', () => {
  const evidence: Evidence = {
    id: 'evidence-1',
    fact: { featureId: 'extrude-1' },
    source: 'API',
    identity: activeIdentity,
    revision: 'revision-a',
    observedAt: '2026-10-13T11:59:00.000Z',
    detectorVersion: '1.0.0',
    expiresAt: '2026-10-13T12:00:30.000Z',
    level: 'API_CONFIRMED',
  };

  it('accepts only current evidence for the active document and revision', async () => {
    const { isEvidenceCurrent } = await import('./verification');

    expect(
      isEvidenceCurrent(evidence, activeIdentity, 'revision-a', currentTime),
    ).toBe(true);
    expect(
      isEvidenceCurrent(
        evidence,
        { ...activeIdentity, documentId: 'document-b' },
        'revision-a',
        currentTime,
      ),
    ).toBe(false);
    expect(
      isEvidenceCurrent(evidence, activeIdentity, 'revision-b', currentTime),
    ).toBe(false);
    expect(
      isEvidenceCurrent(
        evidence,
        activeIdentity,
        'revision-a',
        new Date('2026-10-13T12:00:31.000Z'),
      ),
    ).toBe(false);
  });
});
