import { afterEach, expect, it } from 'vitest';

// All static labels, wrappers and bounds are SIMULATED. Real captures establish
// a visible role=dialog, three direct branches, and nonsemantic SVG control paths.
function simulatedDialog(label = 'Sketch plane') {
  const dialog = document.createElement('div');
  dialog.setAttribute('role', 'dialog');
  const header = document.createElement('div');
  const source = document.createElement('span');
  source.textContent = label;
  header.append(source);
  const branches = [
    header,
    document.createElement('div'),
    document.createElement('div'),
  ];
  for (const branch of branches.slice(1)) {
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    icon.append(document.createElementNS('http://www.w3.org/2000/svg', 'use'));
    branch.append(icon);
  }
  dialog.append(...branches);
  document.body.append(dialog);
  for (const element of [dialog, ...branches, source])
    element.getBoundingClientRect = () => new DOMRect(20, 40, 180, 30);
  return { dialog, header, source };
}

async function capture() {
  const api = await import('./sketchControlCapture');
  expect(api).toHaveProperty('inspectSketchDialogIdentity');
  return api.inspectSketchDialogIdentity(document);
}

afterEach(() => document.body.replaceChildren());

it('records the static label and its dialog/branch relationship without naming either action', async () => {
  simulatedDialog();
  const result = await capture();
  expect(result).toMatchObject({
    version: 'leqad-sketch-dialog-identity/1',
    status: 'CAPTURED',
    activeSketchState: 'UNKNOWN',
    productionRecognition: 'NOT_RUN',
    branchIdentities: 'UNVERIFIED',
    controlOwnership: 'NOT_INSPECTED',
  });
  expect(result.dialogs[0]).toMatchObject({
    childCount: 3,
    visibility: 'VISIBLE',
  });
  expect(result.dialogs[0]?.labels).toEqual([
    expect.objectContaining({
      label: 'Sketch plane',
      source: 'TEXT',
      tag: 'span',
      role: 'none',
      branchIndex: 0,
      pathFromDialog: [0, 0],
    }),
  ]);
  expect(result.dialogs[0]?.branches.map((branch) => branch.svgCount)).toEqual([
    0, 1, 1,
  ]);
});

it('returns NOT_ESTABLISHED for unrelated dialogs and editable or numbered feature names', async () => {
  const { source, header } = simulatedDialog('Extrude');
  source.setAttribute('contenteditable', 'true');
  source.textContent = 'Sketch';
  const name = document.createElement('input');
  name.setAttribute('aria-label', 'Sketch');
  Object.defineProperty(name, 'value', {
    get() {
      throw new Error('Do not inspect editable values');
    },
  });
  header.append(name);
  const numbered = document.createElement('span');
  numbered.textContent = 'Sketch 1';
  header.append(numbered);
  const result = await capture();
  expect(result.status).toBe('NOT_ESTABLISHED');
  expect(result.dialogs[0]?.labels).toEqual([]);
  expect(JSON.stringify(result)).not.toContain('Sketch 1');
});

it('does not rescue an unsupported accessible name with a static-looking fallback', async () => {
  const { source } = simulatedDialog('Sketch');
  source.setAttribute('aria-label', 'private-feature-name');
  const result = await capture();
  expect(result.status).toBe('NOT_ESTABLISHED');
  expect(result.dialogs[0]?.labels).toEqual([]);
  expect(JSON.stringify(result)).not.toContain('private-feature-name');
});

it('retains ambiguity between visible candidate dialogs instead of selecting the first', async () => {
  simulatedDialog();
  simulatedDialog('Sketch');
  const result = await capture();
  expect(result).toMatchObject({
    status: 'NOT_ESTABLISHED',
    reason: 'AMBIGUOUS_DIALOGS',
  });
  expect(result.dialogs.length).toBe(2);
});

it('returns NOT_ESTABLISHED for hidden or structurally unrelated dialogs', async () => {
  const { dialog } = simulatedDialog();
  dialog.hidden = true;
  expect((await capture()).status).toBe('NOT_ESTABLISHED');
  dialog.hidden = false;
  dialog.append(document.createElement('div'));
  expect((await capture()).status).toBe('NOT_ESTABLISHED');
});

