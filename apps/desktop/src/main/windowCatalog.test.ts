import { describe, expect, it, vi } from 'vitest';
import {
  createWindowCatalogProvider,
  createWindowsMetadataScanner,
} from './windowCatalog';
import type { NativeWindowMetadata } from './windowCatalog';

const metadata = (
  overrides: Partial<NativeWindowMetadata> = {},
): NativeWindowMetadata => ({
  handle: '0x100',
  processId: 42,
  threadId: 7,
  processStart: 'start-1',
  application: 'Chrome',
  kind: 'browser',
  ...overrides,
});

describe('WindowCatalogProvider', () => {
  it('reports an unsupported platform without returning choices', async () => {
    const provider = createWindowCatalogProvider({ platform: 'linux' });

    expect(await provider.list()).toEqual({
      availability: 'unavailable',
      unavailableReason: 'unsupported',
      incomplete: false,
      windows: [],
    });
    expect(await provider.select('anything')).toBeNull();
    provider.dispose();
  });

  it('returns only short aliases and opaque tokens, then binds a live choice', async () => {
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => ({ windows: [metadata()], incomplete: false }),
    });

    const catalog = await provider.list();
    expect(catalog).toMatchObject({
      availability: 'available',
      unavailableReason: null,
      incomplete: false,
      windows: [{ application: 'Chrome', ordinal: 1, kind: 'browser' }],
    });
    expect(Object.keys(catalog.windows[0]!)).toEqual([
      'application',
      'ordinal',
      'kind',
      'token',
    ]);
    expect(catalog.windows[0]!.token).not.toContain('0x100');
    expect(catalog.windows[0]!.token.length).toBeLessThanOrEqual(128);

    const binding = await provider.select(catalog.windows[0]!.token);
    expect(binding).toMatchObject({
      token: catalog.windows[0]!.token,
      application: 'Chrome',
      ordinal: 1,
      kind: 'browser',
    });
    expect(binding && Object.keys(binding).sort()).toEqual([
      'application',
      'kind',
      'ordinal',
      'token',
    ]);
    expect(await provider.isCurrent(binding!)).toBe(true);
    provider.dispose();
  });

  it('parses only allowlisted native metadata and rejects title values', async () => {
    const scanWindows = createWindowsMetadataScanner(async () =>
      JSON.stringify({
        incomplete: false,
        windows: [
          {
            handle: '0x100',
            processId: 42,
            threadId: 7,
            processStart: 'start-1',
            application: 'Chrome',
            kind: 'browser',
          },
        ],
      }),
    );

    await expect(scanWindows()).resolves.toEqual({
      incomplete: false,
      windows: [metadata()],
    });
    const privateDataScan = createWindowsMetadataScanner(async () =>
      JSON.stringify({
        incomplete: false,
        windows: [{ ...metadata(), title: 'private CAD drawing' }],
      }),
    );
    await expect(privateDataScan()).rejects.toThrow(
      'Invalid Windows metadata response',
    );
  });

  it('marks incomplete metadata as incomplete and excludes inconsistent rows', async () => {
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => ({
        incomplete: false,
        windows: [
          metadata({ kind: 'native' }),
          metadata({
            handle: '0x200',
            application: 'FreeCAD',
            kind: 'native',
          }),
        ],
      }),
    });

    const catalog = await provider.list();
    expect(catalog.incomplete).toBe(true);
    expect(
      catalog.windows.map(({ application, ordinal, kind }) => ({
        application,
        ordinal,
        kind,
      })),
    ).toEqual([{ application: 'FreeCAD', ordinal: 1, kind: 'native' }]);
    provider.dispose();
  });

  it('invalidates a choice after observing its handle reused on another thread', async () => {
    let current = metadata();
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => ({ windows: [current], incomplete: false }),
    });
    const choice = (await provider.list()).windows[0]!;

    current = metadata({ threadId: 8 });
    expect(await provider.isCurrent(choice)).toBe(false);
    current = metadata();
    expect(await provider.isCurrent(choice)).toBe(false);
    expect(await provider.select(choice.token)).toBeNull();
    provider.dispose();
  });

  it('invalidates a choice when the provider cannot validate it', async () => {
    let fail = false;
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => {
        if (fail) throw new Error('private CAD title');
        return { windows: [metadata()], incomplete: false };
      },
    });
    const choice = (await provider.list()).windows[0]!;

    fail = true;
    expect(await provider.select(choice.token)).toBeNull();
    fail = false;
    expect(await provider.select(choice.token)).toBeNull();
    provider.dispose();
  });

  it('does not present duplicate native handles as separate choices', async () => {
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => ({
        incomplete: false,
        windows: [
          metadata(),
          metadata({ application: 'FreeCAD', kind: 'native' }),
        ],
      }),
    });

    const catalog = await provider.list();
    expect(catalog.incomplete).toBe(true);
    expect(catalog.windows.map(({ application }) => application)).toEqual([
      'Chrome',
    ]);
    provider.dispose();
  });

  it('returns an empty provider-failed catalog without exposing provider errors', async () => {
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => {
        throw new Error('private CAD drawing title');
      },
    });

    const catalog = await provider.list();
    expect(catalog).toEqual({
      availability: 'unavailable',
      unavailableReason: 'provider-failed',
      incomplete: false,
      windows: [],
    });
    expect(JSON.stringify(catalog)).not.toContain('private CAD drawing title');
    provider.dispose();
  });

  it('marks a choice unusable after its window closes', async () => {
    let windows = [metadata()];
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => ({ windows, incomplete: false }),
    });
    const choice = (await provider.list()).windows[0]!;

    windows = [];
    expect(await provider.select(choice.token)).toBeNull();
    windows = [metadata()];
    expect(await provider.select(choice.token)).toBeNull();
    provider.dispose();
  });

  it('caps a large catalog and marks the result incomplete', async () => {
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => ({
        incomplete: false,
        windows: Array.from({ length: 51 }, (_, index) =>
          metadata({ handle: `0x${index + 1}` }),
        ),
      }),
    });

    const catalog = await provider.list();
    expect(catalog.availability).toBe('available');
    expect(catalog.incomplete).toBe(true);
    expect(catalog.windows).toHaveLength(50);
    expect(catalog.windows[49]?.ordinal).toBe(50);
    provider.dispose();
  });

  it('expires window tokens after one minute', async () => {
    const clock = vi.spyOn(Date, 'now').mockReturnValue(1_000);
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => ({ windows: [metadata()], incomplete: false }),
    });
    const choice = (await provider.list()).windows[0]!;

    clock.mockReturnValue(61_000);
    expect(await provider.select(choice.token)).toBeNull();
    provider.dispose();
    clock.mockRestore();
  });

  it('does not publish an older scan after a newer list request', async () => {
    let resolveFirst: (scan: {
      windows: NativeWindowMetadata[];
      incomplete: boolean;
    }) => void = () => undefined;
    let call = 0;
    const current = metadata({
      handle: '0x200',
      processId: 43,
      threadId: 8,
      processStart: 'start-2',
    });
    const provider = createWindowCatalogProvider({
      platform: 'win32',
      scanWindows: async () => {
        call += 1;
        if (call === 1) {
          return new Promise((resolve) => {
            resolveFirst = resolve;
          });
        }
        return { windows: [current], incomplete: false };
      },
    });

    const olderRequest = provider.list();
    const newerRequest = provider.list();
    const newerCatalog = await newerRequest;
    resolveFirst({ windows: [metadata()], incomplete: false });
    const olderCatalog = await olderRequest;

    expect(newerCatalog.availability).toBe('available');
    expect(olderCatalog).toEqual({
      availability: 'unavailable',
      unavailableReason: 'provider-failed',
      incomplete: false,
      windows: [],
    });
    expect(
      await provider.select(newerCatalog.windows[0]!.token),
    ).not.toBeNull();
    provider.dispose();
  });
});
