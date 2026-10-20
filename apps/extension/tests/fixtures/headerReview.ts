import { readFileSync } from 'node:fs';
import type { Page } from '@playwright/test';

// Node-side controlled-fixture review only. Never import this into the content
// script. This archived raster preview is superseded by the approved SVG identity.
export async function applyOriginalWordmarkPreview(page: Page): Promise<void> {
  const png = readFileSync(
    new URL(
      '../../src/assets/brand/leqad-header-wordmark.png',
      import.meta.url,
    ),
  );
  await page.locator('.leqad-wordmark > span').evaluate(
    (text, source) => {
      const image = text.ownerDocument.createElement('img');
      image.src = source;
      image.alt = '';
      image.width = 80;
      image.height = 26;
      image.draggable = false;
      image.dataset.leqadWordmarkReview = 'OPTION_B_NOT_APPROVED';
      image.style.cssText = 'display:block;flex:0 0 80px;object-fit:contain';
      text.replaceWith(image);
    },
    `data:image/png;base64,${png.toString('base64')}`,
  );
}
