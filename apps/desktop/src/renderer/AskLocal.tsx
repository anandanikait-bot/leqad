import type { DesktopStepView } from './lessonController';

type QuestionId = 'corner-rectangle' | 'verification';

const ANSWERS: Record<QuestionId, { question: string; answer: string }> = {
  'corner-rectangle': {
    question: 'Why use Corner Rectangle?',
    answer:
      'Corner Rectangle uses two opposite corners. It suits this lesson’s corner-based rectangular profile. Center Rectangle starts from a center point instead.',
  },
  verification: {
    question: 'What can Leqad verify?',
    answer:
      'Visual inspection is unavailable in this build. Marking a step done records your report; it does not check the CAD interface or geometry.',
  },
};

type AskLocalProps = {
  step: DesktopStepView;
  stepNumber: number;
  selectedQuestion: QuestionId | null;
  onSelectQuestion(question: QuestionId): void;
};

export function AskLocal({
  step,
  stepNumber,
  selectedQuestion,
  onSelectQuestion,
}: AskLocalProps) {
  const selected = selectedQuestion ? ANSWERS[selectedQuestion] : null;

  return (
    <section aria-label="Ask local prototype" className="ask-local">
      <div className="ask-heading-row">
        <h2 id="ask-title">Ask</h2>
        <span className="local-prototype-label">
          Local prototype · no AI connected
        </span>
      </div>
      <div className="ask-context" aria-label="Current lesson context">
        <p>{step.goal}</p>
        <p>
          {step.id === 'introduction'
            ? 'A sketch provides a flat profile for a later 3D feature.'
            : step.action}
        </p>
        <p className="ask-step-context">{`Step ${stepNumber} · ${step.id}`}</p>
      </div>
      <div className="ask-questions" aria-label="Authored questions">
        {(
          Object.entries(ANSWERS) as [
            QuestionId,
            (typeof ANSWERS)[QuestionId],
          ][]
        ).map(([id, item]) => (
          <button
            aria-pressed={selectedQuestion === id}
            className="secondary-button ask-question"
            key={id}
            onClick={() => onSelectQuestion(id)}
            type="button"
          >
            {item.question}
          </button>
        ))}
      </div>
      {selected ? (
        <section
          className="ask-answer"
          aria-live="polite"
          aria-label="Local example"
        >
          <h3>Local example</h3>
          <p>{selected.answer}</p>
          <p className="muted-copy">
            This explanation does not check your sketch.
          </p>
        </section>
      ) : (
        <p className="muted-copy">
          Choose an authored example for this lesson.
        </p>
      )}
    </section>
  );
}

export type { QuestionId };
