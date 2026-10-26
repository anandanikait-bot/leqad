import { describe, expect, it } from 'vitest';
import { createTrustedRendererUrlCheck, resolveDevServerUrl, resolveTestUserDataPath } from './runtimeConfig';

describe('desktop runtime URL and profile boundaries', () => {
  it('accepts only localhost dev URLs without credentials or URL suffixes', () => {
    expect(resolveDevServerUrl('http://localhost:5197')).toBe('http://localhost:5197/');
    expect(resolveDevServerUrl('http://127.0.0.1:5197/')).toBe('http://127.0.0.1:5197/');
    expect(resolveDevServerUrl('http://[::1]:5197/')).toBe('http://[::1]:5197/');
    expect(() => resolveDevServerUrl('https://example.com')).toThrow(/localhost/i);
    expect(() => resolveDevServerUrl('http://user:pass@localhost:5197')).toThrow();
    expect(() => resolveDevServerUrl('http://localhost:5197/?remote=1')).toThrow();
  });

  it('allows an isolated test profile only under the named temporary-directory boundary', () => {
    expect(resolveTestUserDataPath(
      '/tmp/leqad-desktop-test-run-123',
      '1',
      '/tmp',
    )).toBe('/tmp/leqad-desktop-test-run-123');
    expect(() => resolveTestUserDataPath('/tmp/leqad-desktop-test-run-123', '', '/tmp')).toThrow(/test mode/i);
    expect(() => resolveTestUserDataPath('/workspace/user-data', '1', '/tmp')).toThrow(/temporary/i);
    expect(() => resolveTestUserDataPath('/tmp/unrelated', '1', '/tmp')).toThrow(/prefix/i);
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
