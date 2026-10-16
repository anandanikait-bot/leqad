import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureManualRectangleDropdownSnapshot,
  createRectangleDropdownCapture,
  inspectRectangleDropdown,
  serializeRectangleDropdownReport,
  type RectangleDropdownCaptureReport,
} from './rectangleDropdownCapture';

// Simulated DOM fixtures only. They do not represent authenticated Onshape DOM.
afterEach(() => document.body.replaceChildren());

function setRect(
  element: HTMLElement,
  rect: { x: number; y: number; width: number; height: number },
) {
  element.getBoundingClientRect = () =>
    new DOMRect(rect.x, rect.y, rect.width, rect.height);
}

describe('inspectRectangleDropdown', () => {
  it('captures nested exact labels, safe structure, and local sibling relationships', () => {
    const toolbar = document.createElement('div');
    toolbar.setAttribute('role', 'toolbar');
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-label', 'Rectangle');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    setRect(trigger, { x: 10, y: 10, width: 32, height: 28 });
    const icon = document.createElement('span');
    icon.textContent = 'Rectangle';
    trigger.append(icon);
    toolbar.append(trigger);
    document.body.append(toolbar);

    const snapshot = inspectRectangleDropdown(document);
    const candidate = snapshot.candidates.find(
      (item) => item.node.ariaHasPopup === 'MENU',
    );

    expect(snapshot.domObservedState).toBe('CLOSED');
    expect(candidate).toMatchObject({
      label: 'Rectangle',
      labelClassification: 'GROUP_LABEL',
      node: {
        ariaHasPopup: 'MENU',
        ariaExpanded: 'FALSE',
        visibility: 'VISIBLE',
      },
    });
    expect(candidate?.ancestors.map((item) => item.tag)).toContain('div');
    expect(candidate?.siblings).toBeDefined();
  });

  it('marks Aligned Rectangle as diagnostic-only and never as a production target', () => {
    const item = document.createElement('div');
    item.textContent = 'Aligned Rectangle';
    setRect(item, { x: 10, y: 10, width: 90, height: 20 });
    document.body.append(item);

    const snapshot = inspectRectangleDropdown(document);

    expect(snapshot.candidates).toContainEqual(
      expect.objectContaining({
        label: 'Aligned Rectangle',
        labelClassification: 'DIAGNOSTIC_ONLY_UNVERIFIED',
      }),
    );
    expect(JSON.stringify(snapshot)).not.toContain('productionTarget');
  });

  it('records an unlabeled potential trigger without claiming it is actionable', () => {
    const trigger = document.createElement('div');
    trigger.setAttribute('aria-haspopup', 'true');
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('data-secret', 'private-value');
    trigger.append(document.createElement('svg'));
    setRect(trigger, { x: 10, y: 10, width: 32, height: 28 });
    document.body.append(trigger);

    const snapshot = inspectRectangleDropdown(document);

    expect(snapshot.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          label: null,
          labelClassification: 'UNLABELED_POTENTIAL_TRIGGER',
          node: expect.objectContaining({
            actionableMarkup: 'MARKUP_SIGNAL',
            ariaHasPopup: 'TRUE',
          }),
        }),
      ]),
    );
  });

  it('records a bounded dialog context so unrelated controls stay distinguishable', () => {
    const dialog = document.createElement('div');
    dialog.setAttribute('role', 'dialog');
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-label', 'Rectangle');
    setRect(trigger, { x: 10, y: 10, width: 32, height: 28 });
    dialog.append(trigger);
    document.body.append(dialog);

    const snapshot = inspectRectangleDropdown(document);

    expect(
      snapshot.candidates.find((candidate) => candidate.label === 'Rectangle')
        ?.node,
    ).toMatchObject({ context: 'DIALOG' });
  });

  it('keeps unsupported names private and omits arbitrary attributes and text', () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-label', 'Private CAD project member');
    trigger.setAttribute('aria-controls', 'private-dom-id');
    trigger.setAttribute('data-customer', 'private@example.com');
    trigger.textContent = 'Sketch 17, private geometry';
    document.body.append(trigger);

    const output = JSON.stringify(inspectRectangleDropdown(document));

    for (const secret of [
      'Private CAD project member',
      'private-dom-id',
      'private@example.com',
      'Sketch 17',
      'data-customer',
    ])
      expect(output).not.toContain(secret);
  });

  it('does not resolve duplicate exact labels by choosing a global first match', () => {
    const first = document.createElement('button');
    first.setAttribute('aria-label', 'Rectangle');
    const second = document.createElement('button');
    second.setAttribute('aria-label', 'Rectangle');
    document.body.append(first, second);

    const snapshot = inspectRectangleDropdown(document);

    expect(snapshot.ambiguity).toBe('DUPLICATE_EXACT_LABELS');
    expect(snapshot.domObservedState).toBe('UNKNOWN');
    expect(
      snapshot.candidates.filter((item) => item.label === 'Rectangle'),
    ).toHaveLength(2);
  });

  it('keeps state unknown when an expanded signal conflicts with a visible menu structure', () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-label', 'Rectangle');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    setRect(trigger, { x: 10, y: 10, width: 32, height: 28 });
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    setRect(menu, { x: 10, y: 40, width: 120, height: 80 });
    const item = document.createElement('button');
    item.setAttribute('role', 'menuitem');
    item.setAttribute('aria-label', 'Corner rectangle');
    setRect(item, { x: 12, y: 42, width: 100, height: 20 });
    menu.append(item);
    document.body.append(trigger, menu);

    const snapshot = inspectRectangleDropdown(document);

    expect(snapshot.domObservedState).toBe('UNKNOWN');
    expect(snapshot.stateBasis).toBe('UNKNOWN');
  });

  it('reports limits as incomplete rather than making absent-control claims', () => {
    const root = document.createElement('section');
    for (let index = 0; index < 10; index++) {
      const button = document.createElement('button');
      button.setAttribute('aria-label', 'Rectangle');
      root.append(button);
    }
    document.body.append(root);

    const snapshot = inspectRectangleDropdown(document, {
      scannedElements: 5,
      candidateRecords: 1,
      capturedAncestors: 1,
      siblingRadius: 1,
      reportChars: 1000,
    });

    expect(snapshot.scan.status).toBe('INCOMPLETE');
    expect(snapshot.scan.truncated).toBe(true);
    expect(snapshot.candidates).toHaveLength(1);
  });

  it('prioritizes exact Rectangle evidence after many unrelated controls', () => {
    const toolbar = document.createElement('div');
    for (let index = 0; index < 24; index++) {
      const unrelated = document.createElement('button');
      unrelated.setAttribute('aria-label', `Unrelated toolbar tool ${index}`);
      toolbar.append(unrelated);
    }
    const rectangle = document.createElement('button');
    rectangle.setAttribute('aria-label', 'Rectangle');
    rectangle.setAttribute('aria-haspopup', 'menu');
    rectangle.setAttribute('aria-expanded', 'false');
    toolbar.append(rectangle);
    document.body.append(toolbar);

    const manual = captureManualRectangleDropdownSnapshot(
      document,
      'BEFORE',
      'CLOSED',
    );

    expect(manual.snapshot.candidates).toContainEqual(
      expect.objectContaining({
        label: 'Rectangle',
        labelClassification: 'GROUP_LABEL',
      }),
    );
    expect(manual.snapshot.scan).toMatchObject({
      status: 'INCOMPLETE',
      truncated: true,
    });
    expect(manual.snapshot.scan.scannedElements).toBeLessThanOrEqual(5000);
    expect(manual.snapshot.candidates).toHaveLength(12);
  });
});

