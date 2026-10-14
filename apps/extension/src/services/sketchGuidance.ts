import { findSemanticTarget } from './semanticTargets';
import {
  observedSketchDialogPlane,
  type ReferencePlane,
} from './referencePlanes';

export interface SketchGuidanceObservation {
  editingAppearsActive: boolean;
  dialogPlane: ReferencePlane | null;
}

export function observeSketchGuidanceUi(
  root: ParentNode,
): SketchGuidanceObservation {
  const editingAppearsActive =
    findSemanticTarget(root, 'finish-sketch') !== null;
  return {
    editingAppearsActive,
    dialogPlane: editingAppearsActive ? observedSketchDialogPlane(root) : null,
  };
}
