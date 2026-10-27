import { describe, expect, it } from 'vitest';
import { FOUNDATIONS_FIRST_SKETCH } from '@leqad/lesson-engine';
import { DESKTOP_STEP_COPY } from './desktopCopy';

describe('desktop-only beginner lesson copy', () => {
  it('covers all eight original step identities using presentation fields only', () => {
    expect(Object.keys(DESKTOP_STEP_COPY)).toEqual(
      FOUNDATIONS_FIRST_SKETCH.steps.map((s) => s.id),
    );
    for (const step of FOUNDATIONS_FIRST_SKETCH.steps) {
      const copy = DESKTOP_STEP_COPY[step.id];
      expect(Object.keys(copy).sort()).toEqual(
        [
          'heading',
          'goal',
          'action',
          'explanation',
          'hints',
          'commonErrors',
          'recoveryActions',
        ].sort(),
      );
      expect(copy.hints).toHaveLength(5);
      expect(copy.explanation.split(/\s+/).length).toBeLessThanOrEqual(40);
      expect(copy.commonErrors).toHaveLength(step.commonErrors.length);
      expect(copy.recoveryActions).toHaveLength(step.recoveryActions.length);
      expect(
        copy.explanation.match(/[.!?](?:\s|$)/g)?.length,
      ).toBeLessThanOrEqual(2);
    }
  });
  it('preserves exact tools, opposite corner clicks, measurements and flat-versus-solid teaching', () => {
    const rectangle = DESKTOP_STEP_COPY['draw-rectangle'];
    expect(rectangle.action).toMatch(
      /arrow beside Rectangle.*Choose Corner Rectangle/,
    );
    expect(rectangle.action).toMatch(/first corner.*opposite corner/);
    expect(rectangle.explanation).toContain('Center Point Rectangle');
    expect(rectangle.explanation).toContain('Aligned Rectangle');
    expect(DESKTOP_STEP_COPY['apply-dimensions'].action).toMatch(
      /Dimension.*40 mm.*30 mm/,
    );
    expect(DESKTOP_STEP_COPY['understand-result'].explanation).toMatch(
      /flat.*Extrude.*solid/,
    );
  });
  it('uses manual Top troubleshooting and a practice rationale without capability promises', () => {
    expect(DESKTOP_STEP_COPY['select-reference-plane'].hints[4]).toMatch(
      /scroll.*list.*Default geometry/,
    );
    expect(DESKTOP_STEP_COPY['select-reference-plane'].hints[4]).not.toMatch(
      /highlight|unavailable|Leqad/,
    );
    expect(DESKTOP_STEP_COPY['independent-practice'].explanation).toMatch(
      /remember.*tools.*get stuck/,
    );
    expect(DESKTOP_STEP_COPY['independent-practice'].explanation).not.toMatch(
      /verif|check|Mark done|report/,
    );
    expect(JSON.stringify(DESKTOP_STEP_COPY)).not.toMatch(
      /Show me|Leqad checks|Leqad can observe/,
    );
  });
});
