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
        body: '<!doctype html><html><body><h1>Onshape test fixture</h1></body></html>',
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
  } finally {
    await context.close();
  }
});
