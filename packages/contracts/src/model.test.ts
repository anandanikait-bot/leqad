import { describe, expect, it } from 'vitest';
import { EvidenceSchema, VerificationDecisionSchema } from './model';

const identity = {
  documentId: 'document-a',
  workspaceId: 'workspace-a',
  elementId: 'element-a',
  revision: 'revision-a',
};

describe('evidence contracts', () => {
  it('rejects invalid serialized evidence', () => {
    const result = EvidenceSchema.safeParse({
      id: 'evidence-1',
      fact: { selected: true },
      source: 'MOCK',
      identity,
      revision: 'revision-a',
      observedAt: 'not-a-timestamp',
      detectorVersion: 'test/1.0.0',
      expiresAt: null,
      level: 'API_CONFIRMED',
    });

    expect(result.success).toBe(false);
  });

  it('rejects an evidence level that its source cannot support', () => {
    const result = EvidenceSchema.safeParse({
      id: 'evidence-1',
      fact: { selected: true },
      source: 'MOCK',
      identity,
      revision: 'revision-a',
      observedAt: '2026-10-13T11:59:00.000Z',
      detectorVersion: 'test/1.0.0',
      expiresAt: null,
      level: 'API_CONFIRMED',
    });

    expect(result.success).toBe(false);
  });

  it('rejects a serialized decision that omits required decision facts', () => {
    const result = VerificationDecisionSchema.safeParse({
      status: 'PASS',
      explanation: 'Looks correct.',
      evidence: [],
    });

    expect(result.success).toBe(false);
  });
});
