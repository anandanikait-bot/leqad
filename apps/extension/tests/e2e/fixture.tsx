import { createRoot } from 'react-dom/client';
import { AssistantPanel } from '../../src/components/panel/AssistantPanel';
import {
  evaluateFoundationsSketchProgress,
  unavailableFoundationsDecision,
} from '../../src/services/foundationsEvidence';
import styles from '../../src/styles/panel.css?inline';
import { findSemanticTarget } from '../../src/services/semanticTargets';
import { createTargetHighlight } from '../../src/services/semanticTargets';

const host = document.createElement('leqad-e2e-host');
host.style.position = 'fixed';
host.style.inset = '0';
host.style.zIndex = '2147483000';
host.style.pointerEvents = 'none';
const shadow = host.attachShadow({ mode: 'open' });
const style = document.createElement('style');
style.textContent = styles;
const mountPoint = document.createElement('div');
shadow.append(style, mountPoint);
document.body.append(host);

const reactRoot = createRoot(mountPoint);
let highlight: ReturnType<typeof createTargetHighlight> | null = null;

reactRoot.render(
  <AssistantPanel
    page={{
      supported: true,
      documentId: 'fixture-document',
      workspaceId: 'fixture-workspace',
      elementId: 'fixture-part-studio',
      modelType: 'workspace',
      editable: true,
    }}
    initialPanelPreferences={{
      collapsed: false,
      position: { left: 760, top: 40 },
    }}
    onShowTarget={(targetId) => {
      const target = findSemanticTarget(document, targetId);
      highlight?.remove();
      if (!target) return false;
      highlight = createTargetHighlight(target);
      return true;
    }}
    onCheckStep={(_stepId, signal) =>
      signal === 'finish-sketch'
        ? evaluateFoundationsSketchProgress(
            {
              supported: true,
              documentId: 'fixture-document',
              workspaceId: 'fixture-workspace',
              elementId: 'fixture-part-studio',
              modelType: 'workspace',
              editable: true,
            },
            document,
          )
        : unavailableFoundationsDecision(
            undefined,
            'This fixture has no observer for the requested signal.',
            [signal],
          )
    }
  />,
);
