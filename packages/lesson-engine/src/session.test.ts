import { describe, expect, it } from 'vitest';
import type { LessonSession, LessonStepState } from './types';

const currentIdentity = {
  documentId: 'document-a',
  workspaceId: 'workspace-a',
  elementId: 'element-a',
  revision: 'revision-a',
};

const completedStep: LessonStepState = {
  status: 'COMPLETED',
  hintLevel: 2,
  verification: 'PASS',
  resumeState: null,
  outcome: 'MODEL_VERIFIED',
};

function session(): LessonSession {
  return {
    lessonId: 'mounting-plate',
    lessonVersion: '1.0.0',
    currentStepId: 'extrude',
    modelIdentity: currentIdentity,
    modelRevision: 'revision-a',
    modelState: {
      observedUiStates: {
        sketch: {
          fact: { sketchEditingAppearsActive: true },
          observedAt: '2026-10-13T10:59:00.000Z',
          expiresAt: '2026-10-13T11:01:00.000Z',
          evidenceIds: ['ui-evidence-1'],
        },
      },
      verifiedModelStates: {
        extrude: {
          status: 'PASS',
          observedAt: '2026-10-13T10:59:00.000Z',
          revision: 'revision-a',
          evidenceIds: ['api-evidence-1'],
        },
      },
      evidenceReferences: ['ui-evidence-1', 'api-evidence-1'],
      evidenceFreshness: 'current',
      uncertaintyReason: null,
    },
    updatedAt: '2026-10-13T11:00:00.000Z',
    steps: { sketch: completedStep },
  };
}

describe('reconcileSession', () => {
  const now = new Date('2026-10-13T12:00:00.000Z');

  it('invalidates completed steps after the active model revision changes', async () => {
    const { reconcileSession } = await import('./session');
    const nextIdentity = { ...currentIdentity, revision: 'revision-b' };

    const result = reconcileSession(session(), nextIdentity, 'revision-b', now);

    expect(result.steps.sketch?.status).toBe('UNKNOWN');
    expect(result.steps.sketch?.verification).toBe('UNKNOWN');
    expect(result.steps.sketch?.hintLevel).toBe(2);
    expect(result.currentStepId).toBe('extrude');
    expect(result.modelState).toEqual({
      observedUiStates: {},
      verifiedModelStates: {},
      evidenceReferences: [],
      evidenceFreshness: 'unknown',
      uncertaintyReason:
        'Model-dependent progress needs to be checked against the current revision.',
    });
    expect(result.updatedAt).toBe(now.toISOString());
  });

  it('invalidates completed steps when the document identity changes', async () => {
    const { reconcileSession } = await import('./session');
    const nextIdentity = {
      ...currentIdentity,
      documentId: 'document-b',
      revision: 'revision-b',
    };

    const result = reconcileSession(session(), nextIdentity, 'revision-b', now);

    expect(result.steps.sketch?.status).toBe('UNKNOWN');
    expect(result.modelState.evidenceReferences).toEqual([]);
  });

  it('does not retain verified completions when the current revision is unknown', async () => {
    const { reconcileSession } = await import('./session');
    const nextIdentity = { ...currentIdentity, revision: null };

    const result = reconcileSession(session(), nextIdentity, null, now);

    expect(result.steps.sketch?.status).toBe('UNKNOWN');
    expect(result.steps.sketch?.hintLevel).toBe(2);
    expect(result.modelState.uncertaintyReason).toContain('unknown');
  });

  it.each(['ACKNOWLEDGED', 'SELF_REPORTED'] as const)(
    'preserves %s learning progress when model evidence is invalidated',
    async (outcome) => {
      const { reconcileSession } = await import('./session');
      const prior = session();
      prior.steps.sketch = {
        ...completedStep,
        verification: outcome === 'ACKNOWLEDGED' ? null : 'UNKNOWN',
        outcome,
      };

      const result = reconcileSession(
        prior,
        { ...currentIdentity, revision: null },
        null,
        now,
      );

      expect(result.steps.sketch).toEqual(prior.steps.sketch);
      expect(result.modelState.evidenceReferences).toEqual([]);
    },
  );

  it('preserves completion when the document and revision are unchanged', async () => {
    const { reconcileSession } = await import('./session');

    const result = reconcileSession(
      session(),
      currentIdentity,
      'revision-a',
      now,
    );

    expect(result.steps.sketch).toEqual(completedStep);
    expect(result.modelState).toEqual(session().modelState);
  });

  it('preserves a paused session when its document and revision are unchanged', async () => {
    const { reconcileSession } = await import('./session');
    const paused = session();
    paused.steps.sketch = {
      ...completedStep,
      status: 'PAUSED',
      resumeState: 'AWAITING_ACTION',
      verification: null,
      outcome: 'NONE',
    };

    const result = reconcileSession(paused, currentIdentity, 'revision-a', now);

    expect(result.steps.sketch).toEqual(paused.steps.sketch);
  });
});
