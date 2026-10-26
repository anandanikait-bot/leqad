import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ContextualHelp } from './ContextualHelp';
import { createDesktopLessonController } from './lessonController';

let notifyResize: (() => void) | undefined;

class TestResizeObserver {
  constructor(callback: ResizeObserverCallback) {
    notifyResize = () => callback([], this as unknown as ResizeObserver);
  }

  observe = vi.fn();
  disconnect = vi.fn();
}

function makeRect(height: number): DOMRect {
  return {
    x: 0,
    y: 0,
    width: 365,
    height,
    top: 0,
    right: 365,
    bottom: height,
    left: 0,
    toJSON: () => ({}),
  };
}

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  notifyResize = undefined;
});

describe('ContextualHelp', () => {
  it('keeps the body-scroller fallback after extra space becomes available', async () => {
    let topicHeight = 100;
    let containerHeight = 300;
    vi.stubGlobal('ResizeObserver', TestResizeObserver);
    vi.spyOn(HTMLElement.prototype, 'getBoundingClientRect').mockImplementation(
      function (this: HTMLElement) {
        if (this.matches('[data-help-measurement-container]'))
          return makeRect(containerHeight);
        if (this.matches('.help-topic-body')) return makeRect(topicHeight);
        return makeRect(0);
      },
    );

    const modes: boolean[] = [];
    const step = createDesktopLessonController().getView().currentStep;
    render(
      <div data-help-measurement-container>
        <ContextualHelp
          onMoreHelp={vi.fn()}
          onScrollModeChange={(single) => modes.push(single)}
          step={step}
          textScale={1}
        />
      </div>,
    );

    fireEvent.click(screen.getByRole('button', { name: 'Help +' }));
    expect(modes.at(-1)).toBe(true);

    topicHeight = 200;
    containerHeight = 500;
    await act(async () => notifyResize?.());

    expect(modes).toEqual([false, true]);
  });
});
