import type { VerificationStatus } from '@leqad/contracts';
import type { OnshapePageContext } from './onshapePage';
import {
  findSelectedSemanticTarget,
  findSemanticTarget,
} from './semanticTargets';

export function evaluateFoundationsSketchProgress(
  page: OnshapePageContext,
  root: ParentNode,
): VerificationStatus {
  if (
    !page.supported ||
    !page.editable ||
    page.modelType !== 'workspace' ||
    !page.workspaceId
  ) {
    return 'UNKNOWN';
  }

  const selectedTopPlane = findSelectedSemanticTarget(root, 'top-plane');
  const finishSketchControl = findSemanticTarget(root, 'finish-sketch');
  return selectedTopPlane && finishSketchControl ? 'PASS' : 'UNKNOWN';
}
