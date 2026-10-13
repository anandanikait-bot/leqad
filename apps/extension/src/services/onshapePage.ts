import {
  findSelectedSemanticTarget,
  findSemanticTarget,
} from './semanticTargets';

export type OnshapeModelType = 'workspace' | 'version' | 'microversion' | null;
export type OnshapeEditability = 'editable' | 'read-only' | 'unknown';
export type OnshapeElementType = 'part-studio' | 'other' | 'unknown';
export type OnshapeCapabilitySource = 'ROUTE' | 'UI' | 'API' | null;

export interface OnshapePageContext {
  supported: boolean;
  documentId: string | null;
  workspaceId: string | null;
  versionId: string | null;
  microversionId: string | null;
  elementId: string | null;
  modelType: OnshapeModelType;
  editability: OnshapeEditability;
  elementType: OnshapeElementType;
  capabilitySource: OnshapeCapabilitySource;
  capabilityObservedAt: string | null;
}

export interface OnshapeCapabilityObservation {
  documentId: string;
  workspaceId?: string | null;
  versionId?: string | null;
  microversionId?: string | null;
  elementId: string;
  editability?: Exclude<OnshapeEditability, 'unknown'>;
  elementType?: Exclude<OnshapeElementType, 'unknown'>;
  source: Exclude<OnshapeCapabilitySource, 'ROUTE' | null>;
  observedAt: string;
}

const UNSUPPORTED_PAGE: OnshapePageContext = {
  supported: false,
  documentId: null,
  workspaceId: null,
  versionId: null,
  microversionId: null,
  elementId: null,
  modelType: null,
  editability: 'unknown',
  elementType: 'unknown',
  capabilitySource: null,
  capabilityObservedAt: null,
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

  const [, documentId, mode, contextId, elementId] = match;
  if (!documentId || !mode || !contextId || !elementId) {
    return { ...UNSUPPORTED_PAGE };
  }

  const modelType =
    mode === 'w' ? 'workspace' : mode === 'v' ? 'version' : 'microversion';
  const readOnlyRoute = modelType !== 'workspace';
  return {
    supported: true,
    documentId,
    workspaceId: modelType === 'workspace' ? contextId : null,
    versionId: modelType === 'version' ? contextId : null,
    microversionId: modelType === 'microversion' ? contextId : null,
    elementId,
    modelType,
    editability: readOnlyRoute ? 'read-only' : 'unknown',
    elementType: 'unknown',
    capabilitySource: readOnlyRoute ? 'ROUTE' : null,
    capabilityObservedAt: null,
  };
}

export function isSupportedOnshapeUrl(input: string | URL): boolean {
  return parseOnshapePage(input).supported;
}

export function sameOnshapePageContext(
  left: OnshapePageContext,
  right: OnshapePageContext,
): boolean {
  return (
    left.supported === right.supported &&
    left.documentId === right.documentId &&
    left.workspaceId === right.workspaceId &&
    left.versionId === right.versionId &&
    left.microversionId === right.microversionId &&
    left.elementId === right.elementId &&
    left.modelType === right.modelType
  );
}

function observationMatchesPage(
  page: OnshapePageContext,
  observation: OnshapeCapabilityObservation,
): boolean {
  return (
    page.supported &&
    observation.documentId === page.documentId &&
    (observation.workspaceId ?? null) === page.workspaceId &&
    (observation.versionId ?? null) === page.versionId &&
    (observation.microversionId ?? null) === page.microversionId &&
    observation.elementId === page.elementId
  );
}

function validCapabilityObservation(
  observation: OnshapeCapabilityObservation,
): boolean {
  return (
    observation.documentId.length > 0 &&
    observation.elementId.length > 0 &&
    (observation.source === 'UI' || observation.source === 'API') &&
    Number.isFinite(Date.parse(observation.observedAt)) &&
    (observation.editability !== undefined ||
      observation.elementType !== undefined)
  );
}

export function applyOnshapeCapabilityObservation(
  page: OnshapePageContext,
  observation: OnshapeCapabilityObservation,
): OnshapePageContext {
  if (
    !validCapabilityObservation(observation) ||
    !observationMatchesPage(page, observation)
  ) {
    return page;
  }

  const editability =
    page.modelType === 'version' || page.modelType === 'microversion'
      ? 'read-only'
      : (observation.editability ?? page.editability);

  return {
    ...page,
    editability,
    elementType: observation.elementType ?? page.elementType,
    capabilitySource: observation.source,
    capabilityObservedAt: observation.observedAt,
  };
}

export function observeOnshapeCapabilities(
  page: OnshapePageContext,
  root: ParentNode,
  now: Date = new Date(),
): OnshapePageContext {
  if (
    !page.supported ||
    !page.documentId ||
    !page.elementId ||
    !Number.isFinite(now.getTime())
  ) {
    return page;
  }

  const partStudioTab = findSelectedSemanticTarget(root, 'part-studio-tab');
  const readOnlyIndicator = findSemanticTarget(root, 'read-only-indicator');
  const sketchCommand = findSemanticTarget(root, 'sketch');
  const elementType = partStudioTab ? 'part-studio' : undefined;
  const editability = readOnlyIndicator
    ? 'read-only'
    : page.modelType === 'workspace' && partStudioTab && sketchCommand
      ? 'editable'
      : undefined;

  if (!elementType && !editability) return page;

  return applyOnshapeCapabilityObservation(page, {
    documentId: page.documentId,
    workspaceId: page.workspaceId,
    versionId: page.versionId,
    microversionId: page.microversionId,
    elementId: page.elementId,
    ...(editability ? { editability } : {}),
    ...(elementType ? { elementType } : {}),
    source: 'UI',
    observedAt: now.toISOString(),
  });
}
