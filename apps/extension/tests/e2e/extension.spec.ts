import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { chromium, expect, test } from '@playwright/test';

const extensionPath = resolve('apps/extension/.output/chrome-mv3');
const edgeExtensionPath = resolve('apps/extension/.output/edge-mv3');
const systemChromium = '/usr/bin/chromium';
const localChromiumPolicyPath =
  '/etc/chromium/policies/managed/extensions.json';

function localPolicyBlocksUnpackedExtensions(): boolean {
  if (!existsSync(localChromiumPolicyPath)) return false;
  try {
    const policy = JSON.parse(
      readFileSync(localChromiumPolicyPath, 'utf8'),
    ) as {
      ExtensionInstallBlocklist?: unknown;
      ExtensionInstallAllowlist?: unknown;
    };
    const blocked =
      Array.isArray(policy.ExtensionInstallBlocklist) &&
      policy.ExtensionInstallBlocklist.includes('*');
    const wildcardAllowed =
      Array.isArray(policy.ExtensionInstallAllowlist) &&
      policy.ExtensionInstallAllowlist.includes('*');
    return blocked && !wildcardAllowed;
  } catch {
    return false;
  }
}

for (const [browser, outputPath] of [
  ['Chrome', extensionPath],
  ['Edge', edgeExtensionPath],
] as const) {
  test(`the ${browser} production package is a minimal Manifest V3 extension`, () => {
    const manifestPath = resolve(outputPath, 'manifest.json');
    expect(existsSync(manifestPath)).toBe(true);
    const manifest = JSON.parse(readFileSync(manifestPath, 'utf8')) as {
      manifest_version: number;
      permissions: string[];
      host_permissions?: string[];
      content_scripts: Array<{ matches: string[]; js: string[] }>;
    };

    expect(manifest.manifest_version).toBe(3);
    expect(manifest.permissions).toEqual(['storage']);
    expect(manifest.host_permissions ?? []).toEqual([]);
    expect(manifest.content_scripts[0]).toMatchObject({
      matches: ['https://cad.onshape.com/documents/*'],
      js: ['content-scripts/onshape.js'],
    });
  });
}

test('the built MV3 extension mounts its React panel in the Onshape page Shadow DOM', async () => {
  test.setTimeout(60_000);
  test.skip(
    localPolicyBlocksUnpackedExtensions(),
    'Managed Chromium ExtensionInstallBlocklist=* prevents loading this unpacked extension in the current environment.',
  );
  expect(existsSync(resolve(extensionPath, 'manifest.json'))).toBe(true);
  const context = await chromium.launchPersistentContext('', {
    ...(existsSync(systemChromium) ? { executablePath: systemChromium } : {}),
    headless: true,
    ignoreHTTPSErrors: true,
    ignoreDefaultArgs: ['--disable-extensions'],
    args: [
      '--no-sandbox',
      `--disable-extensions-except=${extensionPath}`,
      `--load-extension=${extensionPath}`,
    ],
  });

  try {
    await context.route('https://cad.onshape.com/**', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'text/html',
        // Controlled semantic fixture, not a capture of production Onshape DOM.
        body: '<!doctype html><html><body><h1>Onshape test fixture</h1><div role="tree"><div role="group" aria-label="Default geometry"><button aria-label="Top" style="margin:40px;width:180px;height:28px">Top</button></div></div></body></html>',
      });
    });
    const page = context.pages()[0] ?? (await context.newPage());
    await page.goto(
      'https://cad.onshape.com/documents/document-a/w/workspace-a/e/element-a',
      { waitUntil: 'domcontentloaded', timeout: 15_000 },
    );

    await expect(page.locator('leqad-assistant')).toHaveCount(1, {
      timeout: 20_000,
    });
    await expect(
      page.getByRole('heading', { name: 'Your First Sketch' }),
    ).toBeVisible();
    await expect(
      page.getByRole('status', { name: 'Connection status' }),
    ).toHaveText('Limited observation');
    const mark = page.locator('leqad-assistant img.leqad-wordmark__mark');
    await expect(mark).toHaveAttribute('src', /^data:image\/svg\+xml/);
    await expect(mark).toHaveJSProperty('complete', true);
    await expect(mark).toHaveJSProperty('naturalWidth', 256);
    await page.getByRole('button', { name: 'Got it' }).click();
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Show me' }).click();
    await expect(page.locator('[data-leqad-highlight]')).toHaveCount(1);
    await expect(page.getByText('Step 2 of 8 · Visited')).toBeVisible();
    // Exercise the production content-script SPA cleanup, not a fixture copy.
    await page.evaluate(() =>
      history.pushState(
        {},
        '',
        '/documents/document-b/w/workspace-b/e/element-b',
      ),
    );
    await expect(page.locator('[data-leqad-highlight]')).toHaveCount(0);
    await expect(page.locator('leqad-assistant')).toHaveCount(1);
    await expect(page.getByText('Step 1 of 8 · Visited')).toBeVisible();
  } finally {
    await context.close();
  }
});
