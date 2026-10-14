import { describe, expect, it } from 'vitest';
import {
  isValidCapture,
  validateCapture,
  type ReferenceCapture,
} from './schema.ts';
import { summarizeTransition } from './sanitize.ts';
import { capturePageSnapshot } from '../../tools/onshape-reference/capture-page.ts';
import { compareReferenceContract } from './evaluate.ts';
import {
  sha256Hex,
  verifyApprovedManifest,
  verifyPendingHashSidecar,
} from './integrity.ts';
import { checkImportBoundaries } from './dependency-boundary.ts';
import type { ProductObservation } from './evaluate.ts';

const makeCapture = (
  overrides: Partial<ReferenceCapture> = {},
): ReferenceCapture => ({
  schemaVersion: 1,
  captureId: 'cap_simulated_001',
  capturedAt: '2026-10-14T12:00:00.000Z',
  captureSource: 'LOCAL_CHROME',
  captureOrigin: 'SIMULATED_FIXTURE',
  scenarioId: 'rectangle-dropdown',
  targetId: 'rectangle-tool-group',
  reviewStatus: 'PENDING_REVIEW',
  authorization: {
    disposablePartStudioConfirmed: true,
    manualSignInConfirmed: true,
    noGeometryEdited: true,
  },
  browser: {
    name: 'CHROME',
    majorVersion: 140,
    webgl: 'AVAILABLE',
  },
  observations: [
    {
      stateId: 'BEFORE',
      humanState: 'RECTANGLE_MENU_CLOSED',
      domState: 'NO_MENU_EVIDENCE',
      nodes: [
        {
          nodeIndex: 0,
          parentIndex: null,
          childIndexes: [1],
          tag: 'DIV',
          label: null,
          role: null,
          aria: {
            expanded: 'UNKNOWN',
            selected: 'UNKNOWN',
            disabled: 'UNKNOWN',
            hidden: 'UNKNOWN',
          },
          accessibility: {
            nameAttributePresent: false,
            roleAttributePresent: false,
            tabIndexAttributePresent: false,
          },
          visibility: 'VISIBLE',
          clipping: 'NONE',
          bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.1 },
        },
        {
          nodeIndex: 1,
          parentIndex: 0,
          childIndexes: [],
          tag: 'BUTTON',
          label: 'Rectangle',
          role: 'BUTTON',
          aria: {
            expanded: 'FALSE',
            selected: 'UNKNOWN',
            disabled: 'FALSE',
            hidden: 'FALSE',
          },
          accessibility: {
            nameAttributePresent: true,
            roleAttributePresent: true,
            tabIndexAttributePresent: false,
          },
          visibility: 'VISIBLE',
          clipping: 'NONE',
          bounds: { x: 0.1, y: 0.1, width: 0.05, height: 0.04 },
        },
      ],
      events: [],
      scan: {
        visitedElements: 18,
        recognizedLabelCount: 1,
        accessibleNameCount: 1,
        roleAttributeCount: 1,
        nativeControlCount: 1,
        nodeLimitReached: false,
        depthLimitReached: false,
        outputLimitReached: false,
        status: 'COMPLETE',
      },
    },
    {
      stateId: 'AFTER',
      humanState: 'RECTANGLE_MENU_OPEN',
      domState: 'MENU_VISIBLE',
      nodes: [
        {
          nodeIndex: 0,
          parentIndex: null,
          childIndexes: [1, 2],
          tag: 'DIV',
          label: null,
          role: null,
          aria: {
            expanded: 'UNKNOWN',
            selected: 'UNKNOWN',
            disabled: 'UNKNOWN',
            hidden: 'UNKNOWN',
          },
          accessibility: {
            nameAttributePresent: false,
            roleAttributePresent: false,
            tabIndexAttributePresent: false,
          },
          visibility: 'VISIBLE',
          clipping: 'NONE',
          bounds: { x: 0.1, y: 0.1, width: 0.4, height: 0.1 },
        },
        {
          nodeIndex: 1,
          parentIndex: 0,
          childIndexes: [],
          tag: 'BUTTON',
          label: 'Rectangle',
          role: 'BUTTON',
          aria: {
            expanded: 'TRUE',
            selected: 'UNKNOWN',
            disabled: 'FALSE',
            hidden: 'FALSE',
          },
          accessibility: {
            nameAttributePresent: true,
            roleAttributePresent: true,
            tabIndexAttributePresent: false,
          },
          visibility: 'VISIBLE',
          clipping: 'NONE',
          bounds: { x: 0.1, y: 0.1, width: 0.05, height: 0.04 },
        },
        {
          nodeIndex: 2,
          parentIndex: 0,
          childIndexes: [],
          tag: 'DIV',
          label: 'Aligned Rectangle',
          role: 'MENUITEM',
          aria: {
            expanded: 'UNKNOWN',
            selected: 'UNKNOWN',
            disabled: 'FALSE',
            hidden: 'FALSE',
          },
          accessibility: {
            nameAttributePresent: true,
            roleAttributePresent: true,
            tabIndexAttributePresent: false,
          },
          visibility: 'VISIBLE',
          clipping: 'NONE',
          bounds: { x: 0.1, y: 0.15, width: 0.1, height: 0.04 },
        },
      ],
      events: [{ type: 'CLICK', key: null, label: 'Rectangle', offsetMs: 120 }],
      scan: {
        visitedElements: 21,
        recognizedLabelCount: 2,
        accessibleNameCount: 2,
        roleAttributeCount: 2,
        nativeControlCount: 1,
        nodeLimitReached: false,
        depthLimitReached: false,
        outputLimitReached: false,
        status: 'COMPLETE',
      },
    },
  ],
  ...overrides,
});

