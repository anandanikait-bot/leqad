// Diagnostic only: these observations never admit a production guidance target.
export interface MetadataEligibility {
  visibility:
    'VISIBLE' | 'HIDDEN' | 'ZERO_SIZE' | 'OFFSCREEN' | 'CLIPPED' | 'UNKNOWN';
  enabled: 'ENABLED' | 'DISABLED' | 'UNKNOWN';
  hitTest: 'TARGET' | 'OTHER' | 'UNKNOWN';
  eligibility: 'ELIGIBLE' | 'REJECTED' | 'UNKNOWN';
  ancestorLimitReached: boolean;
}

const MAX_ANCESTORS = 96;
const MAX_STYLE_READS = 4096;

/** Fresh per snapshot: no stale eligibility survives a DOM replacement or UI change. */
export function createMetadataEligibilityInspector(root: Document) {
  const styles = new WeakMap<Element, CSSStyleDeclaration>();
  let styleReads = 0;
  const view = root.defaultView;
  return (element: Element): MetadataEligibility => {
    const result: MetadataEligibility = {
      visibility: 'UNKNOWN',
      enabled: 'UNKNOWN',
      hitTest: 'UNKNOWN',
      eligibility: 'UNKNOWN',
      ancestorLimitReached: false,
    };
    if (!element.isConnected || element.ownerDocument !== root) {
      result.eligibility = 'REJECTED';
      return result;
    }
    const rect = element.getBoundingClientRect();
    const finiteBounds = [rect.x, rect.y, rect.width, rect.height].every(
      Number.isFinite,
    );
    let hidden = false;
    let clipped = false;
    let disabled = false;
    let inspected = 0;
    let current: Element | null = element;
    for (
      ;
      current && inspected < MAX_ANCESTORS;
      inspected++, current = current.parentElement
    ) {
      hidden ||=
        current.hasAttribute('hidden') ||
        current.getAttribute('aria-hidden') === 'true';
      disabled ||=
        current.getAttribute('aria-disabled') === 'true' ||
        current.hasAttribute('inert') ||
        current.classList.contains('disabled') ||
        (current instanceof HTMLButtonElement && current.disabled) ||
        current.matches(':disabled');
      let style = styles.get(current);
      if (!style) {
        if (!view || styleReads >= MAX_STYLE_READS) break;
        style = view.getComputedStyle(current);
        styleReads++;
        styles.set(current, style);
      }
      hidden ||=
        style.display === 'none' ||
        style.visibility === 'hidden' ||
        style.visibility === 'collapse' ||
        style.opacity === '0' ||
        style.contentVisibility === 'hidden';
      if (
        current !== element &&
        /(hidden|clip|auto|scroll)/.test(
          `${style.overflow} ${style.overflowX} ${style.overflowY}`,
        )
      ) {
        const clip = current.getBoundingClientRect();
        clipped ||=
          clip.width <= 0 ||
          clip.height <= 0 ||
          rect.left < clip.left ||
          rect.top < clip.top ||
          rect.right > clip.right ||
          rect.bottom > clip.bottom;
      }
    }
    result.ancestorLimitReached = current !== null;
    result.enabled = disabled ? 'DISABLED' : current ? 'UNKNOWN' : 'ENABLED';
    if (hidden) result.visibility = 'HIDDEN';
    else if (current || !finiteBounds || !view) result.visibility = 'UNKNOWN';
    else if (rect.width <= 0 || rect.height <= 0)
      result.visibility = 'ZERO_SIZE';
    else if (
      rect.bottom <= 0 ||
      rect.right <= 0 ||
      rect.left >= view.innerWidth ||
      rect.top >= view.innerHeight
    )
      result.visibility = 'OFFSCREEN';
    else if (
      clipped ||
      rect.left < 0 ||
      rect.top < 0 ||
      rect.right > view.innerWidth ||
      rect.bottom > view.innerHeight
    )
      result.visibility = 'CLIPPED';
    else result.visibility = 'VISIBLE';
    if (result.visibility === 'VISIBLE' && root.elementFromPoint) {
      const hit = root.elementFromPoint(
        rect.left + rect.width / 2,
        rect.top + rect.height / 2,
      );
      result.hitTest = hit
        ? hit === element || element.contains(hit)
          ? 'TARGET'
          : 'OTHER'
        : 'UNKNOWN';
    }
    if (
      result.enabled === 'DISABLED' ||
      !['VISIBLE', 'UNKNOWN'].includes(result.visibility) ||
      result.hitTest === 'OTHER'
    )
      result.eligibility = 'REJECTED';
    else if (
      result.visibility === 'VISIBLE' &&
      result.enabled === 'ENABLED' &&
      result.hitTest === 'TARGET'
    )
      result.eligibility = 'ELIGIBLE';
    return result;
  };
}
