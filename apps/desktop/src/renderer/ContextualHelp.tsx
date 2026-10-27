import { DESKTOP_STEP_COPY } from './desktopCopy';
import { useEffect, useRef, useState } from 'react';
import type { DesktopStepView } from './lessonController';

export function helpUsesBodyScroller(
  availableHeight: number,
  renderedLineHeight: number,
): boolean {
  return availableHeight < renderedLineHeight * 6;
}

type HelpTopic = 'hint' | 'detail' | 'why' | 'unable';

type ContextualHelpProps = {
  step: DesktopStepView;
  textScale: number;
  onMoreHelp(): void;
  onScrollModeChange(singleScroller: boolean): void;
};

const TOPICS: { id: HelpTopic; label: string }[] = [
  { id: 'hint', label: 'Hint' },
  { id: 'detail', label: 'Step details' },
  { id: 'why', label: 'Why it matters' },
];

export function ContextualHelp({
  step,
  textScale,
  onMoreHelp,
  onScrollModeChange,
}: ContextualHelpProps) {
  const copy = DESKTOP_STEP_COPY[step.id];
  const hint = step.hintLevel > 0 ? copy.hints[step.hintLevel - 1] : null;
  const [expanded, setExpanded] = useState(false);
  const [topic, setTopic] = useState<HelpTopic>('hint');
  const disclosureRef = useRef<HTMLButtonElement>(null);
  const helpRootRef = useRef<HTMLDivElement>(null);
  const singleScrollerRequiredRef = useRef(false);

  useEffect(() => {
    setExpanded(false);
    setTopic('hint');
    singleScrollerRequiredRef.current = false;
    onScrollModeChange(false);
  }, [step.id, onScrollModeChange]);

  useEffect(() => {
    if (!expanded) return;

    const helpRoot = helpRootRef.current;
    const stableContainer = helpRoot?.closest(
      '[data-help-measurement-container]',
    );
    const measure = () => {
      if (!helpRoot) return;
      const topicBody = helpRoot.querySelector<HTMLElement>('.help-topic-body');
      const lineHeight = Number.parseFloat(
        getComputedStyle(helpRoot).lineHeight,
      );
      const renderedLineHeight = Number.isFinite(lineHeight)
        ? lineHeight
        : 21 * textScale;
      const requiresSingleScroller = helpUsesBodyScroller(
        topicBody?.getBoundingClientRect().height ?? 0,
        renderedLineHeight,
      );
      if (!singleScrollerRequiredRef.current && requiresSingleScroller) {
        singleScrollerRequiredRef.current = true;
        onScrollModeChange(true);
      }
    };

    measure();
    window.addEventListener('resize', measure);
    const observer =
      typeof ResizeObserver === 'undefined' || !stableContainer
        ? null
        : new ResizeObserver(measure);
    if (observer && stableContainer) observer.observe(stableContainer);

    return () => {
      window.removeEventListener('resize', measure);
      observer?.disconnect();
    };
  }, [expanded, step.id, textScale, onScrollModeChange]);

  const close = () => {
    setExpanded(false);
    singleScrollerRequiredRef.current = false;
    onScrollModeChange(false);
    requestAnimationFrame(() => disclosureRef.current?.focus());
  };

  const open = () => {
    setTopic('hint');
    setExpanded(true);
    if (!step.hint) onMoreHelp();
  };

  const selectTopic = (nextTopic: HelpTopic) => {
    setTopic(nextTopic);
    if (nextTopic === 'hint' && !step.hint) onMoreHelp();
  };

  return (
    <section className="help-area" ref={helpRootRef}>
      <button
        aria-controls="lesson-help-content"
        aria-expanded={expanded}
        className="help-disclosure"
        onClick={() => (expanded ? close() : open())}
        onKeyDown={(event) => {
          if (expanded && event.key === 'Escape') {
            event.preventDefault();
            close();
          }
        }}
        ref={disclosureRef}
        type="button"
      >
        Help {expanded ? '−' : '+'}
      </button>
      {expanded ? (
        <div
          aria-label="Lesson help"
          className="help-content"
          id="lesson-help-content"
          onKeyDown={(event) => {
            if (event.key === 'Escape') {
              event.preventDefault();
              close();
            }
          }}
          role="region"
          tabIndex={0}
        >
          <div className="help-topics" aria-label="Help topics">
            {[
              ...TOPICS,
              ...(step.requiredEvidence
                ? [
                    {
                      id: 'unable' as const,
                      label: "Why can't Leqad check?",
                    },
                  ]
                : []),
            ].map((item) => (
              <button
                aria-pressed={topic === item.id}
                className="secondary-button help-topic"
                key={item.id}
                onClick={() => selectTopic(item.id)}
                type="button"
              >
                {item.label}
              </button>
            ))}
          </div>
          <div className="help-topic-body">
            {topic === 'hint' && (
              <div>
                <p>{hint ?? 'Click Next hint to see a hint.'}</p>
                {step.hintLevel < 5 ? (
                  <button
                    className="text-action"
                    onClick={onMoreHelp}
                    type="button"
                  >
                    Next hint
                  </button>
                ) : null}
              </div>
            )}
            {topic === 'detail' && (
              <div>
                <p>{copy.hints[0]}</p>
                <h3>Common mistakes</h3>
                <ul>
                  {copy.commonErrors.map((error) => (
                    <li key={error}>{error}</li>
                  ))}
                </ul>
                <h3>How to fix it</h3>
                <ul>
                  {copy.recoveryActions.map((action) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
            {topic === 'why' && <p>{copy.explanation}</p>}
            {topic === 'unable' && (
              <div>
                <p>This app can't see Onshape.</p>
                <p>Use the written steps to check your work yourself.</p>
              </div>
            )}
          </div>
        </div>
      ) : null}
    </section>
  );
}
