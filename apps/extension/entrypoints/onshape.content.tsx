import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { AssistantPanel } from '../src/components/panel/AssistantPanel';
import {
  observeOnshapeCapabilities,
  onshapePageContextKey,
  parseOnshapePage,
} from '../src/services/onshapePage';
import { createLessonProgressStore } from '../src/services/progressStore';
import { createEmptyLearningHistory } from '../src/services/progressStore';
import type {
  LearningHistory,
  PanelPreferences,
} from '../src/services/progressStore';
import { createPageLifecycleCoordinator } from '../src/services/pageLifecycle';
import {
  evaluateFoundationsPlaneProgress,
  evaluateFoundationsSketchProgress,
  unavailableFoundationsDecision,
} from '../src/services/foundationsEvidence';
import {
  createTargetHighlight,
  recognizeSemanticTarget,
} from '../src/services/semanticTargets';
import type {
  SemanticTargetId,
  TargetHighlight,
} from '../src/services/semanticTargets';
import type { ModelIdentity } from '@leqad/contracts';
import { FOUNDATIONS_FIRST_SKETCH } from '@leqad/lesson-engine';
import '../src/styles/panel.css';

export default defineContentScript({
  matches: ['https://cad.onshape.com/documents/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    const progressStore = createLessonProgressStore(browser.storage.local);
    let activeHighlight: TargetHighlight | null = null;
    let highlightTimer: number | null = null;
    const pageLifecycle = createPageLifecycleCoordinator();

    const clearHighlight = () => {
      if (highlightTimer !== null) window.clearTimeout(highlightTimer);
      highlightTimer = null;
      activeHighlight?.remove();
      activeHighlight = null;
    };

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

      try {
        const ui = await createShadowRootUi(ctx, {
          name: 'leqad-assistant',
          position: 'overlay',
          alignment: 'top-left',
          zIndex: 2147483000,
          onMount(container) {
            const root = createRoot(container);
            root.render(
              <AssistantPanel
                page={page}
                initialSession={initialSession}
                initialPanelPreferences={initialPanelPreferences}
                initialLearningHistory={initialLearningHistory}
                onShowTarget={(targetId: SemanticTargetId) => {
                  const recognition = recognizeSemanticTarget(
                    document,
                    targetId,
                  );
                  clearHighlight();
                  if (recognition.status !== 'FOUND' || !recognition.element) {
                    return recognition;
                  }
                  activeHighlight = createTargetHighlight(recognition.element);
                  highlightTimer = ctx.setTimeout(clearHighlight, 5000);
                  return recognition;
                }}
                onCheckStep={(_stepId, signal) => {
                  if (signal === 'top-plane-selected') {
                    return evaluateFoundationsPlaneProgress(page, document);
                  }
                  if (signal === 'sketch-editing') {
                    return evaluateFoundationsSketchProgress(page, document);
                  }
                  return unavailableFoundationsDecision(
                    page,
                    'This lesson step does not have a supported observer.',
                    [signal],
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
            return root;
          },
          onRemove(root) {
            root?.unmount();
          },
        });

        if (ctx.isInvalid) {
          pageLifecycle.abandon(attempt);
          ui.remove();
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

    await mountForCurrentPage();
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      void mountForCurrentPage();
    });
    ctx.onInvalidated(() => {
      pageLifecycle.invalidate();
      clearHighlight();
    });
  },
});
