import { randomUUID } from 'node:crypto';
import { chmod, mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { chromium, type BrowserContext, type Page } from '@playwright/test';
import {
  validateCapture,
  type CaptureEvent,
  type DomState,
  type HumanState,
  type ScenarioId,
} from '../../validation/onshape-reference/schema.ts';
import { REFERENCE_SCENARIOS } from '../../validation/onshape-reference/scenarios.ts';
import { sha256Hex } from '../../validation/onshape-reference/integrity.ts';
import { capturePageSnapshot } from './capture-page.ts';
import { isSupportedOnshapePartStudioLocation } from './onshape-context.ts';
import {
  MAX_SIGN_IN_MS,
  observationDeadlineAfterPartStudioReady,
  signInDeadlineFromLaunch,
} from './session-policy.ts';

const REPOSITORY_ROOT = fileURLToPath(new URL('../../', import.meta.url));
const PENDING_DIRECTORY = resolve(
  REPOSITORY_ROOT,
  'validation/onshape-reference/captures/pending',
);

function assertNotCi(): void {
  if (process.env.CI === 'true')
    throw new Error(
      'Reference capture is an explicit local-only command and is disabled in CI.',
    );
}

function domState(value: string): DomState {
  const allowed: readonly string[] = [
    'PART_STUDIO_CONTROLS_VISIBLE',
    'SKETCH_CONTROLS_VISIBLE',
    'TOP_LABEL_VISIBLE',
    'SKETCH_COMMAND_VISIBLE',
    'RECTANGLE_TRIGGER_VISIBLE',
    'MENU_VISIBLE',
    'NO_MENU_EVIDENCE',
    'UNKNOWN',
  ];
  return allowed.includes(value) ? (value as DomState) : 'UNKNOWN';
}

function humanStatesFor(stateId: 'BEFORE' | 'AFTER'): HumanState[] {
  return stateId === 'BEFORE'
    ? ['PART_STUDIO_READY', 'UNKNOWN']
    : ['SKETCH_ACTIVE', 'SKETCH_INACTIVE', 'UNKNOWN'];
}

async function askWithinSession(
  prompt: string,
  deadline: number,
): Promise<string> {
  const remaining = deadline - Date.now();
  if (remaining <= 0)
    throw new Error('Observation session reached its 10-minute time limit.');
  const readline = createInterface({ input: stdin, output: stdout });
  let timer: NodeJS.Timeout | undefined;
  try {
    return await Promise.race([
      readline.question(prompt),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => {
          readline.close();
          reject(
            new Error('Observation session reached its 10-minute time limit.'),
          );
        }, remaining);
      }),
    ]);
  } finally {
    if (timer) clearTimeout(timer);
    readline.close();
  }
}

async function selectHumanState(
  stateId: 'BEFORE' | 'AFTER',
  deadline: number,
): Promise<HumanState> {
  const choices = humanStatesFor(stateId);
  stdout.write(
    '\nUser-reported state (kept separate from DOM observations):\n',
  );
  choices.forEach((state, index) => stdout.write(`  ${index + 1}. ${state}\n`));
  while (true) {
    const value = await askWithinSession('Choose a number: ', deadline);
    const state = choices[Number.parseInt(value, 10) - 1];
    if (state) return state;
    stdout.write('Choose one of the listed options.\n');
  }
}

async function scanPage(page: Page) {
  return await page.evaluate(capturePageSnapshot, {
    maxElements: 10_000,
    maxDepth: 10,
    maxOutputNodes: 100,
    maxCandidates: 32,
    maxSiblings: 12,
    maxOutputBytes: 9_000,
  });
}

function snapshotSummary(
  snapshot: Awaited<ReturnType<typeof scanPage>>,
): string {
  return `${snapshot.scan.status}; ${snapshot.scan.visitedElements} elements inspected; ${snapshot.nodes.length} structural nodes retained; DOM state ${snapshot.domState}.`;
}

