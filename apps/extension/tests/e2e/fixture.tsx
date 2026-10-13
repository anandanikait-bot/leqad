import { createRoot } from 'react-dom/client';
import { AssistantPanel } from '../../src/components/panel/AssistantPanel';
import { evaluateFoundationsStepProgress } from '../../src/services/foundationsEvidence';
import styles from '../../src/styles/panel.css?inline';
import { recognizeSemanticTarget } from '../../src/services/semanticTargets';
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
      versionId: null,
      microversionId: null,
      elementId: 'fixture-part-studio',
      modelType: 'workspace',
      editability: 'editable',
      elementType: 'part-studio',
      capabilitySource: 'UI',
      capabilityObservedAt: new Date().toISOString(),
    }}
    initialPanelPreferences={{
      collapsed: false,
      position: { left: 760, top: 40 },
      onboardingComplete: true,
    }}
    onShowTarget={(targetId) => {
      const recognition = recognizeSemanticTarget(document, targetId);
      highlight?.remove();
      if (recognition.status !== 'FOUND' || !recognition.element) {
        return recognition;
      }
      highlight = createTargetHighlight(recognition.element);
      return recognition;
    }}
    onCheckStep={(_stepId, signal) => {
      const page = {
        supported: true as const,
        documentId: 'fixture-document',
        workspaceId: 'fixture-workspace',
        versionId: null,
        microversionId: null,
        elementId: 'fixture-part-studio',
        modelType: 'workspace' as const,
        editability: 'editable' as const,
        elementType: 'part-studio' as const,
        capabilitySource: 'UI' as const,
        capabilityObservedAt: new Date().toISOString(),
      };
      return evaluateFoundationsStepProgress(page, document, signal);
    }}
  />,
);