describe('independent reference capture contract (synthetic fixtures)', () => {
  it('accepts the sanitized bounded fixture without claiming approval', () => {
    expect(validateCapture(makeCapture()).reviewStatus).toBe('PENDING_REVIEW');
  });

  it('rejects arbitrary text, URLs, identifiers, or extra properties', () => {
    const invalid = {
      ...makeCapture(),
      documentUrl: 'https://cad.onshape.com/documents/private-id',
    };

    expect(isValidCapture(invalid)).toBe(false);
  });

  it('captures only exact allowlisted names and safe structural fields', () => {
    document.body.innerHTML = `
      <main id="private-id" class="private-class">
        <button aria-label="Rectangle" aria-expanded="false">Rectangle</button>
        <button aria-label="Private feature name" value="secret">Private feature name</button>
        <span>Account email and CAD notes</span>
      </main>`;

    const snapshot = capturePageSnapshot({
      maxElements: 100,
      maxDepth: 8,
      maxOutputBytes: 12_000,
    });
    const serialized = JSON.stringify(snapshot);

    expect(snapshot.nodes.some((node) => node.label === 'Rectangle')).toBe(
      true,
    );
    expect(serialized).not.toContain('private-id');
    expect(serialized).not.toContain('private-class');
    expect(serialized).not.toContain('Private feature name');
    expect(serialized).not.toContain('secret');
    expect(serialized).not.toContain('Account email');
  });

  it('preserves incomplete scans instead of claiming complete observation', () => {
    document.body.innerHTML =
      Array.from(
        { length: 60 },
        (_, index) => `<button>Unrelated ${index}</button>`,
      ).join('') + '<button>Rectangle</button>';

    const snapshot = capturePageSnapshot({
      maxElements: 20,
      maxDepth: 4,
      maxOutputBytes: 2_000,
    });

    expect(snapshot.scan.nodeLimitReached).toBe(true);
    expect(snapshot.scan.status).toBe('INCOMPLETE_CAPTURE');
  });

  it('does not infer a menu transition from a click without a DOM change', () => {
    const capture = makeCapture();
    const before = capture.observations[0]!;
    const after = {
      ...capture.observations[1]!,
      nodes: before.nodes,
      domState: 'NO_MENU_EVIDENCE' as const,
    };

    expect(summarizeTransition(before, after).status).toBe('UNKNOWN');
    expect(summarizeTransition(before, after).basis).toBe(
      'NO_STRUCTURAL_CHANGE',
    );
  });

  it('keeps human-reported state distinct from DOM-observed state', () => {
    const capture = makeCapture({
      observations: [
        {
          ...makeCapture().observations[0]!,
          humanState: 'RECTANGLE_MENU_OPEN',
          domState: 'NO_MENU_EVIDENCE',
        },
        makeCapture().observations[1]!,
      ],
    });

    const observation = validateCapture(capture).observations[0]!;
    expect(observation.humanState).toBe('RECTANGLE_MENU_OPEN');
    expect(observation.domState).toBe('NO_MENU_EVIDENCE');
  });

  it('treats incomplete, ambiguous, stale, or unapproved references as non-passing', () => {
    const capture = makeCapture();
    const product = {
      scenarioId: 'rectangle-dropdown' as const,
      outcome: 'RECOGNIZED' as const,
      targetId: 'rectangle-tool-group' as const,
      menuEvidence: 'DOM_TRANSITION' as const,
      highlight: 'CORRECT' as const,
    };

    const unapproved = compareReferenceContract({
      capture,
      product,
      approval: 'PENDING_REVIEW',
      freshness: 'CURRENT',
    });
    expect(unapproved.status).toBe('NOT_RUN');

    const stale = compareReferenceContract({
      capture,
      product,
      approval: 'APPROVED',
      freshness: 'STALE',
    });
    expect(stale.status).toBe('NOT_RUN');

    const incomplete = compareReferenceContract({
      capture: makeCapture({
        observations: [
          {
            ...capture.observations[0]!,
            scan: {
              ...capture.observations[0]!.scan,
              nodeLimitReached: true,
              status: 'INCOMPLETE_CAPTURE',
            },
          },
          capture.observations[1]!,
        ],
      }),
      product,
      approval: 'APPROVED',
      freshness: 'CURRENT',
    });
    expect(incomplete.status).toBe('INSUFFICIENT_EVIDENCE');
  });

  it('fails wrong, missing, ambiguous, unsupported, or click-only product outcomes', () => {
    const capture = makeCapture();
    const base: ProductObservation = {
      scenarioId: 'rectangle-dropdown' as const,
      outcome: 'RECOGNIZED' as const,
      targetId: 'rectangle-tool-group' as const,
      menuEvidence: 'DOM_TRANSITION' as const,
      highlight: 'CORRECT' as const,
    };
    const compare = (product: ProductObservation) =>
      compareReferenceContract({
        capture,
        product,
        approval: 'APPROVED',
        freshness: 'CURRENT',
      });

    expect(compare({ ...base, targetId: 'sketch-command' }).status).toBe(
      'FAIL',
    );
    expect(compare({ ...base, outcome: 'MISSING' }).status).toBe('FAIL');
    expect(compare({ ...base, outcome: 'AMBIGUOUS' }).status).toBe('FAIL');
    expect(compare({ ...base, outcome: 'UNSUPPORTED' }).status).toBe('FAIL');
    expect(compare({ ...base, menuEvidence: 'CLICK_ONLY' }).status).toBe(
      'FAIL',
    );
    expect(compare({ ...base, highlight: 'UNKNOWN' }).status).toBe(
      'INSUFFICIENT_EVIDENCE',
    );
  });

  it('keeps matching synthetic contract results classified as SIMULATED', () => {
    const result = compareReferenceContract({
      capture: makeCapture(),
      product: {
        scenarioId: 'rectangle-dropdown',
        outcome: 'RECOGNIZED',
        targetId: 'rectangle-tool-group',
        menuEvidence: 'DOM_TRANSITION',
        highlight: 'CORRECT',
      },
      approval: 'APPROVED',
      freshness: 'CURRENT',
    });

    expect(result.status).toBe('PASS');
    expect(result.evidenceLevel).toBe('SIMULATED');
  });

  it('compares active Sketch evidence against the exact recognized target and catches missing or wrong recognition', () => {
    const sketchCapture = makeCapture({
      scenarioId: 'active-sketch',
      targetId: 'finish-sketch-command',
      observations: [
        {
          ...makeCapture().observations[0]!,
          stateId: 'BEFORE',
          humanState: 'PART_STUDIO_READY',
          domState: 'SKETCH_COMMAND_VISIBLE',
          nodes: makeCapture().observations[0]!.nodes.map((node) =>
            node.nodeIndex === 1 ? { ...node, label: 'Sketch' as const } : node,
          ),
        },
        {
          stateId: 'AFTER',
          humanState: 'SKETCH_ACTIVE',
          domState: 'SKETCH_CONTROLS_VISIBLE',
          nodes: [
            {
              nodeIndex: 0,
              parentIndex: null,
              childIndexes: [1],
              tag: 'DIV',
              label: null,
              role: null,
              aria: {
                expanded: 'UNKNOWN',
                selected: 'UNKNOWN',
                disabled: 'UNKNOWN',
                hidden: 'UNKNOWN',
              },
              accessibility: {
                nameAttributePresent: false,
                roleAttributePresent: false,
                tabIndexAttributePresent: false,
              },
              visibility: 'VISIBLE',
              clipping: 'NONE',
              bounds: { x: 0.1, y: 0.1, width: 0.2, height: 0.1 },
            },
            {
              nodeIndex: 1,
              parentIndex: 0,
              childIndexes: [],
              tag: 'BUTTON',
              label: 'Finish Sketch',
              role: 'BUTTON',
              aria: {
                expanded: 'UNKNOWN',
                selected: 'UNKNOWN',
                disabled: 'FALSE',
                hidden: 'FALSE',
              },
              accessibility: {
                nameAttributePresent: true,
                roleAttributePresent: true,
                tabIndexAttributePresent: false,
              },
              visibility: 'VISIBLE',
              clipping: 'NONE',
              bounds: { x: 0.12, y: 0.12, width: 0.08, height: 0.03 },
            },
          ],
          events: [],
          scan: {
            visitedElements: 10,
            recognizedLabelCount: 1,
            accessibleNameCount: 1,
            roleAttributeCount: 1,
            nativeControlCount: 1,
            nodeLimitReached: false,
            depthLimitReached: false,
            outputLimitReached: false,
            status: 'COMPLETE',
          },
        },
      ],
    });
    const productBase: ProductObservation = {
      scenarioId: 'active-sketch',
      outcome: 'RECOGNIZED',
      targetId: 'finish-sketch-command',
      menuEvidence: 'NOT_APPLICABLE',
      highlight: 'NOT_APPLICABLE',
    };
    const evaluate = (product: ProductObservation) =>
      compareReferenceContract({
        capture: sketchCapture,
        product,
        approval: 'APPROVED',
        freshness: 'CURRENT',
      });

    expect(evaluate(productBase)).toMatchObject({
      status: 'PASS',
      evidenceLevel: 'SIMULATED',
    });
    expect(
      evaluate({ ...productBase, targetId: 'sketch-command' }),
    ).toMatchObject({ status: 'FAIL', reason: 'TARGET_WRONG' });
    expect(
      evaluate({ ...productBase, outcome: 'MISSING', targetId: null }),
    ).toMatchObject({ status: 'FAIL', reason: 'TARGET_MISSING' });
  });

  it('detects tampering and refuses to approve a synthetic capture', async () => {
    const body = JSON.stringify(makeCapture());
    const goodHash = await sha256Hex(body);
    const manifest = {
      schemaVersion: 1,
      captures: [
        {
          captureId: 'cap_simulated_001',
          sha256: goodHash,
          file: 'cap_simulated_001.json',
          scenarioIds: ['rectangle-dropdown'],
          freshness: 'CURRENT',
          approvedAt: '2026-10-14T12:01:00.000Z',
        },
      ],
    };

    const clean = await verifyApprovedManifest(manifest, {
      'cap_simulated_001.json': body,
    });
    expect(clean.valid).toBe(false);
    expect(clean.errors).toContain(
      'SYNTHETIC_CAPTURE_CANNOT_BE_APPROVED:cap_simulated_001',
    );
    const tampered = await verifyApprovedManifest(manifest, {
      'cap_simulated_001.json': `${body} `,
    });
    expect(tampered.errors).toContain(
      'CAPTURE_HASH_MISMATCH:cap_simulated_001',
    );
  });

  it('detects edits to pending review bytes before owner approval', async () => {
    const content = JSON.stringify(makeCapture());
    const sidecar = `${await sha256Hex(content)}\n`;

    await expect(verifyPendingHashSidecar(content, sidecar)).resolves.toBe(
      true,
    );
    await expect(
      verifyPendingHashSidecar(`${content} `, sidecar),
    ).resolves.toBe(false);
    await expect(verifyPendingHashSidecar(content, 'not-a-hash')).resolves.toBe(
      false,
    );
  });

  it('blocks imports from production app code in the reference environment', () => {
    const result = checkImportBoundaries({
      'tools/onshape-reference/capture.ts':
        "import { findTarget } from '../../apps/extension/src/services/semanticTargets.ts';",
      'validation/onshape-reference/schema.ts':
        'export type Capture = unknown;',
    });

    expect(result.valid).toBe(false);
    expect(result.violations).toHaveLength(1);
  });
});
