import { readdir, readFile } from 'node:fs/promises';
import { resolve, relative } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateCapture } from '../../validation/onshape-reference/schema.ts';
import {
  verifyApprovedManifest,
  verifyPendingHashSidecar,
  type ApprovedManifest,
} from '../../validation/onshape-reference/integrity.ts';
import { checkImportBoundaries } from '../../validation/onshape-reference/dependency-boundary.ts';

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

async function sourceFiles(directory: string): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const walk = async (path: string) => {
    const entries = await readdir(path, { withFileTypes: true });
    for (const entry of entries) {
      const absolute = resolve(path, entry.name);
      if (entry.isDirectory()) await walk(absolute);
      else if (
        /\.(?:ts|tsx|js|mjs)$/.test(entry.name) &&
        !/\.(?:test|spec)\.(?:ts|tsx|js|mjs)$/.test(entry.name)
      ) {
        result[relative(ROOT, absolute).replaceAll('\\', '/')] = await readFile(
          absolute,
          'utf8',
        );
      }
    }
  };
  await walk(directory);
  return result;
}

async function captureJsonFiles(
  directory: string,
  allowHashSidecars = false,
): Promise<Record<string, string>> {
  const result: Record<string, string> = {};
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    if (entry.isDirectory()) continue;
    if (entry.name === '.gitkeep') continue;
    if (
      allowHashSidecars &&
      entry.isFile() &&
      entry.name.endsWith('.json.sha256')
    )
      continue;
    if (!entry.isFile() || !entry.name.endsWith('.json'))
      throw new Error('Unexpected file in capture directory.');
    result[entry.name] = await readFile(resolve(directory, entry.name), 'utf8');
  }
  return result;
}

export async function validateReferenceHarness(): Promise<string[]> {
  const errors: string[] = [];
  const code = {
    ...(await sourceFiles(resolve(ROOT, 'tools/onshape-reference'))),
    ...(await sourceFiles(resolve(ROOT, 'validation/onshape-reference'))),
    ...(await sourceFiles(resolve(ROOT, 'apps/extension'))),
  };
  const boundaries = checkImportBoundaries(code);
  for (const violation of boundaries.violations) {
    errors.push(`PROHIBITED_IMPORT:${violation.file}:${violation.specifier}`);
  }

  const pending = await captureJsonFiles(PENDING, true);
  for (const [file, content] of Object.entries(pending)) {
    let capture: unknown;
    try {
      capture = JSON.parse(content);
      const checked = validateCapture(capture);
      if (file !== `${checked.captureId}.json`)
        errors.push(`PENDING_CAPTURE_FILENAME_MISMATCH:${file}`);
      if (
        checked.reviewStatus !== 'PENDING_REVIEW' ||
        checked.captureOrigin !== 'OWNER_CAPTURE'
      ) {
        errors.push(`PENDING_CAPTURE_PROVENANCE_INVALID:${file}`);
      }
      let sidecar = '';
      try {
        sidecar = await readFile(resolve(PENDING, `${file}.sha256`), 'utf8');
      } catch {
        errors.push(`PENDING_CAPTURE_HASH_MISSING:${file}`);
      }
      if (sidecar && !(await verifyPendingHashSidecar(content, sidecar)))
        errors.push(`PENDING_CAPTURE_HASH_MISMATCH:${file}`);
    } catch {
      errors.push(`PENDING_CAPTURE_INVALID:${file}`);
    }
  }

  for (const entry of await readdir(PENDING, { withFileTypes: true })) {
    if (!entry.isFile() || !entry.name.endsWith('.json.sha256')) continue;
    const captureName = entry.name.slice(0, -'.sha256'.length);
    if (!Object.hasOwn(pending, captureName))
      errors.push(`ORPHAN_PENDING_CAPTURE_HASH:${entry.name}`);
  }

  let manifest: unknown;
  try {
    manifest = JSON.parse(await readFile(MANIFEST, 'utf8'));
  } catch {
    errors.push('APPROVED_MANIFEST_UNREADABLE');
    return errors;
  }
  const approvedFiles = await captureJsonFiles(APPROVED);
  const integrity = await verifyApprovedManifest(manifest, approvedFiles);
  errors.push(...integrity.errors);
  if (
    manifest &&
    typeof manifest === 'object' &&
    'captures' in manifest &&
    Array.isArray(manifest.captures)
  ) {
    const listed = new Set(
      manifest.captures
        .filter((entry): entry is { file: string } =>
          Boolean(
            entry &&
            typeof entry === 'object' &&
            'file' in entry &&
            typeof entry.file === 'string',
          ),
        )
        .map((entry) => entry.file),
    );
    for (const file of Object.keys(approvedFiles)) {
      if (!listed.has(file)) errors.push(`UNLISTED_APPROVED_CAPTURE:${file}`);
    }
  }
  return errors;
}

export async function runReferenceValidation(): Promise<void> {
  const errors = await validateReferenceHarness();
  if (errors.length > 0) {
    for (const error of errors) process.stderr.write(`${error}\n`);
    process.exitCode = 1;
    return;
  }
  const manifest = JSON.parse(
    await readFile(MANIFEST, 'utf8'),
  ) as ApprovedManifest;
  process.stdout.write('Independent reference validation: PASS\n');
  process.stdout.write(
    `Frozen approved capture hashes verified: ${manifest.captures.length}\n`,
  );
  if (manifest.captures.length === 0)
    process.stdout.write(
      'NO LIVE EVIDENCE: approved reference dataset is empty; this does not establish Onshape compatibility.\n',
    );
}
