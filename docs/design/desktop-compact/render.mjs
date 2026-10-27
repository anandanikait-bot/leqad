// Static design documentation QA. This does not launch Electron or connect to CAD.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs/promises';
const dir = path.dirname(fileURLToPath(import.meta.url));
const root =
  process.env.LEQAD_PLAYWRIGHT_ROOT || path.resolve(dir, '../../../..');
const require = createRequire(path.join(root, 'package.json'));
const { chromium } = require('@playwright/test');
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  headless: true,
  args: ['--no-sandbox'],
});
const page = await browser.newPage({
  viewport: { width: 1400, height: 1050 },
  deviceScaleFactor: 1,
});
await page.goto(process.env.DESIGN_URL || 'http://127.0.0.1:4187/mockups.html');
await page.evaluate(() => document.fonts.ready);
await fs.mkdir(path.join(dir, 'previews'), { recursive: true });
const report = await page.evaluate(() => ({
  scope:
    'Static design boards only; not Electron, real CAD, or live compatibility evidence',
  fonts: [...document.fonts].map((f) => ({
    family: f.family,
    status: f.status,
  })),
  panels: [...document.querySelectorAll('.panel')].map((p) => ({
    board: p.closest('.board').id,
    width: p.clientWidth,
    height: p.clientHeight,
    overflowX: p.scrollWidth > p.clientWidth,
    overflowY: p.scrollHeight > p.clientHeight,
    helpViewport: p.querySelector('.help-content')?.clientHeight ?? null,
    body: p.querySelector('.body')
      ? {
          height: p.querySelector('.body').clientHeight,
          scrollHeight: p.querySelector('.body').scrollHeight,
          overflow: getComputedStyle(p.querySelector('.body')).overflowY,
        }
      : null,
  })),
  externalAssets: [...document.querySelectorAll('[src],[href]')]
    .map((e) => e.getAttribute('src') || e.getAttribute('href'))
    .filter((v) => /^https?:/.test(v)),
}));
for (let i = 1; i <= 19; i++) {
  const id = `board-${String(i).padStart(2, '0')}`;
  await page
    .locator('#' + id)
    .screenshot({ path: path.join(dir, 'previews', id + '.png') });
}
// Reuse the exact authored panel markup for a six-state review sheet.
await page.evaluate(() => {
  const ids = [3, 4, 5, 7, 8, 12];
  const panels = ids.map((i) => ({
    label: document.querySelector(`#board-${String(i).padStart(2, '0')} h2`)
      .textContent,
    html: document.querySelector(`#board-${String(i).padStart(2, '0')} .panel`)
      .outerHTML,
  }));
  document.body.innerHTML =
    '<div class="gallery-head"><p class="design-label">Design mockups only · no running CAD integration</p><h1>Leqad Compact Companion</h1><p>Same teaching context across help, local Ask, uncertainty, pause, and dark appearance.</p></div><div id="comparison" class="board" style="display:grid;grid-template-columns:repeat(3,365px);gap:24px;border:0">' +
    panels
      .map(
        (p) =>
          '<section><h3 style="margin-bottom:12px">' +
          p.label +
          '</h3>' +
          p.html +
          '</section>',
      )
      .join('') +
    '</div>';
});
await page.screenshot({
  path: path.join(dir, 'previews', 'comparison.png'),
  fullPage: true,
});
await fs.writeFile(
  path.join(dir, 'render-report.json'),
  JSON.stringify(report, null, 2) + '\n',
);
console.log(JSON.stringify(report, null, 2));
if (
  report.panels.some(
    (p) =>
      p.overflowX ||
      p.overflowY ||
      (p.body &&
        p.body.scrollHeight > p.body.height + 1 &&
        !['auto', 'scroll'].includes(p.body.overflow)),
  )
)
  throw new Error('Static panel has inaccessible body overflow');
await browser.close();
