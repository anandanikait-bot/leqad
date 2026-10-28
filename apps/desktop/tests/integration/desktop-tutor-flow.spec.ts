import { build } from 'esbuild';
import { fileURLToPath } from 'node:url';
import { rm, readFile } from 'node:fs/promises';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import {
  captureScreenshot,
  chooseWrittenLessons,
  createUserDataDir,
  launchDesktop,
  openSettings,
} from './helpers/desktop';
const entry = fileURLToPath(
  new URL('../fixtures/tutor-test-main.ts', import.meta.url),
);
const output = fileURLToPath(
  new URL('../../dist/tutor-test-main.cjs', import.meta.url),
);
test.beforeAll(async () => {
  await build({
    entryPoints: [entry],
    outfile: output,
    bundle: true,
    platform: 'node',
    format: 'cjs',
    external: ['electron'],
  });
});
test('simulated provider: real IPC conversation, clarification, restart memory and deletion', async ({}, testInfo) => {
  const userData = await createUserDataDir();
  let desktop = await launchDesktop(userData, output);
  try {
    await chooseWrittenLessons(desktop.page);
    await desktop.page
      .getByRole('button', { name: 'Ask', exact: true })
      .click();
    await expect(
      desktop.page.getByText('Test provider · simulated responses', {
        exact: true,
      }),
    ).toBeVisible();
    await captureScreenshot(
      desktop.page,
      testInfo,
      'tutor-test-start-light.png',
    );
    await desktop.page
      .getByLabel('Your question', { exact: true })
      .fill('How do I dimension a rectangle?');
    await desktop.page
      .getByRole('button', { name: 'Send', exact: true })
      .click();
    await expect(
      desktop.page.locator('.tutor-message-assistant'),
    ).toContainText('40 mm');
    await desktop.page
      .getByLabel('Your question', { exact: true })
      .fill("I'm still confused.");
    await desktop.page
      .getByRole('button', { name: 'Send', exact: true })
      .click();
    await expect(
      desktop.page.locator('.tutor-message-assistant').last(),
    ).toContainText('picture frame');
    await desktop.page.getByText('Learning history', { exact: true }).click();
    await expect(desktop.page.locator('.tutor-events li')).toHaveCount(2);
    await desktop.page
      .getByLabel('Explanation style', { exact: true })
      .selectOption('step-by-step');
    await expect
      .poll(
        async () =>
          JSON.parse(
            await readFile(path.join(userData, 'learner-profile.json'), 'utf8'),
          ).preference,
      )
      .toBe('step-by-step');
    const file = await readFile(
      path.join(userData, 'learner-profile.json'),
      'utf8',
    );
    expect(file).not.toContain('How do I dimension');
    expect(file).not.toContain('Simulated reply');
    await desktop.page
      .locator('.tutor-message-assistant')
      .last()
      .scrollIntoViewIfNeeded();
    await captureScreenshot(
      desktop.page,
      testInfo,
      'tutor-test-conversation-light.png',
    );
    await desktop.app.close();
    desktop = await launchDesktop(userData, output);
    await chooseWrittenLessons(desktop.page);
    const resume = desktop.page.getByRole('button', {
      name: 'Resume lesson',
      exact: true,
    });
    if (await resume.isVisible()) await resume.click();
    await desktop.page
      .getByRole('button', { name: 'Ask', exact: true })
      .click();
    await expect(desktop.page.locator('.tutor-message')).toHaveCount(0);
    await desktop.page
      .getByLabel('Your question', { exact: true })
      .fill('Can we review dimensions?');
    await desktop.page
      .getByRole('button', { name: 'Send', exact: true })
      .click();
    await expect(
      desktop.page.locator('.tutor-message-assistant'),
    ).toContainText('previously asked');
    await openSettings(desktop.page);
    await desktop.page
      .getByRole('radio', { name: 'Dark', exact: true })
      .check();
    await desktop.page
      .getByRole('radio', { name: '200%', exact: true })
      .check();
    await desktop.page
      .getByRole('button', { name: 'Back to Ask', exact: true })
      .click();
    await desktop.app.evaluate(({ BrowserWindow }) =>
      BrowserWindow.getAllWindows()[0]!.setContentSize(320, 400),
    );
    const question = desktop.page.getByLabel('Your question', { exact: true });
    await question.scrollIntoViewIfNeeded();
    await question.focus();
    await expect(question).toBeFocused();
    const bounds = await question.boundingBox();
    expect(bounds!.x).toBeGreaterThanOrEqual(0);
    expect(bounds!.x + bounds!.width).toBeLessThanOrEqual(320);
    await captureScreenshot(
      desktop.page,
      testInfo,
      'tutor-test-compact-dark-200.png',
    );
    await question.fill('Wait for cancellation');
    await desktop.page
      .getByRole('button', { name: 'Send', exact: true })
      .click();
    await expect(
      desktop.page.getByText('Thinking…', { exact: true }),
    ).toBeVisible();
    await desktop.page.getByText('Learning history', { exact: true }).click();
    await desktop.page
      .getByRole('button', {
        name: 'Clear learning history and chat',
        exact: true,
      })
      .click();
    await expect(desktop.page.locator('.tutor-events li')).toHaveCount(0);
    await expect(desktop.page.locator('.tutor-message')).toHaveCount(0);
    await expect
      .poll(
        async () =>
          JSON.parse(
            await readFile(path.join(userData, 'learner-profile.json'), 'utf8'),
          ).events.length,
      )
      .toBe(0);
    await expect(desktop.page.locator('.step-counter')).toContainText(
      'Step 1 of 8',
    );
    await expect(
      desktop.page.getByRole('button', { name: 'Cancel', exact: true }),
    ).toHaveCount(0);
    await desktop.app.close();
    desktop = await launchDesktop(userData, output);
    await chooseWrittenLessons(desktop.page);
    const resumeAfterDelete = desktop.page.getByRole('button', {
      name: 'Resume lesson',
      exact: true,
    });
    if (await resumeAfterDelete.isVisible()) await resumeAfterDelete.click();
    await desktop.page
      .getByRole('button', { name: 'Ask', exact: true })
      .click();
    await expect(desktop.page.locator('.tutor-message')).toHaveCount(0);
    await desktop.page.getByText('Learning history', { exact: true }).click();
    await expect(desktop.page.locator('.tutor-events li')).toHaveCount(0);
    await expect(
      desktop.page.getByLabel('Explanation style', { exact: true }),
    ).toHaveValue('none');
    await desktop.page
      .getByLabel('Your question', { exact: true })
      .fill('How do I dimension a rectangle?');
    await desktop.page
      .getByRole('button', { name: 'Send', exact: true })
      .click();
    await expect(
      desktop.page.locator('.tutor-message-assistant'),
    ).toContainText('Choose Dimension');
    await expect(
      desktop.page.locator('.tutor-message-assistant'),
    ).not.toContainText('previously asked');
  } finally {
    await desktop.app.close().catch(() => undefined);
    await rm(userData, { recursive: true, force: true });
  }
});
