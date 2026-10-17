import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureRectangleCommandMetadata,
  createRectangleCommandMetadataReport,
  createRectangleMenuMetadataCapture,
  serializeRectangleCommandMetadataReport,
} from './rectangleCommandMetadataCapture';

// Simulated DOM fixtures only. They test diagnostic privacy and structure, not
// actual Onshape compatibility or production recognition.
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

function visible(element: HTMLElement, x = 10, y = 10) {
  element.getBoundingClientRect = () => new DOMRect(x, y, 32, 24);
}

function command(id: string, parent: HTMLElement) {
  const element = document.createElement('div');
  element.setAttribute('command-id', id);
  visible(element);
  parent.append(element);
  return element;
}

describe('Rectangle command metadata capture', () => {
  it('records only allowlisted command identities and the hypothesized toolbar marker', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar private-account-class';
    const line = command('LINESEGMENT', toolbar);
    const corner = command('RECTANGLE_TWO_CORNERS', toolbar);
    command('private-document-command', toolbar);
    document.body.append(toolbar);

    const events = vi.fn();
    line.addEventListener('click', events);
    corner.addEventListener('click', events);
    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot).toMatchObject({
      ownerReportedState: 'SKETCH_EDITING',
      observationGeneration: 1,
      toolbarMarkers: 1,
      sketchClue: 'PRESENT',
      scan: { status: 'COMPLETE', unallowlistedCommandIds: 1 },
    });
    expect(snapshot.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commandId: 'LINESEGMENT',
          location: 'TOOLBAR',
        }),
        expect.objectContaining({
          commandId: 'RECTANGLE_TWO_CORNERS',
          location: 'TOOLBAR',
        }),
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toContain('private-document-command');
    expect(JSON.stringify(snapshot)).not.toContain('private-account-class');
    expect(events).not.toHaveBeenCalled();
  });

  it('records a distinct arrow boundary and a portaled visible Rectangle menu', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const group = document.createElement('div');
    const face = command('RECTANGLE_CENTER', group);
    const arrow = document.createElement('div');
    arrow.className = 'dropdown-arrow';
    visible(face, 20, 10);
    visible(arrow, 52, 10);
    group.append(arrow);
    toolbar.append(group);

    const menu = document.createElement('div');
    menu.className = 'os-tool-dropdown-content';
    command('RECTANGLE_TWO_CORNERS', menu);
    command('RECTANGLE_CENTER', menu);
    command('RECTANGLE_ALIGNED', menu);
    document.body.append(toolbar, menu);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'RECTANGLE_MENU_OPEN',
      2,
    );

    expect(snapshot).toMatchObject({
      arrowMarkers: 1,
      menuMarkers: 1,
      ownership: [
        expect.objectContaining({
          faceCommandId: 'RECTANGLE_CENTER',
          arrowRelation: 'SAME_PARENT',
          visibleArrowCount: 1,
        }),
      ],
    });
    expect(
      snapshot.commands.filter(({ location }) => location === 'MENU'),
    ).toHaveLength(3);
  });

  it('keeps duplicate, hidden, disabled and unknown relationships explicit', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const first = command('RECTANGLE_TWO_CORNERS', toolbar);
    const second = command('RECTANGLE_TWO_CORNERS', toolbar);
    second.setAttribute('aria-disabled', 'true');
    const hidden = command('RECTANGLE_CENTER', toolbar);
    hidden.hidden = true;
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(first.isConnected).toBe(true);
    expect(snapshot.identity).toBe('AMBIGUOUS');
    expect(snapshot.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commandId: 'RECTANGLE_TWO_CORNERS',
          enabled: 'DISABLED',
        }),
        expect.objectContaining({
          commandId: 'RECTANGLE_CENTER',
          visibility: 'HIDDEN',
        }),
      ]),
    );
  });

  it('reports an incomplete bounded scan without promoting an unknown command', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    for (let index = 0; index < 300; index += 1)
      command(`unrelated-${index}`, toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.scan.status).toBe('INCOMPLETE');
    expect(snapshot.identity).toBe('UNKNOWN');
    expect(snapshot.commands).toEqual([
      expect.objectContaining({ commandId: 'RECTANGLE_TWO_CORNERS' }),
    ]);
  });

  it('excludes irrelevant SVG descendants from command inspection', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (let index = 0; index < 300; index += 1)
      svg.append(
        document.createElementNS('http://www.w3.org/2000/svg', 'path'),
      );
    toolbar.append(svg);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.scan).toMatchObject({
      status: 'COMPLETE',
      scannedElements: 1,
      relevantRegionCoverage: 'COMPLETE',
      inspection: 'COMPLETE',
    });
    expect(snapshot.identity).toBe('OBSERVED');
  });

  it('bounds ancestor inspection and retains conservative visibility and enabledness', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    let parent = toolbar;
    for (let depth = 0; depth < 110; depth += 1) {
      const wrapper = document.createElement('div');
      parent.append(wrapper);
      parent = wrapper;
    }
    command('RECTANGLE_TWO_CORNERS', parent);
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.scan).toMatchObject({
      status: 'INCOMPLETE',
      reasons: expect.arrayContaining(['ANCESTOR_LIMIT_REACHED']),
    });
    expect(snapshot.commands[0]).toMatchObject({
      visibility: 'UNKNOWN',
      enabled: 'UNKNOWN',
    });
    expect(snapshot.identity).toBe('UNKNOWN');
  });

  it('ignores unrelated global arrows and marks combined region overflow incomplete', () => {
    const unrelatedArrow = document.createElement('div');
    unrelatedArrow.className = 'dropdown-arrow';
    visible(unrelatedArrow);
    document.body.append(unrelatedArrow);
    for (let region = 0; region < 2; region += 1) {
      const toolbar = document.createElement('div');
      toolbar.className = 'os-element-toolbar';
      for (let index = 0; index < 140; index += 1)
        command(`unrelated-${region}-${index}`, toolbar);
      document.body.append(toolbar);
    }

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.arrowMarkers).toBe(0);
    expect(snapshot.ownership).toEqual([]);
    expect(snapshot.scan).toMatchObject({
      status: 'INCOMPLETE',
      reasons: expect.arrayContaining(['COMMAND_LIMIT_REACHED']),
    });
  });

  it('marks arrow overflow when a later bounded toolbar exceeds an exact first-toolbar cutoff', () => {
    const firstToolbar = document.createElement('div');
    firstToolbar.className = 'os-element-toolbar';
    for (let index = 0; index < 16; index += 1) {
      const arrow = document.createElement('div');
      arrow.className = 'dropdown-arrow';
      visible(arrow);
      firstToolbar.append(arrow);
    }
    const secondToolbar = document.createElement('div');
    secondToolbar.className = 'os-element-toolbar';
    const laterArrow = document.createElement('div');
    laterArrow.className = 'dropdown-arrow';
    visible(laterArrow);
    secondToolbar.append(laterArrow);
    document.body.append(firstToolbar, secondToolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.scan).toMatchObject({
      status: 'INCOMPLETE',
      reasons: expect.arrayContaining(['ARROW_LIMIT_REACHED']),
    });
    expect(snapshot.arrowMarkers).toBe(16);
  });

  it('marks an exact record-limit cutoff incomplete when a later Rectangle identity is omitted', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    for (let index = 0; index < 24; index += 1) command('LINESEGMENT', toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.scan).toMatchObject({
      status: 'INCOMPLETE',
      reasons: expect.arrayContaining(['RECORD_LIMIT_REACHED']),
    });
    expect(snapshot.identity).toBe('UNKNOWN');
  });

  it('does not let duplicate non-Rectangle clues contaminate a unique Rectangle identity', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    command('LINESEGMENT', toolbar);
    command('LINESEGMENT', toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.sketchClue).toBe('AMBIGUOUS');
    expect(snapshot.identity).toBe('OBSERVED');
  });

  it('inspects arrows only in the bounded toolbar set', () => {
    for (let index = 0; index < 20; index += 1) {
      const toolbar = document.createElement('div');
      toolbar.className = 'os-element-toolbar';
      const arrow = document.createElement('div');
      arrow.className = 'dropdown-arrow';
      visible(arrow);
      toolbar.append(arrow);
      document.body.append(toolbar);
    }

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.scan.reasons).toContain('REGION_LIMIT_REACHED');
    expect(snapshot.arrowMarkers).toBe(8);
    expect(snapshot.ownership).toHaveLength(8);
  });

  it('keeps owner-reported states separate from observed command evidence', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    command('extrude', toolbar);
    document.body.append(toolbar);

    const report = createRectangleCommandMetadataReport([
      captureRectangleCommandMetadata(document, 'EXTRUDE_EDITING', 4),
    ]);

    expect(report).toMatchObject({
      observationClaim: 'OWNER_REPORTED_STATE_WITH_DOM_OBSERVATIONS',
      productionRecognition: 'NOT_RUN',
      geometryVerification: 'NOT_RUN',
      snapshots: [
        expect.objectContaining({
          ownerReportedState: 'EXTRUDE_EDITING',
          sketchClue: 'ABSENT',
          extrudeClue: 'PRESENT',
        }),
      ],
    });
  });

  it('arms before the owner click and captures the opened menu without dispatching CAD input', async () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const group = document.createElement('div');
    const arrow = document.createElement('div');
    arrow.className = 'dropdown-arrow';
    visible(arrow);
    group.append(command('RECTANGLE_TWO_CORNERS', group), arrow);
    toolbar.append(group);
    document.body.append(toolbar);
    let ownerClicks = 0;
    arrow.addEventListener('pointerdown', () => {
      ownerClicks += 1;
      const menu = document.createElement('div');
      menu.className = 'os-tool-dropdown-content';
      command('RECTANGLE_TWO_CORNERS', menu);
      document.body.append(menu);
    });

    const task = createRectangleMenuMetadataCapture(document, 2, 1_000);
    await Promise.resolve();
    arrow.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const result = await task.promise;

    expect(result.status).toBe('CAPTURED');
    expect(result.snapshot).toMatchObject({
      ownerReportedState: 'RECTANGLE_MENU_OPEN',
      observationGeneration: 2,
      menuMarkers: 1,
    });
    expect(result.snapshot.commands).toContainEqual(
      expect.objectContaining({
        commandId: 'RECTANGLE_TWO_CORNERS',
        location: 'MENU',
      }),
    );
    expect(ownerClicks).toBe(1);
    expect(task.isActive()).toBe(false);
  });

  it('ignores a pre-existing hidden menu and waits for the visible Rectangle menu transition', async () => {
    vi.useFakeTimers();
    const hiddenMenu = document.createElement('div');
    hiddenMenu.className = 'os-tool-dropdown-content';
    hiddenMenu.hidden = true;
    document.body.append(hiddenMenu);
    const trigger = document.createElement('div');
    document.body.append(trigger);
    trigger.addEventListener('pointerdown', () => {
      trigger.className = 'pressed';
      setTimeout(() => {
        const menu = document.createElement('div');
        menu.className = 'os-tool-dropdown-content';
        const item = command('RECTANGLE_TWO_CORNERS', menu);
        visible(menu);
        visible(item);
        document.body.append(menu);
      }, 20);
    });

    const task = createRectangleMenuMetadataCapture(document, 2, 1_000);
    await Promise.resolve();
    trigger.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    await Promise.resolve();
    expect(task.isActive()).toBe(true);
    await vi.advanceTimersByTimeAsync(100);
    const result = await task.promise;

    expect(result.status).toBe('CAPTURED');
    expect(result.snapshot.menuMarkers).toBe(2);
    expect(result.snapshot.commands).toContainEqual(
      expect.objectContaining({
        commandId: 'RECTANGLE_TWO_CORNERS',
        location: 'MENU',
        visibility: 'VISIBLE',
      }),
    );
    vi.useRealTimers();
  });

  it('times out or cancels cleanly without inventing an open menu', async () => {
    vi.useFakeTimers();
    const timedOut = createRectangleMenuMetadataCapture(document, 2, 40);
    await Promise.resolve();
    await vi.advanceTimersByTimeAsync(40);
    expect(await timedOut.promise).toMatchObject({
      status: 'TIMED_OUT',
      snapshot: { menuMarkers: 0, identity: 'UNKNOWN' },
    });

    const cancelled = createRectangleMenuMetadataCapture(document, 2, 40);
    await Promise.resolve();
    cancelled.cancel();
    await expect(cancelled.promise).resolves.toMatchObject({
      status: 'CANCELLED',
    });
    expect(cancelled.isActive()).toBe(false);
    vi.useRealTimers();
  });

  it('inspects every command duplicate within bounded regions instead of trusting a global first match', () => {
    const decoy = command('RECTANGLE_TWO_CORNERS', document.body);
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    for (let i = 0; i < 100; i++) command(`unrelated-${i}`, toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);
    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );
    expect(snapshot.identity).toBe('AMBIGUOUS');
    expect(snapshot.commands).toHaveLength(2);
    expect(snapshot.scan).toMatchObject({
      inspection: 'COMPLETE',
      relevantRegionCoverage: 'COMPLETE',
      scannedElements: 102,
    });
    expect(snapshot.commands.every((item) => item.location === 'TOOLBAR')).toBe(
      true,
    );
    expect(decoy.isConnected).toBe(true);
  });

  it('separates completed bounded inspection from unknown relevant coverage', () => {
    for (let i = 0; i < 9; i++) {
      const toolbar = document.createElement('div');
      toolbar.className = 'os-element-toolbar';
      command('RECTANGLE_TWO_CORNERS', toolbar);
      document.body.append(toolbar);
    }
    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );
    expect(snapshot.scan).toMatchObject({
      inspection: 'COMPLETE',
      relevantRegionCoverage: 'UNKNOWN',
      status: 'INCOMPLETE',
    });
    expect(snapshot.identity).toBe('UNKNOWN');
  });

  it.each(['RECTANGLE_TWO_CORNERS', 'RECTANGLE_CENTER'] as const)(
    'records only a local group candidate with exact arrow bounds for %s',
    (id) => {
      const toolbar = document.createElement('div');
      toolbar.className = 'os-element-toolbar';
      let parent: HTMLElement = document.body;
      for (let i = 0; i < 40; i++) {
        const wrapper = document.createElement('div');
        parent.append(wrapper);
        parent = wrapper;
      }
      const group = document.createElement('div');
      group.getBoundingClientRect = () => new DOMRect(10, 10, 46, 24);
      const face = command(id, group);
      face.getBoundingClientRect = () => new DOMRect(10, 10, 32, 24);
      const arrow = document.createElement('div');
      arrow.className = 'dropdown-arrow';
      arrow.getBoundingClientRect = () => new DOMRect(42, 10, 14, 24);
      group.append(arrow);
      toolbar.append(group);
      parent.append(toolbar);
      const snapshot = captureRectangleCommandMetadata(
        document,
        'SKETCH_EDITING',
        1,
      );
      expect(snapshot.ownership[0]).toMatchObject({
        faceCommandId: id,
        assessment: 'LOCAL_CANDIDATE',
        visibility: 'VISIBLE',
        enabled: 'ENABLED',
        relativeBounds: { x: 32, y: 0, width: 14, height: 24 },
        menuAssociation: 'NOT_ESTABLISHED',
      });
      expect(snapshot.activeSketchState).toBe('UNKNOWN');
      const other = document.createElement('div');
      other.className = 'dropdown-arrow';
      visible(other);
      group.append(other);
      expect(
        captureRectangleCommandMetadata(document, 'SKETCH_EDITING', 1)
          .ownership[0]?.assessment,
      ).toBe('AMBIGUOUS');
    },
  );

  it('never identifies Sketch from command presence alone across negative contexts', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    document.body.append(toolbar);
    const line = command('LINESEGMENT', toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    const extrude = command('extrude', toolbar);
    expect(
      captureRectangleCommandMetadata(document, 'SKETCH_EDITING', 1),
    ).toMatchObject({ sketchClue: 'PRESENT', activeSketchState: 'UNKNOWN' });
    extrude.classList.add('is-active');
    expect(
      captureRectangleCommandMetadata(document, 'EXTRUDE_EDITING', 4),
    ).toMatchObject({
      contextReason: 'CONFLICTING_COMMAND_CLUES',
      activeSketchState: 'UNKNOWN',
    });
    line.remove();
    command('newSketch', toolbar);
    expect(
      captureRectangleCommandMetadata(document, 'EXTRUDE_EDITING', 4)
        .activeSketchState,
    ).toBe('UNKNOWN');
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    document.body.append(dialog);
    toolbar.hidden = true;
    expect(
      captureRectangleCommandMetadata(document, 'SKETCH_EDITING', 1).sketchClue,
    ).toBe('ABSENT');
    expect(
      captureRectangleCommandMetadata(document, 'SKETCH_EDITING', 1, {
        pageSupport: 'UNSUPPORTED',
        editability: 'READ_ONLY',
      }),
    ).toMatchObject({
      contextReason: 'PAGE_RESTRICTED',
      activeSketchState: 'UNKNOWN',
    });
  });

  it.each(['RECTANGLE_TWO_CORNERS', 'RECTANGLE_CENTER'] as const)(
    'attributes a menu transition only to the actual unique %s arrow branch',
    async (id) => {
      vi.useFakeTimers();
      const toolbar = document.createElement('div');
      toolbar.className = 'os-element-toolbar';
      const group = document.createElement('div');
      group.getBoundingClientRect = () => new DOMRect(10, 10, 46, 24);
      const face = command(id, group);
      face.getBoundingClientRect = () => new DOMRect(10, 10, 32, 24);
      const arrow = document.createElement('div');
      arrow.className = 'dropdown-arrow';
      arrow.getBoundingClientRect = () => new DOMRect(42, 10, 14, 24);
      group.append(arrow);
      toolbar.append(group);
      document.body.append(toolbar);
      const nested = document.createElement('span');
      arrow.append(nested);
      let clicks = 0;
      nested.addEventListener('pointerdown', () => {
        clicks++;
        const menu = document.createElement('div');
        menu.className = 'os-tool-dropdown-content';
        visible(menu);
        command('RECTANGLE_TWO_CORNERS', menu);
        group.append(menu);
      });
      const task = createRectangleMenuMetadataCapture(document, 2, 1000);
      await Promise.resolve();
      const event = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
      });
      nested.dispatchEvent(event);
      await vi.advanceTimersByTimeAsync(100);
      const result = await task.promise;
      expect(result.snapshot.interaction).toMatchObject({
        origin: 'RECTANGLE_ARROW_CANDIDATE',
        menuAssociation: 'LOCAL_TRANSITION_CANDIDATE',
        outcome: 'CAPTURED',
      });
      expect(event.defaultPrevented).toBe(false);
      expect(clicks).toBe(1);
      expect(result.snapshot.activeSketchState).toBe('UNKNOWN');
    },
  );

  it('records another user interaction and an unrelated visible menu without Rectangle ownership', async () => {
    vi.useFakeTimers();
    const other = document.createElement('button');
    document.body.append(other);
    const task = createRectangleMenuMetadataCapture(document, 2, 1000);
    await Promise.resolve();
    other.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    const menu = document.createElement('div');
    menu.className = 'os-tool-dropdown-content';
    visible(menu);
    document.body.append(menu);
    await vi.advanceTimersByTimeAsync(1000);
    const result = await task.promise;
    expect(result.status).toBe('TIMED_OUT');
    expect(result.snapshot.interaction).toMatchObject({
      origin: 'OTHER',
      menuAssociation: 'UNOWNED',
      outcome: 'TIMED_OUT',
    });
  });

  it('does not attribute a portaled Rectangle menu or a replaced arrow to the old group', async () => {
    vi.useFakeTimers();
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const group = document.createElement('div');
    group.getBoundingClientRect = () => new DOMRect(10, 10, 46, 24);
    const face = command('RECTANGLE_TWO_CORNERS', group);
    face.getBoundingClientRect = () => new DOMRect(10, 10, 32, 24);
    const arrow = document.createElement('div');
    arrow.className = 'dropdown-arrow';
    arrow.getBoundingClientRect = () => new DOMRect(42, 10, 14, 24);
    group.append(arrow);
    toolbar.append(group);
    document.body.append(toolbar);
    const task = createRectangleMenuMetadataCapture(document, 2, 1000);
    await Promise.resolve();
    arrow.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    arrow.remove();
    const menu = document.createElement('div');
    menu.className = 'os-tool-dropdown-content';
    visible(menu);
    command('RECTANGLE_TWO_CORNERS', menu);
    document.body.append(menu);
    await vi.advanceTimersByTimeAsync(100);
    expect((await task.promise).snapshot.interaction).toMatchObject({
      origin: 'RECTANGLE_ARROW_CANDIDATE',
      menuAssociation: 'UNKNOWN',
    });
  });

  it('does not call a shared parent a candidate when an unrelated actionable branch competes', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const group = document.createElement('div');
    group.getBoundingClientRect = () => new DOMRect(10, 10, 46, 24);
    const face = command('RECTANGLE_TWO_CORNERS', group);
    face.getBoundingClientRect = () => new DOMRect(10, 10, 32, 24);
    const arrow = document.createElement('div');
    arrow.className = 'dropdown-arrow';
    arrow.getBoundingClientRect = () => new DOMRect(42, 10, 14, 24);
    const unrelated = document.createElement('button');
    group.append(arrow, unrelated);
    toolbar.append(group);
    document.body.append(toolbar);
    expect(
      captureRectangleCommandMetadata(document, 'SKETCH_EDITING', 1)
        .ownership[0],
    ).toMatchObject({ assessment: 'AMBIGUOUS', competingControls: 1 });
  });

  it('retains pending read-only observations on navigation cancellation and expiry', async () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    command('LINESEGMENT', toolbar);
    document.body.append(toolbar);
    const task = createRectangleMenuMetadataCapture(document, 2, 1000);
    await Promise.resolve();
    window.dispatchEvent(new Event('pagehide'));
    expect(await task.promise).toMatchObject({
      status: 'CANCELLED',
      snapshot: {
        interaction: { outcome: 'CANCELLED', origin: 'NOT_OBSERVED' },
      },
    });
    expect(task.isActive()).toBe(false);
  });

  it('measures focused inspection cost on a controlled SVG-heavy simulation', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    for (let i = 0; i < 10000; i++)
      svg.append(document.createElementNS(svg.namespaceURI, 'path'));
    toolbar.append(svg);
    command('LINESEGMENT', toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);
    const start = performance.now();
    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );
    const elapsed = performance.now() - start;
    expect(snapshot.scan).toMatchObject({
      scannedElements: 2,
      relevantRegionCoverage: 'COMPLETE',
    });
    expect(elapsed).toBeLessThan(5000);
    console.info(
      `Simulated 10,000-path toolbar: ${elapsed.toFixed(1)} ms; ${snapshot.scan.scannedElements} command inspections`,
    );
  });

  it('bounds region discovery without materializing all command/actionable matches', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    for (let i = 0; i < 4200; i++)
      toolbar.append(document.createElement('div'));
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);
    const queryAll = vi.spyOn(toolbar, 'querySelectorAll');
    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );
    expect(queryAll).not.toHaveBeenCalled();
    expect(snapshot.scan).toMatchObject({
      status: 'INCOMPLETE',
      relevantRegionCoverage: 'UNKNOWN',
      regionElementsVisited: 4096,
      reasons: expect.arrayContaining(['REGION_TRAVERSAL_LIMIT_REACHED']),
    });
    expect(snapshot.identity).toBe('UNKNOWN');
  });

  it('revokes a local menu association if command coverage becomes incomplete after input', async () => {
    vi.useFakeTimers();
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const group = document.createElement('div');
    group.getBoundingClientRect = () => new DOMRect(10, 10, 46, 24);
    const face = command('RECTANGLE_TWO_CORNERS', group);
    face.getBoundingClientRect = () => new DOMRect(10, 10, 32, 24);
    const arrow = document.createElement('div');
    arrow.className = 'dropdown-arrow';
    arrow.getBoundingClientRect = () => new DOMRect(42, 10, 14, 24);
    group.append(arrow);
    toolbar.append(group);
    document.body.append(toolbar);
    const task = createRectangleMenuMetadataCapture(document, 2, 1000);
    await Promise.resolve();
    arrow.dispatchEvent(new PointerEvent('pointerdown', { bubbles: true }));
    for (let i = 0; i < 300; i++) command('UNLISTED', toolbar);
    const menu = document.createElement('div');
    menu.className = 'os-tool-dropdown-content';
    visible(menu);
    command('RECTANGLE_TWO_CORNERS', menu);
    group.append(menu);
    await vi.advanceTimersByTimeAsync(100);
    const result = await task.promise;
    expect(result.snapshot.interaction).toMatchObject({
      origin: 'RECTANGLE_ARROW_CANDIDATE',
      menuAssociation: 'UNKNOWN',
    });
    expect(result.snapshot.scan.relevantRegionCoverage).toBe('UNKNOWN');
  });

  it('retains separate hidden duplicate, regular Part Studio and other-dialog observations', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const line = command('LINESEGMENT', toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);
    const hidden = toolbar.cloneNode(true) as HTMLElement;
    hidden.hidden = true;
    document.body.append(hidden);
    expect(
      captureRectangleCommandMetadata(document, 'SKETCH_EDITING', 1),
    ).toMatchObject({
      activeSketchState: 'UNKNOWN',
      sketchClue: 'PRESENT',
      identity: 'AMBIGUOUS',
    });
    toolbar.remove();
    expect(
      captureRectangleCommandMetadata(document, 'SKETCH_EDITING', 1).sketchClue,
    ).toBe('ABSENT');
    hidden.remove();
    toolbar.replaceChildren();
    command('newSketch', toolbar);
    document.body.append(toolbar);
    const other = document.createElement('div');
    other.setAttribute('role', 'dialog');
    other.textContent = 'Extrude';
    document.body.append(other);
    expect(
      captureRectangleCommandMetadata(document, 'EXTRUDE_EDITING', 4),
    ).toMatchObject({
      activeSketchState: 'UNKNOWN',
      sketchClue: 'ABSENT',
      contextReason: 'COMMAND_CLUES_ONLY',
    });
    expect(line.isConnected).toBe(false);
  });

  it('serializes a closed privacy-safe schema even when input is poisoned', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);
    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );
    const poisonedCommand = snapshot
      .commands[0] as (typeof snapshot.commands)[number] & {
      privateText?: string;
      url?: string;
    };
    (snapshot.interaction as unknown as { origin: string }).origin =
      'PRIVATE_INTERACTION';
    poisonedCommand.privateText = 'Private CAD project';
    poisonedCommand.url = 'https://cad.onshape.com/documents/private-id';
    snapshot.ownership = Array.from({ length: 100 }, () => ({
      faceCommandId: 'RECTANGLE_TWO_CORNERS' as const,
      arrowRelation: 'SAME_PARENT' as const,
      visibleArrowCount: 1,
      parentChildCount: 2,
      parentChildCountCapped: false,
    }));
    const report = createRectangleCommandMetadataReport([
      snapshot,
    ]) as ReturnType<typeof createRectangleCommandMetadataReport> & {
      url?: string;
      html?: string;
      token?: string;
    };
    report.url = 'https://cad.onshape.com/documents/private-id';
    report.html = '<div data-account="secret">Private CAD</div>';
    report.token = 'SECRET_TOKEN';

    const output = serializeRectangleCommandMetadataReport(report);

    expect(output).toContain('leqad-rectangle-command-metadata/2');
    expect(JSON.parse(output).snapshots[0].ownership).toHaveLength(16);
    expect(JSON.parse(output).snapshots[0]).toMatchObject({
      activeSketchState: 'UNKNOWN',
      interaction: { origin: 'UNKNOWN' },
      scan: { discoveryWork: 'NATIVE_SELECTOR_ENGINE_NOT_HARD_BOUNDED' },
    });
    for (const secret of [
      'private-id',
      'data-account',
      'Private CAD',
      'SECRET_TOKEN',
      'url',
      'html',
      'token',
      'privateText',
      'PRIVATE_INTERACTION',
    ])
      expect(output).not.toContain(secret);
  });
});