describe('manual Rectangle dropdown snapshots', () => {
  it('keeps user-reported state separate from unknown DOM state', () => {
    const label = document.createElement('span');
    label.textContent = 'Rectangle';
    document.body.append(label);

    const manual = captureManualRectangleDropdownSnapshot(
      document,
      'BEFORE',
      'CLOSED',
    );

    expect(manual).toMatchObject({
      snapshotRole: 'BEFORE',
      userReportedState: 'CLOSED',
      snapshot: { domObservedState: 'UNKNOWN' },
    });
  });

  it('serializes a standalone sanitized report without production recognition', () => {
    const report: RectangleDropdownCaptureReport = {
      version: 'leqad-rectangle-dropdown/3',
      interactionMode: 'OBSERVE_MENU',
      workflowState: 'FINISHED',
      stateHistory: ['FINISHED'],
      cancelReason: null,
      interactions: [],
      status: 'CAPTURED',
      captureMode: 'MANUAL_FALLBACK',
      baseline: inspectRectangleDropdown(document),
      transitions: [],
      manualSnapshots: [
        captureManualRectangleDropdownSnapshot(document, 'AFTER', 'OPEN'),
      ],
      truncated: false,
    };

    const output = serializeRectangleDropdownReport(report);

    expect(JSON.parse(output).version).toBe('leqad-rectangle-dropdown/3');
    expect(output).not.toContain('productionRecognition');
    expect(output.length).toBeLessThanOrEqual(24_000);
  });

  it('drops unexpected runtime properties before serialization', () => {
    const baseline = inspectRectangleDropdown(
      document,
    ) as RectangleDropdownCaptureReport['baseline'] & {
      privateText: string;
    };
    baseline.privateText = 'private CAD note';
    const report: RectangleDropdownCaptureReport = {
      version: 'leqad-rectangle-dropdown/3',
      interactionMode: 'OBSERVE_MENU',
      workflowState: 'FINISHED',
      stateHistory: ['FINISHED'],
      cancelReason: null,
      interactions: [],
      status: 'CAPTURED',
      captureMode: 'AUTOMATIC',
      baseline,
      transitions: [],
      manualSnapshots: [],
      truncated: false,
    };

    const output = serializeRectangleDropdownReport(report);

    expect(output).not.toContain('private CAD note');
  });

  it('marks report-size truncation incomplete and stays within the report cap', () => {
    const report: RectangleDropdownCaptureReport = {
      version: 'leqad-rectangle-dropdown/3',
      interactionMode: 'OBSERVE_MENU',
      workflowState: 'FINISHED',
      stateHistory: ['FINISHED'],
      cancelReason: null,
      interactions: [],
      status: 'CAPTURED',
      captureMode: 'MANUAL_FALLBACK',
      baseline: inspectRectangleDropdown(document),
      transitions: [],
      manualSnapshots: Array.from({ length: 1000 }, (_, index) => ({
        snapshotRole: index % 2 === 0 ? 'BEFORE' : 'AFTER',
        userReportedState: index % 2 === 0 ? 'CLOSED' : 'OPEN',
        snapshot: inspectRectangleDropdown(document),
      })),
      truncated: false,
    };

    const output = serializeRectangleDropdownReport(report);
    const parsed = JSON.parse(output);

    expect(output.length).toBeLessThanOrEqual(24_000);
    expect(parsed.status).toBe('INCOMPLETE');
    expect(parsed.truncated).toBe(true);
  });
});

