import { afterEach, expect, it } from 'vitest';
import { captureFeatureListStructure } from './featureListStructureCapture';

afterEach(() => document.body.replaceChildren());

function rect(
  element: Element,
  x: number,
  y: number,
  width: number,
  height: number,
) {
  element.getBoundingClientRect = () => new DOMRect(x, y, width, height);
  return element;
}

function simulatedNonAriaFeatureList() {
  // Simulation only: this fixture is not a captured or asserted Onshape DOM.
  const root = document.createElement('div');
  const heading = document.createElement('div');
  heading.append(document.createTextNode('Default geometry'));
  const list = document.createElement('div');
  const rows = new Map<string, HTMLElement>();
  for (const plane of ['Top', 'Front', 'Right']) {
    const row = document.createElement('div');
    const nested = document.createElement('div');
    const label = document.createElement('span');
    label.textContent = plane;
    nested.append(label);
    row.append(nested);
    rect(row, 20, 50 + rows.size * 24, 180, 24);
    rect(nested, 20, 50 + rows.size * 24, 180, 24);
    rect(label, 32, 55 + rows.size * 24, 30, 12);
    list.append(row);
    rows.set(plane, row);
  }
  root.append(heading, list);
  rect(heading, 8, 22, 180, 22);
  rect(list, 8, 48, 200, 80);
  document.body.append(root);
  return { root, heading, list, rows };
}

function pathTo(target: HTMLElement): HTMLElement[] {
  const path: HTMLElement[] = [];
  for (let node: HTMLElement | null = target; node; node = node.parentElement)
    path.push(node);
  return path;
}

it('captures simulated non-ARIA plane siblings and the Default geometry sibling relationship', () => {
  const { heading, rows } = simulatedNonAriaFeatureList();
  const clicked = rows.get('Top')!.querySelector('span')!;
  const outline = captureFeatureListStructure(clicked, pathTo(clicked));
  const serialized = JSON.stringify(outline);

  expect(outline.relationships.length).toBeGreaterThan(0);
  expect(
    outline.relationships.some((relationship) =>
      relationship.siblings.some((sibling) =>
        sibling.nestedLabelMatches.some(
          (match) => match.label === 'Default geometry',
        ),
      ),
    ),
  ).toBe(true);
  const planeMatches = outline.relationships.flatMap((relationship) =>
    relationship.siblings.flatMap((sibling) =>
      sibling.nestedLabelMatches.map((match) => match.label),
    ),
  );
  expect(planeMatches).toContain('Front');
  expect(planeMatches).toContain('Right');
  expect(
    outline.relationships.some((relationship) =>
      relationship.siblings.some((sibling) => sibling.capturedBranch),
    ),
  ).toBe(true);
  expect(heading.isConnected).toBe(true);
  expect(serialized).not.toContain('feature-list');
});

it.each([
  ['view controls', 'div', 'View controls', 'VIEW_CONTROLS'],
  ['canvas fallback', 'canvas', null, 'VIEWPORT'],
  ['active Sketch dialog', 'div', 'Sketch 2', 'SKETCH_DIALOG'],
] as const)(
  'labels a %s Top decoy by its observed context',
  (_name, tag, label, context) => {
    // Simulation only: context ancestors are controlled decoys.
    const container = document.createElement(tag);
    if (label) {
      container.setAttribute('aria-label', label);
      container.setAttribute(
        'role',
        context === 'VIEW_CONTROLS' ? 'toolbar' : 'dialog',
      );
    }
    const clicked = document.createElement('span');
    clicked.textContent = 'Top';
    container.append(clicked);
    document.body.append(container);

    const outline = captureFeatureListStructure(clicked, pathTo(clicked));
    expect(outline.capturedPath[0]?.context).toBe(context);
    expect(outline.capturedPath[0]?.planeMatches).toEqual(['Top']);
  },
);

