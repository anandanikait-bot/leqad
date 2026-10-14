import { afterEach, expect, it, vi } from 'vitest';
import { createTopRowCapture } from './recognitionDiagnostics';

// All DOM structures in this file are simulations, not captured Onshape DOM.
afterEach(() => {
  vi.useRealTimers();
  document.body.replaceChildren();
});

it('captures one click and lets Onshape handle it normally', async () => {
  const tree = document.createElement('div');
  tree.setAttribute('role', 'tree');
  const group = document.createElement('div');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Default geometry');
  const row = document.createElement('div');
  row.setAttribute('role', 'treeitem');
  row.append(document.createTextNode('Top'));
  row.getBoundingClientRect = () => new DOMRect(10, 10, 120, 24);
  group.append(row);
  tree.append(group);
  document.body.append(tree);
  let clicked = false;
  row.addEventListener('click', () => {
    clicked = true;
  });
  const capture = createTopRowCapture(document, 1000);
  const event = new MouseEvent('click', {
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  row.dispatchEvent(event);
  const result = await capture.promise;
  expect(clicked).toBe(true);
  expect(event.defaultPrevented).toBe(false);
  expect(result.status).toBe('CAPTURED');
  if (result.status === 'CAPTURED') {
    const first = result.report.structure[0]!;
    expect(result.report.diagnosis).toBe(
      'NO_ARIA_NAME_ATTRIBUTE_ON_TOP_LABEL_OR_ROW',
    );
    expect(first).toMatchObject({
      tag: 'div',
      role: 'treeitem',
      planeMatches: ['Top'],
    });
    expect(first.ariaLabelPresent).toBe(false);
  }
  const next = createTopRowCapture(document, 1000);
  row.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  expect((await next.promise).status).toBe('CAPTURED');
});

it('captures a nested target and exposes the actionable ancestor distance', async () => {
  const tree = document.createElement('div');
  tree.setAttribute('role', 'tree');
  const group = document.createElement('div');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Default geometry');
  const row = document.createElement('div');
  row.setAttribute('role', 'treeitem');
  row.setAttribute('aria-label', 'Top');
  row.getBoundingClientRect = () => new DOMRect(10, 10, 120, 24);
  const button = document.createElement('button');
  button.setAttribute('aria-label', 'Top');
  button.getBoundingClientRect = () => new DOMRect(10, 10, 120, 24);
  row.append(button);
  group.append(row);
  tree.append(group);
  document.body.append(tree);
  const capture = createTopRowCapture(document, 1000);
  button.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true }),
  );
  const result = await capture.promise;
  expect(result.status).toBe('CAPTURED');
  if (result.status === 'CAPTURED') {
    expect(result.report.actionableAncestorDistance).toBe(0);
    expect(
      result.report.structure.slice(0, 2).map((item) => item.role),
    ).toEqual(['button', 'treeitem']);
    expect(result.report.diagnosis).toBe(
      'STRUCTURE_MATCHES_SUPPORTED_RESOLVER',
    );
  }
});

it('shows the non-ARIA hierarchy and keeps unsupported actionability unknown', async () => {
  // Simulation only: sibling placement is not asserted as Onshape structure.
  const root = document.createElement('div');
  const heading = document.createElement('div');
  heading.textContent = 'Default geometry';
  const list = document.createElement('div');
  const row = document.createElement('div');
  const wrapper = document.createElement('div');
  const top = document.createElement('span');
  top.textContent = 'Top';
  wrapper.append(top);
  row.append(wrapper);
  const front = document.createElement('div');
  front.innerHTML = '<span>Front</span>';
  const right = document.createElement('div');
  right.innerHTML = '<span>Right</span>';
  list.append(row, front, right);
  root.append(heading, list);
  document.body.append(root);

  let clickPassedThrough = false;
  top.addEventListener('click', () => {
    clickPassedThrough = true;
  });
  const capture = createTopRowCapture(document, 1000);
  const event = new MouseEvent('click', {
    bubbles: true,
    composed: true,
    cancelable: true,
  });
  top.dispatchEvent(event);
  const result = await capture.promise;

  expect(result.status).toBe('CAPTURED');
  expect(clickPassedThrough).toBe(true);
  expect(event.defaultPrevented).toBe(false);
  if (result.status === 'CAPTURED') {
    expect(result.report.structure[0]).toMatchObject({
      tag: 'span',
      role: 'none',
      rolePresent: false,
      planeMatches: ['Top'],
      actionable: false,
      actionabilityEvidence: 'NOT_EXPOSED',
      context: 'UNKNOWN',
    });
    expect(result.report.relationshipOutline.interactionHandling).toBe(
      'JAVASCRIPT_HANDLER_NOT_INSPECTED',
    );
    expect(
      result.report.relationshipOutline.relationships.some((relationship) =>
        relationship.siblings.some((sibling) =>
          sibling.nestedLabelMatches.some(
            (match) => match.label === 'Default geometry',
          ),
        ),
      ),
    ).toBe(true);
    expect(
      result.report.relationshipOutline.relationships.some((relationship) =>
        relationship.siblings.some((sibling) =>
          sibling.nestedLabelMatches.some(
            (match) => match.label === 'Front' || match.label === 'Right',
          ),
        ),
      ),
    ).toBe(true);
    expect(result.report.findings).toContain(
      'DEFAULT_GEOMETRY_OBSERVED_OUTSIDE_CAPTURED_ANCESTOR_PATH',
    );
  }
});

it('never exports arbitrary text, IDs, or attribute values from the captured path', async () => {
  const root = document.createElement('main');
  root.id = 'document-123-private';
  root.dataset.secret = 'token-abc';
  root.textContent = 'private sketch geometry and someone@example.com ';
  const top = document.createElement('span');
  top.textContent = 'Top';
  root.append(top);
  document.body.append(root);
  const capture = createTopRowCapture(document, 1000);
  top.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true }));
  const result = await capture.promise;
  expect(result.status).toBe('CAPTURED');
  if (result.status === 'CAPTURED') {
    const output = JSON.stringify(result.report);
    expect(result.report.findings).toContain(
      'TREE_OR_TREEGRID_ROLE_NOT_EXPOSED',
    );
    for (const secret of [
      'document-123-private',
      'token-abc',
      'private sketch',
      'someone@example.com',
      'data-secret',
    ])
      expect(output).not.toContain(secret);
  }
});

it('times out and removes its one-shot capture listener', async () => {
  vi.useFakeTimers();
  const capture = createTopRowCapture(document, 20);
  vi.advanceTimersByTime(20);
  await expect(capture.promise).resolves.toMatchObject({ status: 'TIMED_OUT' });
  document.body.append(document.createElement('button'));
  document
    .querySelector('button')!
    .dispatchEvent(new MouseEvent('click', { bubbles: true }));
  expect(capture.isActive()).toBe(false);
});

it('ignores Leqad panel clicks and remains armed for the Onshape row', async () => {
  const host = document.createElement('leqad-assistant');
  const shadow = host.attachShadow({ mode: 'open' });
  const button = document.createElement('button');
  shadow.append(button);
  document.body.append(host);
  const target = document.createElement('div');
  target.setAttribute('role', 'treeitem');
  target.textContent = 'Top';
  document.body.append(target);
  const capture = createTopRowCapture(document, 1000);
  button.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true }),
  );
  expect(capture.isActive()).toBe(true);
  target.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true }),
  );
  expect((await capture.promise).status).toBe('CAPTURED');
});
