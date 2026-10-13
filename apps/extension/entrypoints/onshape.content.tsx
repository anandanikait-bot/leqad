import { createRoot } from 'react-dom/client';
import { browser } from 'wxt/browser';
import { createShadowRootUi } from 'wxt/utils/content-script-ui/shadow-root';
import { defineContentScript } from 'wxt/utils/define-content-script';
import { AssistantPanel } from '../src/components/panel/AssistantPanel';
import { parseOnshapePage } from '../src/services/onshapePage';
import { createLessonProgressStore } from '../src/services/progressStore';
import type { PanelPreferences } from '../src/services/progressStore';
import {
  createTargetHighlight,
  findSemanticTarget,
} from '../src/services/semanticTargets';
import type {
  SemanticTargetId,
  TargetHighlight,
} from '../src/services/semanticTargets';
import type { ModelIdentity, VerificationStatus } from '@leqad/contracts';
import '../src/styles/panel.css';

export default defineContentScript({
  matches: ['https://cad.onshape.com/documents/*'],
  runAt: 'document_idle',
  cssInjectionMode: 'ui',
  async main(ctx) {
    const progressStore = createLessonProgressStore(browser.storage.local);
    let activeUi: { remove(): void } | null = null;
    let activeHighlight: TargetHighlight | null = null;
    let highlightTimer: number | null = null;
    let generation = 0;

    const clearHighlight = () => {
      if (highlightTimer !== null) window.clearTimeout(highlightTimer);
      highlightTimer = null;
      activeHighlight?.remove();
      activeHighlight = null;
    };

    const closePanel = () => {
      clearHighlight();
      activeUi?.remove();
      activeUi = null;
    };

    const mountForCurrentPage = async () => {
      const currentGeneration = ++generation;
      closePanel();
      const page = parseOnshapePage(window.location.href);
      if (!page.supported) return;

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
      };
      if (identity) {
        try {
          initialSession = await progressStore.restoreSession(identity, null);
        } catch {
          initialSession = null;
        }
      }
      try {
        initialPanelPreferences = await progressStore.loadPanelPreferences();
      } catch {
        // Keep the usable in-memory defaults if extension storage is unavailable.
      }
      if (currentGeneration !== generation || ctx.isInvalid) return;

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
              onShowTarget={(targetId: SemanticTargetId) => {
                const target = findSemanticTarget(document, targetId);
                clearHighlight();
                if (!target) return false;
                activeHighlight = createTargetHighlight(target);
                highlightTimer = ctx.setTimeout(clearHighlight, 5000);
                return true;
              }}
              onCheckStep={(_stepId, signal): VerificationStatus =>
                signal === 'finish-sketch' &&
                findSemanticTarget(document, 'finish-sketch')
                  ? 'PASS'
                  : 'UNKNOWN'
              }
              onSessionChange={(session) => {
                void progressStore.saveSession(session).catch(() => undefined);
              }}
              onPanelPreferencesChange={(preferences) => {
                void progressStore
                  .savePanelPreferences(preferences)
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

      if (currentGeneration !== generation || ctx.isInvalid) {
        ui.remove();
        return;
      }
      activeUi = ui;
      ui.mount();
    };

    await mountForCurrentPage();
    ctx.addEventListener(window, 'wxt:locationchange', () => {
      void mountForCurrentPage();
    });
    ctx.onInvalidated(closePanel);
  },
});
