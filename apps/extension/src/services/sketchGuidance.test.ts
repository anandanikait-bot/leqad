import { afterEach, describe, expect, it, vi } from 'vitest';

afterEach(() => document.body.replaceChildren());

describe('Sketch guidance observation monitor', () => {
  it('updates when supported active-Sketch evidence appears and disappears', async () => {
    const { createSketchGuidanceMonitor } = await import('./sketchGuidance');
    const monitor = createSketchGuidanceMonitor(document);
    const listener = vi.fn();
    const unsubscribe = monitor.subscribe(listener);

    expect(monitor.current.editingAppearsActive).toBe(false);

    const finishSketch = document.createElement('button');
    finishSketch.setAttribute('aria-label', 'Finish sketch');
    finishSketch.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
    document.body.append(finishSketch);

    await vi.waitFor(() =>
      expect(monitor.current.editingAppearsActive).toBe(true),
    );
    expect(listener).toHaveBeenLastCalledWith({
      editingAppearsActive: true,
      dialogPlane: null,
    });

    finishSketch.remove();
    await vi.waitFor(() =>
      expect(monitor.current.editingAppearsActive).toBe(false),
    );
    expect(listener).toHaveBeenLastCalledWith({
      editingAppearsActive: false,
      dialogPlane: null,
    });

    unsubscribe();
    monitor.disconnect();
  });
});