describe('automatic Rectangle dropdown capture', () => {
  afterEach(() => vi.useRealTimers());

  function makeTrigger(initialState: 'true' | 'false') {
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-label', 'Rectangle');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', initialState);
    setRect(trigger, { x: 10, y: 10, width: 32, height: 28 });
    document.body.append(trigger);
    return trigger;
  }

  it('captures an observed pointer transition while preserving the host click', async () => {
    const trigger = makeTrigger('false');
    let hostPointerDowns = 0;
    trigger.addEventListener('pointerdown', () => hostPointerDowns++);
    const task = createRectangleDropdownCapture(document, 1000);

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    trigger.setAttribute('aria-expanded', 'true');
    const result = await task.promise;

    expect(result.status).toBe('CAPTURED');
    expect(hostPointerDowns).toBe(1);
    expect(result.report.transitions[0]).toMatchObject({
      eventCategory: 'POINTER',
      before: { domObservedState: 'CLOSED' },
      after: { domObservedState: 'OPEN' },
    });
    expect(task.isActive()).toBe(false);
  });

  it('retains Rectangle evidence when unrelated toolbar buttons precede it', async () => {
    const toolbar = document.createElement('div');
    for (let index = 0; index < 24; index++) {
      const unrelated = document.createElement('button');
      unrelated.setAttribute('aria-label', `Unrelated toolbar tool ${index}`);
      toolbar.append(unrelated);
    }
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-label', 'Rectangle');
    trigger.setAttribute('aria-haspopup', 'menu');
    trigger.setAttribute('aria-expanded', 'false');
    setRect(trigger, { x: 10, y: 10, width: 32, height: 28 });
    toolbar.append(trigger);
    document.body.append(toolbar);
    const task = createRectangleDropdownCapture(document, 1000);

    expect(task.isActive()).toBe(true);
    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    trigger.setAttribute('aria-expanded', 'true');
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const variant = document.createElement('button');
    variant.setAttribute('role', 'menuitem');
    variant.setAttribute('aria-label', 'Corner rectangle');
    menu.append(variant);
    document.body.append(menu);

    const result = await task.promise;
    const automatic = result.report.transitions[0]?.after;

    expect(result.status).toBe('INCOMPLETE');
    expect(result.report.baseline.scan).toMatchObject({
      status: 'INCOMPLETE',
      truncated: true,
    });
    expect(result.report.baseline.candidates).toContainEqual(
      expect.objectContaining({ label: 'Rectangle' }),
    );
    expect(automatic?.candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ label: 'Rectangle' }),
        expect.objectContaining({ label: 'Corner rectangle' }),
        expect.objectContaining({
          node: expect.objectContaining({ role: 'menu' }),
        }),
      ]),
    );
    expect(automatic?.domObservedState).toBe('OPEN');
    expect(automatic?.scan).toMatchObject({
      status: 'INCOMPLETE',
      truncated: true,
    });
  });

  it('captures a keyboard transition without recording the key value', async () => {
    const trigger = makeTrigger('false');
    const task = createRectangleDropdownCapture(document, 1000);

    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    trigger.setAttribute('aria-expanded', 'true');
    const result = await task.promise;
    const output = serializeRectangleDropdownReport(result.report);

    expect(result.report.transitions[0]?.eventCategory).toBe('KEYBOARD');
    expect(result.report.transitions[0]?.after.domObservedState).toBe('OPEN');
    expect(output).not.toContain('Enter');
    expect(output).not.toContain('key');
  });

  it('does not report a menu transition when an input event causes no DOM change', async () => {
    vi.useFakeTimers();
    const trigger = makeTrigger('false');
    const task = createRectangleDropdownCapture(document, 40);

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    await vi.advanceTimersByTimeAsync(50);
    const result = await task.promise;

    expect(result.status).toBe('TIMED_OUT');
    expect(result.report.transitions).toHaveLength(0);
    expect(result.report.baseline.domObservedState).toBe('CLOSED');
  });

  it('does not finish on an unrelated mutation while an observed menu stays closed', async () => {
    const trigger = makeTrigger('false');
    const task = createRectangleDropdownCapture(document, 1000);

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const unrelated = document.createElement('div');
    document.body.append(unrelated);
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(task.isActive()).toBe(true);

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    trigger.setAttribute('aria-expanded', 'true');
    const result = await task.promise;
    expect(result.status).toBe('CAPTURED');
    expect(result.report.transitions.at(-1)?.after.domObservedState).toBe(
      'OPEN',
    );
  });

  it('records manual close then reopen when capture starts open', async () => {
    const trigger = makeTrigger('true');
    const task = createRectangleDropdownCapture(document, 1000);

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    trigger.setAttribute('aria-expanded', 'false');
    await new Promise((resolve) => setTimeout(resolve, 30));
    expect(task.isActive()).toBe(true);
    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    trigger.setAttribute('aria-expanded', 'true');
    const result = await task.promise;

    expect(result.report.baseline.domObservedState).toBe('OPEN');
    expect(
      result.report.transitions.map(
        (transition) => transition.after.domObservedState,
      ),
    ).toEqual(['CLOSED', 'OPEN']);
  });

  it('captures bounded structure from an unlabeled nonsemantic event target', async () => {
    const trigger = document.createElement('div');
    trigger.setAttribute('data-secret', 'private-dom-value');
    setRect(trigger, { x: 10, y: 10, width: 32, height: 28 });
    document.body.append(trigger);
    const task = createRectangleDropdownCapture(document, 1000);

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const child = document.createElement('span');
    child.textContent = 'Private CAD content';
    trigger.append(child);
    const result = await task.promise;
    const inputNode = result.report.transitions[0]?.after.candidates.find(
      (candidate) => candidate.inputPathMember && candidate.node.tag === 'div',
    );
    const output = serializeRectangleDropdownReport(result.report);

    expect(result.status).toBe('CAPTURED');
    expect(inputNode).toMatchObject({
      label: null,
      labelClassification: 'INPUT_PATH_STRUCTURE',
      node: { actionableMarkup: 'NOT_EXPOSED' },
    });
    expect(output).not.toContain('private-dom-value');
    expect(output).not.toContain('Private CAD content');
  });

  it('reports a menu nested under the Rectangle control only as a nested DOM relationship', async () => {
    const trigger = makeTrigger('false');
    const task = createRectangleDropdownCapture(document, 1000);

    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    trigger.setAttribute('aria-expanded', 'true');
    const menu = document.createElement('div');
    menu.setAttribute('role', 'menu');
    const item = document.createElement('button');
    item.setAttribute('role', 'menuitem');
    item.setAttribute('aria-label', 'Corner rectangle');
    menu.append(item);
    trigger.append(menu);
    const result = await task.promise;

    expect(result.report.transitions[0]?.relationship).toBe('NESTED');
    expect(result.report.transitions[0]?.after.domObservedState).toBe('OPEN');
  });

  it('cleans up once on repeated cancel and leaves later input untouched', async () => {
    const trigger = makeTrigger('false');
    const disconnect = vi.spyOn(MutationObserver.prototype, 'disconnect');
    const task = createRectangleDropdownCapture(document, 1000);

    task.cancel();
    task.cancel();
    trigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const result = await task.promise;

    expect(result.status).toBe('CANCELLED');
    expect(task.isActive()).toBe(false);
    expect(disconnect).toHaveBeenCalledTimes(1);
  });
});

