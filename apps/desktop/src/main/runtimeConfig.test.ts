import path from 'node:path';
import { tmpdir } from 'node:os';
import { describe, expect, it } from 'vitest';
import {
  createTrustedRendererUrlCheck,
  resolveDevServerUrl,
  resolveTestUserDataPath,
} from './runtimeConfig';

describe('desktop runtime URL and profile boundaries', () => {
  it('accepts only localhost dev URLs without credentials or URL suffixes', () => {
    expect(resolveDevServerUrl('http://localhost:5197')).toBe(
      'http://localhost:5197/',
    );
    expect(resolveDevServerUrl('http://127.0.0.1:5197/')).toBe(
      'http://127.0.0.1:5197/',
    );
    expect(resolveDevServerUrl('http://[::1]:5197/')).toBe(
      'http://[::1]:5197/',
    );
    expect(() => resolveDevServerUrl('https://example.com')).toThrow(
      /localhost/i,
    );
    expect(() =>
      resolveDevServerUrl('http://user:pass@localhost:5197'),
    ).toThrow();
    expect(() =>
      resolveDevServerUrl('http://localhost:5197/?remote=1'),
    ).toThrow();
  });

  it('allows an isolated test profile only under the named temporary-directory boundary', () => {
    const root = tmpdir();
    const candidate = path.join(root, 'leqad-desktop-test-run-123');
    expect(resolveTestUserDataPath(candidate, '1', root)).toBe(
      path.resolve(candidate),
    );
    expect(() => resolveTestUserDataPath(candidate, '', root)).toThrow(
      /test mode/i,
    );
    expect(() =>
      resolveTestUserDataPath(
        path.join(root, '..', 'outside-profile'),
        '1',
        root,
      ),
    ).toThrow(/temporary/i);
    expect(() =>
      resolveTestUserDataPath(path.join(root, 'unrelated'), '1', root),
    ).toThrow(/prefix/i);
  });

  it('allows only the configured main renderer document for IPC and navigation', () => {
    const isTrusted = createTrustedRendererUrlCheck(
      'http://localhost:5197/',
      'file:///app/dist/renderer/index.html',
    );

    expect(isTrusted('http://localhost:5197/')).toBe(true);
    expect(isTrusted('http://localhost:5197/other')).toBe(false);
    expect(isTrusted('http://127.0.0.1:5197/')).toBe(false);
    expect(isTrusted('file:///app/dist/renderer/index.html')).toBe(true);
    expect(isTrusted('file:///app/dist/renderer/other.html')).toBe(false);
    expect(isTrusted('javascript:alert(1)')).toBe(false);
  });
});
