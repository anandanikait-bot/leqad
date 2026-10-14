import { createRoot } from 'react-dom/client';
import { AssistantPanel } from '../../src/components/panel/AssistantPanel';
import { evaluateFoundationsStepProgress } from '../../src/services/foundationsEvidence';
import styles from '../../src/styles/panel.css?inline';
import { createSemanticHighlighter } from '../../src/services/semanticTargets';
import { observeSketchGuidanceUi } from '../../src/services/sketchGuidance';
import {
  collectRecognitionDiagnostics,
  createTopRowCapture,
} from '../../src/services/recognitionDiagnostics';

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
const highlighter = createSemanticHighlighter(document);
window.addEventListener('pagehide', highlighter.clear, { once: true });
window.addEventListener(
  'fixture:unmount',
  () => {
    reactRoot.unmount();
    highlighter.clear();
    host.remove();
  },
  { once: true },
);

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
      editability: new URLSearchParams(location.search).has(
        'unknown-permission',
      )
        ? 'unknown'
        : 'editable',
      elementType: 'part-studio',
      capabilitySource: 'UI',
      capabilityObservedAt: new Date().toISOString(),
    }}
    initialPanelPreferences={{
      collapsed: false,
      position: { left: 760, top: 40 },
      onboardingComplete: true,
    }}
    onShowTarget={highlighter.show}
    onClearTarget={highlighter.clear}
    onObserveSketchUi={() => observeSketchGuidanceUi(document)}
    onCaptureTopRow={() => createTopRowCapture(document)}
    onRecognitionDiagnostics={(capture) =>
      collectRecognitionDiagnostics(document, capture)
    }
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