// Label spelling and row child relationships below come from Issue #3's evidence
// review. The trigger, portal relationship, layout and handlers are simulations.
describe('bounded local evidence beyond the document baseline', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  function scene(flood = true) {
    if (flood) {
      const unrelated = document.createElement('section');
      for (let i = 0; i < 6100; i++)
        unrelated.append(document.createElement('i'));
      document.body.append(unrelated);
    }
    const group = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = 'Rectangle';
    const trigger = document.createElement('div');
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.id = 'private-trigger-id';
    svg.setAttribute('class', 'private-trigger-class');
    trigger.append(svg);
    group.append(label, trigger);
    document.body.append(group);
    const menu = document.createElement('div');
    const items = [
      'Corner rectangle',
      'Center point rectangle',
      'Aligned Rectangle',
    ].map((name, index) => {
      const row = document.createElement('div');
      const text = document.createElement('span');
      text.textContent = name;
      row.append(document.createElement('div'), text);
      if (index < 2) row.append(document.createElement('span'));
      menu.append(row);
      return text;
    });
    for (const node of [group, label, trigger, svg, menu, ...items])
      node.getBoundingClientRect = () => new DOMRect(10, 20, 90, 24);
    return { group, trigger, svg, menu, items };
  }
  function input(element: Element) {
    element.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const event = new MouseEvent('click', { bubbles: true, cancelable: true });
    element.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
  }

  it('records pre-input context and portal labels separately from an incomplete 6000-element baseline', async () => {
    const { svg, menu } = scene();
    const walk = vi.spyOn(document, 'createTreeWalker');
    let clicks = 0;
    svg.addEventListener('click', () => {
      clicks++;
      document.body.append(menu);
    });
    const task = createRectangleDropdownCapture(document, 1000);
    input(svg);
    const { report } = await task.promise;
    expect(report.version).toBe('leqad-rectangle-dropdown/3');
    expect(report.baseline.scan).toMatchObject({
      scannedElements: 6000,
      status: 'INCOMPLETE',
    });
    expect(report.truncated).toBe(true);
    expect(report.interactions?.[0]).toMatchObject({
      sequence: 1,
      clickObserved: true,
      path: expect.arrayContaining([
        expect.objectContaining({
          distance: 0,
          label: null,
          node: expect.objectContaining({ tag: 'svg' }),
        }),
      ]),
      localBefore: {
        domObservedState: 'UNKNOWN',
        scan: { status: 'COMPLETE' },
      },
    });
    const localBefore = report.interactions?.[0]?.localBefore;
    expect(localBefore?.candidates).toContainEqual(
      expect.objectContaining({
        label: 'Rectangle',
        inputRelation: {
          kind: 'SIBLING_BRANCH',
          pathDistance: 1,
          siblingOffset: -1,
        },
      }),
    );
    const transition = report.transitions[0];
    expect(transition).toMatchObject({
      inputSequence: 1,
      scope: 'INPUT_AND_MUTATION_LOCAL',
      after: { domObservedState: 'UNKNOWN', scan: { status: 'INCOMPLETE' } },
    });
    expect(transition?.after.candidates.map(({ label }) => label)).toEqual(
      expect.arrayContaining([
        'Corner rectangle',
        'Center point rectangle',
        'Aligned Rectangle',
      ]),
    );
    expect(transition?.after.scan.scannedElements).toBeLessThanOrEqual(256);
    expect(
      walk.mock.calls.filter(
        ([root, whatToShow]) =>
          root === document.documentElement && whatToShow === 1,
      ),
    ).toHaveLength(1);
    const output = serializeRectangleDropdownReport(report);
    expect(output).not.toContain('private-trigger');
    expect(output.length).toBeLessThanOrEqual(24000);
    expect(
      JSON.parse(output).transitions[0].after.candidates.map(
        (item: { label: string }) => item.label,
      ),
    ).toEqual(
      expect.arrayContaining([
        'Corner rectangle',
        'Center point rectangle',
        'Aligned Rectangle',
      ]),
    );
    expect(clicks).toBe(1);
  });

  it('retains the separate actual option click path before the portal is removed', async () => {
    const { menu, items } = scene();
    document.body.append(menu);
    const item = items[0]!;
    item.addEventListener('click', () => menu.remove());
    const task = createRectangleDropdownCapture(document, 1000);
    input(item);
    const { report } = await task.promise;
    expect(report.interactions?.[0]).toMatchObject({
      clickObserved: true,
      path: expect.arrayContaining([
        expect.objectContaining({
          distance: 0,
          label: 'Corner rectangle',
          node: expect.objectContaining({ connected: true }),
        }),
      ]),
    });
    expect(report.transitions[0]?.after.candidates).toContainEqual(
      expect.objectContaining({
        label: 'Corner rectangle',
        node: expect.objectContaining({
          connected: false,
          visibility: 'HIDDEN',
        }),
      }),
    );
    expect(report.transitions[0]?.after.domObservedState).toBe('UNKNOWN');
  });

  it('does not finish or invent a transition for an unrelated mutation after unlabeled input', async () => {
    vi.useFakeTimers();
    const { svg } = scene(false);
    const task = createRectangleDropdownCapture(document, 1000);
    input(svg);
    document.body.append(document.createElement('aside'));
    await vi.advanceTimersByTimeAsync(40);
    expect(task.isActive()).toBe(true);
    task.cancel();
    const { report } = await task.promise;
    expect(report.transitions).toHaveLength(0);
    expect(report.interactions).toHaveLength(1);
  });

  it('keeps useful input evidence when the user click causes no observable DOM mutation', async () => {
    vi.useFakeTimers();
    const { svg } = scene(false);
    const task = createRectangleDropdownCapture(document, 40);
    input(svg);
    await vi.advanceTimersByTimeAsync(50);
    const result = await task.promise;
    expect(result.status).toBe('TIMED_OUT');
    expect(result.report.interactions?.[0]?.path[0]?.node.tag).toBe('svg');
    expect(result.report.interactions?.[0]?.localBefore.domObservedState).toBe(
      'UNKNOWN',
    );
    expect(result.report.transitions).toHaveLength(0);
  });

  it('reports local inspection bounds without losing the clicked path', async () => {
    vi.useFakeTimers();
    const { group, svg } = scene(false);
    for (let i = 0; i < 400; i++) group.append(document.createElement('span'));
    const task = createRectangleDropdownCapture(document, 40);
    input(svg);
    await vi.advanceTimersByTimeAsync(50);
    const { report } = await task.promise;
    expect(report.interactions?.[0]?.localBefore.scan).toMatchObject({
      status: 'INCOMPLETE',
      truncated: true,
    });
    expect(
      report.interactions?.[0]?.localBefore.scan.scannedElements,
    ).toBeLessThanOrEqual(256);
    expect(report.interactions?.[0]?.path[0]?.node.tag).toBe('svg');
  });

  it('does not combine an unrelated semantic menu with a Rectangle label to claim OPEN', () => {
    const { menu, group } = scene(false);
    menu.setAttribute('role', 'menu');
    group.setAttribute('role', 'button');
    document.body.append(menu);
    expect(inspectRectangleDropdown(document).domObservedState).toBe('UNKNOWN');
  });

  it('reports duplicate exact variant labels without choosing one', () => {
    const { menu } = scene(false);
    const other = document.createElement('span');
    other.textContent = 'Corner rectangle';
    menu.append(other);
    document.body.append(menu);
    expect(inspectRectangleDropdown(document).ambiguity).toBe(
      'DUPLICATE_EXACT_LABELS',
    );
    expect(inspectRectangleDropdown(document).domObservedState).toBe('UNKNOWN');
  });

  it.each(['disabled', 'hidden', 'inert'])(
    'does not use a %s command as enabled open-state evidence',
    (attribute) => {
      const trigger = document.createElement('button');
      trigger.setAttribute('aria-label', 'Rectangle');
      trigger.setAttribute('aria-haspopup', 'menu');
      trigger.setAttribute('aria-expanded', 'true');
      trigger.setAttribute(attribute, '');
      setRect(trigger, { x: 10, y: 10, width: 32, height: 28 });
      document.body.append(trigger);
      expect(inspectRectangleDropdown(document).domObservedState).toBe(
        'UNKNOWN',
      );
    },
  );

  it('ignores typing and Leqad interaction and cleans all listeners on cancellation', async () => {
    const field = document.createElement('input');
    field.value = 'PRIVATE CAD VALUE';
    const panel = document.createElement('section');
    panel.setAttribute('data-leqad-root', '');
    const button = document.createElement('button');
    panel.append(button);
    document.body.append(field, panel);
    const task = createRectangleDropdownCapture(document, 1000);
    input(field);
    field.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'private-key', bubbles: true }),
    );
    input(button);
    const remove = vi.spyOn(document, 'removeEventListener');
    task.cancel();
    const { report } = await task.promise;
    expect(report.interactions).toEqual([]);
    expect(remove).toHaveBeenCalledWith('click', expect.any(Function), true);
    expect(serializeRectangleDropdownReport(report)).not.toContain('PRIVATE');
    expect(task.isActive()).toBe(false);
  });
});

