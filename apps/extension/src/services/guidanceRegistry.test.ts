import { describe, expect, it } from 'vitest';
import {
  GUIDANCE_ACTION_IDS,
  GUIDANCE_REGISTRY,
  GUIDANCE_TARGET_IDS,
  guidanceActionForSemanticTarget,
  validateGuidanceRequest,
} from './guidanceRegistry';

describe('closed guidance registry', () => {
  it('registers the four supported lesson actions with their exact group identities', () => {
    expect(GUIDANCE_ACTION_IDS).toEqual([
      'sketch',
      'rectangle-tool-group',
      'dimension',
      'finish-sketch',
    ]);
    expect(GUIDANCE_REGISTRY['rectangle-tool-group']).toMatchObject({
      actionId: 'rectangle-tool-group',
      targetId: 'rectangle-tool-group',
      semanticTarget: 'rectangle-dropdown',
      requiredContext: 'SKETCH_EDITING',
      supportedLevels: ['HINT', 'SHOW'],
      hintContentId: 'rectangle-tool-group',
    });
    expect(
      GUIDANCE_REGISTRY['rectangle-tool-group'].guideRecipe,
    ).toBeUndefined();
    expect(GUIDANCE_TARGET_IDS).not.toContain('corner-rectangle');
    expect(GUIDANCE_TARGET_IDS).not.toContain('corner-rectangle-option');
    expect(GUIDANCE_TARGET_IDS).not.toContain('aligned-rectangle');
    expect(
      GUIDANCE_REGISTRY['rectangle-tool-group'].requiredObservations,
    ).toEqual([{ observationId: 'SKETCH_UI_ACTIVE', expected: 'OPEN' }]);
    expect(
      Object.values(GUIDANCE_REGISTRY).every(
        (definition) => definition.hintAreaTargetId === undefined,
      ),
    ).toBe(true);
  });

  it('accepts only versioned action-and-level requests with no caller target or selector', () => {
    expect(
      validateGuidanceRequest({
        version: 1,
        actionId: 'rectangle-tool-group',
        level: 'SHOW',
      }),
    ).toEqual({
      version: 1,
      actionId: 'rectangle-tool-group',
      level: 'SHOW',
    });
    expect(
      validateGuidanceRequest({
        version: 1,
        actionId: 'rectangle-tool-group',
        level: 'SHOW',
        targetId: 'anything',
      }),
    ).toBeNull();
    expect(
      validateGuidanceRequest({
        version: 1,
        actionId: 'rectangle-tool-group',
        level: 'SHOW',
        selector: 'button',
      }),
    ).toBeNull();
    expect(
      validateGuidanceRequest({
        version: 1,
        actionId: 'rectangle-variant:aligned',
        level: 'GUIDE',
      }),
    ).toBeNull();
    expect(
      validateGuidanceRequest({
        version: 1,
        actionId: 'sketch',
        level: 'AUTO',
      }),
    ).toBeNull();
    expect(validateGuidanceRequest(null)).toBeNull();
  });

  it('maps only supported lesson semantic targets and leaves Top-plane guidance separate', () => {
    expect(guidanceActionForSemanticTarget('sketch')).toBe('sketch');
    expect(guidanceActionForSemanticTarget('rectangle')).toBe(
      'rectangle-tool-group',
    );
    expect(guidanceActionForSemanticTarget('dimension')).toBe('dimension');
    expect(guidanceActionForSemanticTarget('finish-sketch')).toBe(
      'finish-sketch',
    );
    expect(guidanceActionForSemanticTarget('top-plane')).toBeNull();
    expect(guidanceActionForSemanticTarget('other')).toBeNull();
  });
});
