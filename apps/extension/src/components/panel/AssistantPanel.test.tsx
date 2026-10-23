import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => cleanup());

describe('AssistantPanel', () => {
  it('starts in limited access and never claims an unverified connection', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');

    render(<AssistantPanel />);

    expect(
      screen.getByRole('status', { name: 'Connection status' }).textContent,
    ).toBe('Limited access');
    expect(screen.queryByText('Connected')).toBeNull();
    expect(screen.getByRole('img', { name: 'Leqad logo' }).getAttribute('src'))
      .toMatch(/leqad-official-horizontal-dark-v1\.svg|data:image\/svg\+xml/);
  });

  it('lets a keyboard-accessible navigation control change the panel mode', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel />);

    fireEvent.click(screen.getByRole('button', { name: 'Projects' }));

    expect(
      screen.getByRole('heading', { name: 'Guided projects' }),
    ).toBeTruthy();
  });

  it('collapses the panel and exposes an accessible way to expand it', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Collapse Leqad panel' }),
    );

    expect(screen.queryByRole('navigation')).toBeNull();
    expect(
      screen.getByRole('button', { name: 'Expand Leqad panel' }),
    ).toBeTruthy();
  });

  it('uses the fixed brand colors as theme tokens', () => {
    const css = readFileSync(
      resolve(process.cwd(), 'apps/extension/src/styles/panel.css'),
      'utf8',
    );

    const normalizedCss = css.toLowerCase();

    expect(normalizedCss).toContain('#0d1c43');
    expect(normalizedCss).toContain('#793327');
    expect(normalizedCss).toContain('#f5efe7');
  });

  it('offers the first Foundations lesson and can request a semantic highlight', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const onShowTarget = vi.fn();
    render(<AssistantPanel onShowTarget={onShowTarget} />);

    expect(
      screen.getByRole('heading', { name: 'Your first sketch' }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Show me' }));

    expect(onShowTarget).toHaveBeenCalledWith('top-plane');
  });

  it('keeps lesson progress unverified when no UI evidence can be read', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel onCheckStep={() => 'UNKNOWN'} />);

    fireEvent.click(screen.getByRole('button', { name: 'Check progress' }));

    expect(
      screen.getByRole('status', { name: 'Lesson progress' }).textContent,
    ).toContain('Unable to verify');
    expect(screen.queryByText('Verified in Onshape')).toBeNull();
  });

  it('explains UI-only sketch evidence without implying verified model geometry', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel onCheckStep={() => 'PASS'} />);

    fireEvent.click(screen.getByRole('button', { name: 'Check progress' }));

    expect(
      screen.getByRole('status', { name: 'Lesson progress' }).textContent,
    ).toContain('Interface evidence confirms');
    expect(screen.getByText(/Model geometry is not checked/)).toBeTruthy();
  });

  it('reuses the current semantic target for repeated local cursor samples', async () => {
    const semanticTargets = await import('../../services/semanticTargets');
    const findTarget = vi.spyOn(semanticTargets, 'findSemanticTarget');
    const target = document.createElement('button');
    target.setAttribute('aria-label', 'Top plane');
    target.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    target.getClientRects = () =>
      [new DOMRect(20, 30, 80, 24)] as unknown as DOMRectList;
    document.body.append(target);
    const { AssistantPanel } = await import('./AssistantPanel');
    render(<AssistantPanel />);

    fireEvent.pointerMove(document, { clientX: 24, clientY: 35 });
    fireEvent.pointerMove(document, { clientX: 26, clientY: 36 });

    expect(findTarget).toHaveBeenCalledTimes(1);
  });

  it('moves the panel using its keyboard-accessible drag handle', async () => {
    const { AssistantPanel } = await import('./AssistantPanel');
    const { container } = render(<AssistantPanel />);
    const panel = container.querySelector('[data-leqad-panel]') as HTMLElement;
    const handle = screen.getByRole('group', { name: 'Move Leqad panel' });
    const before = panel.style.left;

    fireEvent.keyDown(handle, { key: 'ArrowRight' });

    expect(panel.style.left).not.toBe(before);
  });

  it('debounces local preference writes while the panel is moving', async () => {
    vi.useFakeTimers();
    try {
      const { AssistantPanel } = await import('./AssistantPanel');
      const onPanelPreferencesChange = vi.fn();
      render(
        <AssistantPanel onPanelPreferencesChange={onPanelPreferencesChange} />,
      );
      onPanelPreferencesChange.mockClear();
      const handle = screen.getByRole('group', { name: 'Move Leqad panel' });

      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      fireEvent.keyDown(handle, { key: 'ArrowRight' });
      expect(onPanelPreferencesChange).not.toHaveBeenCalled();

      vi.advanceTimersByTime(250);
      expect(onPanelPreferencesChange).toHaveBeenCalledTimes(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