describe('local observation resource and export guards', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('bounds mutation-root enumeration before walking a large added node list', async () => {
    vi.useFakeTimers();
    const target = document.createElement('div');
    document.body.append(target);
    const task = createRectangleDropdownCapture(document, 40);
    target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const walk = vi.spyOn(document, 'createTreeWalker');
    const roots = new Set<Element>();
    const fragment = document.createDocumentFragment();
    for (let index = 0; index < 1500; index++) {
      const item = document.createElement('div');
      roots.add(item);
      fragment.append(item);
    }
    document.body.append(fragment);
    await vi.advanceTimersByTimeAsync(50);
    const { report } = await task.promise;
    expect(
      walk.mock.calls.filter(
        ([root, show]) =>
          root instanceof Element && roots.has(root) && show === 1,
      ).length,
    ).toBeLessThanOrEqual(256);
    expect(report.truncated).toBe(true);
    expect(report.transitions).toHaveLength(0);
  });

  it('caps input observations and sanitizes new path metadata before export', async () => {
    const target = document.createElement('div');
    target.id = 'private-document-token';
    document.body.append(target);
    const task = createRectangleDropdownCapture(document, 1000);
    for (let i = 0; i < 5; i++)
      target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    const { report } = await task.promise;
    expect(report.status).toBe('INCOMPLETE');
    expect(report.interactions).toHaveLength(4);
    const poisoned = report
      .interactions[0]! as (typeof report.interactions)[0] & { secret: string };
    poisoned.secret = 'PRIVATE EVENT DATA';
    Object.assign(poisoned.path[0]!.node, {
      role: 'PRIVATE ROLE',
      html: 'PRIVATE HTML',
    });
    const output = serializeRectangleDropdownReport(report);
    expect(output.length).toBeLessThanOrEqual(24000);
    expect(output).not.toContain('PRIVATE');
    expect(output).not.toContain('private-document-token');
    expect(JSON.parse(output).interactions[0].path[0].node.role).toBe('other');
  });
});

