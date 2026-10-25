import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AssistantPanel } from './AssistantPanel';
afterEach(cleanup);
it('opens a short hint without running SHOW or verification; sections are exclusive', () => {
  const show = vi.fn(),
    check = vi.fn();
  render(<AssistantPanel onShowTarget={show} onCheckStep={check} />);
  expect(screen.queryByText(/Hint 1 of 5/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Help', exact: true }));
  expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
  expect(show).not.toHaveBeenCalled();
  expect(check).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Why it matters' }));
  expect(screen.queryByText(/Hint 1 of 5/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Hint', exact: true }));
  expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Help', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Help', exact: true }));
  expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
});
it('closes help on collapse, step changes and document changes', () => {
  const page = {
    supported: true,
    documentId: 'a',
    workspaceId: 'w',
    elementId: 'e',
    editability: 'unknown',
    elementType: 'part-studio',
    modelType: 'workspace',
  } as const;
  const view = render(<AssistantPanel page={page} />);
  fireEvent.click(screen.getByRole('button', { name: 'Help', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next', exact: true }));
  expect(
    screen
      .getByRole('button', { name: 'Help', exact: true })
      .getAttribute('aria-expanded'),
  ).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Help', exact: true }));
  view.rerender(<AssistantPanel page={{ ...page, documentId: 'b' }} />);
  expect(
    screen
      .getByRole('button', { name: 'Help', exact: true })
      .getAttribute('aria-expanded'),
  ).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Help', exact: true }));
  fireEvent.click(screen.getByRole('button', { name: 'Collapse Leqad panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expand Leqad panel' }));
  expect(screen.queryByRole('region', { name: 'Help content' })).toBeNull();
});
it('emphasizes Next only after acknowledgement without upgrading evidence', () => {
  render(<AssistantPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  expect(
    screen.getByRole('button', { name: 'Next', exact: true }).className,
  ).toContain('leqad-button--primary');
  expect(
    screen.getByRole('status', { name: 'Lesson progress' }).textContent,
  ).toContain('does not claim CAD verification');
});
