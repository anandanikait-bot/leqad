import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { AssistantPanel } from '../src/components/panel/AssistantPanel';
import {
  createOnshapeCapabilityMonitor,
  observeOnshapeCapabilities,
  observeOnshapeGuidanceContext,
  onshapePageContextKey,
  onshapeUrlMatchesContextKey,
  parseOnshapePage,
} from '../src/services/onshapePage';
import { createLessonProgressStore } from '../src/services/progressStore';
import { createEmptyLearningHistory } from '../src/services/progressStore';
import type {
  LearningHistory,
  PanelPreferences,
} from '../src/services/progressStore';
import { createPageLifecycleCoordinator } from '../src/services/pageLifecycle';
import { evaluateFoundationsStepProgress } from '../src/services/foundationsEvidence';
import { createGuidanceHighlighter } from '../src/services/calibratedHighlight';
import type { SketchHighlightCalibration } from '../src/services/calibratedHighlight';
import { recognizeSemanticTarget } from '../src/services/semanticTargets';
import type { SemanticTargetId } from '../src/services/semanticTargets';
import {
  collectRecognitionDiagnostics,
  createTopRowCapture,
} from '../src/services/recognitionDiagnostics';
import {
  captureManualRectangleDropdownSnapshot,
  createRectangleDropdownCapture,
} from '../src/services/rectangleDropdownCapture';
import {
  createSketchGuidanceMonitor,
  observeSketchGuidanceUi,
} from '../src/services/sketchGuidance';
import { GUIDANCE_REGISTRY } from '../src/services/guidanceRegistry';
import type {
  GuidanceAreaTargetId,
  GuidanceTargetId,
} from '../src/services/guidanceRegistry';
import { createGuidanceRunner } from '../src/services/guidanceRunner';
import type { GuidanceRunner } from '../src/services/guidanceRunner';
import type { ModelIdentity } from '@leqad/contracts';
import { FOUNDATIONS_FIRST_SKETCH } from '@leqad/lesson-engine';
import '../src/styles/panel.css';

