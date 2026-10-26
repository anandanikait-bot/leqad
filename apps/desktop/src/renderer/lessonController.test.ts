import { describe, expect, it } from 'vitest';
import { parseStoredLesson } from '@leqad/desktop-contracts';
import { FOUNDATIONS_FIRST_SKETCH } from '@leqad/lesson-engine';
import { createDesktopLessonController } from './lessonController';

describe('desktop lesson controller', () => {
  it('keeps the existing ordered eight-step Foundations lesson', () => {
    const controller = createDesktopLessonController();
    const view = controller.getView();

    expect(view.lesson.title).toBe('Your First Sketch');
    expect(view.lesson.steps).toHaveLength(8);
    expect(view.lesson.steps.map(({ id }) => id)).toEqual(
      FOUNDATIONS_FIRST_SKETCH.steps.map(({ id }) => id),
    );
    expect(view.currentStepIndex).toBe(0);
    expect(view.currentStep.status).toBe('AWAITING_ACTION');
  });

  it('requires an allowed completion before Next and respects Back and Next boundaries', () => {
    const controller = createDesktopLessonController();

    controller.dispatch({ type: 'NEXT' });
    expect(controller.getView().currentStepIndex).toBe(0);
    controller.dispatch({ type: 'ACKNOWLEDGE' });
    expect(controller.getView().currentStepIndex).toBe(0);
    controller.dispatch({ type: 'BACK' });
    expect(controller.getView().currentStepIndex).toBe(0);
    controller.dispatch({ type: 'NEXT' });
    expect(controller.getView().currentStepIndex).toBe(1);
    controller.dispatch({ type: 'BACK' });
    expect(controller.getView().currentStepIndex).toBe(0);
  });

  it('uses only acknowledgement and self-report outcomes for all eight steps', () => {
    const controller = createDesktopLessonController();
    const events = [
      'ACKNOWLEDGE',
      'MARK_DONE',
      'MARK_DONE',
      'MARK_DONE',
      'MARK_DONE',
      'MARK_DONE',
      'ACKNOWLEDGE',
      'MARK_DONE',
    ] as const;
    const outcomes = [
      'ACKNOWLEDGED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'SELF_REPORTED',
      'ACKNOWLEDGED',
      'SELF_REPORTED',
    ];

    events.forEach((type, index) => {
      controller.dispatch({ type });
      expect(controller.getView().steps[index]?.outcome).toBe(outcomes[index]);
      if (index < events.length - 1) {
        controller.dispatch({ type: 'NEXT' });
      }
    });

    expect(controller.getView().isComplete).toBe(true);
    expect(controller.getView().steps.map(({ outcome }) => outcome)).toEqual(outcomes);
    expect(JSON.stringify(controller.getView())).not.toContain('MODEL_VERIFIED');
  });

  it('keeps hint history ordered and pauses and resumes without changing outcome', () => {
    const controller = createDesktopLessonController();
    controller.dispatch({ type: 'MORE_HELP' });
    expect(controller.getView().currentStep.hintLevel).toBe(1);
    expect(controller.getView().currentStep.hint).toBe(
      FOUNDATIONS_FIRST_SKETCH.steps[0]?.hints[0],
    );
    controller.dispatch({ type: 'MORE_HELP' });
    expect(controller.getView().currentStep.hintLevel).toBe(2);
    controller.dispatch({ type: 'PAUSE' });
    expect(controller.getView().currentStep.status).toBe('PAUSED');
    controller.dispatch({ type: 'RESUME' });
    expect(controller.getView().currentStep.status).toBe('AWAITING_ACTION');
    expect(controller.getView().currentStep.outcome).toBe('NONE');
  });

  it('serializes and reloads only the bounded lesson record', () => {
    const controller = createDesktopLessonController();
    controller.dispatch({ type: 'ACKNOWLEDGE' });
    controller.dispatch({ type: 'NEXT' });
    controller.dispatch({ type: 'MARK_DONE' });
    const saved = parseStoredLesson(controller.serialize());
    const resumed = createDesktopLessonController(saved);

    expect(saved.currentStep).toBe(1);
    expect(saved.steps).toHaveLength(8);
    expect(saved.steps[0]?.outcome).toBe('ACKNOWLEDGED');
    expect(saved.steps[1]?.outcome).toBe('SELF_REPORTED');
    expect(resumed.getView().currentStepIndex).toBe(1);
    expect(resumed.getView().steps[1]?.outcome).toBe('SELF_REPORTED');
    expect(JSON.stringify(saved)).not.toMatch(/capture|consent|window|MODEL_VERIFIED/i);
  });

  it('restarts lesson progress only on the explicit restart event', () => {
    const controller = createDesktopLessonController();
    controller.dispatch({ type: 'ACKNOWLEDGE' });
    controller.dispatch({ type: 'NEXT' });
    controller.dispatch({ type: 'RESTART' });

    expect(controller.getView().currentStepIndex).toBe(0);
    expect(controller.getView().steps.every(({ outcome }) => outcome === 'NONE')).toBe(true);
    expect(controller.getView().currentStep.status).toBe('AWAITING_ACTION');
  });

  it('returns to the completed summary after reviewing through step eight', () => {
    const controller = createDesktopLessonController();
    const events = [
      'ACKNOWLEDGE',
      'MARK_DONE',
      'MARK_DONE',
      'MARK_DONE',
      'MARK_DONE',
      'MARK_DONE',
      'ACKNOWLEDGE',
      'MARK_DONE',
    ] as const;

    events.forEach((type, index) => {
      controller.dispatch({ type });
      if (index < events.length - 1) controller.dispatch({ type: 'NEXT' });
    });
    const completedOutcomes = controller.getView().steps.map(({ outcome }) => outcome);

    controller.dispatch({ type: 'REVIEW_STEPS' });
    for (let index = 0; index < 7; index += 1) {
      controller.dispatch({ type: 'NEXT' });
    }
    expect(controller.getView().currentStepIndex).toBe(7);
    expect(controller.getView().isComplete).toBe(false);

    controller.dispatch({ type: 'NEXT' });

    expect(controller.getView().isComplete).toBe(true);
    expect(controller.getView().steps.map(({ outcome }) => outcome)).toEqual(
      completedOutcomes,
    );
  });

  it('does not complete a saved lesson with unfinished earlier steps', () => {
    const controller = createDesktopLessonController({
      schemaVersion: 1,
      lessonId: 'foundations-first-sketch',
      lessonVersion: '2.0.0',
      currentStep: 7,
      steps: Array.from({ length: 8 }, (_, index) => ({
        status: index === 7 ? 'AWAITING_ACTION' : 'NOT_STARTED',
        hintLevel: 0,
        verification: null,
        resumeState: null,
        outcome: 'NONE',
      })),
    });

    controller.dispatch({ type: 'MARK_DONE' });

    expect(controller.getView().completionCount).toBe(1);
    expect(controller.getView().isComplete).toBe(false);
  });
});
