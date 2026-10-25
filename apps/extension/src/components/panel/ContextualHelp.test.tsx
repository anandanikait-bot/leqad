import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ContextualHelp } from './ContextualHelp';
afterEach(cleanup);
it('starts closed and shows only the chosen section', () => {
  const onOpenChange = vi.fn();
  const onSectionChange = vi.fn();
  const props = {
    open: false,
    section: 'hint' as const,
    onOpenChange,
    onSectionChange,
    content: { hint: <p>Short hint</p>, why: <p>Concept</p> },
  };
  const { rerender } = render(<ContextualHelp {...props} />);
  expect(screen.queryByText('Short hint')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Help' }));
  expect(onOpenChange).toHaveBeenCalledWith(true);
  rerender(<ContextualHelp {...props} open />);
  expect(screen.getByText('Short hint')).toBeTruthy();
  expect(screen.queryByText('Concept')).toBeNull();
  fireEvent.click(screen.getByRole('button', { name: 'Why it matters' }));
  expect(onSectionChange).toHaveBeenCalledWith('why');
});
it('Escape closes and returns focus without invoking a CAD action', () => {
  const close = vi.fn();
  render(
    <ContextualHelp
      open
      section="hint"
      onOpenChange={close}
      onSectionChange={vi.fn()}
      content={{ hint: <button>More help</button> }}
    />,
  );
  screen.getByRole('button', { name: 'More help' }).focus();
  fireEvent.keyDown(screen.getByRole('region', { name: 'Help content' }), {
    key: 'Escape',
  });
  expect(close).toHaveBeenCalledWith(false);
  expect(document.activeElement).toBe(
    screen.getByRole('button', { name: 'Help' }),
  );
});
