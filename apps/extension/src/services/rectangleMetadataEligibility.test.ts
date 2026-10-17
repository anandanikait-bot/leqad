import { afterEach, describe, expect, it, vi } from 'vitest';
import { createMetadataEligibilityInspector } from './rectangleMetadataEligibility';

// Simulations of eligibility failure modes, not authenticated Onshape fixtures.
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});
function target(depth = 40) {
  let parent: HTMLElement = document.body;
  for (let index = 0; index < depth; index++) {
    const next = document.createElement('div');
    parent.append(next);
    parent = next;
  }
  const element = document.createElement('div');
  parent.append(element);
  element.getBoundingClientRect = () => new DOMRect(20, 20, 12, 24);
  Object.defineProperty(document, 'elementFromPoint', {
    configurable: true,
    value: vi.fn(() => element),
  });
  return element;
}
describe('diagnostic-only command eligibility', () => {
  it('establishes a deep valid control with one bounded cached ancestor pass', () => {
    const element = target();
    const style = vi.spyOn(window, 'getComputedStyle');
    const inspect = createMetadataEligibilityInspector(document);
    expect(inspect(element)).toMatchObject({
      visibility: 'VISIBLE',
      enabled: 'ENABLED',
      eligibility: 'ELIGIBLE',
      hitTest: 'TARGET',
      ancestorLimitReached: false,
    });
    inspect(element);
    expect(style.mock.calls.length).toBeLessThanOrEqual(45);
  });
  it.each(['hidden', 'disabled', 'inert'] as const)(
    'rejects a deep %s ancestor',
    (state) => {
      const element = target();
      const ancestor = document.body.firstElementChild!;
      if (state === 'hidden') ancestor.setAttribute('hidden', '');
      else
        ancestor.setAttribute(
          state === 'disabled' ? 'aria-disabled' : 'inert',
          'true',
        );
      expect(
        createMetadataEligibilityInspector(document)(element).eligibility,
      ).toBe('REJECTED');
    },
  );
  it('keeps visibility and enabledness unknown beyond the hard ancestry bound', () => {
    expect(
      createMetadataEligibilityInspector(document)(target(110)),
    ).toMatchObject({
      visibility: 'UNKNOWN',
      enabled: 'UNKNOWN',
      eligibility: 'UNKNOWN',
      ancestorLimitReached: true,
    });
  });
  it('rejects detached, zero-size, clipped, offscreen and obscured controls', () => {
    const element = target(1);
    const inspect = () => createMetadataEligibilityInspector(document)(element);
    element.remove();
    expect(inspect().eligibility).toBe('REJECTED');
    document.body.append(element);
    element.getBoundingClientRect = () => new DOMRect(0, 0, 0, 0);
    expect(inspect().visibility).toBe('ZERO_SIZE');
    element.getBoundingClientRect = () => new DOMRect(-20, 20, 12, 24);
    expect(inspect().visibility).toBe('OFFSCREEN');
    element.getBoundingClientRect = () => new DOMRect(-2, 20, 12, 24);
    expect(inspect().visibility).toBe('CLIPPED');
    element.getBoundingClientRect = () => new DOMRect(20, 20, 12, 24);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: () => document.body,
    });
    expect(inspect()).toMatchObject({
      hitTest: 'OTHER',
      eligibility: 'REJECTED',
    });
  });
  it('retains UNKNOWN when hit testing is unavailable', () => {
    const element = target(1);
    Object.defineProperty(document, 'elementFromPoint', {
      configurable: true,
      value: undefined,
    });
    expect(createMetadataEligibilityInspector(document)(element)).toMatchObject(
      { visibility: 'VISIBLE', hitTest: 'UNKNOWN', eligibility: 'UNKNOWN' },
    );
  });
});
