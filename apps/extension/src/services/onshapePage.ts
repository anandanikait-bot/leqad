import {
  findSelectedSemanticTarget,
  findSemanticTarget,
  recognizeSemanticTarget,
} from './semanticTargets';
import { observeSketchGuidanceUi } from './sketchGuidance';
import type { GuidanceUiContext } from './guidanceRegistry';

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

export function onshapePageContextKey(page: OnshapePageContext): string | null {
  if (
    !page.supported ||
    !page.documentId ||
    !page.elementId ||
    !page.modelType
  ) {
    return null;
  }
  const contextId =
    page.workspaceId ?? page.versionId ?? page.microversionId ?? null;
  if (!contextId) return null;
  return [page.documentId, page.modelType, contextId, page.elementId]
    .map(encodeURIComponent)
    .join('/');
}

export function onshapeUrlMatchesContextKey(
  url: string | URL,
  contextKey: string,
): boolean {
  return onshapePageContextKey(parseOnshapePage(url)) === contextKey;
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
  const elementType = partStudioTab ? 'part-studio' : undefined;
  // Visible commands identify UI controls, not the current user's permission.
  // No supported positive editing-permission observation is implemented yet.
  const editability = readOnlyIndicator ? 'read-only' : undefined;

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

/**
 * Observe the UI context needed solely to show visual guidance.
 * This is deliberately separate from capability observations: an identified
 * Sketch button is not proof of the element type or editing permission.
 * An unknown selected-tab state must not prevent highlighting a unique,
 * usable Sketch control on an otherwise supported workspace.
 */
export function observeOnshapeGuidanceContext(
  page: OnshapePageContext,
  root: ParentNode,
): GuidanceUiContext {
  if (!page.supported || page.elementType === 'other') return 'UNKNOWN';

  const editingAppearsActive =
    observeSketchGuidanceUi(root).editingAppearsActive;
  if (page.elementType === 'part-studio') {
    return editingAppearsActive ? 'SKETCH_EDITING' : 'PART_STUDIO';
  }

  // Fall back only for visual guidance in a workspace with an unknown tab type.
  // This does not update the page's elementType or editability.
  if (page.modelType !== 'workspace' || page.editability === 'read-only') {
    return 'UNKNOWN';
  }
  if (editingAppearsActive) return 'SKETCH_EDITING';
  return recognizeSemanticTarget(root, 'sketch').status === 'FOUND'
    ? 'PART_STUDIO'
    : 'UNKNOWN';
}

export interface OnshapeCapabilityMonitor {
  readonly current: OnshapePageContext;
  refresh(): OnshapePageContext;
  disconnect(): void;
}

function sameCapabilityState(
  left: OnshapePageContext,
  right: OnshapePageContext,
): boolean {
  return (
    sameOnshapePageContext(left, right) &&
    left.editability === right.editability &&
    left.elementType === right.elementType &&
    left.capabilitySource === right.capabilitySource
  );
}

export function createOnshapeCapabilityMonitor(
  routePage: OnshapePageContext,
  root: ParentNode,
  onChange: (page: OnshapePageContext) => void,
): OnshapeCapabilityMonitor {
  const rootNode = root as Node;
  const document =
    rootNode.nodeType === Node.DOCUMENT_NODE
      ? (rootNode as Document)
      : rootNode.ownerDocument;
  const view = document?.defaultView;
  let current = observeOnshapeCapabilities(routePage, root);
  let frame: number | null = null;
  let disconnected = false;

  const refresh = () => {
    if (disconnected) return current;
    const next = observeOnshapeCapabilities(routePage, root);
    const changed = !sameCapabilityState(current, next);
    current = next;
    if (changed) onChange(current);
    return current;
  };
  const scheduleRefresh = () => {
    if (disconnected || frame !== null) return;
    if (view?.requestAnimationFrame) {
      frame = view.requestAnimationFrame(() => {
        frame = null;
        refresh();
      });
    } else {
      refresh();
    }
  };
  const observer = view?.MutationObserver
    ? new view.MutationObserver(scheduleRefresh)
    : null;
  const observationRoot =
    rootNode.nodeType === Node.DOCUMENT_NODE
      ? document?.documentElement
      : rootNode;
  if (observer && observationRoot) {
    observer.observe(observationRoot, {
      attributes: true,
      childList: true,
      characterData: true,
      subtree: true,
      attributeFilter: [
        'aria-disabled',
        'aria-label',
        'aria-labelledby',
        'aria-hidden',
        'aria-selected',
        'class',
        'data-tooltip',
        'disabled',
        'hidden',
        'id',
        'inert',
        'role',
        'style',
        'title',
      ],
    });
  }

  return {
    get current() {
      return current;
    },
    refresh,
    disconnect() {
      disconnected = true;
      observer?.disconnect();
      if (frame !== null) view?.cancelAnimationFrame(frame);
      frame = null;
    },
  };
}
