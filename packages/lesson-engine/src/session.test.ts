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
};

function session(): LessonSession {
  return {
    lessonId: 'mounting-plate',
    lessonVersion: '1.0.0',
    currentStepId: 'extrude',
    modelIdentity: currentIdentity,
    modelRevision: 'revision-a',
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
  });

  it('does not retain verified completions when the current revision is unknown', async () => {
    const { reconcileSession } = await import('./session');
    const nextIdentity = { ...currentIdentity, revision: null };

    const result = reconcileSession(session(), nextIdentity, null, now);

    expect(result.steps.sketch?.status).toBe('UNKNOWN');
  });

  it('preserves completion when the document and revision are unchanged', async () => {
    const { reconcileSession } = await import('./session');

    const result = reconcileSession(
      session(),
      currentIdentity,
      'revision-a',
      now,
    );

    expect(result.steps.sketch).toEqual(completedStep);
  });
});
