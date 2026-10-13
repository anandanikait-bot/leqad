import { describe, expect, it } from 'vitest';

describe('isSupportedOnshapeUrl', () => {
  it('recognizes HTTPS pages on the supported Onshape origin', async () => {
    const { isSupportedOnshapeUrl } = await import('./onshapePage');

    expect(
      isSupportedOnshapeUrl(
        'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
      ),
    ).toBe(true);
  });

  it('rejects lookalike hosts and non-HTTPS origins', async () => {
    const { isSupportedOnshapeUrl } = await import('./onshapePage');

    expect(
      isSupportedOnshapeUrl('https://cad.onshape.com.attacker.example/'),
    ).toBe(false);
    expect(isSupportedOnshapeUrl('https://onshape.com/')).toBe(false);
    expect(isSupportedOnshapeUrl('http://cad.onshape.com/')).toBe(false);
    expect(isSupportedOnshapeUrl('not a url')).toBe(false);
  });

  it('extracts editable workspace identity from a supported Part Studio URL', async () => {
    const { parseOnshapePage } = await import('./onshapePage');

    expect(
      parseOnshapePage(
        'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
      ),
    ).toEqual({
      supported: true,
      documentId: 'document-a',
      workspaceId: 'workspace-a',
      elementId: 'element-a',
      modelType: 'workspace',
      editable: true,
    });
  });

  it('recognizes a version URL as read-only and rejects non-document routes', async () => {
    const { parseOnshapePage } = await import('./onshapePage');

    expect(
      parseOnshapePage(
        'https://cad.onshape.com/documents/document-a/v/version-a/e/element-a',
      ).editable,
    ).toBe(false);
    expect(parseOnshapePage('https://cad.onshape.com/')).toMatchObject({
      supported: false,
      documentId: null,
      editable: false,
    });
  });
});
