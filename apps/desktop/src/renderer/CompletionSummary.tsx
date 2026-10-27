import { DESKTOP_STEP_COPY } from './desktopCopy';
import { useEffect, useRef } from 'react';
import type { DesktopLessonView } from './lessonController';

type CompletionSummaryProps = {
  view: DesktopLessonView;
  onReviewSteps(): void;
  onEndSession(): void;
};

function outcomeLabel(
  outcome: DesktopLessonView['steps'][number]['outcome'],
): string {
  switch (outcome) {
    case 'ACKNOWLEDGED':
      return 'You clicked Got it';
    case 'SELF_REPORTED':
      return 'Marked done by you';
    case 'UI_VERIFIED':
      return 'Interface state verified';
    case 'MODEL_VERIFIED':
      return 'Model state verified';
    case 'UNABLE_TO_VERIFY':
      return "Leqad couldn't check this step";
    case 'NONE':
      return 'Not done yet';
  }
}

export function CompletionSummary({
  view,
  onReviewSteps,
  onEndSession,
}: CompletionSummaryProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);
  useEffect(() => {
    headingRef.current?.focus();
  }, []);
  const independentlyVerified = view.steps.some(
    ({ outcome }) => outcome === 'UI_VERIFIED' || outcome === 'MODEL_VERIFIED',
  );

  return (
    <>
      <section
        aria-label="Eight-step completion summary"
        className="completion-body"
        role="region"
        tabIndex={0}
      >
        <h2 ref={headingRef} tabIndex={-1}>
          Lesson complete
        </h2>
        <p>
          {view.completionCount} steps marked complete.{' '}
          {independentlyVerified
            ? 'Some steps have an independent interface or model check.'
            : 'Leqad has not checked your drawing.'}
        </p>
        <p className="muted-copy">Scroll to see all 8 steps.</p>
        <ol className="completion-list">
          {view.lesson.steps.map((step, index) => (
            <li key={step.id}>
              <strong>{`${index + 1} · ${DESKTOP_STEP_COPY[step.id].goal}`}</strong>
              <span>{outcomeLabel(view.steps[index]!.outcome)}</span>
            </li>
          ))}
        </ol>
      </section>
      <footer className="workspace-footer completion-footer">
        <p className="muted-copy">
          Reviewing keeps your progress. Restarting asks you first.
        </p>
        <button
          className="primary-button"
          onClick={onReviewSteps}
          type="button"
        >
          Review steps
        </button>
        <button className="text-action" onClick={onEndSession} type="button">
          Close Leqad
        </button>
      </footer>
    </>
  );
}
