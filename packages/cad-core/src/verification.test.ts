import { describe, expect, it } from 'vitest';
import type {
  Evidence,
  FeatureCondition,
  ModelIdentity,
  ModelSnapshot,
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
    source: 'MOCK',
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
  parameters: FeatureCondition['parameters'] = {
    depth: { value: 5, unit: 'mm' },
  },
): FeatureCondition {
  return {
    identity: activeIdentity,
    featureType: 'Extrusion',
    parameters,
  };
}

describe('evaluateFeatureCondition', () => {
  it('passes only when the current committed feature has the supported expected parameter', async () => {
    const { evaluateFeatureCondition } = await import('./verification');

    const result = evaluateFeatureCondition(
      snapshot(),
      condition(),
      currentTime,
    );

    expect(result.status).toBe('PASS');
    expect(result.evidence[0]?.level).toBe('INFERRED');
    expect(result.evidence[0]?.source).toBe('MOCK');
  });

  it('fails when a supported feature parameter differs from the expected value', async () => {
    const { evaluateFeatureCondition } = await import('./verification');

    const result = evaluateFeatureCondition(
      snapshot(),
      condition({ depth: { value: 6, unit: 'mm' } }),
      currentTime,
    );

    expect(result.status).toBe('FAIL');
    expect(result.actual).toEqual({ value: 5, unit: 'mm' });
  });

  it('returns unknown when an expected parameter is unavailable', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const model = snapshot({
      features: [
        { id: 'extrude-1', type: 'Extrusion', committed: true, parameters: {} },
      ],
    });

    const result = evaluateFeatureCondition(model, condition(), currentTime);

    expect(result.status).toBe('UNKNOWN');
  });

  it('returns unknown when the model snapshot belongs to a different active revision', async () => {
    const { evaluateFeatureCondition } = await import('./verification');
    const model = snapshot({
      identity: { ...activeIdentity, revision: 'revision-old' },
    });

    const result = evaluateFeatureCondition(model, condition(), currentTime);

    expect(result.status).toBe('UNKNOWN');
  });

  it('returns unknown after the snapshot validity window expires', async () => {
    const { evaluateFeatureCondition } = await import('./verification');

    const result = evaluateFeatureCondition(
      snapshot(),
      condition(),
      new Date('2026-10-13T12:00:31.000Z'),
    );

    expect(result.status).toBe('UNKNOWN');
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

  it('accepts evidence while its document, revision, and expiry still match', async () => {
    const { isEvidenceCurrent } = await import('./verification');

    expect(
      isEvidenceCurrent(evidence, activeIdentity, 'revision-a', currentTime),
    ).toBe(true);
  });

  it('rejects evidence from a different document or model revision', async () => {
    const { isEvidenceCurrent } = await import('./verification');

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
  });

  it('rejects evidence after its expiration time', async () => {
    const { isEvidenceCurrent } = await import('./verification');

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
