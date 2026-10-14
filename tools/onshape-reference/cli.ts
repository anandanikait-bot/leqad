import { readFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  validateCapture,
  TARGET_IDS,
  type TargetId,
} from '../../validation/onshape-reference/schema.ts';
import {
  parseApprovedManifest,
  verifyApprovedManifest,
} from '../../validation/onshape-reference/integrity.ts';
import {
  compareReferenceContract,
  type ProductObservation,
} from '../../validation/onshape-reference/evaluate.ts';
import { validateReferenceHarness } from './validate.ts';
import { approvePendingCapture } from './approval.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const APPROVED = resolve(
  ROOT,
  'validation/onshape-reference/captures/approved',
);
const MANIFEST = resolve(
  ROOT,
  'validation/onshape-reference/manifests/approved.json',
);

async function readJson(path: string): Promise<unknown> {
  try {
    return JSON.parse(await readFile(path, 'utf8')) as unknown;
  } catch {
    throw new Error(
      'A required local JSON record could not be read or parsed.',
    );
  }
}

async function selectValue<T extends string>(
  prompt: string,
  values: readonly T[],
  readline: ReturnType<typeof createInterface>,
): Promise<T> {
  stdout.write(`${prompt}\n`);
  values.forEach((value, index) => stdout.write(`  ${index + 1}. ${value}\n`));
  while (true) {
    const answer = Number.parseInt(
      (await readline.question('Choose a number: ')).trim(),
      10,
    );
    const value = values[answer - 1];
    if (value) return value;
  }
}

async function evaluateApprovedCapture(captureId: string): Promise<void> {
  if (!/^cap_[a-zA-Z0-9_-]{6,80}$/.test(captureId))
    throw new Error('Capture ID format is invalid.');
  const manifest = parseApprovedManifest(await readJson(MANIFEST));
  const entry = manifest.captures.find((item) => item.captureId === captureId);
  if (!entry) throw new Error('No owner-approved capture with that ID exists.');
  const files = Object.fromEntries(
    await Promise.all(
      manifest.captures.map(
        async (item) =>
          [
            item.file,
            await readFile(resolve(APPROVED, item.file), 'utf8'),
          ] as const,
      ),
    ),
  );
  const integrity = await verifyApprovedManifest(manifest, files);
  if (!integrity.valid)
    throw new Error('Approved reference integrity validation failed.');
  const capture = validateCapture(
    JSON.parse(files[entry.file] ?? 'null') as unknown,
  );

  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const outcome = await selectValue(
      'Leqad result you observed for this capture:',
      ['RECOGNIZED', 'MISSING', 'AMBIGUOUS', 'UNSUPPORTED', 'UNKNOWN'] as const,
      readline,
    );
    let targetId: TargetId | null = null;
    if (outcome === 'RECOGNIZED') {
      targetId = await selectValue(
        'Exact Leqad target identity:',
        TARGET_IDS.filter((id) => id !== 'none'),
        readline,
      );
    }
    const menuEvidence: ProductObservation['menuEvidence'] =
      capture.scenarioId === 'rectangle-dropdown'
        ? await selectValue(
            'Menu evidence:',
            ['DOM_TRANSITION', 'CLICK_ONLY', 'NONE'] as const,
            readline,
          )
        : 'NOT_APPLICABLE';
    const highlight =
      capture.scenarioId === 'active-sketch'
        ? 'NOT_APPLICABLE'
        : await selectValue(
            'Highlight result:',
            ['CORRECT', 'INCORRECT', 'UNKNOWN', 'NOT_APPLICABLE'] as const,
            readline,
          );
    const product: ProductObservation = {
      scenarioId: capture.scenarioId,
      outcome,
      targetId,
      menuEvidence,
      highlight,
    };
    const result = compareReferenceContract({
      capture,
      product,
      approval: 'APPROVED',
      freshness: entry.freshness,
    });
    stdout.write(
      `\nOffline comparison: ${result.status} (${result.evidenceLevel})\nReason: ${result.reason}\n`,
    );
    stdout.write(
      'This comparison uses reviewed reference evidence and manually entered Leqad observations. It does not establish live acceptance or verify CAD geometry.\n',
    );
  } finally {
    readline.close();
  }
}

async function main(): Promise<void> {
  const [command, argument] = process.argv.slice(2);
  if (command === 'validate') {
    const errors = await validateReferenceHarness();
    if (errors.length) {
      errors.forEach((error) => process.stderr.write(`${error}\n`));
      process.exitCode = 1;
      return;
    }
    const manifest = parseApprovedManifest(await readJson(MANIFEST));
    stdout.write(
      `Independent reference integrity: PASS (${manifest.captures.length} approved capture hashes checked).\n`,
    );
    if (manifest.captures.length === 0)
      stdout.write(
        'NO LIVE EVIDENCE: no approved Onshape reference captures exist.\n',
      );
    return;
  }
  if (command === 'approve' && argument)
    return await approvePendingCapture(argument);
  if (command === 'evaluate' && argument)
    return await evaluateApprovedCapture(argument);
  throw new Error(
    'Usage: reference:validate | reference:test | reference:capture | reference:approve <captureId> | reference:evaluate <captureId>',
  );
}

await main();
