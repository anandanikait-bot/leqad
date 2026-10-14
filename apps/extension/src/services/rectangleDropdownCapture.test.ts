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
      version: 'leqad-rectangle-dropdown/1',
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

    expect(JSON.parse(output).version).toBe('leqad-rectangle-dropdown/1');
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
      version: 'leqad-rectangle-dropdown/1',
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
      version: 'leqad-rectangle-dropdown/1',
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
