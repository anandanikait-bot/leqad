// Run with fixture server already listening: node docs/reviews/phase-1-5/capture.mjs
// Fixture observations only; never run this against authenticated Onshape.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || '/usr/bin/chromium',
  args: ['--no-sandbox'],
});
const output = fileURLToPath(new URL('./screenshots/', import.meta.url));
try {
  for (const [name, width, height] of [
    ['desktop', 1440, 900],
    ['narrow', 320, 720],
    ['short', 1024, 480],
  ]) {
    const page = await browser.newPage({ viewport: { width, height } });
    await page.goto('http://127.0.0.1:4173/fixture.html?unknown-permission=1');
    await page.getByRole('button', { name: 'Got it' }).waitFor();
    await page.screenshot({ path: output + `after-${name}.png` });
    await page.getByRole('button', { name: 'Help', exact: true }).click();
    await page.getByRole('region', { name: 'Help content' }).waitFor();
    // Wait for a ResizeObserver/paint cycle before recording the bounded layout.
    await page.evaluate(
      () =>
        new Promise((resolve) =>
          requestAnimationFrame(() => requestAnimationFrame(resolve)),
        ),
    );
    await page.screenshot({ path: output + `after-help-${name}.png` });
    if (name === 'desktop') {
      await page.getByRole('button', { name: 'Got it' }).click();
      await page.getByRole('button', { name: 'Next', exact: true }).click();
      await page.screenshot({ path: output + 'after-unable-to-verify.png' });
      await page.getByRole('button', { name: 'Ask', exact: true }).click();
      await page
        .getByRole('button', { name: 'Why does this step matter?' })
        .click();
      await page.screenshot({ path: output + 'after-ask-local-example.png' });
      await page.getByRole('button', { name: 'Collapse Leqad panel' }).click();
      await page.screenshot({ path: output + 'after-collapsed.png' });
    }
    await page.close();
  }
} finally {
  await browser.close();
}
