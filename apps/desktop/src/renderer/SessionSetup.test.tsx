import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { WindowCatalog, WindowSummary } from '@leqad/desktop-contracts';
import { SessionSetup } from './SessionSetup';

const catalog: WindowCatalog = {
  availability: 'available',
  unavailableReason: null,
  incomplete: false,
  windows: [
    {
      token: 'window-token-1',
      application: 'Chrome',
      ordinal: 1,
      kind: 'browser',
    },
    {
      token: 'window-token-2',
      application: 'Microsoft Edge',
      ordinal: 1,
      kind: 'browser',
    },
  ],
};

afterEach(cleanup);

describe('window selection and visual-unavailable startup screens', () => {
  it('requires a user to choose a window and keeps written lessons available', () => {
    const onUseWrittenLessons = vi.fn();
    render(
      <SessionSetup
        catalog={catalog}
        loading={false}
        mode="select"
        onRefresh={vi.fn()}
        onSelectionChange={vi.fn()}
        onUseSelectedWindow={vi.fn()}
        onUseWrittenLessons={onUseWrittenLessons}
        selectedToken={null}
        selectionError={null}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Learn alongside your CAD workspace',
      }),
    ).toBeTruthy();
    expect(
      screen.getByRole('radio', { name: 'Chrome · Window 1' }),
    ).toHaveProperty('checked', false);
    expect(
      screen.getByRole('button', { name: 'Use selected window' }),
    ).toHaveProperty('disabled', true);
    fireEvent.click(
      screen.getByRole('button', { name: 'Use written lessons' }),
    );
    expect(onUseWrittenLessons).toHaveBeenCalledOnce();
  });

  it('requires explicit selection and validation before using a listed window', () => {
    const onSelectionChange = vi.fn();
    const onUseSelectedWindow = vi.fn();
    const { rerender } = render(
      <SessionSetup
        catalog={catalog}
        loading={false}
        mode="select"
        onRefresh={vi.fn()}
        onSelectionChange={onSelectionChange}
        onUseSelectedWindow={onUseSelectedWindow}
        onUseWrittenLessons={vi.fn()}
        selectedToken={null}
        selectionError={null}
      />,
    );

    fireEvent.click(
      screen.getByRole('radio', { name: 'Microsoft Edge · Window 1' }),
    );
    expect(onSelectionChange).toHaveBeenCalledWith('window-token-2');
    expect(onUseSelectedWindow).not.toHaveBeenCalled();

    rerender(
      <SessionSetup
        catalog={catalog}
        loading={false}
        mode="select"
        onRefresh={vi.fn()}
        onSelectionChange={onSelectionChange}
        onUseSelectedWindow={onUseSelectedWindow}
        onUseWrittenLessons={vi.fn()}
        selectedToken="window-token-2"
        selectionError={null}
      />,
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Use selected window' }),
    );
    expect(onUseSelectedWindow).toHaveBeenCalledExactlyOnceWith(
      'window-token-2',
    );
  });

  it('blocks selection from an incomplete list while keeping written mode available', () => {
    render(
      <SessionSetup
        catalog={{ ...catalog, incomplete: true }}
        loading={false}
        mode="select"
        onRefresh={vi.fn()}
        onSelectionChange={vi.fn()}
        onUseSelectedWindow={vi.fn()}
        onUseWrittenLessons={vi.fn()}
        selectedToken="window-token-1"
        selectionError={null}
      />,
    );

    expect(screen.getByText(/window list is incomplete/i)).toBeTruthy();
    expect(screen.queryByRole('radio')).toBeNull();
    expect(
      screen.queryByRole('button', { name: 'Use selected window' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Use written lessons' }),
    ).toBeTruthy();
  });

  it('keeps written lessons available when window enumeration is unavailable', () => {
    const onRefresh = vi.fn();
    render(
      <SessionSetup
        catalog={{
          availability: 'unavailable',
          unavailableReason: 'unsupported',
          incomplete: false,
          windows: [],
        }}
        loading={false}
        mode="select"
        onRefresh={onRefresh}
        onSelectionChange={vi.fn()}
        onUseSelectedWindow={vi.fn()}
        onUseWrittenLessons={vi.fn()}
        selectedToken={null}
        selectionError={null}
      />,
    );

    expect(screen.getByText(/Window selection isn’t available/)).toBeTruthy();
    expect(
      screen.queryByRole('button', { name: 'Use selected window' }),
    ).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Use written lessons' }),
    ).toBeTruthy();
    fireEvent.click(
      screen.getByRole('button', { name: 'Refresh window list' }),
    );
    expect(onRefresh).toHaveBeenCalledOnce();
  });

  it('does not offer a false permission grant when visual access is unavailable', () => {
    const selectedWindow: WindowSummary = {
      application: 'Chrome',
      ordinal: 1,
      kind: 'browser',
    };
    const onContinueWithoutScreenAccess = vi.fn();
    const onChooseAnotherWindow = vi.fn();

    render(
      <SessionSetup
        mode="visual-unavailable"
        onChooseAnotherWindow={onChooseAnotherWindow}
        onContinueWithoutScreenAccess={onContinueWithoutScreenAccess}
        selectedWindow={selectedWindow}
      />,
    );

    expect(
      screen.getByRole('heading', {
        name: 'Visual help isn’t available in this build',
      }),
    ).toBeTruthy();
    expect(screen.getByText('Selected: Chrome · Window 1')).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Allow/i })).toBeNull();
    fireEvent.click(
      screen.getByRole('button', { name: 'Continue with written lessons' }),
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Choose another window' }),
    );
    expect(onContinueWithoutScreenAccess).toHaveBeenCalledOnce();
    expect(onChooseAnotherWindow).toHaveBeenCalledOnce();
  });
});
