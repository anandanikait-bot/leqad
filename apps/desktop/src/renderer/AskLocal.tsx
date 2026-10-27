import { DESKTOP_STEP_COPY } from './desktopCopy';
import type { DesktopStepView } from './lessonController';

type QuestionId = 'corner-rectangle' | 'verification';

const ANSWERS: Record<QuestionId, { question: string; answer: string }> = {
  'corner-rectangle': {
    question: 'Why use Corner Rectangle?',
    answer:
      'Corner Rectangle lets you draw by clicking two opposite corners. It is a simple choice for this lesson. Center Point Rectangle starts at the center instead. Use the Rectangle arrow to choose Corner Rectangle.',
  },
  verification: {
    question: 'Can Leqad check my drawing?',
    answer:
      "No. This desktop app can't see Onshape or check your drawing. Mark done records that you say you finished a step.",
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
  const copy = DESKTOP_STEP_COPY[step.id];
  const selected = selectedQuestion ? ANSWERS[selectedQuestion] : null;

  return (
    <section
      aria-label="Ask prototype with example answers"
      className="ask-local"
    >
      <div className="ask-heading-row">
        <h2 id="ask-title">Ask</h2>
        <span className="local-prototype-label">Local prototype · no AI</span>
      </div>
      <div className="ask-context" aria-label="Current lesson context">
        <p>{copy.goal}</p>
        <p>
          {step.id === 'introduction'
            ? 'A later tool can use a flat sketch to create a 3D part.'
            : copy.action}
        </p>
        <p className="ask-step-context">{`Step ${stepNumber} of 8`}</p>
      </div>
      <div className="ask-questions" aria-label="Example questions">
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
          aria-label="Example answer"
        >
          <h3>Example answer</h3>
          <p>{selected.answer}</p>
          <p className="muted-copy">
            Click Back to lesson to follow the steps.
          </p>
        </section>
      ) : (
        <p className="muted-copy">
          Choose a question to see an example answer.
        </p>
      )}
    </section>
  );
}

export type { QuestionId };