it('preserves incomplete observations and privacy without actions or subscriptions', async () => {
  const { dialog, header, source } = simulatedDialog('PRIVATE_TEXT');
  dialog.id = 'private-document-id';
  dialog.className = 'private-class';
  source.setAttribute('aria-labelledby', 'private-document-id');
  source.setAttribute('title', 'https://private.example/token');
  for (let i = 0; i < 300; i++)
    header.append(document.createComment('private-comment'));
  const before = document.body.innerHTML;
  let clicks = 0;
  dialog.addEventListener('click', () => {
    clicks++;
  });
  const result = await capture();
  const output = JSON.stringify(result);
  expect(result).toMatchObject({ status: 'NOT_ESTABLISHED', incomplete: true });
  expect(output.length).toBeLessThanOrEqual(24000);
  for (const value of [
    'PRIVATE_TEXT',
    'private-document-id',
    'private-class',
    'https://',
    'private-comment',
    '<div',
  ])
    expect(output).not.toContain(value);
  expect(document.body.innerHTML).toBe(before);
  expect(clicks).toBe(0);
});

it('does not present incomplete local name inspection as an absent static label', async () => {
  const { source } = simulatedDialog();
  source.replaceChildren();
  for (let i = 0; i < 65; i++) source.append(document.createComment('omitted'));
  source.append(document.createTextNode('Sketch plane'));
  expect(await capture()).toMatchObject({
    status: 'NOT_ESTABLISHED',
    incomplete: true,
    reason: 'INSPECTION_INCOMPLETE',
  });
});

it('does not establish a control-region relationship when the SVG branches are absent', async () => {
  const { dialog } = simulatedDialog();
  dialog.querySelectorAll('svg').forEach((svg) => svg.remove());
  expect(await capture()).toMatchObject({
    status: 'NOT_ESTABLISHED',
    reason: 'CONTROL_BRANCH_STRUCTURE_NOT_ESTABLISHED',
  });
});

it('excludes labels inherited from an editable ancestor outside the dialog', async () => {
  const { dialog } = simulatedDialog('Sketch');
  const editor = document.createElement('div');
  editor.setAttribute('contenteditable', 'true');
  dialog.replaceWith(editor);
  editor.append(dialog);
  const report = await capture();
  expect(report).toMatchObject({
    status: 'NOT_ESTABLISHED',
    reason: 'EDITABLE_CONTEXT',
  });
  expect(report.dialogs[0]?.labels).toEqual([]);
});

it.each(['aria-label', 'title'])(
  'records the allowlisted %s source without exporting other attributes',
  async (attribute) => {
    const { source } = simulatedDialog('');
    source.setAttribute(attribute, 'Sketch');
    source.setAttribute('role', 'heading');
    source.setAttribute('data-private', 'private-value');
    const report = await capture();
    expect(report.dialogs[0]?.labels).toEqual([
      expect.objectContaining({
        label: 'Sketch',
        role: 'heading',
        source: attribute === 'title' ? 'TITLE' : 'ARIA_LABEL',
      }),
    ]);
    expect(JSON.stringify(report)).not.toContain('private-value');
  },
);

it('marks dialog discovery and local candidate limits separately without choosing a partial match', async () => {
  for (let i = 0; i < 9; i++) simulatedDialog();
  const report = await capture();
  expect(report).toMatchObject({
    status: 'NOT_ESTABLISHED',
    incomplete: true,
    discovery: {
      method: 'NATIVE_DIALOG_ROLE_QUERY',
      nativeTraversalBound: 'NOT_ENFORCED',
      candidateInspectionLimitReached: true,
    },
  });
  expect(report.dialogs.length).toBeLessThanOrEqual(8);
  expect(JSON.stringify(report).length).toBeLessThanOrEqual(24000);
});

it('preserves NOT_ESTABLISHED at the depth limit instead of reading a deep label', async () => {
  const { header, source } = simulatedDialog('Sketch');
  source.remove();
  let parent = header;
  for (let i = 0; i < 10; i++) {
    const wrapper = document.createElement('div');
    parent.append(wrapper);
    parent = wrapper;
  }
  parent.append(source);
  expect(await capture()).toMatchObject({
    status: 'NOT_ESTABLISHED',
    incomplete: true,
    reason: 'INSPECTION_INCOMPLETE',
  });
});
