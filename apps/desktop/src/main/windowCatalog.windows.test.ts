import { expect, it } from 'vitest';
import { createWindowsMetadataScanner } from './windowCatalog';

// Executes the production subprocess and Win32 metadata query, without mocks.
// No returned native identities are logged or saved.
it.skipIf(process.platform !== 'win32')(
  'executes the actual Windows metadata query without a synthetic provider',
  async () => {
    const result = await createWindowsMetadataScanner()();
    expect(Array.isArray(result.windows)).toBe(true);
    expect(typeof result.incomplete).toBe('boolean');
  },
  15000,
);
