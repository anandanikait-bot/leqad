export interface PageCaptureOptions {
  maxElements?: number;
  maxDepth?: number;
  maxVisibilityAncestors?: number;
  maxOutputNodes?: number;
  maxCandidates?: number;
  maxSiblings?: number;
  maxOutputBytes?: number;
}

/** Self-contained so Playwright can execute this bounded observer in the page. */
export function capturePageSnapshot(options: PageCaptureOptions = {}) {
  const allowedLabels = [
    'Part Studio',
    'Assembly',
    'Sketch',
    'Start sketch',
    'Create sketch',
    'Finish Sketch',
    'Rectangle',
    'Aligned Rectangle',
    'Dimension',
    'Top',
    'Front',
    'Right',
    'Default geometry',
    'Cancel',
    'Close',
  ];
  const roles = [
    'BUTTON',
    'TREE',
    'TREEGRID',
    'TREEITEM',
    'ROW',
    'MENU',
    'MENUITEM',
    'DIALOG',
    'TAB',
    'TABLIST',
    'TOOLBAR',
    'OPTION',
    'CHECKBOX',
    'RADIO',
    'COMBOBOX',
    'TEXTBOX',
    'GENERIC',
    'PRESENTATION',
  ];
  const tagNames = [
    'BUTTON',
    'DIV',
    'SPAN',
    'LI',
    'UL',
    'OL',
    'SVG',
    'PATH',
    'A',
    'INPUT',
    'SELECT',
    'OPTION',
    'CANVAS',
  ];
  const limits = {
    maxElements: Math.min(Math.max(options.maxElements ?? 10_000, 1), 20_000),
    maxDepth: Math.min(Math.max(options.maxDepth ?? 10, 1), 20),
    maxVisibilityAncestors: Math.min(
      Math.max(options.maxVisibilityAncestors ?? 64, 1),
      96,
    ),
    maxOutputNodes: Math.min(Math.max(options.maxOutputNodes ?? 180, 1), 300),
    maxCandidates: Math.min(Math.max(options.maxCandidates ?? 48, 1), 100),
    maxSiblings: Math.min(Math.max(options.maxSiblings ?? 12, 1), 24),
    maxOutputBytes: Math.min(
      Math.max(options.maxOutputBytes ?? 24_000, 512),
      32_768,
    ),
  };
  const root = document.body;
  const emptyScan = {
    visitedElements: 0,
    recognizedLabelCount: 0,
    accessibleNameCount: 0,
    roleAttributeCount: 0,
    nativeControlCount: 0,
    nodeLimitReached: false,
    candidateLimitReached: false,
    sketchCandidateLimitReached: false,
    depthLimitReached: false,
    outputLimitReached: false,
    status: 'COMPLETE',
  } as const;
  if (!root) return { nodes: [], scan: emptyScan, domState: 'UNKNOWN' };

  const exactLabel = (value: string | null) => {
    const trimmed = value?.trim();
    return trimmed && allowedLabels.includes(trimmed) ? trimmed : null;
  };
  const labelOf = (element: Element) => {
    // An explicit accessible name takes precedence even when it is not in the
    // export allowlist. In that case keep the target unknown instead of
    // classifying it from a lower-priority title or text fallback.
    if (element.hasAttribute('aria-labelledby')) return null;
    if (element.hasAttribute('aria-label'))
      return exactLabel(element.getAttribute('aria-label'));
    if (element.hasAttribute('title'))
      return exactLabel(element.getAttribute('title'));
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const direct = exactLabel(child.textContent);
        if (direct) return direct;
      }
    }
    return null;
  };
  const roleOf = (element: Element) => {
    const role = element.getAttribute('role')?.trim().toUpperCase();
    return role && roles.includes(role) ? role : null;
  };
  const hasConflictingNamedControlAncestor = (
    element: Element,
    label: string,
  ) => {
    const nativeActionable = new Set(['BUTTON', 'INPUT', 'SELECT', 'OPTION']);
    let ancestor = element.parentElement;
    let depth = 0;
    while (ancestor && ancestor !== root && depth < limits.maxDepth) {
      const actionable =
        nativeActionable.has(ancestor.tagName.toUpperCase()) ||
        ['BUTTON', 'MENUITEM'].includes(roleOf(ancestor) ?? '');
      const hasExplicitName =
        ancestor.hasAttribute('aria-labelledby') ||
        ancestor.hasAttribute('aria-label') ||
        ancestor.hasAttribute('title');
      if (actionable && hasExplicitName && labelOf(ancestor) !== label)
        return true;
      ancestor = ancestor.parentElement;
      depth += 1;
    }
    return false;
  };
  const safeLabelOf = (element: Element) => {
    const label = labelOf(element);
    return label && !hasConflictingNamedControlAncestor(element, label)
      ? label
      : null;
  };
  const boolOf = (element: Element, key: string) => {
    const value = element.getAttribute(`aria-${key}`)?.trim().toLowerCase();
    if (value === 'true') return 'TRUE';
    if (value === 'false') return 'FALSE';
    if (value === 'mixed') return 'MIXED';
    return 'UNKNOWN';
  };
  const boundsOf = (element: Element) => {
    const view = document.defaultView;
    if (!view || view.innerWidth <= 0 || view.innerHeight <= 0) {
      return { bounds: null, visibility: 'UNKNOWN', clipping: 'UNKNOWN' };
    }
    const style = view.getComputedStyle(element);
    if (
      element.hasAttribute('hidden') ||
      boolOf(element, 'hidden') === 'TRUE' ||
      style.display === 'none' ||
      style.visibility === 'hidden' ||
      style.visibility === 'collapse' ||
      style.opacity === '0' ||
      (element as HTMLElement).inert
    )
      return { bounds: null, visibility: 'HIDDEN', clipping: 'UNKNOWN' };

    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) {
      return { bounds: null, visibility: 'UNKNOWN', clipping: 'UNKNOWN' };
    }
    const left = Math.max(0, Math.min(1, rect.left / view.innerWidth));
    const top = Math.max(0, Math.min(1, rect.top / view.innerHeight));
    const right = Math.max(0, Math.min(1, rect.right / view.innerWidth));
    const bottom = Math.max(0, Math.min(1, rect.bottom / view.innerHeight));
    const viewportClipped =
      rect.left < 0 ||
      rect.top < 0 ||
      rect.right > view.innerWidth ||
      rect.bottom > view.innerHeight;
    let ancestorClipped = false;
    let ancestor = element.parentElement;
    let ancestorDepth = 0;
    while (ancestor && ancestorDepth < limits.maxVisibilityAncestors) {
      const ancestorStyle = view.getComputedStyle(ancestor);
      if (
        ancestor.hasAttribute('hidden') ||
        boolOf(ancestor, 'hidden') === 'TRUE' ||
        ancestorStyle.display === 'none' ||
        ancestorStyle.visibility === 'hidden' ||
        ancestorStyle.visibility === 'collapse' ||
        ancestorStyle.opacity === '0' ||
        (ancestor as HTMLElement).inert
      )
        return { bounds: null, visibility: 'HIDDEN', clipping: 'UNKNOWN' };
      if (
        /(hidden|clip|scroll|auto)/.test(
          `${ancestorStyle.overflowX} ${ancestorStyle.overflowY}`,
        )
      ) {
        const ancestorRect = ancestor.getBoundingClientRect();
        if (
          rect.left < ancestorRect.left ||
          rect.top < ancestorRect.top ||
          rect.right > ancestorRect.right ||
          rect.bottom > ancestorRect.bottom
        ) {
          ancestorClipped = true;
          break;
        }
      }
      ancestor = ancestor.parentElement;
      ancestorDepth += 1;
    }
    const ancestorDepthReached = ancestor !== null;
    const clipping = ancestorClipped
      ? 'ANCESTOR'
      : viewportClipped
        ? 'VIEWPORT'
        : ancestorDepthReached
          ? 'UNKNOWN'
          : 'NONE';
    return {
      bounds: {
        x: Number(left.toFixed(4)),
        y: Number(top.toFixed(4)),
        width: Number((right - left).toFixed(4)),
        height: Number((bottom - top).toFixed(4)),
      },
      visibility:
        viewportClipped || ancestorClipped
          ? 'PARTIAL'
          : ancestorDepthReached
            ? 'UNKNOWN'
            : 'VISIBLE',
      clipping,
    };
  };

  let visitedElements = 0;
  let nodeLimitReached = false;
  let candidateLimitReached = false;
  let sketchCandidateLimitReached = false;
  let depthLimitReached = false;
  let outputLimitReached = false;
  let recognizedLabelCount = 0;
  let accessibleNameCount = 0;
  let roleAttributeCount = 0;
  let nativeControlCount = 0;
  const labeledCandidates: Element[] = [];
  const structuralCandidates: Element[] = [];
  const genericFallbackCandidates: Element[] = [];
  const nativeControls = new Set(['BUTTON', 'INPUT', 'SELECT', 'OPTION']);
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_ELEMENT);
  let current: Node | null = root;
  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as Element;
      visitedElements += 1;
      const accessibleNamePresent =
        element.hasAttribute('aria-label') ||
        element.hasAttribute('aria-labelledby') ||
        element.hasAttribute('title');
      if (accessibleNamePresent) accessibleNameCount += 1;
      if (element.hasAttribute('role')) roleAttributeCount += 1;
      if (nativeControls.has(element.tagName.toUpperCase()))
        nativeControlCount += 1;
      let depth = 0;
      let parent = element.parentElement;
      while (parent && parent !== root && depth <= limits.maxDepth) {
        depth += 1;
        parent = parent.parentElement;
      }
      if (parent && parent !== root) depthLimitReached = true;
      const label = safeLabelOf(element);
      if (label) {
        recognizedLabelCount += 1;
        labeledCandidates.push(element);
      } else if (
        accessibleNamePresent ||
        element.hasAttribute('role') ||
        element.hasAttribute('tabindex') ||
        nativeControls.has(element.tagName.toUpperCase())
      ) {
        structuralCandidates.push(element);
      }
      if (
        ['DIV', 'SPAN', 'LI', 'UL', 'OL'].includes(
          element.tagName.toUpperCase(),
        )
      )
        genericFallbackCandidates.push(element);
      if (visitedElements >= limits.maxElements) {
        nodeLimitReached = true;
        break;
      }
    }
    current = walker.nextNode();
  }

  // Exact Sketch controls win the bounded candidate budget even if unrelated
  // allowlisted controls occur earlier in the document. No arbitrary label is
  // promoted into a recognized candidate.
  const sketchLabels = new Set([
    'Sketch',
    'Start sketch',
    'Create sketch',
    'Finish Sketch',
  ]);
  labeledCandidates.sort((left, right) => {
    const leftRank = sketchLabels.has(labelOf(left) ?? '') ? 0 : 1;
    const rightRank = sketchLabels.has(labelOf(right) ?? '') ? 0 : 1;
    return leftRank - rightRank;
  });
  const preferredSketchCandidates = labeledCandidates.filter((element) =>
    sketchLabels.has(labelOf(element) ?? ''),
  );
  const otherLabelCandidates = labeledCandidates.filter(
    (element) => !sketchLabels.has(labelOf(element) ?? ''),
  );
  const structuralSet = new Set(structuralCandidates);
  const genericCandidates = genericFallbackCandidates.filter(
    (element) => !structuralSet.has(element) && !labelOf(element),
  );
  // Deterministic coverage across the bounded scan, including both ends.
  // These are samples of unknown structure, never identified Sketch targets.
  const sample = (elements: Element[], budget: number): Element[] => {
    if (elements.length <= budget) return elements;
    if (budget <= 0) return [];
    if (budget === 1) return [elements[Math.floor(elements.length / 2)]!];
    return Array.from(
      { length: budget },
      (_, index) =>
        elements[Math.round((index * (elements.length - 1)) / (budget - 1))]!,
    );
  };
  const fallbackCandidates = [...structuralCandidates, ...genericCandidates];
  const selectedSketch = preferredSketchCandidates.slice(
    0,
    limits.maxCandidates,
  );
  // This broad, bounded viewport region is diagnostic only. The screenshot
  // shows Sketch dialog controls here, but coordinates do not identify them.
  const view = document.defaultView;
  const panelControl = (element: Element) => {
    if (!view || view.innerWidth <= 0 || view.innerHeight <= 0) return false;
    const tag = element.tagName.toUpperCase();
    if (
      tag !== 'BUTTON' &&
      roleOf(element) !== 'BUTTON' &&
      roleOf(element) !== 'MENUITEM' &&
      !element.hasAttribute('tabindex')
    )
      return false;
    const rect = element.getBoundingClientRect();
    if (rect.width <= 0 || rect.height <= 0) return false;
    const x = (rect.left + rect.width / 2) / view.innerWidth;
    const y = (rect.top + rect.height / 2) / view.innerHeight;
    return x >= 0.08 && x <= 0.36 && y >= 0.025 && y <= 0.32;
  };
  const centerDistance = (element: Element) => {
    if (!view) return Infinity;
    const rect = element.getBoundingClientRect();
    const x = (rect.left + rect.width / 2) / view.innerWidth;
    const y = (rect.top + rect.height / 2) / view.innerHeight;
    return (x - 0.22) ** 2 + (y - 0.09) ** 2;
  };
  const focusCandidates = structuralCandidates
    .filter(panelControl)
    .sort((left, right) => centerDistance(left) - centerDistance(right));
  const afterSketchBudget = limits.maxCandidates - selectedSketch.length;
  const selectedFocus = focusCandidates.slice(0, Math.min(6, afterSketchBudget));
  const focusSet = new Set(selectedFocus);
  const structuralBudget = Math.min(
    afterSketchBudget - selectedFocus.length,
    Math.min(8, Math.max(1, Math.floor(limits.maxCandidates / 4))),
  );
  const genericBudget = Math.min(
    genericCandidates.length,
    Math.floor(structuralBudget / 2),
  );
  const selectedStructure = [
    ...sample(
      structuralCandidates.filter((element) => !focusSet.has(element)),
      structuralBudget - genericBudget,
    ),
    ...sample(genericCandidates, genericBudget),
  ];
  const remainingAfterStructure =
    limits.maxCandidates -
    selectedSketch.length -
    selectedFocus.length -
    selectedStructure.length;
  const selectedOtherLabels = otherLabelCandidates.slice(
    0,
    remainingAfterStructure,
  );
  const usedFallbacks = new Set([...selectedFocus, ...selectedStructure]);
  const additionalStructure = sample(
    fallbackCandidates.filter((element) => !usedFallbacks.has(element)),
    limits.maxCandidates -
      selectedSketch.length -
      selectedFocus.length -
      selectedStructure.length -
      selectedOtherLabels.length,
  );
  const candidates = [
    ...selectedSketch,
    ...selectedFocus,
    ...selectedStructure,
    ...selectedOtherLabels,
    ...additionalStructure,
  ];
  const allCandidates = new Set([
    ...preferredSketchCandidates,
    ...fallbackCandidates,
    ...otherLabelCandidates,
  ]);
  if (allCandidates.size > candidates.length) candidateLimitReached = true;
  if (preferredSketchCandidates.length > selectedSketch.length)
    sketchCandidateLimitReached = true;

  // Retain sampled candidates before their context so ancestors and early
  // siblings cannot consume the output budget ahead of later samples.
  const primaryCandidates = [
    ...selectedSketch,
    ...selectedFocus,
    ...selectedStructure,
  ];
  const relevant = new Set<Element>(primaryCandidates);
  for (const candidate of primaryCandidates)
    if (candidate.parentElement) relevant.add(candidate.parentElement);
  for (const candidate of candidates) relevant.add(candidate);
  for (const candidate of candidates) {
    relevant.add(candidate);
    let ancestor = candidate.parentElement;
    let depth = 0;
    while (ancestor && depth < limits.maxDepth) {
      relevant.add(ancestor);
      const parent = ancestor.parentElement;
      if (!parent) break;
      for (const sibling of Array.from(parent.children).slice(
        0,
        limits.maxSiblings,
      ))
        relevant.add(sibling);
      if (ancestor === root) break;
      ancestor = parent;
      depth += 1;
    }
  }
  const ordered = Array.from(relevant).filter(
    (element) => element === root || root.contains(element),
  );
  if (ordered.length > limits.maxOutputNodes) outputLimitReached = true;
  const selected = ordered.slice(0, limits.maxOutputNodes);
  const selectedSet = new Set(selected);
  const indexOf = new Map(selected.map((element, index) => [element, index]));
  let nodes = selected.map((element, nodeIndex) => {
    const parent = element.parentElement;
    const position = boundsOf(element);
    return {
      nodeIndex,
      parentIndex:
        parent && selectedSet.has(parent)
          ? (indexOf.get(parent) ?? null)
          : null,
      childIndexes: Array.from(element.children)
        .filter((child) => selectedSet.has(child))
        .map((child) => indexOf.get(child))
        .filter((index): index is number => index !== undefined),
      tag: tagNames.includes(element.tagName.toUpperCase())
        ? element.tagName.toUpperCase()
        : 'OTHER',
      label: safeLabelOf(element),
      role: roleOf(element),
      aria: {
        expanded: boolOf(element, 'expanded'),
        selected: boolOf(element, 'selected'),
        disabled: boolOf(element, 'disabled'),
        hidden: boolOf(element, 'hidden'),
      },
      accessibility: {
        nameAttributePresent:
          element.hasAttribute('aria-label') ||
          element.hasAttribute('aria-labelledby') ||
          element.hasAttribute('title'),
        nativeDisabledAttributePresent: element.hasAttribute('disabled'),
        roleAttributePresent: element.hasAttribute('role'),
        tabIndexAttributePresent: element.hasAttribute('tabindex'),
      },
      visibility: position.visibility,
      clipping: position.clipping,
      bounds: position.bounds,
    };
  });

  const scan = () => ({
    visitedElements,
    recognizedLabelCount,
    accessibleNameCount,
    roleAttributeCount,
    nativeControlCount,
    nodeLimitReached,
    candidateLimitReached,
    sketchCandidateLimitReached,
    depthLimitReached,
    outputLimitReached,
    status:
      nodeLimitReached ||
      candidateLimitReached ||
      depthLimitReached ||
      outputLimitReached
        ? 'INCOMPLETE_CAPTURE'
        : 'COMPLETE',
  });
  const size = () =>
    new TextEncoder().encode(JSON.stringify({ nodes, scan: scan() }))
      .byteLength;
  if (size() > limits.maxOutputBytes) {
    outputLimitReached = true;
    while (nodes.length > 1 && size() > limits.maxOutputBytes) {
      nodes.pop();
      const remainingIndexes = new Set(nodes.map((node) => node.nodeIndex));
      for (const node of nodes) {
        if (
          node.parentIndex !== null &&
          !remainingIndexes.has(node.parentIndex)
        )
          node.parentIndex = null;
        node.childIndexes = node.childIndexes.filter((childIndex) =>
          remainingIndexes.has(childIndex),
        );
      }
    }
    if (size() > limits.maxOutputBytes) nodes = [];
  }
  const visible = nodes.filter(
    (node) => node.visibility === 'VISIBLE' || node.visibility === 'PARTIAL',
  );
  const has = (label: string) => visible.some((node) => node.label === label);
  const menuVisible = visible.some(
    (node) => node.role === 'MENU' || node.role === 'MENUITEM',
  );
  let domState = 'UNKNOWN';
  if (!nodeLimitReached && !outputLimitReached) {
    if (has('Finish Sketch')) domState = 'SKETCH_CONTROLS_VISIBLE';
    else if (has('Sketch') || has('Start sketch') || has('Create sketch'))
      domState = 'SKETCH_COMMAND_VISIBLE';
    // Menu roles stay independently visible in the sanitized node records.
    else if (menuVisible) domState = 'MENU_VISIBLE';
    else if (has('Top')) domState = 'TOP_LABEL_VISIBLE';
    else if (has('Rectangle')) domState = 'RECTANGLE_TRIGGER_VISIBLE';
    else if (has('Part Studio')) domState = 'PART_STUDIO_CONTROLS_VISIBLE';
  }

  return { nodes, scan: scan(), domState };
}
