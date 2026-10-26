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

const STEP_TITLES: Record<string, string> = {
  introduction: 'Before you begin',
  'select-reference-plane': 'Choose the Top reference plane',
  'start-sketch': 'Start a Sketch',
  'draw-rectangle': 'Draw a Corner Rectangle',
  'apply-dimensions': 'Add dimensions',
  'finish-sketch': 'Finish the sketch',
  'understand-result': 'Understand the result',
  'independent-practice': 'Try it yourself',
};

function evidenceText(view: DesktopLessonView): string {
  switch (view.currentStep.outcome) {
    case 'ACKNOWLEDGED':
      return 'Instruction acknowledged. No CAD operation was checked.';
    case 'SELF_REPORTED':
      return 'Marked done by you. CAD work has not been verified.';
    default:
      return view.currentStep.completionMode === 'ACKNOWLEDGEMENT'
        ? 'Acknowledgement only. No CAD operation has been checked.'
        : 'Not checked. Marking done records your report.';
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
  const title = STEP_TITLES[view.currentStep.id] ?? view.currentStep.goal;

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
            Saved progress couldn’t be read. You can continue with a fresh
            lesson in this session. The unreadable record is not cleared by this
            action.
            <button
              className="text-action"
              onClick={onStartFresh}
              type="button"
            >
              Start fresh in this session
            </button>
          </p>
        ) : null}
        <section className="lesson-context" aria-label="Current lesson context">
          <p className="step-counter">{`${view.lesson.title} · Step ${view.currentStepIndex + 1} of 8`}</p>
          <h2 className="step-title">{title}</h2>
          <p className="progress-copy">
            {`${view.completionCount} ${view.completionCount === 1 ? 'step' : 'steps'} completed · CAD work unverified`}
          </p>
          <progress
            aria-label="Steps completed"
            className="lesson-progress"
            max={8}
            value={view.completionCount}
          />
          <p className="step-goal">{view.currentStep.goal}</p>
        </section>

        {page === 'learn' ? (
          <div className="lesson-instruction">
            <p>{view.currentStep.action}</p>
            {currentIsPaused ? (
              <p className="pause-status" role="status">
                Paused. No observation running.
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
              Retry save
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
              Local examples do not change progress.
            </p>
            <button
              className="primary-button"
              onClick={() => onPageChange('learn')}
              type="button"
            >
              Return to Learn
            </button>
          </>
        )}
      </footer>
    </>
  );
}
