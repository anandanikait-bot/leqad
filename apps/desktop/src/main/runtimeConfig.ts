import path from 'node:path';

const LOCALHOST_NAMES = new Set(['localhost', '127.0.0.1', '[::1]', '::1']);

export function resolveDevServerUrl(
  value: string | undefined,
): string | undefined {
  if (value === undefined) return undefined;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    throw new Error('LEQAD_DESKTOP_DEV_URL must be a valid localhost URL');
  }

  if (
    parsed.protocol !== 'http:' ||
    !LOCALHOST_NAMES.has(parsed.hostname.toLowerCase()) ||
    parsed.username !== '' ||
    parsed.password !== '' ||
    parsed.pathname !== '/' ||
    parsed.search !== '' ||
    parsed.hash !== ''
  ) {
    throw new Error(
      'LEQAD_DESKTOP_DEV_URL must use localhost without credentials, path, query, or fragment',
    );
  }
  return parsed.toString();
}

export function resolveTestUserDataPath(
  configuredPath: string | undefined,
  testMode: string | undefined,
  temporaryDirectory: string,
): string | undefined {
  if (configuredPath === undefined) return undefined;
  if (testMode !== '1') {
    throw new Error(
      'LEQAD_DESKTOP_USER_DATA is available only in desktop test mode',
    );
  }

  const root = path.resolve(temporaryDirectory);
  const resolved = path.resolve(configuredPath);
  const relative = path.relative(root, resolved);
  if (
    relative === '' ||
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative) ||
    path.dirname(resolved) !== root
  ) {
    throw new Error(
      'LEQAD_DESKTOP_USER_DATA must be a direct child of the temporary directory',
    );
  }
  if (!/^leqad-desktop-test-[a-zA-Z0-9_-]+$/.test(path.basename(resolved))) {
    throw new Error(
      'LEQAD_DESKTOP_USER_DATA must use the leqad-desktop-test- prefix',
    );
  }
  return resolved;
}

export function createTrustedRendererUrlCheck(
  devServerUrl: string | undefined,
  productionFileUrl: string,
): (value: string) => boolean {
  const production = new URL(productionFileUrl).toString();
  const development = devServerUrl ? new URL(devServerUrl) : undefined;

  return (value: string) => {
    if (value === production) return true;
    if (!development) return false;
    try {
      const candidate = new URL(value);
      return (
        candidate.protocol === development.protocol &&
        candidate.origin === development.origin &&
        candidate.pathname === development.pathname &&
        candidate.search === '' &&
        candidate.hash === ''
      );
    } catch {
      return false;
    }
  };
}
