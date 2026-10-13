import { afterEach, describe, expect, it } from 'vitest';

function visibleControl(
  name: string,
  role: string,
  selected?: string,
): HTMLElement {
  const control = document.createElement('div');
  control.setAttribute('role', role);
  control.setAttribute('aria-label', name);
  if (selected !== undefined) control.setAttribute('aria-selected', selected);
  control.getBoundingClientRect = () => new DOMRect(20, 30, 80, 24);
  document.body.append(control);
  return control;
}

afterEach(() => document.body.replaceChildren());

describe('parseOnshapePage', () => {
  it('recognizes only exact supported HTTPS Onshape document routes', async () => {
    const { isSupportedOnshapeUrl, parseOnshapePage } =
      await import('./onshapePage');

    expect(
      isSupportedOnshapeUrl(
        'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
      ),
    ).toBe(true);
    expect(
      isSupportedOnshapeUrl('https://cad.onshape.com.attacker.example/'),
    ).toBe(false);
    expect(isSupportedOnshapeUrl('https://onshape.com/')).toBe(false);
    expect(isSupportedOnshapeUrl('http://cad.onshape.com/')).toBe(false);
    expect(isSupportedOnshapeUrl('not a url')).toBe(false);
    expect(parseOnshapePage('https://cad.onshape.com/')).toMatchObject({
      supported: false,
      documentId: null,
      editability: 'unknown',
      elementType: 'unknown',
    });
  });

  it('does not infer editability or Part Studio type from a workspace URL', async () => {
    const { parseOnshapePage } = await import('./onshapePage');

    expect(
      parseOnshapePage(
        'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
      ),
    ).toEqual({
      supported: true,
      documentId: 'document-a',
      workspaceId: 'workspace-a',
      versionId: null,
      microversionId: null,
      elementId: 'element-a',
      modelType: 'workspace',
      editability: 'unknown',
      elementType: 'unknown',
      capabilitySource: null,
      capabilityObservedAt: null,
    });
  });

  it('represents version and microversion routes explicitly as read-only', async () => {
    const { parseOnshapePage } = await import('./onshapePage');

    expect(
      parseOnshapePage(
        'https://cad.onshape.com/documents/document-a/v/version-a/e/element-a',
      ),
    ).toMatchObject({
      supported: true,
      workspaceId: null,
      versionId: 'version-a',
      microversionId: null,
      modelType: 'version',
      editability: 'read-only',
      elementType: 'unknown',
      capabilitySource: 'ROUTE',
    });
    expect(
      parseOnshapePage(
        'https://cad.onshape.com/documents/document-a/m/microversion-a/e/element-a',
      ),
    ).toMatchObject({
      workspaceId: null,
      versionId: null,
      microversionId: 'microversion-a',
      modelType: 'microversion',
      editability: 'read-only',
    });
  });

  it.each([
    'https://cad.onshape.com/documents//w/workspace-a/e/element-a',
    'https://cad.onshape.com/documents/document-a/w//e/element-a',
    'https://cad.onshape.com/documents/document-a/w/workspace-a/e/',
    'https://cad.onshape.com/documents/document-a/x/context-a/e/element-a',
    'https://cad.onshape.com/documents/document-a/w/workspace-a',
  ])('rejects malformed or unsupported route %s', async (url) => {
    const { parseOnshapePage } = await import('./onshapePage');

    expect(parseOnshapePage(url).supported).toBe(false);
  });
});

describe('Onshape capability observations', () => {
  it('applies only a valid observation scoped to the exact document context', async () => {
    const { applyOnshapeCapabilityObservation, parseOnshapePage } =
      await import('./onshapePage');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );

    const observed = applyOnshapeCapabilityObservation(page, {
      documentId: 'document-a',
      workspaceId: 'workspace-a',
      elementId: 'element-a',
      editability: 'editable',
      elementType: 'part-studio',
      source: 'UI',
      observedAt: '2026-10-13T12:00:00.000Z',
    });

    expect(observed).toMatchObject({
      editability: 'editable',
      elementType: 'part-studio',
      capabilitySource: 'UI',
      capabilityObservedAt: '2026-10-13T12:00:00.000Z',
    });
  });

  it.each([
    { documentId: 'document-b' },
    { workspaceId: 'workspace-b' },
    { elementId: 'element-b' },
  ])('ignores an observation for a different context: %o', async (mismatch) => {
    const { applyOnshapeCapabilityObservation, parseOnshapePage } =
      await import('./onshapePage');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );
    const observed = applyOnshapeCapabilityObservation(page, {
      documentId: 'document-a',
      workspaceId: 'workspace-a',
      elementId: 'element-a',
      editability: 'editable',
      elementType: 'part-studio',
      source: 'UI',
      observedAt: '2026-10-13T12:00:00.000Z',
      ...mismatch,
    });

    expect(observed).toEqual(page);
  });

  it('detects a confirmed Part Studio and enabled edit command from supported UI states', async () => {
    const { observeOnshapeCapabilities, parseOnshapePage } =
      await import('./onshapePage');
    visibleControl('Part Studio', 'tab', 'true');
    visibleControl('Sketch', 'button');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );

    const observed = observeOnshapeCapabilities(
      page,
      document,
      new Date('2026-10-13T12:00:00.000Z'),
    );

    expect(observed).toMatchObject({
      editability: 'editable',
      elementType: 'part-studio',
      capabilitySource: 'UI',
    });
  });

  it('honors a visible read-only indicator and does not promote editability', async () => {
    const { observeOnshapeCapabilities, parseOnshapePage } =
      await import('./onshapePage');
    visibleControl('Part Studio', 'tab', 'true');
    visibleControl('View only', 'status');
    visibleControl('Sketch', 'button');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );

    const observed = observeOnshapeCapabilities(page, document);

    expect(observed.editability).toBe('read-only');
    expect(observed.elementType).toBe('part-studio');
  });

  it('distinguishes document, workspace, and element navigation contexts', async () => {
    const { parseOnshapePage, sameOnshapePageContext } =
      await import('./onshapePage');
    const active = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );

    expect(
      sameOnshapePageContext(
        active,
        parseOnshapePage(
          'https://cad.onshape.com/documents/document-b/w/workspace-a/e/element-a',
        ),
      ),
    ).toBe(false);
    expect(
      sameOnshapePageContext(
        active,
        parseOnshapePage(
          'https://cad.onshape.com/documents/document-a/w/workspace-b/e/element-a',
        ),
      ),
    ).toBe(false);
    expect(
      sameOnshapePageContext(
        active,
        parseOnshapePage(
          'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-b',
        ),
      ),
    ).toBe(false);
  });

  it('builds a stable lifecycle key from the complete route identity', async () => {
    const { onshapePageContextKey, parseOnshapePage } =
      await import('./onshapePage');

    expect(
      onshapePageContextKey(
        parseOnshapePage(
          'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
        ),
      ),
    ).toBe('document-a/workspace/workspace-a/element-a');
    expect(
      onshapePageContextKey(parseOnshapePage('https://cad.onshape.com/')),
    ).toBeNull();
  });
});
