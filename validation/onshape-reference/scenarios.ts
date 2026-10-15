import type { ScenarioId, TargetId } from './schema.ts';

export interface ScenarioDefinition {
  id: ScenarioId;
  title: string;
  targetId: TargetId;
  acceptanceChecks: readonly string[];
  nextAction: string;
  historicalNote?: string;
}

export const REFERENCE_SCENARIOS: readonly ScenarioDefinition[] = [
  {
    id: 'clean-part-studio',
    title: 'Clean Part Studio',
    targetId: 'part-studio-tab',
    acceptanceChecks: [
      'Part Studio context observed',
      'Sketch command identity recorded',
      'permission remains UNKNOWN unless independently supported',
    ],
    nextAction:
      'Capture a fresh authorized Part Studio session and separately test Leqad recognition.',
  },
  {
    id: 'active-sketch',
    title: 'Active Sketch',
    targetId: 'finish-sketch-command',
    acceptanceChecks: [
      'Human and DOM sketch state recorded separately',
      'Finish Sketch control observed',
    ],
    nextAction:
      'Capture active Sketch controls; do not infer plane association or geometry.',
  },
  {
    id: 'sketch-show',
    title: 'Sketch command SHOW',
    targetId: 'sketch-command',
    acceptanceChecks: [
      'Correct control target',
      'Highlight is visible and click-through',
      'cleanup observed',
    ],
    nextAction:
      'Run the current extension build in a separate product-test profile.',
  },
  {
    id: 'top-plane',
    title: 'Top reference plane highlight',
    targetId: 'top-plane',
    acceptanceChecks: [
      'Only the Top plane row is highlighted',
      'Top camera view is excluded',
      'no automatic CAD action',
    ],
    nextAction: 'Repeat the live acceptance test on the current PR commit.',
    historicalNote:
      'Owner-reported historical live success; current-build retest is still required.',
  },
  {
    id: 'rectangle-dropdown',
    title: 'Rectangle tool group dropdown',
    targetId: 'rectangle-tool-group',
    acceptanceChecks: [
      'Closed and open snapshots',
      'DOM transition or explicit incomplete result',
      'variant labels remain diagnostic-only',
    ],
    nextAction:
      'Capture the manually opened dropdown; do not enable individual variants from a fixture.',
  },
  {
    id: 'invalid-context',
    title: 'Invalid or unsupported context',
    targetId: 'none',
    acceptanceChecks: [
      'No unsupported target is highlighted',
      'UNKNOWN/unsupported result is explained',
    ],
    nextAction: 'Capture authorized negative contexts only when available.',
  },
  {
    id: 'retry-recovery',
    title: 'Retry and recovery',
    targetId: 'none',
    acceptanceChecks: [
      'Retry performs a fresh check',
      'unknown remains unknown',
      'written fallback is available',
    ],
    nextAction:
      'Test missing, ambiguous, and rerendered controls in the product profile.',
  },
];
