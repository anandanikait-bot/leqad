import { afterEach, describe, expect, it, vi } from 'vitest';

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

  it('recognizes Part Studio without inferring permission from an enabled Sketch command', async () => {
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
      editability: 'unknown',
      elementType: 'part-studio',
      capabilitySource: 'UI',
    });
  });

  it('allows Sketch visual guidance from a unique control when the selected Part Studio tab is unrecognized', async () => {
    const {
      observeOnshapeCapabilities,
      observeOnshapeGuidanceContext,
      parseOnshapePage,
    } = await import('./onshapePage');
    visibleControl('Sketch', 'button');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );

    // The toolbar is guidance evidence, not sufficient capability/permission evidence.
    expect(observeOnshapeCapabilities(page, document)).toMatchObject({
      elementType: 'unknown',
      editability: 'unknown',
    });
    expect(observeOnshapeGuidanceContext(page, document)).toBe('PART_STUDIO');
    expect(page.elementType).toBe('unknown');
  });

  it('allows Sketch-editing guidance only from a unique visible Finish Sketch control when the tab is unrecognized', async () => {
    const { observeOnshapeGuidanceContext, parseOnshapePage } =
      await import('./onshapePage');
    visibleControl('Finish sketch', 'button');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );

    expect(observeOnshapeGuidanceContext(page, document)).toBe(
      'SKETCH_EDITING',
    );
    expect(page.elementType).toBe('unknown');
  });

  it('treats a sketch dialog as guidance-only evidence', async () => {
    const {
      observeOnshapeCapabilities,
      observeOnshapeGuidanceContext,
      parseOnshapePage,
    } = await import('./onshapePage');
    const { observeSketchGuidanceUi } = await import('./sketchGuidance');
    const dialog = document.createElement('section');
    dialog.setAttribute('role', 'dialog');
    dialog.getBoundingClientRect = () => new DOMRect(20, 40, 240, 250);
    const heading = document.createElement('h2');
    heading.textContent = 'Sketch 3';
    const planeField = document.createElement('div');
    planeField.setAttribute('aria-label', 'Sketch plane Top plane');
    planeField.getBoundingClientRect = () => new DOMRect(30, 80, 190, 28);
    dialog.append(heading, planeField);
    document.body.append(dialog);
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );

    expect(observeSketchGuidanceUi(document)).toEqual({
      editingAppearsActive: true,
      dialogPlane: 'Top',
    });
    expect(observeOnshapeGuidanceContext(page, document)).toBe(
      'SKETCH_EDITING',
    );
    expect(observeOnshapeCapabilities(page, document)).toMatchObject({
      elementType: 'unknown',
      editability: 'unknown',
    });
  });

  it('keeps guidance context UNKNOWN without a unique usable control, or with a known different element type', async () => {
    const { observeOnshapeGuidanceContext, parseOnshapePage } =
      await import('./onshapePage');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );

    expect(observeOnshapeGuidanceContext(page, document)).toBe('UNKNOWN');
    visibleControl('Sketch', 'button');
    visibleControl('Sketch', 'button');
    expect(observeOnshapeGuidanceContext(page, document)).toBe('UNKNOWN');
    expect(
      observeOnshapeGuidanceContext(
        { ...page, elementType: 'other' },
        document,
      ),
    ).toBe('UNKNOWN');
  });

  it('does not use Sketch-toolbar fallback for read-only, version, or unsupported pages', async () => {
    const { observeOnshapeGuidanceContext, parseOnshapePage } =
      await import('./onshapePage');
    visibleControl('Sketch', 'button');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );
    expect(
      observeOnshapeGuidanceContext(
        { ...page, editability: 'read-only' },
        document,
      ),
    ).toBe('UNKNOWN');
    expect(
      observeOnshapeGuidanceContext(
        parseOnshapePage(
          'https://cad.onshape.com/documents/document-a/v/version-a/e/element-a',
        ),
        document,
      ),
    ).toBe('UNKNOWN');
    expect(
      observeOnshapeGuidanceContext(
        parseOnshapePage('https://cad.onshape.com/'),
        document,
      ),
    ).toBe('UNKNOWN');
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

  it('keeps permission unknown for a shared read-only workspace that displays Part Studio and Sketch controls', async () => {
    const { observeOnshapeCapabilities, parseOnshapePage } =
      await import('./onshapePage');
    // These controls can be visible in a shared workspace without edit access.
    // There is no supported permission observation in this fixture.
    visibleControl('Part Studio', 'tab', 'true');
    visibleControl('Sketch', 'button');
    const page = parseOnshapePage(
      'https://cad.onshape.com/documents/shared-document/w/shared-workspace/e/part-studio',
    );

    expect(observeOnshapeCapabilities(page, document)).toMatchObject({
      editability: 'unknown',
      elementType: 'part-studio',
    });
  });

  it('does not override a context-matched read-only observation with visible edit controls', async () => {
    const { observeOnshapeCapabilities, parseOnshapePage } =
      await import('./onshapePage');
    visibleControl('Part Studio', 'tab', 'true');
    visibleControl('Sketch', 'button');
    const page = {
      ...parseOnshapePage(
        'https://cad.onshape.com/documents/shared-document/w/shared-workspace/e/part-studio',
      ),
      editability: 'read-only' as const,
    };

    expect(observeOnshapeCapabilities(page, document).editability).toBe(
      'read-only',
    );
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

  it('detects when an initialization attempt no longer matches the live route', async () => {
    const {
      onshapePageContextKey,
      onshapeUrlMatchesContextKey,
      parseOnshapePage,
    } = await import('./onshapePage');
    const firstUrl =
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a';
    const contextKey = onshapePageContextKey(parseOnshapePage(firstUrl))!;

    expect(onshapeUrlMatchesContextKey(firstUrl, contextKey)).toBe(true);
    expect(
      onshapeUrlMatchesContextKey(
        'https://cad.onshape.com/documents/document-b/w/workspace-b/e/element-b',
        contextKey,
      ),
    ).toBe(false);
  });

  it('refreshes and revokes captured capabilities when the page UI changes', async () => {
    const { createOnshapeCapabilityMonitor, parseOnshapePage } =
      await import('./onshapePage');
    visibleControl('Part Studio', 'tab', 'true');
    visibleControl('Sketch', 'button');
    const routePage = parseOnshapePage(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
    );
    const changes: string[] = [];
    const monitor = createOnshapeCapabilityMonitor(
      routePage,
      document,
      (page) => changes.push(page.editability),
    );

    expect(monitor.current.editability).toBe('unknown');
    const readOnly = visibleControl('View only', 'status');
    await new Promise((resolve) => setTimeout(resolve, 0));
    await new Promise((resolve) => requestAnimationFrame(resolve));

    expect(monitor.current.editability).toBe('read-only');
    expect(changes).toContain('read-only');
    readOnly.remove();
    monitor.refresh();
    expect(monitor.current.editability).toBe('unknown');
    expect(changes).toContain('unknown');
    monitor.disconnect();
  });

  it.each(['id', 'aria-labelledby', 'aria-hidden', 'inert'])(
    'revokes Part Studio recognition when %s invalidates its observed control',
    async (attribute) => {
      const { createOnshapeCapabilityMonitor, parseOnshapePage } =
        await import('./onshapePage');
      const label = document.createElement('span');
      label.id = 'part-studio-label';
      label.textContent = 'Part Studio';
      document.body.append(label);
      const tab = visibleControl('Part Studio', 'tab', 'true');
      tab.setAttribute('aria-labelledby', label.id);
      const monitor = createOnshapeCapabilityMonitor(
        parseOnshapePage(
          'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
        ),
        document,
        () => undefined,
      );
      try {
        expect(monitor.current.elementType).toBe('part-studio');
        if (attribute === 'id') label.id = 'replaced-label';
        else
          tab.setAttribute(
            attribute,
            attribute === 'aria-labelledby' ? 'missing-label' : 'true',
          );
        await vi.waitFor(() =>
          expect(monitor.current.elementType).toBe('unknown'),
        );
        expect(monitor.current.editability).toBe('unknown');
      } finally {
        monitor.disconnect();
      }
    },
  );
});
