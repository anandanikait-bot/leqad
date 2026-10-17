/** Diagnostic-only discovery. Candidates are not recognized CAD controls. */
export const EDITOR_DISCOVERY_LIMITS = {
  candidatesPerSource: 32,
  rootsPerSource: 6,
  ancestorSteps: 3,
  elementsPerRoot: 128,
} as const;

export function discoverEditorRegions(
  root: Element,
  labels: readonly string[],
  excluded: (element: Element) => boolean,
) {
  // These selectors express generic markup, not guessed Onshape internals.
  // Native selector-engine work is not hard-bounded. JS enumeration and all
  // detailed subtree inspection are bounded separately and reported as such.
  const attributes = labels
    .flatMap((label) =>
      ['aria-label', 'title', 'data-tooltip'].map(
        (attr) => `[${attr}="${label}" i]`,
      ),
    )
    .join(',');
  const sources = [
    { kind: 'DIALOG', selector: '[role="dialog"],dialog', expand: false },
    { kind: 'TOOLBAR', selector: '[role="toolbar"]', expand: false },
    { kind: 'ALLOWLISTED_ATTRIBUTE', selector: attributes, expand: true },
    { kind: 'SVG_STRUCTURE', selector: 'svg', expand: true },
  ] as const;
  const roots = new Set<Element>();
  const coverage = [];
  for (const source of sources) {
    const matches = root.querySelectorAll(source.selector);
    const candidates: Element[] = [];
    const count = Math.min(
      matches.length,
      EDITOR_DISCOVERY_LIMITS.candidatesPerSource,
    );
    for (let i = 0; i < count; i++) {
      // Spread a bounded sample across native results. A prefix of SVGs from
      // one early region must not monopolize every opportunity for discovery.
      const index =
        count <= 1 ? 0 : Math.floor((i * (matches.length - 1)) / (count - 1));
      const match = matches[index]!;
      if (!match.isConnected || excluded(match)) continue;
      let region = match;
      if (source.expand) {
        for (
          let depth = 0;
          depth < EDITOR_DISCOVERY_LIMITS.ancestorSteps;
          depth++
        ) {
          const parent = region.parentElement;
          if (
            !parent ||
            parent === root ||
            !root.contains(parent) ||
            excluded(parent)
          )
            break;
          // Avoid promoting an icon to a large canvas/list container. This is a
          // candidate boundary, never a claim of toolbar or action ownership.
          if (parent.childElementCount > 10) break;
          region = parent;
          if (region.matches('[role="dialog"],dialog,[role="toolbar"]')) break;
        }
      }
      // Preserve an exact attribute anchor even if an earlier sibling consumes
      // its surrounding region's inspection budget.
      if (
        source.kind === 'ALLOWLISTED_ATTRIBUTE' &&
        !candidates.includes(match)
      )
        candidates.push(match);
      if (!candidates.includes(region)) candidates.push(region);
    }
    // Prefer locally measurable candidates. Unknown ancestry remains unknown in
    // the final report, and hidden candidates may still describe state changes.
    candidates.sort((a, b) => Number(measurable(b)) - Number(measurable(a)));
    const selectedCount = Math.min(
      candidates.length,
      EDITOR_DISCOVERY_LIMITS.rootsPerSource,
    );
    for (let i = 0; i < selectedCount; i++) {
      const index =
        selectedCount <= 1
          ? 0
          : Math.floor((i * (candidates.length - 1)) / (selectedCount - 1));
      roots.add(candidates[index]!);
    }
    coverage.push({
      source: source.kind,
      selection: 'STRATIFIED_DOCUMENT_ORDER' as const,
      examinedCandidates: count,
      candidateLimitReached: matches.length > count,
      rootLimitReached:
        candidates.length > EDITOR_DISCOVERY_LIMITS.rootsPerSource,
    });
  }
  return { roots: [...roots], coverage };
}

function measurable(element: Element) {
  const rect = element.getBoundingClientRect();
  return (
    rect.width > 0 &&
    rect.height > 0 &&
    !element.hasAttribute('hidden') &&
    element.getAttribute('aria-hidden') !== 'true'
  );
}
