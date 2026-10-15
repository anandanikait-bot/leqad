import { chromium } from '@playwright/test';

const fixtureUrl = process.argv[2] ?? 'http://127.0.0.1:4173/fixture.html';
const outputPath =
  process.argv[3] ?? 'docs/images/fixture-foundations-panel.png';
const executablePath = process.env.CHROMIUM_PATH ?? '/usr/bin/chromium';

const browser = await chromium.launch({
  executablePath,
  headless: true,
  args: ['--no-sandbox'],
});

try {
  const page = await browser.newPage({
    viewport: { width: 1280, height: 800 },
  });
  await page.goto(fixtureUrl);
  await page.locator('leqad-e2e-host').waitFor();
  await page.getByRole('heading', { name: 'Your First Sketch' }).waitFor();
  await page.screenshot({ path: outputPath, fullPage: true });
} finally {
  await browser.close();
}
