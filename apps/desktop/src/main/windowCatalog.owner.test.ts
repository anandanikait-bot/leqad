import { expect, it } from 'vitest';
import { createWindowsMetadataScanner } from './windowCatalog';

it('uses the requested window owner exclusion when the observer runs in another process', async () => {
  const scan = createWindowsMetadataScanner(async (script) => {
    // A boolean assertion avoids exporting the observer's real process ID on failure.
    expect(script.includes('::Scan(12345)')).toBe(true);
    return '{"incomplete":false,"windows":[]}';
  }, 12345);
  await expect(scan()).resolves.toEqual({ incomplete: false, windows: [] });
});
