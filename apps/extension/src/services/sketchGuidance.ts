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
  // A visible, distinctly labeled Sketch dialog with a recognized plane is
  // sufficient to offer help for sketch editing. This observation is *not*
  // model verification and does not establish editing permission.
  const dialogPlane = observedSketchDialogPlane(root);
  const editingAppearsActive =
    findSemanticTarget(root, 'finish-sketch') !== null || dialogPlane !== null;
  return {
    editingAppearsActive,
    dialogPlane,
  };
}
