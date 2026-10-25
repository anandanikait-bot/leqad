import { useState } from 'react';
import type {
  GuidanceLevel,
  GuidanceTargetId,
} from '../../services/guidanceRegistry';
export interface AskPrototypeContext {
  lessonId: string;
  lessonTitle: string;
  stepId: string;
  stepTitle: string;
  helpLevel: GuidanceLevel;
  targetId: GuidanceTargetId | null;
  observation: string;
}
export interface LocalExampleResponse {
  id: string;
  question: string;
  kind: 'LOCAL_EXAMPLE';
  explanation: string;
  hint: string;
  evidence: string;
  uncertainty: string;
}
interface AskPrototypeProps {
  context: AskPrototypeContext;
  examples: readonly LocalExampleResponse[];
}
export function AskPrototype({ context, examples }: AskPrototypeProps) {
  // Store selection scoped to the step so a changed context never shows a stale answer.
  const [selection, setSelection] = useState<{
    stepId: string;
    id: string;
  } | null>(null);
  const selected =
    selection?.stepId === context.stepId
      ? examples.find((example) => example.id === selection.id)
      : null;
  return (
    <section
      className="leqad-empty-state leqad-ask"
      aria-label="Ask local prototype"
    >
      <p className="leqad-eyebrow">Local prototype — no AI connected</p>
      <h2>Ask Leqad</h2>
      <p>
        {context.lessonTitle} · {context.stepTitle}
      </p>
      <p className="leqad-prototype-context">
        Requested help: {context.helpLevel}. Instruction target:{' '}
        {context.targetId ?? 'No supported guidance target'}. This does not
        establish control recognition.
      </p>
      <p className="leqad-progress">{context.observation}</p>
      <p>Choose a written example for this step.</p>
      <div
        className="leqad-example-questions"
        role="group"
        aria-label="Local example questions"
      >
        {examples.map((example) => (
          <button
            type="button"
            key={example.id}
            className="leqad-button leqad-button--secondary"
            aria-pressed={selected?.id === example.id}
            onClick={() =>
              setSelection({ stepId: context.stepId, id: example.id })
            }
          >
            {example.question}
          </button>
        ))}
      </div>
      {selected && (
        <section
          aria-label="Local example response"
          className="leqad-local-response"
          aria-live="polite"
        >
          <p className="leqad-eyebrow">Local example</p>
          <dl>
            {(['explanation', 'hint', 'evidence', 'uncertainty'] as const).map(
              (field) => (
                <div key={field}>
                  <dt>{field[0]!.toUpperCase() + field.slice(1)}</dt>
                  <dd>{selected[field]}</dd>
                </div>
              ),
            )}
          </dl>
        </section>
      )}
    </section>
  );
}
