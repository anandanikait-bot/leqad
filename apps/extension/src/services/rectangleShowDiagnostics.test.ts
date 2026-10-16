import { afterEach, expect, it } from 'vitest';
import { inspectRectangleDropdownRecognition } from './semanticTargets';
import {
  serializeRectangleShowDiagnostic,
  rectangleShowPageGate,
  type RectangleShowDiagnostic,
} from './rectangleShowDiagnostics';
import { parseOnshapePage } from './onshapePage';
afterEach(() => document.body.replaceChildren());
it('exports bounded allowlisted reason metadata, without DOM, private names or arbitrary fields', () => {
  const privateControl = document.createElement('button');
  privateControl.textContent = 'private customer geometry';
  privateControl.id = 'private-document-id';
  document.body.append(privateControl);
  const target = inspectRectangleDropdownRecognition(document);
  const value: RectangleShowDiagnostic = {
    version: 'leqad-rectangle-show/1',
    observationScope: 'SHOW_REQUEST_SNAPSHOT',
    stage: 'CONTEXT',
    reason: 'SKETCH_CONTEXT_UNESTABLISHED',
    context: 'UNKNOWN',
    productionLookup: 'NOT_RUN',
    inspection: { pageGate: 'ALLOWED', target },
  };
  const poisoned = {
    ...value,
    privateText: 'private customer',
    element: privateControl,
    inspection: {
      ...value.inspection,
      documentUrl: 'https://private.invalid/secret',
      target: {
        ...target,
        html: privateControl.outerHTML,
        lookup: { ...target.lookup, toolbars: Infinity, popupControls: 1e12 },
        eligibility: {
          ...target.eligibility,
          rejections: Array(1000).fill('private rejection'),
        },
      },
    },
  } as unknown as RectangleShowDiagnostic;
  const output = serializeRectangleShowDiagnostic(poisoned);
  expect(output).not.toMatch(
    /private|customer|documentUrl|element|<button|https:/,
  );
  expect(output.length).toBeLessThan(2500);
  expect(JSON.parse(output).inspection.target.lookup).toMatchObject({
    toolbars: 0,
    popupControls: 513,
  });
  expect(JSON.parse(output).inspection.target.eligibility.rejections).toEqual(
    [],
  );
});
it('keeps unknown permission eligible but distinguishes read-only, version and stale-page gates without exporting IDs', () => {
  const page = parseOnshapePage(
    'https://cad.onshape.com/documents/test-doc/w/test-workspace/e/test-element',
  );
  expect(rectangleShowPageGate(page)).toBe('ALLOWED');
  expect(rectangleShowPageGate({ ...page, editability: 'read-only' })).toBe(
    'READ_ONLY',
  );
  expect(rectangleShowPageGate({ ...page, modelType: 'version' })).toBe(
    'NON_WORKSPACE',
  );
  expect(rectangleShowPageGate(page, false)).toBe('STALE_PAGE');
  expect(page.editability).toBe('unknown');
});
