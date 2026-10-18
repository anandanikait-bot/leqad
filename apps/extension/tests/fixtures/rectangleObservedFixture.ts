export const OWNER_OBSERVED_RECTANGLE_STATES = {
  A: {
    commandIds: ['LINESEGMENT', 'RECTANGLE_TWO_CORNERS'],
    rectangleFace: 'RECTANGLE_TWO_CORNERS',
    arrowRelation: 'SAME_PARENT',
    eligibility: 'UNKNOWN',
    coverage: 'INCOMPLETE',
  },
  B: {
    commandIds: [
      'RECTANGLE_TWO_CORNERS',
      'RECTANGLE_CENTER',
      'RECTANGLE_ALIGNED',
    ],
    menuPlacement: 'NESTED_IN_TOOLBAR',
    menuOwnership: 'UNKNOWN',
    coverage: 'INCOMPLETE',
  },
  C: {
    commandIds: ['RECTANGLE_CENTER'],
    rectangleFace: 'RECTANGLE_CENTER',
    arrowRelation: 'SAME_PARENT',
    eligibility: 'UNKNOWN',
    coverage: 'INCOMPLETE',
  },
  D: {
    commandIds: ['newSketch', 'extrude'],
    rectangleFace: null,
    coverage: 'INCOMPLETE',
  },
} as const;

export type RectangleObservedState =
  keyof typeof OWNER_OBSERVED_RECTANGLE_STATES;

export interface RectangleObservedFixtureOptions {
  /** Synthetic negative condition. It was not established by the owner report. */
  condition?: 'hidden' | 'disabled' | 'duplicate';
}

export interface RectangleObservedFixture {
  arrow: HTMLElement | null;
  face: HTMLElement | null;
  group: HTMLElement | null;
  toolbar: HTMLElement;
  openMenu: (placement: 'group' | 'toolbar' | 'portal') => HTMLElement;
  replaceArrow: () => HTMLElement | null;
}

function bounds(element: Element, rect: DOMRect) {
  element.getBoundingClientRect = () => rect;
}

function command(
  root: Document,
  parent: Element,
  commandId: string,
  rect: DOMRect,
) {
  const element = root.createElement('div');
  element.setAttribute('command-id', commandId);
  bounds(element, rect);
  parent.append(element);
  return element;
}

/**
 * Test-only DOM built from the owner's summarized command observations.
 *
 * The toolbar marker, command IDs, same-parent A/C arrow relationship and
 * toolbar-nested B menu come from that summary. Pixel bounds, click behavior,
 * negative conditions, B's face/group/arrow scaffold and any menu-to-group
 * ownership are synthetic additions.
 */
export function mountRectangleObservedFixture(
  root: Document,
  state: RectangleObservedState,
  options: RectangleObservedFixtureOptions = {},
): RectangleObservedFixture {
  const toolbar = root.createElement('div');
  toolbar.className = 'os-element-toolbar';
  bounds(toolbar, new DOMRect(40, 40, 260, 32));
  root.body.append(toolbar);

  let group: HTMLElement | null = null;
  let face: HTMLElement | null = null;
  let arrow: HTMLElement | null = null;

  if (state === 'D') {
    command(root, toolbar, 'newSketch', new DOMRect(44, 44, 32, 24));
    command(root, toolbar, 'extrude', new DOMRect(80, 44, 32, 24));
  } else {
    if (state === 'A')
      command(root, toolbar, 'LINESEGMENT', new DOMRect(44, 44, 32, 24));
    group = root.createElement('div');
    bounds(group, new DOMRect(60, 40, 46, 24));
    const faceId = state === 'C' ? 'RECTANGLE_CENTER' : 'RECTANGLE_TWO_CORNERS';
    face = command(root, group, faceId, new DOMRect(60, 40, 32, 24));
    arrow = root.createElement('div');
    arrow.className = 'dropdown-arrow';
    bounds(arrow, new DOMRect(92, 40, 14, 24));
    group.append(arrow);
    toolbar.append(group);

    if (options.condition === 'hidden') face.hidden = true;
    if (options.condition === 'disabled')
      face.setAttribute('aria-disabled', 'true');
    if (options.condition === 'duplicate')
      command(root, toolbar, faceId, new DOMRect(112, 40, 32, 24));
  }

  const openMenu = (placement: 'group' | 'toolbar' | 'portal') => {
    const menu = root.createElement('div');
    menu.className = 'os-tool-dropdown-content';
    bounds(menu, new DOMRect(60, 68, 140, 72));
    for (const [index, commandId] of [
      'RECTANGLE_TWO_CORNERS',
      'RECTANGLE_CENTER',
      'RECTANGLE_ALIGNED',
    ].entries())
      command(root, menu, commandId, new DOMRect(60, 68 + index * 24, 140, 24));
    if (placement === 'group') group?.append(menu);
    else if (placement === 'toolbar') toolbar.append(menu);
    else root.body.append(menu);
    return menu;
  };

  if (state === 'B') openMenu('toolbar');

  return {
    get arrow() {
      return arrow;
    },
    face,
    group,
    toolbar,
    openMenu,
    replaceArrow() {
      if (!arrow?.parentElement) return null;
      const replacement = arrow.cloneNode(true) as HTMLElement;
      bounds(replacement, new DOMRect(92, 40, 14, 24));
      arrow.replaceWith(replacement);
      arrow = replacement;
      return replacement;
    },
  };
}
