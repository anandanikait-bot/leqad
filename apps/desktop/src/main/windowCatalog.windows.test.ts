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
      const minimal = {
        SystemRoot: root,
        WINDIR: root,
        TEMP: process.env.TEMP,
        TMP: process.env.TMP,
      };
      for (const mode of [
        'module-path',
        'encoded',
        'inherited-environment',
      ] as const) {
        const started = Date.now();
        try {
          const scan = createWindowsMetadataScanner(async (script) => {
            const env =
              mode === 'inherited-environment'
                ? process.env
                : mode === 'module-path'
                  ? {
                      ...minimal,
                      PSModulePath: path.join(
                        root,
                        'System32',
                        'WindowsPowerShell',
                        'v1.0',
                        'Modules',
                      ),
                    }
                  : minimal;
            const transport =
              mode === 'encoded'
                ? [
                    '-EncodedCommand',
                    Buffer.from(script, 'utf16le').toString('base64'),
                  ]
                : ['-Command', script];
            const { stdout } = await promisify(execFile)(
              path.join(
                root,
                'System32',
                'WindowsPowerShell',
                'v1.0',
                'powershell.exe',
              ),
              ['-NoLogo', '-NoProfile', '-NonInteractive', ...transport],
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
            'NATIVE_BOUNDARY_PROBE',
            JSON.stringify({
              mode,
              result: 'returned',
              incomplete: result.incomplete,
              elapsedMs: Date.now() - started,
            }),
          );
        } catch {
          console.log(
            'NATIVE_BOUNDARY_PROBE',
            JSON.stringify({
              mode,
              result: 'failed',
              elapsedMs: Date.now() - started,
            }),
          );
        }
      }
      throw new Error(
        'Production native metadata query failed; fixed diagnostic outcomes above contain no native identifiers',
      );
    }
  },
  90000,
);
