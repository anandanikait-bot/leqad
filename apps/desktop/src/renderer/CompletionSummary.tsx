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
      return 'Instruction acknowledged';
    case 'SELF_REPORTED':
      return 'Marked done by you · CAD work unverified';
    case 'UI_VERIFIED':
      return 'Interface state verified';
    case 'MODEL_VERIFIED':
      return 'Model state verified';
    case 'UNABLE_TO_VERIFY':
      return 'Unable to verify';
    case 'NONE':
      return 'Not completed';
  }
}

export function CompletionSummary({
  view,
  onReviewSteps,
  onEndSession,
}: CompletionSummaryProps) {
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
        <h2>Lesson completed</h2>
        <p>
          {view.completionCount} steps completed.{' '}
          {independentlyVerified
            ? 'Some steps have an independent interface or model check.'
            : 'CAD work is not independently verified.'}
        </p>
        <p className="muted-copy">Scroll to review all 8 steps.</p>
        <ol className="completion-list">
          {view.lesson.steps.map((step, index) => (
            <li key={step.id}>
              <strong>{`${index + 1} · ${step.goal}`}</strong>
              <span>{outcomeLabel(view.steps[index]!.outcome)}</span>
            </li>
          ))}
        </ol>
      </section>
      <footer className="workspace-footer completion-footer">
        <p className="muted-copy">
          Review keeps progress. Restart requires confirmation.
        </p>
        <button
          className="primary-button"
          onClick={onReviewSteps}
          type="button"
        >
          Review steps
        </button>
        <button className="text-action" onClick={onEndSession} type="button">
          End session
        </button>
      </footer>
    </>
  );
}
