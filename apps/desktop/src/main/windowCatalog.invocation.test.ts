import { execFile, type ChildProcess } from 'node:child_process';
import { afterEach, expect, it, vi } from 'vitest';
import { createWindowsMetadataScanner } from './windowCatalog';

vi.mock('node:child_process', () => ({ execFile: vi.fn() }));
afterEach(() => {
  vi.unstubAllEnvs();
  vi.clearAllMocks();
});

it('preserves Windows compiler runtime paths without forwarding unrelated secrets', async () => {
  vi.stubEnv('SystemRoot', 'C:\\Windows');
  vi.stubEnv('PATH', 'C:\\Windows\\System32');
  vi.stubEnv('ComSpec', 'C:\\Windows\\System32\\cmd.exe');
  vi.stubEnv('LOCALAPPDATA', 'C:\\Users\\test\\AppData\\Local');
  vi.stubEnv('PSModuleAnalysisCachePath', 'C:\\PowerShellCache');
  vi.stubEnv('GH_TOKEN', 'private-test-token');
  let passedEnvironment: NodeJS.ProcessEnv = {};
  vi.mocked(execFile).mockImplementation((...args: unknown[]) => {
    passedEnvironment = (args[2] as { env: NodeJS.ProcessEnv }).env;
    (args[3] as (error: null, stdout: string) => void)(
      null,
      '{"incomplete":false,"windows":[]}',
    );
    return {} as ChildProcess;
  });
  await expect(createWindowsMetadataScanner()()).resolves.toEqual({
    incomplete: false,
    windows: [],
  });
  expect(passedEnvironment).toMatchObject({
    PATH: 'C:\\Windows\\System32',
    ComSpec: 'C:\\Windows\\System32\\cmd.exe',
    LOCALAPPDATA: 'C:\\Users\\test\\AppData\\Local',
  });
  expect(passedEnvironment.PSModuleAnalysisCachePath).toBe(
    'C:\\PowerShellCache',
  );
  expect(passedEnvironment).not.toHaveProperty('GH_TOKEN');
  expect(JSON.stringify(passedEnvironment)).not.toContain('private-test-token');
});
