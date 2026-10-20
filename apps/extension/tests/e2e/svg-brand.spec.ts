import { readFileSync } from 'node:fs';
import { expect, test } from '@playwright/test';

const root = 'apps/extension/src/assets/brand';
const uri = (path: string, type = 'svg+xml') =>
  `data:image/${type};base64,${readFileSync(path).toString('base64')}`;

for (const size of [16, 24, 32, 48]) {
  test(`approved SVG retains separate field, frame and center at ${size}px`, async ({
    page,
  }) => {
    await page.setContent(
      `<img width="${size}" height="${size}" src="${uri(`${root}/leqad-primary.svg`)}">`,
    );
    const colors = await page.locator('img').evaluate(async (element) => {
      const image = element as HTMLImageElement;
      await image.decode();
      const canvas = document.createElement('canvas');
      canvas.width = image.width;
      canvas.height = image.height;
      const context = canvas.getContext('2d')!;
      context.drawImage(image, 0, 0, image.width, image.height);
      return [0.1, 0.25, 0.5].map((fraction) => {
        const pixel = Math.floor(image.width * fraction);
        return Array.from(context.getImageData(pixel, pixel, 1, 1).data);
      });
    });
    expect(colors).toEqual([
      [14, 41, 67, 255],
      [245, 239, 231, 255],
      [183, 75, 33, 255],
    ]);
  });
}

for (const browser of ['chrome', 'edge']) {
  test(`${browser} manifest uses PNG derivatives of the current master`, () => {
    const output = `apps/extension/.output/${browser}-mv3`;
    const manifest = JSON.parse(
      readFileSync(`${output}/manifest.json`, 'utf8'),
    ) as { icons: Record<string, string> };
    for (const size of [16, 32, 48, 128]) {
      expect(readFileSync(`${output}/${manifest.icons[size]}`)).toEqual(
        readFileSync(`apps/extension/public/icon/${size}.png`),
      );
    }
  });
}
