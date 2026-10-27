import { describe, expect, it } from 'vitest';
import {
  parseCommand,
  PreferencesSchema,
  parseStoredLesson,
  EMPTY_SESSION,
} from './index';
describe('desktop trust boundary', () => {
  it('accepts only the closed supported commands', () => {
    expect(
      parseCommand({
        type: 'show',
        requestId: 'r',
        action: 'rectangle.corner',
        generation: 0,
      }).type,
    ).toBe('show');
    for (const type of [
      'cancel',
      'revoke',
      'disconnect',
      'reset-position',
      'close',
    ])
      expect(parseCommand({ type }).type).toBe(type);
  });
  it('rejects executable additions, arbitrary targets and invalid generations', () => {
    for (const value of [
      { type: 'execute', script: 'x' },
      { type: 'show', requestId: 'r', action: 'arbitrary', generation: 0 },
      { type: 'show', requestId: 'r', action: 'sketch.start', generation: -1 },
      { type: 'cancel', selector: 'button' },
      { type: 'select', windowToken: 'a'.repeat(129) },
      JSON.parse('{"type":"cancel","__proto__":{"admin":true}}'),
    ])
      expect(() => parseCommand(value)).toThrow();
  });
  it('starts without visual capabilities or consent', () => {
    expect(EMPTY_SESSION.availableActions).toEqual([]);
    expect(EMPTY_SESSION.consent).toBe('off');
    expect(EMPTY_SESSION.token).toBeNull();
  });
  it('rejects unexpected preferences and unsupported scale', () => {
    expect(
      PreferencesSchema.safeParse({
        appearance: 'system',
        textScale: 3,
        keepVisible: true,
        reduceMotion: 'system',
      }).success,
    ).toBe(false);
  });
  it('rejects stored geometry verification and unknown step records', () => {
    expect(() =>
      parseStoredLesson({
        schemaVersion: 1,
        currentStep: 0,
        steps: [
          { status: 'COMPLETED', outcome: 'MODEL_VERIFIED', hintLevel: 0 },
        ],
      }),
    ).toThrow();
    expect(() =>
      parseStoredLesson({ schemaVersion: 1, currentStep: 99, steps: [] }),
    ).toThrow();
  });
});
