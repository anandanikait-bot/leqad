import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import path from 'node:path';
import { expect, it } from 'vitest';
import { createWindowsMetadataScanner } from './windowCatalog';

it.skipIf(process.platform !== 'win32')(
  'executes the actual Windows metadata query without a synthetic provider',
  async () => {
    try {
      const result = await createWindowsMetadataScanner()();
      expect(Array.isArray(result.windows)).toBe(true);
      expect(typeof result.incomplete).toBe('boolean');
    } catch {
      const root = process.env.SystemRoot!;
      const base: NodeJS.ProcessEnv = { SystemRoot: root, WINDIR: root };
      for (const key of [
        'TEMP',
        'TMP',
        'PATH',
        'PATHEXT',
        'ComSpec',
        'SystemDrive',
        'USERPROFILE',
        'LOCALAPPDATA',
        'APPDATA',
        'ProgramFiles',
        'ProgramFiles(x86)',
        'ProgramW6432',
        'CommonProgramFiles',
        'CommonProgramFiles(x86)',
        'CommonProgramW6432',
      ])
        if (process.env[key]) base[key] = process.env[key];
      base.PSModulePath = path.join(
        root,
        'System32',
        'WindowsPowerShell',
        'v1.0',
        'Modules',
      );
      for (const [mode, keys] of [
        ['module-cache', ['PSModuleAnalysisCachePath']],
        ['home-paths', ['HOMEDRIVE', 'HOMEPATH']],
        [
          'remaining-runtime',
          [
            'ALLUSERSPROFILE',
            'ProgramData',
            'PUBLIC',
            'OS',
            'NUMBER_OF_PROCESSORS',
            'PROCESSOR_ARCHITECTURE',
            'PROCESSOR_IDENTIFIER',
            'PROCESSOR_LEVEL',
            'PROCESSOR_REVISION',
            'PSModuleAnalysisCachePath',
            'HOMEDRIVE',
            'HOMEPATH',
            'DOTNET_ROOT',
            'DOTNET_ROOT_X64',
            'DOTNET_MULTILEVEL_LOOKUP',
            'PSModulePath',
          ],
        ],
      ] as const) {
        const env = { ...base };
        for (const key of keys)
          if (process.env[key]) env[key] = process.env[key];
        const started = Date.now();
        try {
          const scan = createWindowsMetadataScanner(async (script) => {
            const { stdout } = await promisify(execFile)(
              path.join(
                root,
                'System32',
                'WindowsPowerShell',
                'v1.0',
                'powershell.exe',
              ),
              ['-NoLogo', '-NoProfile', '-NonInteractive', '-Command', script],
              {
                env,
                encoding: 'utf8',
                windowsHide: true,
                timeout: 15000,
                maxBuffer: 1048576,
              },
            );
            return stdout;
          });
          const result = await scan();
          console.log(
            'NATIVE_RUNTIME_PROBE',
            JSON.stringify({
              mode,
              result: 'returned',
              incomplete: result.incomplete,
              elapsedMs: Date.now() - started,
            }),
          );
        } catch {
          console.log(
            'NATIVE_RUNTIME_PROBE',
            JSON.stringify({
              mode,
              result: 'failed',
              elapsedMs: Date.now() - started,
            }),
          );
        }
      }
      throw new Error(
        'Production native metadata query failed; no native identifiers or environment values were exported',
      );
    }
  },
  90000,
);
