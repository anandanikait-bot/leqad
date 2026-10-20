import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { describe, expect, it } from 'vitest';

const root = resolve('apps/extension/src/assets/brand');
const read = (name: string) => readFileSync(resolve(root, name), 'utf8');
const digest = (data: string | Buffer) =>
  createHash('sha256').update(data).digest('hex');

describe('immutable owner SVG branding', () => {
  it('preserves the exact uploaded source and primary geometry', () => {
    const source = read('Leqad_Original_Left_Faithful.svg');
    expect(digest(source)).toBe(
      '1d96263cd3f9c4e1446080e37156a45f69e78cfeaab6d6cf8765f9789c4a0eee',
    );
    expect(read('leqad-primary.svg')).toBe(source);
  });
  it.each([
    ['primary', '#0E2943', '#B74B21'],
    ['black', '#191919', '#A49A8E'],
    ['grey', '#55514D', '#A49A8E'],
  ])(
    '%s changes only the palette, with no raster or font dependencies',
    (variant, outer, center) => {
      const source = read('Leqad_Original_Left_Faithful.svg');
      const svg = read(`leqad-${variant}.svg`);
      expect(svg).toBe(
        source.replaceAll('#0E2943', outer).replaceAll('#B74B21', center),
      );
      expect(svg).toContain('fill="#F5EFE7"');
      expect(svg).not.toMatch(
        /<(image|text|filter|linearGradient|radialGradient)\b|\b(rx|ry|transform)=/,
      );
    },
  );
  it('records generated icon provenance and verifies distribution bytes', () => {
    const manifest = JSON.parse(read('generated-icons.json')) as {
      sourceSha256: string;
      icons: Record<string, string>;
    };
    expect(manifest.sourceSha256).toBe(digest(read('leqad-primary.svg')));
    for (const size of [16, 32, 48, 128]) {
      const png = readFileSync(
        resolve('apps/extension/public/icon', `${size}.png`),
      );
      expect(png.readUInt32BE(16)).toBe(size);
      expect(png.readUInt32BE(20)).toBe(size);
      expect(digest(png)).toBe(manifest.icons[String(size)]);
    }
  });
});
