import { afterEach, expect, it } from 'vitest';
import {
  collectRecognitionDiagnostics,
  createTopRowCapture,
  RECOGNITION_DIAGNOSTIC_LIMITS,
} from './recognitionDiagnostics';

// All DOM structures in this file are controlled simulations.
afterEach(() => document.body.replaceChildren());

function featureTree() {
  const tree = document.createElement('div');
  tree.setAttribute('role', 'tree');
  tree.setAttribute('aria-label', 'Feature tree');
  const group = document.createElement('div');
  group.setAttribute('role', 'group');
  group.setAttribute('aria-label', 'Default geometry');
  const row = document.createElement('div');
  row.setAttribute('role', 'treeitem');
  row.setAttribute('aria-label', 'Top');
  row.getBoundingClientRect = () => new DOMRect(10, 10, 150, 24);
  group.append(row);
  tree.append(group);
  return { tree, group, row };
}

it('scans the semantic tree region even when the rest of the document is large', async () => {
  const { tree, row } = featureTree();
  for (let i = 0; i < 5500; i++) {
    const unrelated = document.createElement('div');
    unrelated.textContent = 'private page text';
    document.body.append(unrelated);
  }
  document.body.append(tree);
  const { collectRecognitionDiagnostics } =
    await import('./recognitionDiagnostics');
  const report = JSON.parse(collectRecognitionDiagnostics(document));
  expect(report.version).toBe('leqad-recognition/3');
  expect(report.productionRecognition.status).toBe('NOT_RUN');
  expect(report.scan).toMatchObject({
    status: 'COMPLETE',
    region: 'DEFAULT_GEOMETRY',
  });
  expect(report.observations.Top.status).toBe('OBSERVED');
  expect(report.candidates[0]).toMatchObject({
    plane: 'Top',
    actionable: true,
    context: 'FEATURE_TREE',
  });
  expect(
    report.candidates.filter(
      (candidate: { plane: string }) => candidate.plane === 'Top',
    ),
  ).toHaveLength(1);
  expect(row.isConnected).toBe(true);
  expect(report.scan.scannedElements).toBeLessThan(20);
  expect(report.scanLimitReached).toBe(false);
});

it('keeps a dense clicked-row report within the serialized report-size limit', async () => {
  // Simulation only: this nested structure stresses the capture output bounds.
  let branch: HTMLElement = document.createElement('div');
  document.body.append(branch);
  for (let depth = 0; depth < 8; depth++) {
    const siblings: HTMLElement[] = [];
    for (let siblingIndex = 0; siblingIndex < 5; siblingIndex++) {
      const sibling = document.createElement('div');
      for (let labelIndex = 0; labelIndex < 8; labelIndex++) {
        const label = document.createElement('span');
        label.textContent = ['Top', 'Front', 'Right', 'Default geometry'][
          labelIndex % 4
        ]!;
        sibling.append(label);
      }
      siblings.push(sibling);
      branch.append(sibling);
    }
    branch = siblings[2]!;
  }
  const clicked = document.createElement('span');
  clicked.textContent = 'Top';
  branch.append(clicked);

  const capture = createTopRowCapture(document, 1000);
  clicked.dispatchEvent(
    new MouseEvent('click', { bubbles: true, composed: true }),
  );
  const result = await capture.promise;
  expect(result.status).toBe('CAPTURED');
  if (result.status === 'CAPTURED') {
    const output = collectRecognitionDiagnostics(document, result.report);
    expect(output.length).toBeLessThanOrEqual(
      RECOGNITION_DIAGNOSTIC_LIMITS.reportChars,
    );
    expect(JSON.parse(output).productionRecognition.status).toBe('NOT_RUN');
  }
});