async function snapshotState(
  page: Page,
  stateId: 'POINT' | 'BEFORE' | 'AFTER',
  humanState: HumanState,
  deadline: number,
): Promise<{
  stateId: 'POINT' | 'BEFORE' | 'AFTER';
  humanState: HumanState;
  domState: DomState;
  nodes: Awaited<ReturnType<typeof scanPage>>['nodes'];
  events: CaptureEvent[];
  scan: Awaited<ReturnType<typeof scanPage>>['scan'];
}> {
  if (Date.now() >= deadline)
    throw new Error('Observation session reached its 10-minute time limit.');
  const snapshot = await scanPage(page);
  stdout.write(`DOM observation: ${snapshotSummary(snapshot)}\n`);
  if (snapshot.scan.status !== 'COMPLETE') {
    stdout.write(
      'This snapshot is incomplete. The missing structure will remain UNKNOWN.\n',
    );
  }
  if (humanState === 'UNKNOWN' && snapshot.domState !== 'UNKNOWN') {
    stdout.write(
      'DOM fields are recorded independently; no human state was asserted.\n',
    );
  }
  return {
    stateId,
    humanState,
    domState: domState(snapshot.domState),
    nodes: snapshot.nodes,
    events: [],
    scan: snapshot.scan,
  };
}

async function captureOne(
  page: Page,
  browserMajor: number | null,
  webgl: 'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN',
  deadline: number,
): Promise<void> {
  const scenarioId: ScenarioId = 'active-sketch';
  const scenario = REFERENCE_SCENARIOS.find((item) => item.id === scenarioId);
  if (!scenario) throw new Error('Sketch capture scenario is unavailable.');
  stdout.write(
    '\nTwo-snapshot Sketch capture: start in a Part Studio with the Sketch toolbar command available. The recorder will take one snapshot, then you will manually enter Sketch and take a second snapshot.\n',
  );
  const beforeHumanState = await selectHumanState('BEFORE', deadline);
  await askWithinSession(
    'Press ENTER to capture BEFORE (the current Part Studio / Sketch command state): ',
    deadline,
  );
  const before = await snapshotState(
    page,
    'BEFORE',
    beforeHumanState,
    deadline,
  );
  stdout.write(
    'Now manually open Sketch in Onshape. The recorder will not click it. Leave the Sketch UI open; if it is not recognizable, still capture the UNKNOWN result and structural sample.\n',
  );
  await askWithinSession(
    'Press ENTER when the Sketch UI is ready for AFTER capture: ',
    deadline,
  );
  const afterHumanState = await selectHumanState('AFTER', deadline);
  await askWithinSession('Press ENTER to capture AFTER: ', deadline);
  const after = await snapshotState(page, 'AFTER', afterHumanState, deadline);
  const observations = [before, after];

  const record = {
    schemaVersion: 1,
    captureId: `cap_${randomUUID()}`,
    capturedAt: new Date().toISOString(),
    captureSource: 'LOCAL_CHROME',
    captureOrigin: 'OWNER_CAPTURE',
    scenarioId,
    targetId: scenario.targetId,
    reviewStatus: 'PENDING_REVIEW',
    authorization: {
      disposablePartStudioConfirmed: true,
      manualSignInConfirmed: true,
      noGeometryEdited: true,
    },
    browser: { name: 'CHROME', majorVersion: browserMajor, webgl },
    observations,
  };
  const checked = validateCapture(record);
  const serialized = `${JSON.stringify(checked, null, 2)}\n`;
  if (new TextEncoder().encode(serialized).byteLength > 32_768)
    throw new Error(
      'This sanitized capture exceeds the export limit and was not saved.',
    );
  await mkdir(PENDING_DIRECTORY, { recursive: true, mode: 0o700 });
  const outputPath = join(PENDING_DIRECTORY, `${checked.captureId}.json`);
  await writeFile(outputPath, serialized, { flag: 'wx', mode: 0o600 });
  const digest = await sha256Hex(serialized);
  try {
    await writeFile(`${outputPath}.sha256`, `${digest}\n`, {
      flag: 'wx',
      mode: 0o600,
    });
  } catch (error) {
    await rm(outputPath, { force: true });
    throw error;
  }
  stdout.write(
    `Saved sanitized capture for owner review: ${relative(REPOSITORY_ROOT, outputPath)}\n`,
  );
  stdout.write(`Pending capture SHA-256: ${digest}\n`);
  stdout.write(
    'The capture is PENDING_REVIEW. It is not an approved baseline or a LIVE_VERIFIED result.\n',
  );
}

async function webglSupport(
  page: Page,
): Promise<'AVAILABLE' | 'UNAVAILABLE' | 'UNKNOWN'> {
  try {
    return await page.evaluate(() => {
      const canvas = document.createElement('canvas');
      const context = canvas.getContext('webgl2') ?? canvas.getContext('webgl');
      if (!context) return 'UNAVAILABLE' as const;
      context.getExtension('WEBGL_lose_context')?.loseContext();
      return 'AVAILABLE' as const;
    });
  } catch {
    return 'UNKNOWN';
  }
}

