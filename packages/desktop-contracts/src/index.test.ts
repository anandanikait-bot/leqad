import { describe, expect, it } from 'vitest';
import {
  parseCommand,
  PreferencesSchema,
  parseStoredLesson,
  EMPTY_SESSION,
  parseSessionView,
  parseWindowCatalog,
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
      'use-written',
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
    expect(EMPTY_SESSION.selectedWindow).toBeNull();
  });
  it('keeps window catalog records to bounded aliases and opaque tokens', () => {
    const catalog = parseWindowCatalog({
      availability: 'available',
      unavailableReason: null,
      incomplete: false,
      windows: [
        {
          token: 'opaque-window-token',
          application: 'Chrome',
          ordinal: 1,
          kind: 'browser',
        },
      ],
    });

    expect(catalog.windows[0]).toEqual({
      token: 'opaque-window-token',
      application: 'Chrome',
      ordinal: 1,
      kind: 'browser',
    });
    expect(() =>
      parseWindowCatalog({
        ...catalog,
        windows: [{ ...catalog.windows[0], title: 'Private document' }],
      }),
    ).toThrow();
    expect(() =>
      parseWindowCatalog({
        ...catalog,
        windows: [{ ...catalog.windows[0], application: 'My CAD file' }],
      }),
    ).toThrow();
    expect(() =>
      parseWindowCatalog({
        availability: 'available',
        unavailableReason: null,
        incomplete: false,
        windows: Array.from({ length: 51 }, (_, index) => ({
          token: `window-${index}`,
          application: 'Other app',
          ordinal: index + 1,
          kind: 'other',
        })),
      }),
    ).toThrow();
  });
  it('keeps selected window labels safe and never accepts grant state in M2', () => {
    const view = parseSessionView({
      ...EMPTY_SESSION,
      binding: 'selected',
      selectedWindow: {
        application: 'Microsoft Edge',
        ordinal: 2,
        kind: 'browser',
      },
    });

    expect(view.selectedWindow).toEqual({
      application: 'Microsoft Edge',
      ordinal: 2,
      kind: 'browser',
    });
    expect(() =>
      parseSessionView({
        ...view,
        selectedWindow: {
          ...view.selectedWindow,
          title: 'Sensitive document name',
        },
      }),
    ).toThrow();
    expect(() =>
      parseSessionView({ ...view, consent: 'on-request' }),
    ).toThrow();
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
