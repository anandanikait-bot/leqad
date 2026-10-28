import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { EMPTY_LEARNER_PROFILE } from '@leqad/desktop-contracts';
import { createLearnerProfileStore } from './memory';

const directories: string[] = [];
async function makeFilePath() {
  const directory = await mkdtemp(path.join(tmpdir(), 'leqad-tutor-memory-'));
  directories.push(directory);
  return path.join(directory, 'profile.json');
}

afterEach(async () => {
  await Promise.all(
    directories
      .splice(0)
      .map((directory) => rm(directory, { recursive: true, force: true })),
  );
});

describe('learner profile store', () => {
  it('loads an empty profile, atomically saves validated bounded topic history, and reloads it', async () => {
    const filePath = await makeFilePath();
    const store = createLearnerProfileStore(filePath);
    await expect(store.load()).resolves.toEqual(EMPTY_LEARNER_PROFILE);

    await store.save({
      version: 1,
      preference: 'analogy',
      events: Array.from({ length: 30 }, (_, index) => ({
        id: `event-${index}`,
        topic: 'dimensioning' as const,
        clarification: index % 2 === 0,
      })),
    });
    const savedText = await readFile(filePath, 'utf8');
    expect(savedText).not.toContain('raw question');
    expect(savedText).not.toContain('assistant response');
    await expect(
      createLearnerProfileStore(filePath).load(),
    ).resolves.toMatchObject({
      preference: 'analogy',
      events: { length: 30 },
    });
  });

  it('rejects corrupt, oversized, duplicate-id, or invalid profiles with a safe error', async () => {
    const filePath = await makeFilePath();
    const privateText = 'private question that must not appear in an error';
    await writeFile(filePath, JSON.stringify({ privateText, version: 999 }));
    await expect(createLearnerProfileStore(filePath).load()).rejects.toThrow(
      'Learner profile is corrupt or too large',
    );
    await expect(
      createLearnerProfileStore(filePath).load(),
    ).rejects.not.toThrow(privateText);

    await writeFile(filePath, 'x'.repeat(20_000));
    await expect(createLearnerProfileStore(filePath).load()).rejects.toThrow(
      'Learner profile is corrupt or too large',
    );

    await writeFile(
      filePath,
      JSON.stringify({
        version: 1,
        preference: 'none',
        events: [
          { id: 'duplicate', topic: 'dimensioning', clarification: false },
          { id: 'duplicate', topic: 'rectangles', clarification: true },
        ],
      }),
    );
    await expect(createLearnerProfileStore(filePath).load()).rejects.toThrow(
      'Learner profile is corrupt or too large',
    );
  });

  it('does not silently accept oversized or extra data while saving', async () => {
    const filePath = await makeFilePath();
    const store = createLearnerProfileStore(filePath);
    await expect(
      store.save({
        version: 1,
        preference: 'none',
        events: [],
        rawQuestion: 'do not store this',
      } as never),
    ).rejects.toThrow('Learner profile is invalid');
    await expect(
      store.save({
        version: 1,
        preference: 'none',
        events: Array.from({ length: 31 }, (_, index) => ({
          id: `event-${index}`,
          topic: 'dimensioning',
          clarification: false,
        })),
      } as never),
    ).rejects.toThrow('Learner profile is invalid');
  });

  it('reports write failures without exposing filesystem details', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'leqad-tutor-memory-'));
    directories.push(directory);
    const filePath = path.join(directory, 'profile.json');
    await mkdir(filePath);
    const store = createLearnerProfileStore(filePath);

    await expect(store.save(EMPTY_LEARNER_PROFILE)).rejects.toThrow(
      'Learner profile could not be saved',
    );
    await expect(store.save(EMPTY_LEARNER_PROFILE)).rejects.not.toThrow(
      directory,
    );
  });
});
