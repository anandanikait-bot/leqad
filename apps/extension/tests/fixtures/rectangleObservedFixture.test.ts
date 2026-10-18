import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureRectangleCommandMetadata,
  createRectangleMenuMetadataCapture,
} from '../../src/services/rectangleCommandMetadataCapture';
import { createTargetHighlight } from '../../src/services/semanticTargets';
import {
  OWNER_OBSERVED_RECTANGLE_STATES,
  mountRectangleObservedFixture,
} from './rectangleObservedFixture';

// This suite is SIMULATED. The constant preserves the owner's summarized live
// observations, while the DOM geometry and negative variants are test inputs.
// A passing test is never authenticated Onshape evidence.
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
  vi.useRealTimers();
});

describe('owner-observed Rectangle facts', () => {
  it('keeps observed facts and unresolved fields explicit', () => {
    expect(OWNER_OBSERVED_RECTANGLE_STATES).toMatchObject({
      A: {
        commandIds: ['LINESEGMENT', 'RECTANGLE_TWO_CORNERS'],
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
        arrowRelation: 'SAME_PARENT',
        eligibility: 'UNKNOWN',
        coverage: 'INCOMPLETE',
      },
      D: {
        commandIds: ['newSketch', 'extrude'],
        rectangleFace: null,
        coverage: 'INCOMPLETE',
      },
    });
  });
});

describe('simulated offline Rectangle compatibility matrix', () => {
  it.each([
    ['A', 'RECTANGLE_TWO_CORNERS'],
    ['C', 'RECTANGLE_CENTER'],
  ] as const)(
    'resolves State %s command identity and same-parent arrow without proving Sketch',
    (state, commandId) => {
      mountRectangleObservedFixture(document, state);

      const snapshot = captureRectangleCommandMetadata(
        document,
        state === 'A' ? 'SKETCH_EDITING' : 'OTHER_RECTANGLE_VARIANT',
        state === 'A' ? 1 : 3,
      );

      expect(snapshot.commands).toContainEqual(
        expect.objectContaining({ commandId, location: 'TOOLBAR' }),
      );
      expect(snapshot.ownership).toContainEqual(
        expect.objectContaining({
          faceCommandId: commandId,
          arrowRelation: 'SAME_PARENT',
        }),
      );
      expect(snapshot.activeSketchState).toBe('UNKNOWN');
    },
  );

  it('retains the observed State B menu as unowned', () => {
    mountRectangleObservedFixture(document, 'B');

    const snapshot = captureRectangleCommandMetadata(
      document,
      'RECTANGLE_MENU_OPEN',
      2,
    );

    expect(
      snapshot.commands
        .filter(({ location }) => location === 'MENU')
        .map(({ commandId }) => commandId)
        .sort(),
    ).toEqual([
      'RECTANGLE_ALIGNED',
      'RECTANGLE_CENTER',
      'RECTANGLE_TWO_CORNERS',
    ]);
    expect(snapshot.ownership[0]).toMatchObject({
      menuAssociation: 'NOT_ESTABLISHED',
    });
    expect(snapshot.activeSketchState).toBe('UNKNOWN');
  });

  it.each(['hidden', 'disabled', 'duplicate'] as const)(
    'abstains when the simulated control is %s',
    (condition) => {
      mountRectangleObservedFixture(document, 'A', { condition });

      const snapshot = captureRectangleCommandMetadata(
        document,
        'SKETCH_EDITING',
        1,
      );

      expect(snapshot.identity).not.toBe('OBSERVED');
      expect(snapshot.activeSketchState).toBe('UNKNOWN');
    },
  );

  it('does not attribute a menu after the simulated arrow is replaced', async () => {
    vi.useFakeTimers();
    const fixture = mountRectangleObservedFixture(document, 'A');
    const task = createRectangleMenuMetadataCapture(document, 2, 1_000);
    await Promise.resolve();

    fixture.arrow!.dispatchEvent(
      new PointerEvent('pointerdown', { bubbles: true }),
    );
    fixture.replaceArrow();
    fixture.openMenu('group');
    await vi.advanceTimersByTimeAsync(100);

    expect((await task.promise).snapshot.interaction).toMatchObject({
      origin: 'RECTANGLE_ARROW_CANDIDATE',
      menuAssociation: 'UNKNOWN',
    });
  });

  it('keeps the simulated Extrude state negative for Rectangle and Sketch', () => {
    mountRectangleObservedFixture(document, 'D');

    const snapshot = captureRectangleCommandMetadata(
      document,
      'EXTRUDE_EDITING',
      4,
    );

    expect(snapshot.commands.map(({ commandId }) => commandId)).toEqual([
      'newSketch',
      'extrude',
    ]);
    expect(snapshot.ownership).toEqual([]);
    expect(snapshot.activeSketchState).toBe('UNKNOWN');
  });

  it('positions the existing overlay around only the simulated arrow bounds', () => {
    const fixture = mountRectangleObservedFixture(document, 'A');
    const highlight = createTargetHighlight(fixture.arrow!, document.body);

    expect(highlight.element.style.left).toBe('89px');
    expect(highlight.element.style.top).toBe('37px');
    expect(highlight.element.style.width).toBe('20px');
    expect(highlight.element.style.height).toBe('30px');
    expect(highlight.element.style.pointerEvents).toBe('none');
    highlight.remove();
  });
});
