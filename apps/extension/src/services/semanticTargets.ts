export type SemanticTargetId = 'top-plane' | 'sketch' | 'finish-sketch';

const TARGET_LABELS: Record<SemanticTargetId, readonly string[]> = {
  'top-plane': ['top plane'],
  sketch: ['sketch', 'create sketch', 'start sketch'],
  'finish-sketch': ['finish sketch', 'exit sketch', 'close sketch'],
};

const CANDIDATE_SELECTOR = [
  'button',
  '[role="button"]',
  '[role="treeitem"]',
  '[role="menuitem"]',
  '[role="option"]',
  '[role="tab"]',
  'input',
  '[tabindex]:not([tabindex="-1"])',
  '[aria-label][data-qa]',
  '[title][data-qa]',
].join(',');

function normalizedText(value: string | null | undefined): string {
  return (value ?? '')
    .toLocaleLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

function hasTargetLabel(
  element: HTMLElement,
  labels: readonly string[],
): boolean {
  const values = [
    element.getAttribute('aria-label'),
    element.getAttribute('title'),
    element.getAttribute('data-tooltip'),
    element.textContent,
  ].map(normalizedText);

  return labels.some((label) => {
    const normalizedLabel = normalizedText(label);
    return values.some(
      (value) =>
        value === normalizedLabel ||
        ` ${value} `.includes(` ${normalizedLabel} `),
    );
  });
}

function isLeqadOwned(element: HTMLElement): boolean {
  if (element.closest('[data-leqad-root], [data-leqad-highlight]')) return true;
  const root = element.getRootNode();
  return (
    root instanceof ShadowRoot && root.host.hasAttribute('data-leqad-root')
  );
}

function isVisibleAndUsable(element: HTMLElement): boolean {
  if (
    !element.isConnected ||
    element.hidden ||
    element.getAttribute('aria-hidden') === 'true'
  ) {
    return false;
  }
  if ('disabled' in element && Boolean((element as HTMLButtonElement).disabled))
    return false;
  if (element.getAttribute('aria-disabled') === 'true' || isLeqadOwned(element))
    return false;

  const view = element.ownerDocument.defaultView;
  if (view) {
    const style = view.getComputedStyle(element);
    if (
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.opacity === '0'
    ) {
      return false;
    }
  }

  const rect = element.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) return false;
  if (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= (view?.innerHeight ?? Number.POSITIVE_INFINITY) ||
    rect.left >= (view?.innerWidth ?? Number.POSITIVE_INFINITY)
  ) {
    return false;
  }

  const hit = element.ownerDocument.elementFromPoint?.(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
  return !hit || hit === element || element.contains(hit);
}

export function isUsableSemanticTarget(
  element: HTMLElement,
  targetId: SemanticTargetId,
): boolean {
  return (
    hasTargetLabel(element, TARGET_LABELS[targetId]) &&
    isVisibleAndUsable(element)
  );
}

function findMatchingSemanticTarget(
  root: ParentNode,
  targetId: SemanticTargetId,
  isTargetMatch: (element: HTMLElement) => boolean = () => true,
): HTMLElement | null {
  for (const candidate of root.querySelectorAll<HTMLElement>(
    CANDIDATE_SELECTOR,
  )) {
    if (
      isUsableSemanticTarget(candidate, targetId) &&
      isTargetMatch(candidate)
    ) {
      return candidate;
    }
  }
  return null;
}

export function findSemanticTarget(
  root: ParentNode,
  targetId: SemanticTargetId,
): HTMLElement | null {
  return findMatchingSemanticTarget(root, targetId);
}

export function findSelectedSemanticTarget(
  root: ParentNode,
  targetId: SemanticTargetId,
): HTMLElement | null {
  return findMatchingSemanticTarget(
    root,
    targetId,
    (element) =>
      element.getAttribute('aria-selected') === 'true' ||
      element.getAttribute('aria-pressed') === 'true' ||
      element.getAttribute('aria-checked') === 'true',
  );
}

export interface TargetHighlight {
  element: HTMLDivElement;
  refresh(): void;
  remove(): void;
}

export function createTargetHighlight(
  target: HTMLElement,
  host: HTMLElement = target.ownerDocument.body,
): TargetHighlight {
  const document = target.ownerDocument;
  const view = document.defaultView;
  const overlay = document.createElement('div');
  overlay.dataset.leqadHighlight = 'true';
  overlay.setAttribute('aria-hidden', 'true');
  Object.assign(overlay.style, {
    position: 'fixed',
    boxSizing: 'border-box',
    border: '2px solid #793327',
    borderRadius: '6px',
    boxShadow: '0 0 0 3px rgba(245, 239, 231, 0.9)',
    pointerEvents: 'none',
    zIndex: '2147483646',
    transition:
      'top 120ms ease, left 120ms ease, width 120ms ease, height 120ms ease',
  });

  const refresh = () => {
    if (!target.isConnected) {
      remove();
      return;
    }
    const rect = target.getBoundingClientRect();
    Object.assign(overlay.style, {
      top: `${rect.top - 3}px`,
      left: `${rect.left - 3}px`,
      width: `${rect.width + 6}px`,
      height: `${rect.height + 6}px`,
    });
  };

  let removed = false;
  let mutationObserver: MutationObserver | null = null;
  const remove = () => {
    if (removed) return;
    removed = true;
    mutationObserver?.disconnect();
    view?.removeEventListener('resize', refresh);
    view?.removeEventListener('scroll', refresh, true);
    overlay.remove();
  };

  host.append(overlay);
  view?.addEventListener('resize', refresh);
  view?.addEventListener('scroll', refresh, true);
  if (view?.MutationObserver) {
    mutationObserver = new view.MutationObserver(() => {
      if (!target.isConnected) remove();
    });
    mutationObserver.observe(document.body, { childList: true, subtree: true });
  }
  refresh();

  return { element: overlay, refresh, remove };
}
