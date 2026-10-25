import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AskPrototype } from './AskPrototype';
import type { AskPrototypeContext } from './AskPrototype';
afterEach(cleanup);
const context: AskPrototypeContext = {
  lessonId: 'lesson',
  lessonTitle: 'Your First Sketch',
  stepId: 'draw-rectangle',
  stepTitle: 'Corner Rectangle',
  helpLevel: 'HINT',
  targetId: 'rectangle-tool-group',
  observation: 'Unknown — no current supported observation.',
};
const examples = [
  {
    id: 'why',
    question: 'Why use Corner Rectangle?',
    kind: 'LOCAL_EXAMPLE' as const,
    explanation: 'It starts at a corner.',
    hint: 'Choose two opposite corners.',
    evidence: 'No model evidence.',
    uncertainty: 'Geometry is unverified.',
  },
  {
    id: 'help',
    question: 'What can Leqad verify?',
    kind: 'LOCAL_EXAMPLE' as const,
    explanation: 'Only supported evidence.',
    hint: 'Check in Onshape.',
    evidence: 'Unknown.',
    uncertainty: 'A highlight is not geometry evidence.',
  },
];
it('labels all responses local and never requests a network service', () => {
  const fetch = vi.spyOn(globalThis, 'fetch');
  render(<AskPrototype context={context} examples={examples} />);
  expect(screen.getByText('Local prototype — no AI connected')).toBeTruthy();
  expect(screen.queryByText('It starts at a corner.')).toBeNull();
  fireEvent.click(
    screen.getByRole('button', { name: 'Why use Corner Rectangle?' }),
  );
  expect(screen.getByText('Local example')).toBeTruthy();
  expect(screen.getByText('Geometry is unverified.')).toBeTruthy();
  fireEvent.click(
    screen.getByRole('button', { name: 'What can Leqad verify?' }),
  );
  expect(screen.queryByText('It starts at a corner.')).toBeNull();
  expect(fetch).not.toHaveBeenCalled();
  fetch.mockRestore();
});
it('clears a selected example when step context changes', () => {
  const view = render(<AskPrototype context={context} examples={examples} />);
  fireEvent.click(
    screen.getByRole('button', { name: 'Why use Corner Rectangle?' }),
  );
  view.rerender(
    <AskPrototype
      context={{ ...context, stepId: 'finish' }}
      examples={examples}
    />,
  );
  expect(screen.queryByText('Local example')).toBeNull();
});