describe('reviewed evidence association boundaries', () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  it('does not associate sibling-panel changes through a shared application ancestor', async () => {
    vi.useFakeTimers();
    const app = document.createElement('main');
    const section = document.createElement('section');
    const target = document.createElement('div');
    target.append(
      document.createElementNS('http://www.w3.org/2000/svg', 'svg'),
    );
    section.append(target);
    const unrelated = document.createElement('aside');
    app.append(section, unrelated);
    document.body.append(app);
    const task = createRectangleDropdownCapture(document, 1000);
    target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    unrelated.append(document.createElement('span'));
    await vi.advanceTimersByTimeAsync(40);
    expect(task.isActive()).toBe(true);
    task.cancel();
    expect((await task.promise).report.transitions).toHaveLength(0);
  });

  it('does not use a naming reference as menu ownership evidence', () => {
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-label', 'Rectangle');
    trigger.setAttribute('aria-labelledby', 'private-naming-reference');
    const menu = document.createElement('div');
    menu.id = 'private-naming-reference';
    menu.setAttribute('role', 'menu');
    const item = document.createElement('span');
    item.textContent = 'Corner rectangle';
    menu.append(item);
    for (const node of [trigger, menu, item])
      setRect(node, { x: 10, y: 10, width: 80, height: 24 });
    document.body.append(trigger, menu);
    expect(inspectRectangleDropdown(document).domObservedState).toBe('UNKNOWN');
    // Unlike a naming reference, explicit controls can support a diagnostic
    // observation of this simulated visible menu. It is not a production adapter.
    trigger.removeAttribute('aria-labelledby');
    trigger.setAttribute('aria-controls', 'private-naming-reference');
    expect(inspectRectangleDropdown(document)).toMatchObject({
      domObservedState: 'OPEN',
      stateBasis: 'SEMANTIC_MENU',
    });
  });

  it('preserves the pre-input path and reports a changed click path conservatively', async () => {
    const oldParent = document.createElement('div');
    const newParent = document.createElement('section');
    const target = document.createElement('span');
    target.textContent = 'Corner rectangle';
    oldParent.append(target);
    document.body.append(oldParent, newParent);
    const task = createRectangleDropdownCapture(document, 1000);
    target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    newParent.append(target);
    target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const { report } = await task.promise;
    expect(report.interactions[0]).toMatchObject({
      clickObserved: true,
      clickPathMatchesInput: false,
      clickedLabel: 'Corner rectangle',
    });
    expect(report.interactions[0]?.path[1]?.node.tag).toBe('div');
    expect(report.transitions[0]).toMatchObject({
      inputAssociation: 'UNPROVEN',
    });
  });

  it.each(['timeout', 'navigation', 'hidden', 'success'])(
    'removes all observation hooks on %s',
    async (reason) => {
      vi.useFakeTimers();
      const target = document.createElement('button');
      target.setAttribute('aria-label', 'Rectangle');
      target.setAttribute('aria-haspopup', 'menu');
      target.setAttribute('aria-expanded', 'false');
      setRect(target, { x: 10, y: 10, width: 32, height: 24 });
      document.body.append(target);
      const task = createRectangleDropdownCapture(document, 40);
      const remove = vi.spyOn(document, 'removeEventListener');
      if (reason === 'navigation')
        window.dispatchEvent(new Event('wxt:locationchange'));
      if (reason === 'hidden') {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event('visibilitychange'));
      }
      if (reason === 'success') {
        target.dispatchEvent(new Event('pointerdown', { bubbles: true }));
        target.setAttribute('aria-expanded', 'true');
      }
      await vi.advanceTimersByTimeAsync(50);
      const { report } = await task.promise;
      for (const event of ['pointerdown', 'click', 'keydown'])
        expect(remove).toHaveBeenCalledWith(event, expect.any(Function), true);
      expect(remove).toHaveBeenCalledWith(
        'visibilitychange',
        expect.any(Function),
      );
      expect(task.isActive()).toBe(false);
      expect(vi.getTimerCount()).toBe(0);
      const output = serializeRectangleDropdownReport(report);
      target.dispatchEvent(new MouseEvent('click', { bubbles: true }));
      expect(serializeRectangleDropdownReport(report)).toBe(output);
    },
  );
});

