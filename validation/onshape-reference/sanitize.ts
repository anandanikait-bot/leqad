import type { CaptureNode, CaptureObservation } from './schema.ts';

export interface TransitionSummary {
  status: 'CONFIRMED' | 'UNKNOWN' | 'INCOMPLETE';
  basis: 'STRUCTURAL_CHANGE' | 'NO_STRUCTURAL_CHANGE' | 'INCOMPLETE_SCAN';
}

function structuralFingerprint(
  observation: Pick<CaptureObservation, 'domState' | 'nodes'>,
): string {
  return JSON.stringify({
    domState: observation.domState,
    nodes: observation.nodes.map((node: CaptureNode) => ({
      nodeIndex: node.nodeIndex,
      parentIndex: node.parentIndex,
      childIndexes: node.childIndexes,
      tag: node.tag,
      label: node.label,
      role: node.role,
      expanded: node.aria.expanded,
      selected: node.aria.selected,
      visibility: node.visibility,
      bounds: node.bounds,
    })),
  });
}

/** A user interaction is never enough to establish that the DOM transitioned. */
export function summarizeTransition(
  before: CaptureObservation,
  after: CaptureObservation,
): TransitionSummary {
  if (before.scan.status !== 'COMPLETE' || after.scan.status !== 'COMPLETE') {
    return { status: 'INCOMPLETE', basis: 'INCOMPLETE_SCAN' };
  }
  if (structuralFingerprint(before) === structuralFingerprint(after)) {
    return { status: 'UNKNOWN', basis: 'NO_STRUCTURAL_CHANGE' };
  }
  return { status: 'CONFIRMED', basis: 'STRUCTURAL_CHANGE' };
}