it('does not turn an incomplete feature-tree scan into a MISSING recognition result', async () => {
  const { tree } = featureTree();
  const group = tree.querySelector('[role="group"]')!;
  for (let i = 0; i < 6200; i++) group.append(document.createElement('span'));
  const lateTop = document.createElement('div');
  lateTop.setAttribute('role', 'treeitem');
  lateTop.setAttribute('aria-label', 'Top');
  lateTop.getBoundingClientRect = () => new DOMRect(10, 10, 120, 24);
  group.append(lateTop);
  document.body.append(tree);
  const { collectRecognitionDiagnostics } =
    await import('./recognitionDiagnostics');
  const report = JSON.parse(collectRecognitionDiagnostics(document));
  expect(report.scan.status).toBe('INCOMPLETE');
  expect(report.scanLimitReached).toBe(true);
  expect(report.observations.Top.status).toBe('INCOMPLETE');
  expect(report.productionRecognition).toMatchObject({ status: 'NOT_RUN' });
});

it('states that scanning was not possible when no semantic tree landmark exists', async () => {
  document.body.innerHTML = '<main><p>Top</p></main>';
  const { collectRecognitionDiagnostics } =
    await import('./recognitionDiagnostics');
  const report = JSON.parse(collectRecognitionDiagnostics(document));
  expect(report.scan.status).toBe('NO_SEMANTIC_TREE_ROOT');
  expect(report.scan.scannedElements).toBe(0);
  expect(report.observations.Top.status).toBe('NO_SEMANTIC_TREE_ROOT');
  expect(report.productionRecognition.status).toBe('NOT_RUN');
});

it('reports a visible Top label in a nonsemantic tree without treating it as production recognition', async () => {
  const tree = document.createElement('div');
  tree.setAttribute('role', 'tree');
  const list = document.createElement('ul');
  const row = document.createElement('li');
  row.append(document.createTextNode('Top'));
  row.getBoundingClientRect = () => new DOMRect(20, 30, 150, 24);
  list.append(row);
  tree.append(list);
  document.body.append(tree);
  const { collectRecognitionDiagnostics } =
    await import('./recognitionDiagnostics');
  const report = JSON.parse(collectRecognitionDiagnostics(document));
  expect(report.observations.Top.status).toBe('OBSERVED');
  expect(report.candidates[0]).toMatchObject({
    plane: 'Top',
    actionable: false,
    context: 'UNKNOWN',
    contextValid: false,
  });
  expect(report.productionRecognition.status).toBe('NOT_RUN');
});

it('records absent ARIA name attributes without exporting row text or unrelated attributes', async () => {
  const { tree, group, row } = featureTree();
  row.removeAttribute('aria-label');
  row.id = 'private-row-id';
  row.dataset.account = 'private@example.com';
  row.append(document.createTextNode('Top'));
  group.setAttribute('data-secret', 'secret-123');
  document.body.append(tree);
  const { collectRecognitionDiagnostics } =
    await import('./recognitionDiagnostics');
  const output = collectRecognitionDiagnostics(document);
  const report = JSON.parse(output);
  expect(report.candidates[0]).toMatchObject({
    plane: 'Top',
    ariaNameAttributePresent: false,
  });
  for (const secret of [
    'private-row-id',
    'private@example.com',
    'secret-123',
    'data-secret',
    'private text',
  ])
    expect(output).not.toContain(secret);
});

it('caps tree landmarks, candidate records, and serialized report size', async () => {
  for (let i = 0; i < 16; i++) {
    const { tree } = featureTree();
    tree.querySelector('[role="group"]')!.setAttribute('aria-label', 'Other');
    tree.querySelector('[role="treeitem"]')!.setAttribute('aria-label', 'Top');
    document.body.append(tree);
  }
  const { collectRecognitionDiagnostics } =
    await import('./recognitionDiagnostics');
  const output = collectRecognitionDiagnostics(document);
  const report = JSON.parse(output);
  expect(report.scan.treeRootsScanned).toBeLessThanOrEqual(8);
  expect(report.candidates.length).toBeLessThanOrEqual(12);
  expect(output.length).toBeLessThanOrEqual(16000);
});