// Simulated two-action workflow; no authenticated Onshape structure is implied.
describe('OPEN_THEN_SELECT_RECTANGLE capture workflow', () => {
  function fixture(name = 'Corner rectangle') {
    const trigger = document.createElement('div');
    const icon = document.createElement('span');
    trigger.append(icon);
    const menu = document.createElement('section');
    const row = document.createElement('div');
    const text = document.createElement('span');
    text.textContent = name;
    row.append(text);
    menu.append(row);
    for (const element of [trigger, icon, menu, row, text])
      setRect(element, { x: 10, y: 10, width: 90, height: 24 });
    document.body.append(trigger);
    trigger.addEventListener('click', () => document.body.append(menu));
    text.addEventListener('click', () => menu.remove());
    return { trigger, menu, text };
  }
  const settle = () => new Promise((resolve) => setTimeout(resolve, 35));
  function click(element: Element) {
    element.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true }));
    element.dispatchEvent(new MouseEvent('click', { bubbles: true }));
  }
  it.each(['Corner rectangle', 'Center point rectangle', 'Aligned Rectangle'])(
    'records opening and %s selection in one session, without claiming activation',
    async (name) => {
      const { trigger, menu, text } = fixture(name);
      const task = createRectangleDropdownCapture(
        document,
        1000,
        'OPEN_THEN_SELECT_RECTANGLE',
      );
      click(trigger);
      await settle();
      expect(task.isActive()).toBe(true);
      click(text);
      const { report } = await task.promise;
      expect(menu.isConnected).toBe(false);
      expect(report.interactions).toHaveLength(2);
      expect(report.interactions[0]?.path[0]?.node.connected).toBe(true);
      expect(report.interactions[1]?.clickedLabel).toBe(name);
      expect(report.transitions.map((item) => item.inputSequence)).toEqual([
        1, 2,
      ]);
      expect(report.transitions[0]?.after.domObservedState).toBe('UNKNOWN');
      expect(report.transitions[0]?.after.candidates).toContainEqual(
        expect.objectContaining({ label: name }),
      );
      expect(report.transitions[1]?.after.candidates).toContainEqual(
        expect.objectContaining({
          label: name,
          node: expect.objectContaining({ connected: false }),
        }),
      );
      expect(report.workflowState).toBe('FINISHED');
      expect(report.stateHistory).toEqual([
        'IDLE',
        'WAITING_FOR_MENU_OPEN_INPUT',
        'MENU_INTERACTION_OBSERVED',
        'WAITING_FOR_VARIANT_CLICK',
        'VARIANT_CLICK_OBSERVED',
        'FINISHED',
      ]);
      expect(report.cancelReason).toBeNull();
      expect(serializeRectangleDropdownReport(report)).not.toContain(
        'activated',
      );
    },
  );
  it('flushes opening mutations before a fast second input', async () => {
    const { trigger, text } = fixture();
    const task = createRectangleDropdownCapture(
      document,
      1000,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    click(trigger);
    click(text);
    const { report } = await task.promise;
    expect(report.interactions).toHaveLength(2);
    expect(report.transitions[0]?.inputSequence).toBe(1);
    expect(report.transitions[0]?.after.candidates).toContainEqual(
      expect.objectContaining({ label: 'Corner rectangle' }),
    );
  });
  it('retains opening evidence on timeout without a selection or after unrelated input', async () => {
    const { trigger } = fixture();
    const unrelated = document.createElement('button');
    document.body.append(unrelated);
    const task = createRectangleDropdownCapture(
      document,
      100,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    click(trigger);
    await settle();
    click(unrelated);
    unrelated.setAttribute('title', 'private noise');
    const { report } = await task.promise;
    expect(report.status).toBe('TIMED_OUT');
    expect(report.workflowState).toBe('TIMED_OUT');
    expect(report.interactions[0]?.clickObserved).toBe(true);
    expect(report.cancelReason).toBeNull();
  });
  it.each(['pagehide', 'wxt:locationchange', 'visibilitychange', 'stop'])(
    'records the actual %s cancellation source and cleans up',
    async (source) => {
      const { trigger } = fixture();
      const task = createRectangleDropdownCapture(
        document,
        1000,
        'OPEN_THEN_SELECT_RECTANGLE',
      );
      click(trigger);
      if (source === 'stop') task.cancel('USER_STOP');
      else if (source === 'visibilitychange') {
        vi.spyOn(document, 'visibilityState', 'get').mockReturnValue('hidden');
        document.dispatchEvent(new Event(source));
      } else window.dispatchEvent(new Event(source));
      const { report } = await task.promise;
      vi.restoreAllMocks();
      expect(report.cancelReason).toBe(
        source === 'stop'
          ? 'USER_STOP'
          : source === 'visibilitychange'
            ? 'PAGE_HIDDEN'
            : 'NAVIGATION',
      );
      expect(report.workflowState).toBe('CANCELLED');
      click(trigger);
      expect(report.interactions).toHaveLength(1);
      expect(task.isActive()).toBe(false);
    },
  );
});

