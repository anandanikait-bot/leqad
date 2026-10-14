import { expect, test } from '@playwright/test';
import { captureAuthorizedSnapshot } from '../../../../tools/onshape-reference/recorder.ts';

// All pages below are intercepted simulations, never authenticated Onshape evidence.
test.beforeEach(async ({ context }) => {
  await context.route('https://cad.onshape.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<button>Sketch</button>',
    }),
  );
  await context.route('https://example.com/**', (route) =>
    route.fulfill({
      contentType: 'text/html',
      body: '<button>Finish Sketch</button>',
    }),
  );
});

test('recorder checks origin and route again before both snapshots', async ({
  page,
}) => {
  await page.goto('https://example.com/');
  await expect(captureAuthorizedSnapshot(page)).rejects.toThrow(
    'supported Onshape workspace route',
  );
  await page.goto(
    'https://cad.onshape.com/documents/simulated-document/w/simulated-workspace/e/simulated-element',
  );
  const before = await captureAuthorizedSnapshot(page);
  expect(before.domState).toBe('SKETCH_COMMAND_VISIBLE');
  expect(JSON.stringify(before)).not.toContain('simulated-document');
  await page.goto('https://cad.onshape.com/signin');
  await expect(captureAuthorizedSnapshot(page)).rejects.toThrow(
    'supported Onshape workspace route',
  );
  await page.goto('https://example.com/');
  await expect(captureAuthorizedSnapshot(page)).rejects.toThrow(
    'supported Onshape workspace route',
  );
});

test('recorder requires the original sole tab if Onshape opens in another tab', async ({
  page,
  context,
}) => {
  await page.goto(
    'https://cad.onshape.com/documents/simulated-document/w/simulated-workspace/e/simulated-element',
  );
  const other = await context.newPage();
  await other.goto(
    'https://cad.onshape.com/documents/other-document/w/other-workspace/e/other-element',
  );
  await expect(captureAuthorizedSnapshot(page)).rejects.toThrow(
    'original Chrome tab',
  );
  await other.close();
  expect((await captureAuthorizedSnapshot(page)).domState).toBe(
    'SKETCH_COMMAND_VISIBLE',
  );
  await page.close();
  await expect(captureAuthorizedSnapshot(page)).rejects.toThrow(
    'original Chrome tab',
  );
});
