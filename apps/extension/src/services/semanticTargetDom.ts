import type { TargetEnabledState, TargetVisibility } from './semanticTargets';

export function normalizedText(value: string | null | undefined): string {
  return (value ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim();
}

// Visit at most 64 nodes, including empty elements. Incomplete names are unknown.
function boundedText(element: Element): string | null {
  let node: Node | null = element.firstChild;
  let text = '';
  let count = 0;
  while (node) {
    if (++count > 64) return null;
    const excluded =
      node instanceof Element &&
      node.matches(
        '[aria-hidden="true"],svg,[role="treeitem"],[role="group"],[role="tree"]',
      );
    if (node.nodeType === 3) {
      text += ` ${node.nodeValue ?? ''}`;
      if (text.length > 128) return null;
    }
    if (!excluded && node.firstChild) {
      node = node.firstChild;
      continue;
    }
    while (node && node !== element && !node.nextSibling)
      node = node.parentNode;
    node = node && node !== element ? node.nextSibling : null;
  }
  return text.trim();
}

// Bounded accessible-name subset. Never use arbitrary form values or export IDs.
export function semanticName(element: Element): string {
  const references = element.getAttribute('aria-labelledby')?.trim();
  if (element.hasAttribute('aria-labelledby')) {
    if (!references || references.length > 384) return '';
    const ids = references.split(/\s+/);
    if (ids.length > 3) return '';
    const names: string[] = [];
    for (const id of ids) {
      const reference = element.ownerDocument.getElementById(id);
      const name = reference ? boundedText(reference) : null;
      if (name === null) return '';
      names.push(name);
    }
    const labelled = names.join(' ');
    return labelled.length <= 128 ? normalizedText(labelled) : '';
  }
  const explicit = element.getAttribute('aria-label');
  if (explicit !== null)
    return explicit.length <= 128 ? normalizedText(explicit) : '';
  return normalizedText(boundedText(element));
}

export function isLeqadOwned(element: Element): boolean {
  if (element.closest('[data-leqad-root], [data-leqad-highlight]')) return true;
  const root = element.getRootNode();
  return (
    root instanceof ShadowRoot &&
    (root.host.hasAttribute('data-leqad-root') ||
      root.host.localName.startsWith('leqad-'))
  );
}

export function enabledState(element: HTMLElement): TargetEnabledState {
  for (
    let current: HTMLElement | null = element;
    current;
    current = current.parentElement
  ) {
    if (
      current.getAttribute('aria-disabled') === 'true' ||
      current.hasAttribute('inert') ||
      ('disabled' in current &&
        Boolean((current as HTMLButtonElement).disabled))
    )
      return 'DISABLED';
  }
  return 'ENABLED';
}

export function visibilityState(element: HTMLElement): TargetVisibility {
  const view = element.ownerDocument.defaultView;
  const rect = element.getBoundingClientRect();
  for (
    let current: HTMLElement | null = element;
    current;
    current = current.parentElement
  ) {
    if (
      !current.isConnected ||
      current.hidden ||
      current.getAttribute('aria-hidden') === 'true' ||
      (current !== element &&
        current.matches('[role="group"],[role="treeitem"]') &&
        current.getAttribute('aria-expanded') === 'false')
    )
      return 'HIDDEN';
    const style = view?.getComputedStyle(current);
    if (
      style &&
      (style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        style.opacity === '0')
    )
      return 'HIDDEN';
    if (
      current !== element &&
      style &&
      /(hidden|clip|auto|scroll)/.test(
        `${style.overflow} ${style.overflowX} ${style.overflowY}`,
      )
    ) {
      const clip = current.getBoundingClientRect();
      if (
        clip.width > 0 &&
        clip.height > 0 &&
        (rect.left < clip.left ||
          rect.right > clip.right ||
          rect.top < clip.top ||
          rect.bottom > clip.bottom)
      )
        return 'CLIPPED';
    }
  }
  if (rect.width <= 0 || rect.height <= 0) return 'ZERO_SIZE';
  const width = view?.innerWidth ?? Infinity;
  const height = view?.innerHeight ?? Infinity;
  if (
    rect.bottom <= 0 ||
    rect.right <= 0 ||
    rect.top >= height ||
    rect.left >= width
  )
    return 'OFFSCREEN';
  if (
    rect.top < 0 ||
    rect.left < 0 ||
    rect.right > width ||
    rect.bottom > height
  )
    return 'CLIPPED';
  const hit = element.ownerDocument.elementFromPoint?.(
    rect.left + rect.width / 2,
    rect.top + rect.height / 2,
  );
  if (hit && hit !== element && !element.contains(hit)) return 'OBSCURED';
  return 'VISIBLE';
}