// Conservative evidence edge cases for the new mode, all simulated.
describe('two-action diagnostic boundaries', () => {
  it('preserves duplicate-label ambiguity without choosing an option globally', async () => {
    const trigger = document.createElement('button');
    const chosen = document.createElement('span');
    chosen.textContent = 'Corner rectangle';
    const duplicate = chosen.cloneNode(true) as HTMLElement;
    document.body.append(trigger);
    const task = createRectangleDropdownCapture(
      document,
      1000,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.body.append(chosen, duplicate);
    chosen.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const { report } = await task.promise;
    expect(report.transitions[0]?.after.ambiguity).toBe(
      'DUPLICATE_EXACT_LABELS',
    );
    expect(report.transitions[0]?.after.domObservedState).toBe('UNKNOWN');
    expect(report.interactions[1]?.clickedLabel).toBe('Corner rectangle');
  });
  it('retains deep option paths with incomplete visibility instead of inventing confidence', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    const task = createRectangleDropdownCapture(
      document,
      1000,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    let parent = document.createElement('section');
    document.body.append(parent);
    for (let i = 0; i < 20; i++) {
      const child = document.createElement('div');
      parent.append(child);
      parent = child;
    }
    const option = document.createElement('span');
    option.textContent = 'Corner rectangle';
    parent.append(option);
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const { report } = await task.promise;
    expect(report.interactions[1]?.pathTruncated).toBe(true);
    expect(report.interactions[1]?.path[0]?.node.visibility).not.toBe(
      'VISIBLE',
    );
    expect(report.status).toBe('INCOMPLETE');
    expect(report.transitions[0]?.after.domObservedState).toBe('UNKNOWN');
    expect(serializeRectangleDropdownReport(report).length).toBeLessThanOrEqual(
      24000,
    );
  });
  it('records keyboard-originated opening followed by a keyboard-generated click, even without a DOM change', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    const option = document.createElement('button');
    option.textContent = 'Corner rectangle';
    const task = createRectangleDropdownCapture(
      document,
      1000,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    trigger.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    document.body.append(option);
    option.dispatchEvent(
      new KeyboardEvent('keydown', { key: 'Enter', bubbles: true }),
    );
    option.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const { report } = await task.promise;
    expect(report.interactions.map((item) => item.eventCategory)).toEqual([
      'KEYBOARD',
      'KEYBOARD',
    ]);
    expect(report.workflowState).toBe('FINISHED');
    expect(report.interactions[1]?.clickObserved).toBe(true);
    expect(serializeRectangleDropdownReport(report)).not.toContain('Enter');
  });
  it('sanitizes forged cancellation/state fields and ignores ordinary focus changes', async () => {
    const trigger = document.createElement('button');
    document.body.append(trigger);
    const task = createRectangleDropdownCapture(
      document,
      1000,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    trigger.focus();
    window.dispatchEvent(new Event('blur'));
    expect(task.isActive()).toBe(true);
    task.cancel('REPLACED');
    const { report } = await task.promise;
    expect(report.cancelReason).toBe('REPLACED');
    const poisoned = {
      ...report,
      cancelReason: 'private URL',
      stateHistory: ['private text'],
      workflowState: 'private ID',
    } as unknown as RectangleDropdownCaptureReport;
    const safe = serializeRectangleDropdownReport(poisoned);
    expect(safe).not.toMatch(/private/);
    expect(JSON.parse(safe).cancelReason).toBe('UNKNOWN');
  });
});

it.each(['CANCELLED', 'TIMED_OUT'] as const)(
  'preserves %s when a large report is reduced to the export cap',
  async (status) => {
    const trigger = document.createElement('button');
    trigger.setAttribute('aria-label', 'Rectangle');
    document.body.append(trigger);
    const task = createRectangleDropdownCapture(
      document,
      40,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    if (status === 'CANCELLED') task.cancel('USER_STOP');
    const { report } = await task.promise;
    const snapshot = report.interactions[0]!.localBefore;
    snapshot.candidates = Array.from(
      { length: 12 },
      () => snapshot.candidates[0]!,
    );
    report.manualSnapshots = [
      { snapshotRole: 'BEFORE', userReportedState: 'CLOSED', snapshot },
      { snapshotRole: 'AFTER', userReportedState: 'OPEN', snapshot },
    ];
    // Duplicate bounded snapshots force size reduction, not just scan truncation.
    report.transitions = Array.from({ length: 4 }, () => ({
      eventCategory: 'CLICK',
      inputSequence: 1,
      scope: 'INPUT_AND_MUTATION_LOCAL',
      inputAssociation: 'UNPROVEN',
      before: snapshot,
      after: snapshot,
      relationship: 'UNKNOWN',
      changedCandidateCount: 1,
    }));
    expect(JSON.stringify(report).length).toBeGreaterThan(24000);
    const output = serializeRectangleDropdownReport(report);
    expect(output.length).toBeLessThanOrEqual(24000);
    expect(JSON.parse(output).status).toBe(status);
    expect(JSON.parse(output).cancelReason).toBe(
      status === 'CANCELLED' ? 'USER_STOP' : null,
    );
  },
);

it.each(['sibling', 'opener'] as const)(
  'does not treat an unrelated %s click as variant selection',
  async (kind) => {
    const trigger = document.createElement('button');
    if (kind === 'opener') {
      trigger.textContent = 'Corner rectangle';
      trigger.setAttribute('aria-haspopup', 'menu');
    }
    document.body.append(trigger);
    const task = createRectangleDropdownCapture(
      document,
      80,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    trigger.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const container = document.createElement('section');
    const label = document.createElement('span');
    label.textContent = 'Corner rectangle';
    const unrelated = document.createElement('button');
    container.append(label, unrelated);
    document.body.append(container);
    (kind === 'opener' ? trigger : unrelated).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    const { report } = await task.promise;
    expect(report.status).toBe('TIMED_OUT');
    expect(report.stateHistory).not.toContain('VARIANT_CLICK_OBSERVED');
  },
);

it.each(['nested-opener', 'conflicting-name'] as const)(
  'keeps %s input uncertain rather than completing',
  async (kind) => {
    const opener = document.createElement('button');
    document.body.append(opener);
    const option = document.createElement('button');
    const text = document.createElement('span');
    text.textContent = 'Corner rectangle';
    option.append(text);
    if (kind === 'nested-opener') option.setAttribute('aria-haspopup', 'menu');
    else option.setAttribute('aria-label', 'Center point rectangle');
    document.body.append(option);
    const task = createRectangleDropdownCapture(
      document,
      80,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    (kind === 'nested-opener' ? option : opener).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    text.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const { report } = await task.promise;
    expect(report.status).toBe('TIMED_OUT');
    expect(report.stateHistory).not.toContain('VARIANT_CLICK_OBSERVED');
  },
);

it.each(['row', 'icon'] as const)(
  'does not count another child of the nonsemantic opening %s as an option',
  async (kind) => {
    const row = document.createElement('div');
    const icon = document.createElement('span');
    const label = document.createElement('span');
    label.textContent = 'Corner rectangle';
    row.append(icon, label);
    document.body.append(row);
    const task = createRectangleDropdownCapture(
      document,
      80,
      'OPEN_THEN_SELECT_RECTANGLE',
    );
    (kind === 'row' ? row : icon).dispatchEvent(
      new MouseEvent('click', { bubbles: true }),
    );
    label.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    const { report } = await task.promise;
    expect(report.status).toBe('TIMED_OUT');
    expect(report.stateHistory).not.toContain('VARIANT_CLICK_OBSERVED');
  },
);
