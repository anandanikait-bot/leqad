import { afterEach, expect, it } from 'vitest';

afterEach(() => document.body.replaceChildren());

it('exports bounded allowlisted reference-plane structure without private page content', async () => {
  const { collectRecognitionDiagnostics } =
    await import('./recognitionDiagnostics');
  document.body.innerHTML =
    '<div id="private-document-123" data-account="owner@example.com"><div role="tree"><div role="group" aria-label="Default geometry"><div role="treeitem" aria-label="Top" id="private-element-456"><span>Top</span></div></div></div><input value="private-token"><p>Private CAD geometry and owner@example.com</p></div>';
  const row = document.querySelector<HTMLElement>('[role="treeitem"]')!;
  row.getBoundingClientRect = () => new DOMRect(20, 30, 180, 28);
  const output = collectRecognitionDiagnostics(document);
  const report = JSON.parse(output);
  expect(report.version).toBe('leqad-recognition/1');
  expect(report.recognition.Top.status).toBe('FOUND');
  expect(
    report.candidates.some(
      (c: { plane: string; context: string; actionableRow: boolean }) =>
        c.plane === 'Top' && c.context === 'FEATURE_TREE' && c.actionableRow,
    ),
  ).toBe(true);
  for (const secret of [
    'private-document',
    'private-element',
    'owner@example',
    'private-token',
    'Private CAD',
    'data-account',
    'innerHTML',
  ])
    expect(output).not.toContain(secret);
  expect(output.length).toBeLessThanOrEqual(12000);
});

it('reports non-semantic Top labels without guessing an actionable row and caps processing', async () => {
  const { collectRecognitionDiagnostics } =
    await import('./recognitionDiagnostics');
  for (let i = 0; i < 5500; i++) {
    const label = document.createElement('span');
    label.textContent = 'Top';
    document.body.append(label);
  }
  const output = collectRecognitionDiagnostics(document);
  const report = JSON.parse(output);
  expect(report.candidates.length).toBeLessThanOrEqual(12);
  expect(report.scannedElements).toBeLessThanOrEqual(5000);
  expect(report.scanLimitReached).toBe(true);
  expect(report.candidates[0]).toMatchObject({
    plane: 'Top',
    actionableRow: false,
    context: 'UNKNOWN',
  });
  expect(report.recognition.Top.status).not.toBe('FOUND');
  expect(output.length).toBeLessThanOrEqual(12000);
});