export default defineContentScript({
  matches: ['https://cad.onshape.com/documents/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    const progressStore = createLessonProgressStore(browser.storage.local);
    const highlighter = createGuidanceHighlighter(document);
    const pageLifecycle = createPageLifecycleCoordinator();
    let activeGuidanceRunner: GuidanceRunner | null = null;

    const clearHighlight = highlighter.clear;

    const mountForCurrentPage = async () => {
      const routePage = parseOnshapePage(window.location.href);
      const contextKey = onshapePageContextKey(routePage);
      if (!contextKey) {
        pageLifecycle.invalidate();
        clearHighlight();
        return;
      }
      const attempt = pageLifecycle.begin(contextKey);
      if (!attempt) return;
      clearHighlight();
      const page = observeOnshapeCapabilities(routePage, document);

      const identity: ModelIdentity | null =
        page.documentId && page.workspaceId && page.elementId
          ? {
              documentId: page.documentId,
              workspaceId: page.workspaceId,
              elementId: page.elementId,
              revision: null,
            }
          : null;

      let initialSession = null;
      let initialPanelPreferences: PanelPreferences = {
        collapsed: false,
        position: null,
        onboardingComplete: false,
      };
      let initialLearningHistory: LearningHistory =
        createEmptyLearningHistory();
      let initialSketchCalibration: SketchHighlightCalibration | null = null;
      if (identity) {
        try {
          initialSession = await progressStore.restoreSession(identity, null, {
            lessonId: FOUNDATIONS_FIRST_SKETCH.id,
            lessonVersion: FOUNDATIONS_FIRST_SKETCH.version,
          });
        } catch {
          initialSession = null;
        }
      }
      let activated = false;
      try {
        initialPanelPreferences = await progressStore.loadPanelPreferences();
      } catch {
        // Keep the usable in-memory defaults if extension storage is unavailable.
      }
      try {
        initialLearningHistory = await progressStore.loadLearningHistory();
      } catch {
        // Keep an empty learning history if extension storage is unavailable.
      }
      if (page.modelType === 'workspace') {
        try {
          initialSketchCalibration =
            await progressStore.loadSketchCalibration();
        } catch {
          // Calibration is optional; written and semantic guidance remain usable.
        }
      }
      if (!pageLifecycle.isCurrent(attempt) || ctx.isInvalid) return;
      if (!onshapeUrlMatchesContextKey(window.location.href, contextKey)) {
        pageLifecycle.abandon(attempt);
        void mountForCurrentPage();
        return;
      }

      try {
        const ui = await createShadowRootUi(ctx, {
          name: 'leqad-assistant',
          position: 'overlay',
          alignment: 'top-left',
          zIndex: 2147483000,
          onMount(container) {
            const root = createRoot(container);
            const sketchGuidanceMonitor = createSketchGuidanceMonitor(document);
            const observeSketchUi = () => sketchGuidanceMonitor.refresh();
            const subscribeSketchUi = (
              listener: Parameters<typeof sketchGuidanceMonitor.subscribe>[0],
            ) => sketchGuidanceMonitor.subscribe(listener);
            let currentPage = observeOnshapeCapabilities(routePage, document);
            const calibrationWorkspaceIsCurrent = () =>
              routePage.modelType === 'workspace' &&
              currentPage.elementType !== 'other' &&
              onshapeUrlMatchesContextKey(window.location.href, contextKey);
            const showCalibratedHighlight = (
              calibration: SketchHighlightCalibration,
            ) =>
              calibrationWorkspaceIsCurrent() &&
              highlighter.showCalibrated(calibration);
            const saveSketchCalibration = async (
              calibration: SketchHighlightCalibration | null,
            ) => {
              if (!calibrationWorkspaceIsCurrent())
                throw new Error('Unsupported calibration workspace.');
              await progressStore.saveSketchCalibration(calibration);
            };
            const semanticTargetFor = (
              targetId: GuidanceTargetId | GuidanceAreaTargetId,
            ): SemanticTargetId | null => {
              const definition = Object.values(GUIDANCE_REGISTRY).find(
                ({ targetId: registered }) => registered === targetId,
              );
              return definition?.semanticTarget ?? null;
            };
            const guidanceRunner = createGuidanceRunner({
              getContext: () =>
                observeOnshapeGuidanceContext(currentPage, document),
              resolveTarget: (targetId) => {
                const semanticTarget = semanticTargetFor(targetId);
                if (!semanticTarget) return { status: 'MISSING' };
                const recognition = recognizeSemanticTarget(
                  document,
                  semanticTarget,
                );
                return recognition.status === 'FOUND'
                  ? { status: 'FOUND' }
                  : recognition.status === 'AMBIGUOUS'
                    ? { status: 'AMBIGUOUS' }
                    : { status: 'MISSING' };
              },
              highlightTarget: (targetId) => {
                const semanticTarget = semanticTargetFor(targetId);
                if (!semanticTarget) return false;
                const recognition = highlighter.show(semanticTarget);
                return (
                  recognition.status === 'FOUND' &&
                  recognition.element?.isConnected === true
                );
              },
              clearHighlight,
              observe: (observationId) => {
                if (observationId === 'SKETCH_UI_ACTIVE') {
                  return {
                    current: observeSketchGuidanceUi(document)
                      .editingAppearsActive
                      ? 'OPEN'
                      : 'CLOSED',
                    unsubscribe: () => undefined,
                  };
                }
                // Rectangle menu transitions stay UNKNOWN until the owner
                // provides authenticated Onshape DOM evidence.
                return {
                  current: 'UNKNOWN',
                  unsubscribe: () => undefined,
                };
              },
            });
            activeGuidanceRunner = guidanceRunner;
            const renderPanel = () =>
              root.render(
                <AssistantPanel
                  page={currentPage}
                  initialSession={initialSession}
                  initialPanelPreferences={initialPanelPreferences}
                  initialLearningHistory={initialLearningHistory}
                  onShowTarget={highlighter.show}
                  initialSketchCalibration={initialSketchCalibration}
                  onShowCalibratedHighlight={showCalibratedHighlight}
                  onSketchCalibrationChange={saveSketchCalibration}
                  guidanceRunner={guidanceRunner}
                  onClearTarget={clearHighlight}
                  onObserveSketchUi={observeSketchUi}
                  onSubscribeSketchUi={subscribeSketchUi}
                  onCaptureTopRow={() => createTopRowCapture(document)}
                  onCaptureRectangleDropdown={() =>
                    createRectangleDropdownCapture(document)
                  }
                  onCaptureRectangleDropdownSnapshot={(
                    snapshotRole,
                    userReportedState,
                  ) =>
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
                    currentPage = capabilityMonitor.refresh();
                    return evaluateFoundationsStepProgress(
                      currentPage,
                      document,
                      signal,
                    );
                  }}
                  onSessionChange={progressStore.saveSession}
                  onPanelPreferencesChange={(preferences) => {
                    void progressStore
                      .savePanelPreferences(preferences)
                      .catch(() => undefined);
                  }}
                  onLearningHistoryChange={(history) => {
                    void progressStore
                      .saveLearningHistory(history)
                      .catch(() => undefined);
                  }}
                />,
              );
            const capabilityMonitor = createOnshapeCapabilityMonitor(
              routePage,
              document,
              (nextPage) => {
                currentPage = nextPage;
                renderPanel();
              },
            );
            currentPage = capabilityMonitor.current;
            renderPanel();
            return {
              root,
              capabilityMonitor,
              guidanceRunner,
              sketchGuidanceMonitor,
            };
          },
          onRemove(mounted) {
            clearHighlight();
            mounted?.capabilityMonitor.disconnect();
            mounted?.guidanceRunner.dispose();
            mounted?.sketchGuidanceMonitor.disconnect();
            activeGuidanceRunner = null;
            mounted?.root.unmount();
          },
        });

        if (ctx.isInvalid) {
          pageLifecycle.abandon(attempt);
          ui.remove();
          return;
        }
        if (!onshapeUrlMatchesContextKey(window.location.href, contextKey)) {
          pageLifecycle.abandon(attempt);
          ui.remove();
          void mountForCurrentPage();
          return;
        }
        if (!pageLifecycle.activate(attempt, ui)) return;
        activated = true;
        ui.mount();
      } catch {
        if (activated || pageLifecycle.isCurrent(attempt)) {
          pageLifecycle.invalidate();
        }
        clearHighlight();
      }
    };

    ctx.addEventListener(window, 'wxt:locationchange', () => {
      clearHighlight();
      activeGuidanceRunner?.cancel();
      // WXT's Navigation API event fires before history/location commits.
      // Read the destination after the synchronous navigation has completed.
      queueMicrotask(() => {
        if (!ctx.isInvalid) void mountForCurrentPage();
      });
    });
    ctx.onInvalidated(() => {
      pageLifecycle.invalidate();
      activeGuidanceRunner?.dispose();
      activeGuidanceRunner = null;
      clearHighlight();
    });
    await mountForCurrentPage();
  },
});
