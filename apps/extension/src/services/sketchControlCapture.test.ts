import { afterEach, describe, expect, it, vi } from 'vitest';

// Simulated DOM. No structure here is asserted to be actual Onshape markup.
function control(label = 'Sketch') {
  const button = document.createElement('button');
  button.setAttribute('aria-label', label);
  button.getBoundingClientRect = () => new DOMRect(30, 40, 80, 24);
  document.body.append(button);
  return button;
}

afterEach(() => {
  document.body.replaceChildren();
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('opt-in Sketch control capture', () => {
  it('retains the clicked nested control after 100 unrelated buttons without running a document scan', async () => {
    const { inspectSketchControl } = await import('./sketchControlCapture');
    for (let i = 0; i < 100; i++) control('Private command ' + i);
    const button = control();
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    document.body.append(toolbar);
    toolbar.append(button);
    const icon = document.createElement('span');
    icon.getBoundingClientRect = () => new DOMRect(40, 45, 20, 12);
    button.append(icon);
    const report = inspectSketchControl(icon);
    expect(report.productionRecognition).toBe('NOT_RUN');
    expect(report.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          relation: 'ANCESTOR',
          distance: 1,
          name: 'Sketch',
          assessment: 'LOCALLY_ELIGIBLE',
        }),
        expect.objectContaining({ role: 'toolbar' }),
      ]),
    );
    expect(JSON.stringify(report)).not.toContain('Private command');
  });

  it('reports why conflicting names cannot be rescued by a Sketch tooltip', async () => {
    const { inspectSketchControl } = await import('./sketchControlCapture');
    const button = control('private account command');
    button.title = 'Sketch';
    const report = inspectSketchControl(button);
    expect(report.nodes[0]).toMatchObject({
      name: 'UNLISTED',
      title: 'Sketch',
      assessment: 'NO_SUPPORTED_COMMAND_NAME',
    });
    expect(JSON.stringify(report)).not.toContain('private account');
  });

  it.each(['hidden', 'disabled', 'inert'])(
    'reports the local %s rejection',
    async (attribute) => {
      const { inspectSketchControl } = await import('./sketchControlCapture');
      const button = control();
      button.setAttribute(attribute, '');
      const node = inspectSketchControl(button).nodes[0]!;
      expect(node.assessment).toBe(
        attribute === 'hidden' ? 'NOT_VISIBLE' : 'DISABLED',
      );
    },
  );

  it('retains unlabeled nonsemantic structure and nearby safe tool labels without inventing an action', async () => {
    const { inspectSketchControl } = await import('./sketchControlCapture');
    const wrapper = document.createElement('div');
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    wrapper.append(icon);
    document.body.append(wrapper);
    const neighbor = control('Extrude');
    wrapper.after(neighbor);
    const report = inspectSketchControl(icon);
    expect(report.nodes[0]).toMatchObject({
      tag: 'svg',
      assessment: 'NOT_HTML_CONTROL',
    });
    expect(report.nodes).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ relation: 'SIBLING', name: 'Extrude' }),
      ]),
    );
    expect(
      report.nodes.some((node) => node.assessment === 'LOCALLY_ELIGIBLE'),
    ).toBe(false);
  });

  it('keeps deep evidence with UNKNOWN eligibility and explicit inspection limits', async () => {
    const { inspectSketchControl } = await import('./sketchControlCapture');
    const button = control();
    for (let i = 0; i < 40; i++) {
      const parent = document.createElement('div');
      button.parentElement!.replaceChild(parent, button);
      parent.append(button);
    }
    const report = inspectSketchControl(button);
    expect(report.incomplete).toBe(true);
    expect(report.nodes[0]).toMatchObject({
      name: 'Sketch',
      visibility: 'UNKNOWN',
      enabled: 'UNKNOWN',
      assessment: 'INSPECTION_INCOMPLETE',
    });
    expect(report.nodes.length).toBeLessThanOrEqual(16);
  });

  it('omits private text, attributes, IDs, URLs and HTML and bounds large names/subtrees', async () => {
    const { inspectSketchControl } = await import('./sketchControlCapture');
    const button = control('SECRET'.repeat(100));
    button.id = 'private-document';
    button.className = 'private-class';
    button.setAttribute('data-tooltip', 'https://private.example/token');
    button.innerHTML = '<span>private CAD content</span>'.repeat(100);
    const report = inspectSketchControl(button);
    const output = JSON.stringify(report);
    for (const secret of [
      'SECRET',
      'private-document',
      'private-class',
      'https://',
      'private CAD',
      '<span>',
    ])
      expect(output).not.toContain(secret);
    expect(report.incomplete).toBe(true);
    expect(output.length).toBeLessThanOrEqual(24_000);
  });

  it('captures once before the normal click handler replaces the control and never suppresses clicks', async () => {
    const { createSketchControlCapture } =
      await import('./sketchControlCapture');
    const button = control();
    let clicks = 0;
    button.addEventListener('click', () => {
      clicks++;
      button.remove();
    });
    const task = createSketchControlCapture(document);
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    button.dispatchEvent(event);
    const result = await task.promise;
    expect(result.status).toBe('CAPTURED');
    if (result.status === 'CAPTURED')
      expect(result.report.nodes[0]).toMatchObject({
        connected: true,
        assessment: 'LOCALLY_ELIGIBLE',
      });
    expect(clicks).toBe(1);
    expect(event.defaultPrevented).toBe(false);
    expect(task.isActive()).toBe(false);
  });

  it.each(['cancel', 'timeout', 'navigation'])(
    'removes its listener on %s',
    async (reason) => {
      vi.useFakeTimers();
      const { createSketchControlCapture } =
        await import('./sketchControlCapture');
      const remove = vi.spyOn(document, 'removeEventListener');
      const task = createSketchControlCapture(document);
      if (reason === 'cancel') task.cancel();
      if (reason === 'timeout') vi.advanceTimersByTime(20_000);
      if (reason === 'navigation')
        window.dispatchEvent(new Event('wxt:locationchange'));
      expect((await task.promise).status).toBe(
        reason === 'timeout' ? 'TIMED_OUT' : 'CANCELLED',
      );
      expect(remove).toHaveBeenCalledWith('click', expect.any(Function), true);
      expect(task.isActive()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
    },
  );
});
