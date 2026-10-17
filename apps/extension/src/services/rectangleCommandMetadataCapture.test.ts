import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  captureRectangleCommandMetadata,
  createRectangleCommandMetadataReport,
  serializeRectangleCommandMetadataReport,
} from './rectangleCommandMetadataCapture';

// Simulated DOM fixtures only. They test diagnostic privacy and structure, not
// actual Onshape compatibility or production recognition.
afterEach(() => {
  document.body.replaceChildren();
  vi.restoreAllMocks();
});

function visible(element: HTMLElement, x = 10, y = 10) {
  element.getBoundingClientRect = () => new DOMRect(x, y, 32, 24);
}

function command(id: string, parent: HTMLElement) {
  const element = document.createElement('div');
  element.setAttribute('command-id', id);
  visible(element);
  parent.append(element);
  return element;
}

describe('Rectangle command metadata capture', () => {
  it('records only allowlisted command identities and the hypothesized toolbar marker', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar private-account-class';
    const line = command('LINESEGMENT', toolbar);
    const corner = command('RECTANGLE_TWO_CORNERS', toolbar);
    command('private-document-command', toolbar);
    document.body.append(toolbar);

    const events = vi.fn();
    line.addEventListener('click', events);
    corner.addEventListener('click', events);
    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot).toMatchObject({
      ownerReportedState: 'SKETCH_EDITING',
      observationGeneration: 1,
      toolbarMarkers: 1,
      sketchClue: 'PRESENT',
      scan: { status: 'COMPLETE', unallowlistedCommandIds: 1 },
    });
    expect(snapshot.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commandId: 'LINESEGMENT',
          location: 'TOOLBAR',
        }),
        expect.objectContaining({
          commandId: 'RECTANGLE_TWO_CORNERS',
          location: 'TOOLBAR',
        }),
      ]),
    );
    expect(JSON.stringify(snapshot)).not.toContain('private-document-command');
    expect(JSON.stringify(snapshot)).not.toContain('private-account-class');
    expect(events).not.toHaveBeenCalled();
  });

  it('records a distinct arrow boundary and a portaled visible Rectangle menu', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const group = document.createElement('div');
    const face = command('RECTANGLE_CENTER', group);
    const arrow = document.createElement('div');
    arrow.className = 'dropdown-arrow';
    visible(face, 20, 10);
    visible(arrow, 52, 10);
    group.append(arrow);
    toolbar.append(group);

    const menu = document.createElement('div');
    menu.className = 'os-tool-dropdown-content';
    command('RECTANGLE_TWO_CORNERS', menu);
    command('RECTANGLE_CENTER', menu);
    command('RECTANGLE_ALIGNED', menu);
    document.body.append(toolbar, menu);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'RECTANGLE_MENU_OPEN',
      2,
    );

    expect(snapshot).toMatchObject({
      arrowMarkers: 1,
      menuMarkers: 1,
      ownership: [
        expect.objectContaining({
          faceCommandId: 'RECTANGLE_CENTER',
          arrowRelation: 'SAME_PARENT',
          visibleArrowCount: 1,
        }),
      ],
    });
    expect(
      snapshot.commands.filter(({ location }) => location === 'MENU'),
    ).toHaveLength(3);
  });

  it('keeps duplicate, hidden, disabled and unknown relationships explicit', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    const first = command('RECTANGLE_TWO_CORNERS', toolbar);
    const second = command('RECTANGLE_TWO_CORNERS', toolbar);
    second.setAttribute('aria-disabled', 'true');
    const hidden = command('RECTANGLE_CENTER', toolbar);
    hidden.hidden = true;
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(first.isConnected).toBe(true);
    expect(snapshot.identity).toBe('AMBIGUOUS');
    expect(snapshot.commands).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          commandId: 'RECTANGLE_TWO_CORNERS',
          enabled: 'DISABLED',
        }),
        expect.objectContaining({
          commandId: 'RECTANGLE_CENTER',
          visibility: 'HIDDEN',
        }),
      ]),
    );
  });

  it('reports an incomplete bounded scan without promoting an unknown command', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    for (let index = 0; index < 300; index += 1)
      command(`unrelated-${index}`, toolbar);
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.scan.status).toBe('INCOMPLETE');
    expect(snapshot.identity).toBe('UNKNOWN');
    expect(snapshot.commands).toEqual([
      expect.objectContaining({ commandId: 'RECTANGLE_TWO_CORNERS' }),
    ]);
  });

  it('bounds ancestor inspection and retains conservative visibility and enabledness', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    let parent = toolbar;
    for (let depth = 0; depth < 20; depth += 1) {
      const wrapper = document.createElement('div');
      parent.append(wrapper);
      parent = wrapper;
    }
    command('RECTANGLE_TWO_CORNERS', parent);
    document.body.append(toolbar);

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.scan).toMatchObject({
      status: 'INCOMPLETE',
      reasons: expect.arrayContaining(['ANCESTOR_LIMIT_REACHED']),
    });
    expect(snapshot.commands[0]).toMatchObject({
      visibility: 'UNKNOWN',
      enabled: 'UNKNOWN',
    });
    expect(snapshot.identity).toBe('UNKNOWN');
  });

  it('ignores unrelated global arrows and marks combined region overflow incomplete', () => {
    const unrelatedArrow = document.createElement('div');
    unrelatedArrow.className = 'dropdown-arrow';
    visible(unrelatedArrow);
    document.body.append(unrelatedArrow);
    for (let region = 0; region < 2; region += 1) {
      const toolbar = document.createElement('div');
      toolbar.className = 'os-element-toolbar';
      for (let index = 0; index < 140; index += 1)
        command(`unrelated-${region}-${index}`, toolbar);
      document.body.append(toolbar);
    }

    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );

    expect(snapshot.arrowMarkers).toBe(0);
    expect(snapshot.ownership).toEqual([]);
    expect(snapshot.scan).toMatchObject({
      status: 'INCOMPLETE',
      reasons: expect.arrayContaining(['COMMAND_LIMIT_REACHED']),
    });
  });

  it('keeps owner-reported states separate from observed command evidence', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    command('extrude', toolbar);
    document.body.append(toolbar);

    const report = createRectangleCommandMetadataReport([
      captureRectangleCommandMetadata(document, 'EXTRUDE_EDITING', 4),
    ]);

    expect(report).toMatchObject({
      observationClaim: 'OWNER_REPORTED_STATE_WITH_DOM_OBSERVATIONS',
      productionRecognition: 'NOT_RUN',
      geometryVerification: 'NOT_RUN',
      snapshots: [
        expect.objectContaining({
          ownerReportedState: 'EXTRUDE_EDITING',
          sketchClue: 'ABSENT',
          extrudeClue: 'PRESENT',
        }),
      ],
    });
  });

  it('serializes a closed privacy-safe schema even when input is poisoned', () => {
    const toolbar = document.createElement('div');
    toolbar.className = 'os-element-toolbar';
    command('RECTANGLE_TWO_CORNERS', toolbar);
    document.body.append(toolbar);
    const snapshot = captureRectangleCommandMetadata(
      document,
      'SKETCH_EDITING',
      1,
    );
    const poisonedCommand = snapshot
      .commands[0] as (typeof snapshot.commands)[number] & {
      privateText?: string;
      url?: string;
    };
    poisonedCommand.privateText = 'Private CAD project';
    poisonedCommand.url = 'https://cad.onshape.com/documents/private-id';
    snapshot.ownership = Array.from({ length: 100 }, () => ({
      faceCommandId: 'RECTANGLE_TWO_CORNERS' as const,
      arrowRelation: 'SAME_PARENT' as const,
      visibleArrowCount: 1,
      parentChildCount: 2,
      parentChildCountCapped: false,
    }));
    const report = createRectangleCommandMetadataReport([
      snapshot,
    ]) as ReturnType<typeof createRectangleCommandMetadataReport> & {
      url?: string;
      html?: string;
      token?: string;
    };
    report.url = 'https://cad.onshape.com/documents/private-id';
    report.html = '<div data-account="secret">Private CAD</div>';
    report.token = 'SECRET_TOKEN';

    const output = serializeRectangleCommandMetadataReport(report);

    expect(output).toContain('leqad-rectangle-command-metadata/1');
    expect(JSON.parse(output).snapshots[0].ownership).toHaveLength(16);
    for (const secret of [
      'private-id',
      'data-account',
      'Private CAD',
      'SECRET_TOKEN',
      'url',
      'html',
      'token',
      'privateText',
    ])
      expect(output).not.toContain(secret);
  });
});
