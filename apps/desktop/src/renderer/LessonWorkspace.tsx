import { DESKTOP_STEP_COPY } from './desktopCopy';
import { useCallback, useState } from 'react';
import type { DesktopLessonEvent, DesktopLessonView } from './lessonController';
import { AskLocal, type QuestionId } from './AskLocal';
import { ContextualHelp } from './ContextualHelp';

type LessonWorkspaceProps = {
  view: DesktopLessonView;
  page: 'learn' | 'ask';
  textScale: number;
  selectedQuestion: QuestionId | null;
  saveError: string | null;
  loadError: boolean;
  onStartFresh(): void;
  onDispatch(event: DesktopLessonEvent): void;
  onPageChange(page: 'learn' | 'ask'): void;
  onAskQuestion(question: QuestionId): void;
  onRetrySave(): void;
};

function evidenceText(view: DesktopLessonView): string {
  switch (view.currentStep.outcome) {
    case 'ACKNOWLEDGED':
      return 'You clicked Got it.';
    case 'SELF_REPORTED':
      return "You marked this step done. Leqad hasn't checked it.";
    default:
      return view.currentStep.completionMode === 'ACKNOWLEDGEMENT'
        ? 'Read this step, then click Got it.'
        : "Leqad can't check this step. Click Mark done when you've finished.";
  }
}

export function LessonWorkspace({
  view,
  page,
  textScale,
  selectedQuestion,
  saveError,
  loadError,
  onStartFresh,
  onDispatch,
  onPageChange,
  onAskQuestion,
  onRetrySave,
}: LessonWorkspaceProps) {
  const [singleScroller, setSingleScroller] = useState(false);
  const setScrollMode = useCallback(
    (value: boolean) => setSingleScroller(value),
    [],
  );
  const currentIsCompleted = view.currentStep.status === 'COMPLETED';
  const currentIsPaused = view.currentStep.status === 'PAUSED';
  const copy = DESKTOP_STEP_COPY[view.currentStep.id];

  return (
    <>
      <div
        className="workspace-content"
        data-help-measurement-container
        data-scroll-mode={
          page === 'ask' || singleScroller ? 'single' : 'internal'
        }
      >
        {loadError ? (
          <p className="load-error" role="alert">
            We couldn't read your saved progress. You can start fresh for now.
            Saving may replace the previous lesson.
            <button
              className="text-action"
              onClick={onStartFresh}
              type="button"
            >
              Start fresh for now
            </button>
          </p>
        ) : null}
        <section className="lesson-context" aria-label="Current lesson context">
          <p className="step-counter">{`${view.lesson.title} · Step ${view.currentStepIndex + 1} of 8`}</p>
          <h2 className="step-title">{copy.heading}</h2>
          <p className="progress-copy">
            {`${view.completionCount} of 8 steps marked complete`}
          </p>
          <progress
            aria-label="Steps completed"
            className="lesson-progress"
            max={8}
            value={view.completionCount}
          />
          <p className="step-goal">{copy.goal}</p>
        </section>

        {page === 'learn' ? (
          <div className="lesson-instruction">
            <p>{copy.action}</p>
            {currentIsPaused ? (
              <p className="pause-status" role="status">
                Lesson paused.
              </p>
            ) : null}
          </div>
        ) : (
          <AskLocal
            onSelectQuestion={onAskQuestion}
            selectedQuestion={selectedQuestion}
            step={view.currentStep}
            stepNumber={view.currentStepIndex + 1}
          />
        )}

        {page === 'learn' ? (
          <ContextualHelp
            onMoreHelp={() => onDispatch({ type: 'MORE_HELP' })}
            onScrollModeChange={setScrollMode}
            step={view.currentStep}
            textScale={textScale}
          />
        ) : null}
      </div>

      <footer
        className={`workspace-footer ${page === 'ask' ? 'ask-footer' : ''}`}
      >
        {saveError ? (
          <div className="save-error" role="alert">
            <span>{saveError}</span>
            <button className="text-action" onClick={onRetrySave} type="button">
              Try saving again
            </button>
          </div>
        ) : null}
        {page === 'learn' ? (
          <>
            <p className="evidence-copy">{evidenceText(view)}</p>
            <button
              className="primary-button"
              disabled={currentIsPaused || loadError}
              onClick={() => {
                if (currentIsCompleted) onDispatch({ type: 'NEXT' });
                else if (
                  view.currentStep.completionMode === 'ACKNOWLEDGEMENT'
                ) {
                  onDispatch({ type: 'ACKNOWLEDGE' });
                } else onDispatch({ type: 'MARK_DONE' });
              }}
              type="button"
            >
              {currentIsCompleted
                ? view.currentStepIndex === view.steps.length - 1
                  ? 'Back to summary'
                  : 'Next step'
                : view.currentStep.completionMode === 'ACKNOWLEDGEMENT'
                  ? 'Got it'
                  : 'Mark done'}
            </button>
            <div className="footer-secondary">
              <button
                className="text-action"
                disabled={loadError || view.currentStepIndex === 0}
                onClick={() => onDispatch({ type: 'BACK' })}
                type="button"
              >
                Back
              </button>
              <button
                className="text-action"
                disabled={loadError}
                onClick={() =>
                  onDispatch({ type: currentIsPaused ? 'RESUME' : 'PAUSE' })
                }
                type="button"
              >
                {currentIsPaused ? 'Resume' : 'Pause'}
              </button>
            </div>
          </>
        ) : (
          <>
            <p className="evidence-copy">
              Reading answers does not change your progress.
            </p>
            <button
              className="primary-button"
              onClick={() => onPageChange('learn')}
              type="button"
            >
              Back to lesson
            </button>
          </>
        )}
      </footer>
    </>
  );
}
