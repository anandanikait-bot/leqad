import { randomUUID } from 'node:crypto';
import * as fs from 'node:fs/promises';
import path from 'node:path';
import {
  EMPTY_LEARNER_PROFILE,
  LearnerProfileSchema,
  type LearnerProfile,
} from '@leqad/desktop-contracts';

const MAX_PROFILE_BYTES = 16 * 1024;

export interface ProfileStore {
  load(): Promise<LearnerProfile>;
  save(profile: LearnerProfile): Promise<void>;
}

function cloneProfile(profile: LearnerProfile): LearnerProfile {
  return {
    version: 1,
    preference: profile.preference,
    events: profile.events.map((event) => ({ ...event })),
  };
}

function parseProfile(value: unknown): LearnerProfile {
  const profile = LearnerProfileSchema.parse(value);
  const ids = new Set<string>();
  for (const event of profile.events) {
    if (ids.has(event.id)) throw new Error('Duplicate learner event id');
    ids.add(event.id);
  }
  return profile;
}

function isMissingFile(error: unknown): boolean {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    error.code === 'ENOENT'
  );
}

async function readBounded(filePath: string): Promise<string> {
  const handle = await fs.open(filePath, 'r');
  try {
    const stat = await handle.stat();
    if (stat.size > MAX_PROFILE_BYTES) {
      throw new Error('Learner profile is corrupt or too large');
    }
    const bytes = Buffer.alloc(MAX_PROFILE_BYTES + 1);
    let bytesRead = 0;
    while (bytesRead <= MAX_PROFILE_BYTES) {
      const result = await handle.read(
        bytes,
        bytesRead,
        MAX_PROFILE_BYTES + 1 - bytesRead,
        bytesRead,
      );
      if (result.bytesRead === 0) break;
      bytesRead += result.bytesRead;
      if (bytesRead > MAX_PROFILE_BYTES) {
        throw new Error('Learner profile is corrupt or too large');
      }
    }
    return new TextDecoder('utf-8', { fatal: true }).decode(
      bytes.subarray(0, bytesRead),
    );
  } finally {
    await handle.close();
  }
}

async function atomicWrite(filePath: string, data: string): Promise<void> {
  const directory = path.dirname(filePath);
  const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
  await fs.mkdir(directory, { recursive: true });
  try {
    await fs.writeFile(temporaryPath, data, {
      encoding: 'utf8',
      flag: 'wx',
      mode: 0o600,
    });
    await fs.rename(temporaryPath, filePath);
  } catch (error) {
    try {
      await fs.unlink(temporaryPath);
    } catch {
      // A failed cleanup does not change which profile file is authoritative.
    }
    throw error;
  }
}

export function createLearnerProfileStore(filePath: string): ProfileStore {
  let operationQueue: Promise<void> = Promise.resolve();

  function enqueue<T>(operation: () => Promise<T>): Promise<T> {
    const result = operationQueue.then(operation);
    operationQueue = result.then(
      () => undefined,
      () => undefined,
    );
    return result;
  }

  return {
    load() {
      return enqueue(async () => {
        let text: string;
        try {
          text = await readBounded(filePath);
        } catch (error) {
          if (isMissingFile(error)) return cloneProfile(EMPTY_LEARNER_PROFILE);
          throw new Error('Learner profile is corrupt or too large');
        }
        try {
          return cloneProfile(parseProfile(JSON.parse(text) as unknown));
        } catch {
          throw new Error('Learner profile is corrupt or too large');
        }
      });
    },
    save(profile) {
      let validated: LearnerProfile;
      try {
        validated = cloneProfile(parseProfile(profile));
      } catch {
        return Promise.reject(new Error('Learner profile is invalid'));
      }
      return enqueue(async () => {
        try {
          await atomicWrite(filePath, JSON.stringify(validated));
        } catch {
          throw new Error('Learner profile could not be saved');
        }
      });
    },
  };
}
