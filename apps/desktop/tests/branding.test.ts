// @vitest-environment node
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { expect, it } from 'vitest';
import provenance from '../src/assets/brand/provenance.json';
it('retains all four official main-branch vector masters without path or palette edits', () => {
  expect(Object.keys(provenance.sha256)).toHaveLength(4);
  for (const [name, digest] of Object.entries(provenance.sha256)) {
    const bytes = readFileSync(
      new URL('../src/assets/brand/' + name, import.meta.url),
    );
    expect(createHash('sha256').update(bytes).digest('hex')).toBe(digest);
    expect(bytes.toString()).toContain('#793327');
    expect(bytes.toString()).not.toMatch(
      /<image|<filter|<linearGradient|<radialGradient/,
    );
  }
});