it('retains multiple exact Top labels as separate local observations without choosing a global match', () => {
  // Simulation only: camera and feature-list decoys are controlled fixtures.
  const root = document.createElement('main');
  const camera = document.createElement('div');
  camera.setAttribute('role', 'toolbar');
  const cameraTop = document.createElement('button');
  cameraTop.textContent = 'Top';
  camera.append(cameraTop);
  const featureRow = document.createElement('div');
  const featureTop = document.createElement('span');
  featureTop.textContent = 'Top';
  featureRow.append(featureTop);
  root.append(camera, featureRow);
  document.body.append(root);
  const outline = captureFeatureListStructure(featureTop, pathTo(featureTop));
  const topLabels = outline.relationships
    .flatMap((relationship) =>
      relationship.siblings.flatMap((sibling) => [
        ...sibling.node.planeMatches,
        ...sibling.nestedLabelMatches.map((match) => match.label),
      ]),
    )
    .filter((label) => label === 'Top');

  expect(topLabels.length).toBeGreaterThan(1);
  expect(
    outline.relationships.some((relationship) =>
      relationship.siblings.some(
        (sibling) =>
          sibling.capturedBranch &&
          sibling.nestedLabelMatches.some((match) => match.label === 'Top'),
      ),
    ),
  ).toBe(true);
});

it('reports relative geometry for the row and label without absolute page coordinates', () => {
  // Simulation only: geometry is fixed to exercise the relative measurements.
  const { rows } = simulatedNonAriaFeatureList();
  const clicked = rows.get('Top')!.querySelector('span')!;
  const outline = captureFeatureListStructure(clicked, pathTo(clicked));
  const row = outline.capturedPath.find(
    (node) => node.tag === 'div' && node.geometryRelativeToClicked?.width === 6,
  );

  expect(row?.geometryRelativeToClicked).toMatchObject({ width: 6, height: 2 });
  expect(JSON.stringify(outline)).not.toContain('"x":32');
  expect(JSON.stringify(outline)).not.toContain('"y":55');
});

it('marks hidden reference geometry and bounds sibling and descendant inspection', () => {
  // Simulation only: hidden geometry and an oversized sibling list exercise limits.
  const { list, rows } = simulatedNonAriaFeatureList();
  const hiddenGroup = document.createElement('div');
  hiddenGroup.style.display = 'none';
  const hiddenLabel = document.createElement('span');
  hiddenLabel.textContent = 'Right';
  hiddenGroup.append(hiddenLabel);
  list.insertBefore(hiddenGroup, rows.get('Front')!);
  for (let index = 0; index < 80; index++)
    list.append(document.createElement('div'));
  const clicked = rows.get('Top')!.querySelector('span')!;
  const outline = captureFeatureListStructure(clicked, pathTo(clicked));
  const output = JSON.stringify(outline);

  expect(outline.relationships.length).toBeLessThanOrEqual(8);
  expect(outline.elementsInspected).toBeLessThanOrEqual(256);
  expect(outline.truncated).toBe(true);
  expect(output).not.toContain('Right</span>');
  expect(
    outline.relationships.some((relationship) =>
      relationship.siblings.some((sibling) =>
        sibling.nestedLabelMatches.some(
          (match) =>
            match.label === 'Right' && match.node.visibility === 'HIDDEN',
        ),
      ),
    ),
  ).toBe(true);
});

it('exports only allowlisted structure and exact labels, never arbitrary text or attributes', () => {
  // Simulation only: private values verify the diagnostic privacy boundary.
  const { root, rows } = simulatedNonAriaFeatureList();
  root.id = 'private-document-identifier';
  root.setAttribute('data-secret', 'token-abc');
  root.setAttribute('class', 'owner-private-class');
  const secret = document.createElement('span');
  secret.textContent = 'private account@example.com';
  rows.get('Top')!.append(secret);
  const clicked = rows.get('Top')!.querySelector('span')!;
  const output = JSON.stringify(
    captureFeatureListStructure(clicked, pathTo(clicked)),
  );

  for (const value of [
    'private-document-identifier',
    'token-abc',
    'owner-private-class',
    'account@example.com',
    'data-secret',
  ])
    expect(output).not.toContain(value);
  expect(output).toContain('Top');
});
