import { describe, expect, it } from 'vitest';
import { getOnshapeNativeSearchGuidance } from './nativeSearchGuidance';

describe('Onshape native search guidance registry', () => {
  it('only exposes the owner-tested exact Corner rectangle entry', () => {
    expect(
      getOnshapeNativeSearchGuidance('rectangle-tool-group'),
    ).toMatchObject({
      platform: 'onshape',
      commandName: 'Corner rectangle',
      requiredContext: 'SKETCH_EDITING',
      shortcut: { windows: 'Alt + C', macOS: 'Option + C' },
    });
    expect(getOnshapeNativeSearchGuidance('sketch')).toBeNull();
    expect(getOnshapeNativeSearchGuidance('dimension')).toBeNull();
    expect(getOnshapeNativeSearchGuidance('finish-sketch')).toBeNull();
  });

  it('explains the exact command and distinguishes the other rectangle variants', () => {
    const guidance = getOnshapeNativeSearchGuidance('rectangle-tool-group');
    expect(guidance?.commandName).toBe('Corner rectangle');
    expect(guidance?.instructions.join(' ')).toContain(
      'Highlight tool in toolbar',
    );
    expect(guidance?.distinction).toContain('Center point rectangle');
    expect(guidance?.distinction).toContain('Aligned Rectangle');
  });
});
