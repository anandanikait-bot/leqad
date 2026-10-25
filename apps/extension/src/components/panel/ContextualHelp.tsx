import { useId, useRef } from 'react';
import type { ReactNode } from 'react';
export type HelpSection = 'hint' | 'guidance' | 'why' | 'uncertainty';
interface ContextualHelpProps {
  open: boolean;
  section: HelpSection;
  onOpenChange(open: boolean): void;
  onSectionChange(section: HelpSection): void;
  content: Partial<Record<HelpSection, ReactNode>>;
}
const labels: Record<HelpSection, string> = {
  hint: 'Hint',
  guidance: 'Detailed guidance',
  why: 'Why it matters',
  uncertainty: 'Unable to verify',
};
export function ContextualHelp({
  open,
  section,
  onOpenChange,
  onSectionChange,
  content,
}: ContextualHelpProps) {
  const id = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  return (
    <section
      className="leqad-help"
      aria-label="Lesson help"
      onKeyDown={(event) => {
        if (open && event.key === 'Escape') {
          event.stopPropagation();
          onOpenChange(false);
          trigger.current?.focus();
        }
      }}
    >
      <button
        ref={trigger}
        type="button"
        className="leqad-button leqad-button--text leqad-help-toggle"
        aria-expanded={open}
        aria-controls={id}
        onClick={() => onOpenChange(!open)}
      >
        Help<span aria-hidden="true">{open ? ' −' : ' +'}</span>
      </button>
      {open && (
        <div id={id} className="leqad-help-expanded">
          <div
            className="leqad-help-sections"
            role="group"
            aria-label="Help topics"
          >
            {(Object.keys(labels) as HelpSection[])
              .filter((key) => content[key] != null)
              .map((key) => (
                <button
                  type="button"
                  key={key}
                  className="leqad-button leqad-button--text"
                  aria-pressed={section === key}
                  onClick={() => onSectionChange(key)}
                >
                  {labels[key]}
                </button>
              ))}
          </div>
          <div
            className="leqad-help-content"
            role="region"
            aria-label="Help content"
            tabIndex={0}
          >
            {content[section]}
          </div>
        </div>
      )}
    </section>
  );
}
