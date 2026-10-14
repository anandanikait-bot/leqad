import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { AssistantPanel } from '../src/components/panel/AssistantPanel';
import {
  createOnshapeCapabilityMonitor,
  observeOnshapeCapabilities,
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
import { createSemanticHighlighter } from '../src/services/semanticTargets';
import {
  collectRecognitionDiagnostics,
  createTopRowCapture,
} from '../src/services/recognitionDiagnostics';
import {
  captureManualRectangleDropdownSnapshot,
  createRectangleDropdownCapture,
} from '../src/services/rectangleDropdownCapture';
import { observeSketchGuidanceUi } from '../src/services/sketchGuidance';
import type { ModelIdentity } from '@leqad/contracts';
import { FOUNDATIONS_FIRST_SKETCH } from '@leqad/lesson-engine';
import '../src/styles/panel.css';

export default defineContentScript({
  matches: ['https://cad.onshape.com/documents/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    const progressStore = createLessonProgressStore(browser.storage.local);
    const highlighter = createSemanticHighlighter(document);
    const pageLifecycle = createPageLifecycleCoordinator();

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
            let currentPage = observeOnshapeCapabilities(routePage, document);
            const renderPanel = () =>
              root.render(
                <AssistantPanel
                  page={currentPage}
                  initialSession={initialSession}
                  initialPanelPreferences={initialPanelPreferences}
                  initialLearningHistory={initialLearningHistory}
                  onShowTarget={highlighter.show}
                  onClearTarget={clearHighlight}
                  onObserveSketchUi={() => observeSketchGuidanceUi(document)}
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
                  onSessionChange={(session) => {
                    void progressStore
                      .saveSession(session)
                      .catch(() => undefined);
                  }}
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
            return { root, capabilityMonitor };
          },
          onRemove(mounted) {
            clearHighlight();
            mounted?.capabilityMonitor.disconnect();
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
      // WXT's Navigation API event fires before history/location commits.
      // Read the destination after the synchronous navigation has completed.
      queueMicrotask(() => {
        if (!ctx.isInvalid) void mountForCurrentPage();
      });
    });
    ctx.onInvalidated(() => {
      pageLifecycle.invalidate();
      clearHighlight();
    });
    await mountForCurrentPage();
  },
});