export async function runReferenceCapture(): Promise<void> {
  assertNotCi();
  const confirmation = await askWithinSession(
    'This creates a clean temporary Chrome profile, uses no Leqad extension, and deletes the profile on exit. Type START to begin: ',
    Date.now() + MAX_SIGN_IN_MS,
  );
  if (confirmation.trim() !== 'START') {
    stdout.write('No browser launched.\n');
    return;
  }

  const profileDirectory = await mkdtemp(
    join(tmpdir(), 'leqad-onshape-reference-'),
  );
  const relativeProfile = relative(REPOSITORY_ROOT, profileDirectory);
  const profileIsInsideRepository =
    relativeProfile === '' ||
    (relativeProfile !== '..' &&
      !relativeProfile.startsWith(`..${sep}`) &&
      !isAbsolute(relativeProfile));
  if (!isAbsolute(profileDirectory) || profileIsInsideRepository) {
    await rm(profileDirectory, { recursive: true, force: true });
    throw new Error(
      'The temporary Chrome profile is not outside the repository; capture stopped.',
    );
  }
  try {
    await chmod(profileDirectory, 0o700);
  } catch {
    // Windows ACLs provide the platform-specific private-profile boundary.
  }

  let context: BrowserContext | undefined;
  let page: Page | undefined;
  try {
    const executablePath = process.env.LEQAD_REFERENCE_CHROME;
    context = await chromium.launchPersistentContext(profileDirectory, {
      ...(executablePath ? { executablePath } : { channel: 'chrome' as const }),
      headless: false,
      args: ['--disable-extensions', '--no-first-run'],
      timeout: 30_000,
    });
    page = context.pages()[0] ?? (await context.newPage());
    await page.goto('https://cad.onshape.com', {
      waitUntil: 'domcontentloaded',
      timeout: 60_000,
    });
    const signInDeadline = signInDeadlineFromLaunch(Date.now());
    stdout.write(
      'Chrome opened with a fresh profile and extensions disabled. Sign into Onshape manually, then open an authorized disposable Part Studio.\n',
    );
    const ready = await askWithinSession(
      'When the Part Studio is open, type READY. If you do not have an authenticated authorized session, type STOP: ',
      signInDeadline,
    );
    if (ready.trim().toUpperCase() !== 'READY') {
      stdout.write('No authenticated capture made.\n');
      return;
    }
    const deadline = observationDeadlineAfterPartStudioReady(Date.now());
    const supportedPartStudioRoute = await page.evaluate(
      isSupportedOnshapePartStudioLocation,
    );
    if (!supportedPartStudioRoute) {
      stdout.write(
        'The active tab is not on the supported Onshape Part Studio workspace route. No capture was made; no URL or identifier was recorded.\n',
      );
      return;
    }
    const authorization = await askWithinSession(
      'Confirm this is an authorized disposable Part Studio and you will not edit CAD geometry. Type YES: ',
      deadline,
    );
    if (authorization.trim() !== 'YES') {
      stdout.write(
        'No capture made; authorization confirmation was not provided.\n',
      );
      return;
    }
    const webgl = await webglSupport(page);
    if (webgl === 'UNAVAILABLE')
      stdout.write(
        'WebGL is unavailable in this Chrome session; capture remains diagnostic-only and cannot validate the rendered workspace.\n',
      );
    const version = context.browser()?.version() ?? '';
    const versionMajor = Number.parseInt(version.split('.')[0] ?? '', 10);
    const browserMajor = Number.isInteger(versionMajor) ? versionMajor : null;

    await captureOne(page, browserMajor, webgl, deadline);
    stdout.write(
      'Observation session ended. No CAD controls were clicked by the recorder.\n',
    );
  } catch {
    stdout.write(
      'Reference capture stopped safely after a local browser/session error. No unsanitized error details were recorded.\n',
    );
    stdout.write(
      'Verify local Chrome and WebGL support before starting a new capture.\n',
    );
    process.exitCode = 1;
  } finally {
    if (context) await context.close().catch(() => undefined);
    await rm(profileDirectory, {
      recursive: true,
      force: true,
      maxRetries: 3,
      retryDelay: 100,
    });
    stdout.write(`Temporary profile ${basename(profileDirectory)} removed.\n`);
  }
}

if (
  process.argv[1] &&
  resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  await runReferenceCapture();
}
