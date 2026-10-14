import { createRoot } from 'react-dom/client';
import { AssistantPanel } from '../../src/components/panel/AssistantPanel';
import { evaluateFoundationsStepProgress } from '../../src/services/foundationsEvidence';
import styles from '../../src/styles/panel.css?inline';
import { createSemanticHighlighter } from '../../src/services/semanticTargets';
import {
  createTargetHighlight,
  recognizeSemanticTarget,
} from '../../src/services/semanticTargets';
import type { TargetHighlight } from '../../src/services/semanticTargets';
import { observeSketchGuidanceUi } from '../../src/services/sketchGuidance';
import { GUIDANCE_REGISTRY } from '../../src/services/guidanceRegistry';
import type {
  GuidanceObservedState,
  GuidanceRegistry,
  GuidanceTargetId,
} from '../../src/services/guidanceRegistry';
import { createGuidanceRunner } from '../../src/services/guidanceRunner';
import {
  collectRecognitionDiagnostics,
  createTopRowCapture,
} from '../../src/services/recognitionDiagnostics';
import {
  captureManualRectangleDropdownSnapshot,
  createRectangleDropdownCapture,
} from '../../src/services/rectangleDropdownCapture';

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
let directHighlight: TargetHighlight | null = null;
let directHighlightTimer: number | null = null;
const clearGuidanceHighlight = () => {
  highlighter.clear();
  directHighlight?.remove();
  directHighlight = null;
  if (directHighlightTimer !== null) window.clearTimeout(directHighlightTimer);
  directHighlightTimer = null;
};

const simulatedVariantTarget =
  'test-only.simulated-corner-rectangle' as GuidanceTargetId;
const simulatedGuidanceRegistry: GuidanceRegistry = {
  ...GUIDANCE_REGISTRY,
  'rectangle-tool-group': {
    ...GUIDANCE_REGISTRY['rectangle-tool-group'],
    supportedLevels: ['HINT', 'SHOW', 'GUIDE'],
    guideRecipe: [
      { kind: 'HIGHLIGHT', targetId: 'rectangle-tool-group' },
      {
        kind: 'WAIT_FOR_UI_STATE',
        observationId: 'RECTANGLE_MENU_OPEN',
        expected: 'OPEN',
        timeoutMs: 10_000,
      },
      { kind: 'HIGHLIGHT', targetId: simulatedVariantTarget },
    ],
  },
};

const simulationNote = document.createElement('p');
simulationNote.textContent =
  'Simulated guidance menu only. This is not authenticated Onshape evidence.';
simulationNote.dataset.guidanceSimulationNote = 'true';
simulationNote.style.cssText =
  'position:fixed;left:16px;top:172px;z-index:2;background:#fff;padding:4px;font-size:12px';
document.body.append(simulationNote);
const rectangleControl =
  document.querySelector<HTMLButtonElement>('#fixture-rectangle');
let simulatedItemSelected = false;
rectangleControl?.addEventListener('click', () => {
  const existing = document.querySelector(
    '[data-guidance-simulation-menu="true"]',
  );
  if (existing) {
    existing.remove();
    return;
  }
  const menu = document.createElement('div');
  simulatedItemSelected = false;
  menu.dataset.guidanceSimulationMenu = 'true';
  menu.style.cssText =
    'position:fixed;left:120px;top:210px;width:190px;height:48px;background:white;border:1px solid #aaa';
  const item = document.createElement('button');
  item.type = 'button';
  item.textContent = 'Corner rectangle (simulated)';
  item.dataset.guidanceSimulationItem = 'true';
  item.style.cssText = 'width:100%;height:100%';
  item.addEventListener('click', () => {
    simulatedItemSelected = true;
    menu.remove();
  });
  menu.append(item);
  document.body.append(menu);
});

const guidanceRunner = createGuidanceRunner(
  {
    getContext: () =>
      observeSketchGuidanceUi(document).editingAppearsActive
        ? 'SKETCH_EDITING'
        : 'PART_STUDIO',
    resolveTarget: (targetId) => {
      if (targetId === simulatedVariantTarget) {
        return document.querySelector('[data-guidance-simulation-item="true"]')
          ? { status: 'FOUND' }
          : { status: 'MISSING' };
      }
      const definition = Object.values(GUIDANCE_REGISTRY).find(
        (action) => action.targetId === targetId,
      );
      if (!definition) return { status: 'MISSING' };
      const recognition = recognizeSemanticTarget(
        document,
        definition.semanticTarget,
      );
      return recognition.status === 'FOUND'
        ? { status: 'FOUND' }
        : recognition.status === 'AMBIGUOUS'
          ? { status: 'AMBIGUOUS' }
          : { status: 'MISSING' };
    },
    highlightTarget: (targetId) => {
      clearGuidanceHighlight();
      if (targetId === simulatedVariantTarget) {
        const target = document.querySelector<HTMLElement>(
          '[data-guidance-simulation-item="true"]',
        );
        if (!target) return false;
        directHighlight = createTargetHighlight(target);
        directHighlightTimer = window.setTimeout(clearGuidanceHighlight, 5000);
        return true;
      }
      const definition = Object.values(GUIDANCE_REGISTRY).find(
        (action) => action.targetId === targetId,
      );
      if (!definition) return false;
      const recognition = highlighter.show(definition.semanticTarget);
      return (
        recognition.status === 'FOUND' &&
        recognition.element?.isConnected === true
      );
    },
    clearHighlight: clearGuidanceHighlight,
    observe: (_observationId, onState) => {
      const readState = (): GuidanceObservedState =>
        _observationId === 'SKETCH_UI_ACTIVE'
          ? observeSketchGuidanceUi(document).editingAppearsActive
            ? 'OPEN'
            : 'CLOSED'
          : _observationId !== 'RECTANGLE_MENU_OPEN'
            ? 'UNKNOWN'
            : simulatedItemSelected
              ? 'SELECTED'
              : document.querySelector('[data-guidance-simulation-menu="true"]')
                ? 'OPEN'
                : 'CLOSED';
      let current = readState();
      const observer = new MutationObserver(() => {
        const next = readState();
        if (next === current) return;
        current = next;
        onState(next);
      });
      observer.observe(document.body, { childList: true, subtree: true });
      return {
        current,
        unsubscribe: () => observer.disconnect(),
      };
    },
  },
  simulatedGuidanceRegistry,
);

window.addEventListener(
  'pagehide',
  () => {
    clearGuidanceHighlight();
    guidanceRunner.cancel();
  },
  { once: true },
);
window.addEventListener(
  'fixture:unmount',
  () => {
    reactRoot.unmount();
    guidanceRunner.dispose();
    clearGuidanceHighlight();
    host.remove();
    simulationNote.remove();
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
    guidanceRunner={guidanceRunner}
    onClearTarget={clearGuidanceHighlight}
    onObserveSketchUi={() => observeSketchGuidanceUi(document)}
    onCaptureTopRow={() => createTopRowCapture(document)}
    onCaptureRectangleDropdown={() => createRectangleDropdownCapture(document)}
    onCaptureRectangleDropdownSnapshot={(snapshotRole, userReportedState) =>
      captureManualRectangleDropdownSnapshot(
        document,
        snapshotRole,
        userReportedState,
      )
    }
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
