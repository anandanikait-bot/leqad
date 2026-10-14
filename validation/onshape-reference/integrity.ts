import { createHash } from 'node:crypto';
import { isValidCapture } from './schema.ts';
import type { ReferenceCapture, ScenarioId } from './schema.ts';

export interface ApprovedCaptureEntry {
  captureId: string;
  file: string;
  sha256: string;
  scenarioIds: ScenarioId[];
  freshness: 'CURRENT' | 'STALE' | 'UNKNOWN';
  approvedAt: string;
}

export interface ApprovedManifest {
  schemaVersion: 1;
  captures: ApprovedCaptureEntry[];
}

export interface IntegrityResult {
  valid: boolean;
  errors: string[];
  verifiedCaptureIds: string[];
}

export async function sha256Hex(content: string | Uint8Array): Promise<string> {
  return createHash('sha256').update(content).digest('hex');
}

export async function verifyPendingHashSidecar(
  content: string,
  sidecar: string,
): Promise<boolean> {
  const expected = sidecar.trim();
  return (
    /^[a-f0-9]{64}$/.test(expected) && (await sha256Hex(content)) === expected
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isManifest(value: unknown): value is ApprovedManifest {
  if (
    !isRecord(value) ||
    Object.keys(value).some(
      (key) => !['schemaVersion', 'captures'].includes(key),
    )
  )
    return false;
  if (value.schemaVersion !== 1 || !Array.isArray(value.captures)) return false;
  const seenIds = new Set<string>();
  const seenHashes = new Set<string>();
  for (const raw of value.captures) {
    if (
      !isRecord(raw) ||
      Object.keys(raw).some(
        (key) =>
          ![
            'captureId',
            'file',
            'sha256',
            'scenarioIds',
            'freshness',
            'approvedAt',
          ].includes(key),
      )
    )
      return false;
    if (
      typeof raw.captureId !== 'string' ||
      !/^cap_[a-zA-Z0-9_-]{6,80}$/.test(raw.captureId)
    )
      return false;
    if (raw.file !== `${raw.captureId}.json`) return false;
    if (typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/.test(raw.sha256))
      return false;
    if (
      !Array.isArray(raw.scenarioIds) ||
      raw.scenarioIds.length !== 1 ||
      typeof raw.scenarioIds[0] !== 'string'
    )
      return false;
    if (!['CURRENT', 'STALE', 'UNKNOWN'].includes(String(raw.freshness)))
      return false;
    if (
      typeof raw.approvedAt !== 'string' ||
      Number.isNaN(Date.parse(raw.approvedAt)) ||
      !raw.approvedAt.endsWith('Z')
    )
      return false;
    if (seenIds.has(raw.captureId) || seenHashes.has(raw.sha256)) return false;
    seenIds.add(raw.captureId);
    seenHashes.add(raw.sha256);
  }
  return true;
}

export async function verifyApprovedManifest(
  manifest: unknown,
  captureFiles: Record<string, string>,
): Promise<IntegrityResult> {
  const errors: string[] = [];
  if (!isManifest(manifest)) {
    return {
      valid: false,
      errors: ['APPROVED_MANIFEST_INVALID'],
      verifiedCaptureIds: [],
    };
  }
  const verifiedCaptureIds: string[] = [];
  for (const entry of manifest.captures) {
    const content = captureFiles[entry.file];
    if (content === undefined) {
      errors.push(`CAPTURE_FILE_MISSING:${entry.captureId}`);
      continue;
    }
    const actualHash = await sha256Hex(content);
    if (actualHash !== entry.sha256) {
      errors.push(`CAPTURE_HASH_MISMATCH:${entry.captureId}`);
      continue;
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(content);
    } catch {
      errors.push(`CAPTURE_JSON_INVALID:${entry.captureId}`);
      continue;
    }
    if (!isValidCapture(parsed)) {
      errors.push(`CAPTURE_SCHEMA_INVALID:${entry.captureId}`);
      continue;
    }
    const capture = parsed as ReferenceCapture;
    if (capture.captureOrigin !== 'OWNER_CAPTURE') {
      errors.push(`SYNTHETIC_CAPTURE_CANNOT_BE_APPROVED:${entry.captureId}`);
      continue;
    }
    if (
      capture.captureId !== entry.captureId ||
      capture.scenarioId !== entry.scenarioIds[0]
    ) {
      errors.push(`CAPTURE_PROVENANCE_MISMATCH:${entry.captureId}`);
      continue;
    }
    verifiedCaptureIds.push(entry.captureId);
  }
  return { valid: errors.length === 0, errors, verifiedCaptureIds };
}

/** Existing approved entries must remain byte-for-byte identical in a manifest update. */
export function validateManifestAppendOnly(
  previous: unknown,
  next: unknown,
): boolean {
  if (
    !isManifest(previous) ||
    !isManifest(next) ||
    next.captures.length < previous.captures.length
  )
    return false;
  return previous.captures.every(
    (entry, index) =>
      JSON.stringify(entry) === JSON.stringify(next.captures[index]),
  );
}

export function parseApprovedManifest(value: unknown): ApprovedManifest {
  if (!isManifest(value))
    throw new Error('Approved reference manifest is malformed.');
  return value;
}
