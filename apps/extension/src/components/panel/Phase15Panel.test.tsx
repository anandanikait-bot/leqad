import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { AssistantPanel } from './AssistantPanel';
afterEach(cleanup);
it('opens a short hint without running SHOW or verification; sections are exclusive', () => {
  const show = vi.fn(),
    check = vi.fn();
  render(<AssistantPanel onShowTarget={show} onCheckStep={check} />);
  expect(screen.queryByText(/Hint 1 of 5/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
  expect(show).not.toHaveBeenCalled();
  expect(check).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole('button', { name: 'Why it matters' }));
  expect(screen.queryByText(/Hint 1 of 5/)).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Hint' }));
  expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  expect(screen.getByText(/Hint 1 of 5/)).toBeTruthy();
});
it('closes help on collapse, step changes and document changes', () => {
  const page = {
    supported: true,
    versionId: null,
    microversionId: null,
    capabilitySource: null,
    capabilityObservedAt: null,
    documentId: 'a',
    workspaceId: 'w',
    elementId: 'e',
    editability: 'unknown',
    elementType: 'part-studio',
    modelType: 'workspace',
  } as const;
  const view = render(<AssistantPanel page={page} />);
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(
    screen.getByRole('button', { name: 'Help' }).getAttribute('aria-expanded'),
  ).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  view.rerender(<AssistantPanel page={{ ...page, documentId: 'b' }} />);
  expect(
    screen.getByRole('button', { name: 'Help' }).getAttribute('aria-expanded'),
  ).toBe('false');
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  fireEvent.click(screen.getByRole('button', { name: 'Collapse Leqad panel' }));
  fireEvent.click(screen.getByRole('button', { name: 'Expand Leqad panel' }));
  expect(screen.queryByRole('region', { name: 'Help content' })).toBeNull();
});
it('emphasizes Next only after acknowledgement without upgrading evidence', () => {
  render(<AssistantPanel />);
  fireEvent.click(screen.getByRole('button', { name: 'Got it' }));
  expect(screen.getByRole('button', { name: 'Next' }).className).toContain(
    'leqad-button--primary',
  );
  expect(
    screen.getByRole('status', { name: 'Lesson progress' }).textContent,
  ).toContain('does not claim CAD verification');
});
it('keeps local Ask examples separate from lesson state and guidance actions', () => {
  const show = vi.fn(),
    check = vi.fn(),
    save = vi.fn();
  render(
    <AssistantPanel
      onShowTarget={show}
      onCheckStep={check}
      onSessionChange={save}
    />,
  );
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  fireEvent.click(screen.getByRole('button', { name: 'Ask' }));
  const prior = save.mock.calls.length;
  fireEvent.click(
    screen.getByRole('button', { name: 'Why does this step matter?' }),
  );
  expect(screen.getByText('Local prototype — no AI connected')).toBeTruthy();
  fireEvent.click(screen.getByRole('button', { name: 'Learn' }));
  expect(save.mock.calls.length).toBe(prior);
  expect(show).not.toHaveBeenCalled();
  expect(check).not.toHaveBeenCalled();
  expect(screen.getByText('Step 1 of 8 · Visited')).toBeTruthy();
  expect(screen.queryByRole('region', { name: 'Help content' })).toBeNull();
});
