export type OnshapeModelType = 'workspace' | 'version' | 'microversion' | null;

export interface OnshapePageContext {
  supported: boolean;
  documentId: string | null;
  workspaceId: string | null;
  elementId: string | null;
  modelType: OnshapeModelType;
  editable: boolean;
}

const UNSUPPORTED_PAGE: OnshapePageContext = {
  supported: false,
  documentId: null,
  workspaceId: null,
  elementId: null,
  modelType: null,
  editable: false,
};

export function parseOnshapePage(input: string | URL): OnshapePageContext {
  let url: URL;
  try {
    url = input instanceof URL ? input : new URL(input);
  } catch {
    return { ...UNSUPPORTED_PAGE };
  }

  if (url.protocol !== 'https:' || url.hostname !== 'cad.onshape.com') {
    return { ...UNSUPPORTED_PAGE };
  }

  const match = url.pathname.match(
    /^\/documents\/([^/]+)\/(w|v|m)\/([^/]+)\/e\/([^/]+)\/?$/,
  );
  if (!match) return { ...UNSUPPORTED_PAGE };

  const [, documentId, mode, modelId, elementId] = match;
  if (!documentId || !mode || !modelId || !elementId)
    return { ...UNSUPPORTED_PAGE };

  const modelType =
    mode === 'w' ? 'workspace' : mode === 'v' ? 'version' : 'microversion';
  return {
    supported: true,
    documentId,
    workspaceId: modelType === 'workspace' ? modelId : null,
    elementId,
    modelType,
    editable: modelType === 'workspace',
  };
}

export function isSupportedOnshapeUrl(input: string | URL): boolean {
  return parseOnshapePage(input).supported;
}
