import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { chromium } from '@playwright/test';

const root = 'apps/extension/src/assets/brand';
const source = readFileSync(`${root}/Leqad_Original_Left_Faithful.svg`, 'utf8');
const hash = (bytes) => createHash('sha256').update(bytes).digest('hex');
for (const [name, outer, center] of [
  ['primary', '#0E2943', '#B74B21'],
  ['black', '#191919', '#A49A8E'],
  ['grey', '#55514D', '#A49A8E'],
]) {
  writeFileSync(
    `${root}/leqad-${name}.svg`,
    source.replaceAll('#0E2943', outer).replaceAll('#B74B21', center),
  );
}
// Existing Playwright renderer; no additional image library or source transformation.
const browser = await chromium.launch({
  ...(existsSync('/usr/bin/chromium')
    ? { executablePath: '/usr/bin/chromium' }
    : {}),
  args: ['--no-sandbox'],
});
try {
  const page = await browser.newPage({ deviceScaleFactor: 1 });
  const icons = {};
  mkdirSync('apps/extension/public/icon', { recursive: true });
  for (const size of [16, 32, 48, 128]) {
    await page.setViewportSize({ width: size, height: size });
    await page.setContent(
      `<style>html,body{margin:0}img{display:block}</style><img width="${size}" height="${size}" src="data:image/svg+xml;base64,${Buffer.from(source).toString('base64')}">`,
    );
    await page.locator('img').evaluate((image) => image.decode());
    const png = await page.screenshot({ animations: 'disabled', scale: 'css' });
    writeFileSync(`apps/extension/public/icon/${size}.png`, png);
    icons[size] = hash(png);
  }
  writeFileSync(
    `${root}/generated-icons.json`,
    `${JSON.stringify({ sourceSha256: hash(source), renderer: `Chromium ${browser.version()}`, icons }, null, 2)}\n`,
  );
} finally {
  await browser.close();
}
