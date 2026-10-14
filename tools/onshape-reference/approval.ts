import { mkdir, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCapture } from '../../validation/onshape-reference/schema.ts';
import {
  parseApprovedManifest,
  sha256Hex,
  validateManifestAppendOnly,
  verifyPendingHashSidecar,
  verifyApprovedManifest,
  type ApprovedManifest,
} from '../../validation/onshape-reference/integrity.ts';

const ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PENDING = resolve(ROOT, 'validation/onshape-reference/captures/pending');
const APPROVED = resolve(
  ROOT,
  'validation/onshape-reference/captures/approved',
);
const MANIFEST = resolve(
  ROOT,
  'validation/onshape-reference/manifests/approved.json',
);

export async function approvePendingCapture(captureId: string): Promise<void> {
  if (!/^cap_[a-zA-Z0-9_-]{6,80}$/.test(captureId))
    throw new Error('Capture ID format is invalid.');
  const pendingPath = resolve(PENDING, `${captureId}.json`);
  const pendingContent = await readFile(pendingPath, 'utf8');
  const pendingSidecar = await readFile(`${pendingPath}.sha256`, 'utf8');
  if (!(await verifyPendingHashSidecar(pendingContent, pendingSidecar))) {
    throw new Error(
      'Pending capture hash is missing or does not match; no approval was recorded.',
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(pendingContent);
  } catch {
    throw new Error('Pending capture is not valid JSON.');
  }
  const capture = validateCapture(parsed);
  if (
    capture.captureId !== captureId ||
    capture.captureOrigin !== 'OWNER_CAPTURE'
  ) {
    throw new Error(
      'Only an owner-captured, sanitized pending record can be approved.',
    );
  }

  const manifestContent = await readFile(MANIFEST, 'utf8');
  let manifestValue: unknown;
  try {
    manifestValue = JSON.parse(manifestContent);
  } catch {
    throw new Error('The approved manifest is invalid; no change was made.');
  }
  const manifest = parseApprovedManifest(manifestValue);
  const captureFiles = Object.fromEntries(
    await Promise.all(
      manifest.captures.map(
        async (entry) =>
          [
            entry.file,
            await readFile(resolve(APPROVED, entry.file), 'utf8'),
          ] as const,
      ),
    ),
  );
  const currentIntegrity = await verifyApprovedManifest(manifest, captureFiles);
  if (!currentIntegrity.valid)
    throw new Error(
      'Existing approved evidence failed integrity checks; no change was made.',
    );
  if (manifest.captures.some((entry) => entry.captureId === captureId))
    throw new Error('This capture is already approved and cannot be replaced.');

  stdout.write(
    `\nSanitized capture summary\nScenario: ${capture.scenarioId}\nTarget identity: ${capture.targetId}\nSnapshots: ${capture.observations.length}\nCapture origin: owner-reported local Chrome/DevTools session\n`,
  );
  stdout.write(
    'Review the pending JSON file before continuing. It contains only allowlisted structure and human state codes.\n',
  );
  const readline = createInterface({ input: stdin, output: stdout });
  try {
    const answer = await readline.question(
      `Type APPROVE ${captureId} only after reviewing this sanitized record: `,
    );
    if (answer.trim() !== `APPROVE ${captureId}`)
      throw new Error(
        'Owner review was not confirmed; no approval was recorded.',
      );
    const freshnessAnswer = await readline.question(
      'Reference freshness [CURRENT / UNKNOWN]: ',
    );
    const freshness = freshnessAnswer.trim().toUpperCase();
    if (freshness !== 'CURRENT' && freshness !== 'UNKNOWN')
      throw new Error('Choose CURRENT or UNKNOWN; no approval was recorded.');

    const sha256 = await sha256Hex(pendingContent);
    const next: ApprovedManifest = {
      schemaVersion: 1,
      captures: [
        ...manifest.captures,
        {
          captureId,
          file: `${captureId}.json`,
          sha256,
          scenarioIds: [capture.scenarioId],
          freshness,
          approvedAt: new Date().toISOString(),
        },
      ],
    };
    if (!validateManifestAppendOnly(manifest, next))
      throw new Error('Approval would change an existing frozen record.');
    await mkdir(APPROVED, { recursive: true });
    const approvedPath = resolve(APPROVED, `${captureId}.json`);
    const temporaryManifestPath = `${MANIFEST}.tmp`;
    await writeFile(approvedPath, pendingContent, { flag: 'wx', mode: 0o600 });
    try {
      await writeFile(
        temporaryManifestPath,
        `${JSON.stringify(next, null, 2)}\n`,
        { flag: 'wx', mode: 0o600 },
      );
      await rename(temporaryManifestPath, MANIFEST);
    } catch (error) {
      await rm(temporaryManifestPath, { force: true });
      await rm(approvedPath, { force: true });
      throw error;
    }
    stdout.write(`Approved reference record appended: ${captureId}\n`);
    stdout.write(
      'Commit the approved file and manifest through a CODEOWNERS-reviewed pull request; local hashes alone do not enforce owner control.\n',
    );
  } finally {
    readline.close();
  }
}
