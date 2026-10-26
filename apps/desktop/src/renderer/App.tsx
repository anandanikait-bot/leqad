import { useCallback, useEffect, useRef, useState } from 'react';
import type { CSSProperties } from 'react';
import {
  DEFAULT_PREFERENCES,
  type DesktopBridge,
  type DesktopPreferences,
  type StoredLesson,
} from '@leqad/desktop-contracts';
import lightLogo from '../assets/brand/leqad-official-horizontal-light-v1.svg';
import darkLogo from '../assets/brand/leqad-official-horizontal-dark-v1.svg';
import { CompletionSummary } from './CompletionSummary';
import { LessonWorkspace } from './LessonWorkspace';
import { Settings } from './Settings';
import type { QuestionId } from './AskLocal';
import { createDesktopLessonController } from './lessonController';
import type { DesktopLessonEvent, DesktopLessonView } from './lessonController';

declare global {
  interface Window {
    leqad?: DesktopBridge;
  }
}

type WorkspacePage = 'learn' | 'ask' | 'settings';

const freshController = () => createDesktopLessonController();

export function App() {
  const controllerRef = useRef(freshController());
  const [view, setView] = useState<DesktopLessonView>(() =>
    controllerRef.current.getView(),
  );
  const [preferences, setPreferences] = useState<DesktopPreferences>({
    ...DEFAULT_PREFERENCES,
  });
  const [page, setPage] = useState<WorkspacePage>('learn');
  const [settingsReturnPage, setSettingsReturnPage] = useState<'learn' | 'ask'>(
    'learn',
  );
  const [selectedQuestion, setSelectedQuestion] = useState<QuestionId | null>(
    null,
  );
  const [lessonReady, setLessonReady] = useState(false);
  const [lessonLoadFailed, setLessonLoadFailed] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [settingsMessage, setSettingsMessage] = useState('');
  const [restartConfirm, setRestartConfirm] = useState(false);
  const [freshSessionOnly, setFreshSessionOnly] = useState(false);
  const [resumePrompt, setResumePrompt] = useState(false);
  const menuRef = useRef<HTMLDetailsElement>(null);
  const menuTriggerRef = useRef<HTMLElement>(null);
  const lessonWriteBlockedRef = useRef(false);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());

  useEffect(() => {
    const bridge = window.leqad;
    if (!bridge) {
      setLessonReady(true);
      return;
    }
    let active = true;

    void Promise.allSettled([
      bridge.loadLesson(),
      bridge.loadPreferences(),
    ]).then(([lessonResult, preferencesResult]) => {
      if (!active) return;

      if (lessonResult.status === 'fulfilled') {
        const savedLesson = lessonResult.value;
        const controller = createDesktopLessonController(savedLesson);
        controllerRef.current = controller;
        const loadedView = controller.getView();
        setView(loadedView);
        if (loadedView.loadError) {
          lessonWriteBlockedRef.current = true;
          setLessonLoadFailed(true);
        } else if (savedLesson) {
          setResumePrompt(true);
        }
      } else {
        lessonWriteBlockedRef.current = true;
        setLessonLoadFailed(true);
      }

      if (preferencesResult.status === 'fulfilled') {
        setPreferences(preferencesResult.value);
      } else {
        setLoadError(
          'Settings could not be loaded. Default settings are in use.',
        );
      }
      setLessonReady(true);
    });

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    setSelectedQuestion(null);
  }, [view.currentStepIndex]);

  const persistLesson = useCallback((record: StoredLesson) => {
    const bridge = window.leqad;
    if (!bridge) {
      setSaveError('Progress couldn’t be saved on this device.');
      return;
    }

    saveQueueRef.current = saveQueueRef.current
      .catch(() => undefined)
      .then(() => bridge.saveLesson(record))
      .then(() => setSaveError(null))
      .catch(() => setSaveError('Progress couldn’t be saved on this device.'));
  }, []);

  const dispatch = useCallback(
    (event: DesktopLessonEvent) => {
      if (!lessonReady) return;
      const next = controllerRef.current.dispatch(event);
      setView(next);
      if (event.type === 'RESTART') {
        lessonWriteBlockedRef.current = false;
        setLessonLoadFailed(false);
        persistLesson(controllerRef.current.serialize());
      } else if (!lessonWriteBlockedRef.current) {
        persistLesson(controllerRef.current.serialize());
      }
    },
    [lessonReady, persistLesson],
  );

  const retrySave = useCallback(() => {
    persistLesson(controllerRef.current.serialize());
  }, [persistLesson]);

  const changePreferences = (next: DesktopPreferences) => {
    setPreferences(next);
    const bridge = window.leqad;
    if (!bridge) {
      setSettingsMessage('Settings couldn’t be saved on this device.');
      return;
    }
    void bridge
      .savePreferences(next)
      .then(() => setSettingsMessage('Settings saved.'))
      .catch(() =>
        setSettingsMessage('Settings couldn’t be saved on this device.'),
      );
  };

  const openSettings = () => {
    setSettingsReturnPage(page === 'ask' ? 'ask' : 'learn');
    setSettingsMessage('');
    if (menuRef.current) menuRef.current.open = false;
    setPage('settings');
  };

  const returnFromSettings = () => {
    const nextPage = settingsReturnPage;
    setPage(nextPage);
    requestAnimationFrame(() => menuTriggerRef.current?.focus());
  };

  const stopVisualAccess = () => {
    const bridge = window.leqad;
    if (!bridge) {
      setSettingsMessage(
        'Visual access is off. Written lessons remain available.',
      );
      return;
    }
    void bridge
      .command({ type: 'revoke' })
      .then(() =>
        setSettingsMessage(
          'Visual access is off. Written lessons remain available.',
        ),
      )
      .catch(() =>
        setSettingsMessage(
          'Visual access could not be updated. Written lessons remain available.',
        ),
      );
  };

  const resetPosition = () => {
    const bridge = window.leqad;
    if (!bridge) {
      setSettingsMessage(
        'Panel position can only be reset by the desktop window.',
      );
      return;
    }
    void bridge
      .command({ type: 'reset-position' })
      .then(() =>
        setSettingsMessage(
          'Panel position reset. The CAD window was not moved.',
        ),
      )
      .catch(() =>
        setSettingsMessage(
          'Panel position couldn’t be reset. Use the window’s Move command.',
        ),
      );
  };

  const endSession = () => {
    void window.leqad?.command({ type: 'close' }).catch(() => undefined);
  };

  const confirmRestart = () => {
    setRestartConfirm(false);
    setResumePrompt(false);
    setPage('learn');
    dispatch({ type: 'RESTART' });
  };

  const requestRestart = () => {
    setFreshSessionOnly(lessonWriteBlockedRef.current);
    setRestartConfirm(true);
  };

  const showSummary = view.isComplete && page === 'learn';
  const rootStyle = { '--text-scale': preferences.textScale } as CSSProperties;
  const showMenu = lessonReady && page !== 'settings' && !resumePrompt;

  return (
    <div
      className="desktop-app"
      data-appearance={preferences.appearance}
      data-motion={preferences.reduceMotion}
      style={rootStyle}
    >
      <header className="app-header">
        <div className="brand-lockup" aria-label="Leqad">
          <img
            alt="Leqad"
            className="brand-logo brand-logo-light"
            src={lightLogo}
          />
          <img
            alt=""
            aria-hidden="true"
            className="brand-logo brand-logo-dark"
            src={darkLogo}
          />
        </div>
        <details className="app-menu" hidden={!showMenu} ref={menuRef}>
          <summary aria-label="Open lesson menu" ref={menuTriggerRef}>
            ☰
          </summary>
          <div className="menu-panel">
            <button onClick={openSettings} type="button">
              Settings
            </button>
            <button onClick={requestRestart} type="button">
              Restart lesson
            </button>
          </div>
        </details>
      </header>

      <div className="session-strip">
        <span>Written lessons · Capture off</span>
        <span aria-live="polite">No CAD work is being observed</span>
      </div>

      {lessonReady && page !== 'settings' && !resumePrompt ? (
        <nav aria-label="Lesson views" className="workspace-navigation">
          <button
            aria-current={page === 'learn' ? 'page' : undefined}
            className={page === 'learn' ? 'nav-tab selected' : 'nav-tab'}
            onClick={() => setPage('learn')}
            type="button"
          >
            Learn
          </button>
          <button
            aria-current={page === 'ask' ? 'page' : undefined}
            className={page === 'ask' ? 'nav-tab selected' : 'nav-tab'}
            onClick={() => setPage('ask')}
            type="button"
          >
            Ask
          </button>
        </nav>
      ) : null}

      {loadError && lessonReady && !resumePrompt ? (
        <div className="load-warning" role="status">
          {loadError}
        </div>
      ) : null}

      {!lessonReady ? (
        <div className="load-warning" role="status">
          Loading saved lesson and settings…
        </div>
      ) : resumePrompt ? (
        <>
          <section
            className="resume-body"
            aria-label="Saved lesson recovery"
            role="region"
          >
            <h2>Continue Your First Sketch?</h2>
            <p>
              {`Step ${view.currentStepIndex + 1} of 8 · ${view.completionCount} ${view.completionCount === 1 ? 'step' : 'steps'} completed`}
            </p>
            <p>
              Saved lesson progress does not describe your current CAD model.
            </p>
          </section>
          <footer className="workspace-footer resume-footer">
            <button
              className="primary-button"
              onClick={() => setResumePrompt(false)}
              type="button"
            >
              Resume lesson
            </button>
            <button
              className="secondary-button"
              onClick={requestRestart}
              type="button"
            >
              Start again
            </button>
          </footer>
        </>
      ) : page === 'settings' ? (
        <Settings
          onPreferenceChange={changePreferences}
          onResetPosition={resetPosition}
          onReturn={returnFromSettings}
          onStopVisualAccess={stopVisualAccess}
          preferences={preferences}
          returnLabel={
            settingsReturnPage === 'ask' ? 'Back to Ask' : 'Back to lesson'
          }
          statusMessage={settingsMessage}
        />
      ) : showSummary ? (
        <CompletionSummary
          onEndSession={endSession}
          onReviewSteps={() => dispatch({ type: 'REVIEW_STEPS' })}
          view={view}
        />
      ) : (
        <LessonWorkspace
          loadError={view.loadError || lessonLoadFailed}
          onAskQuestion={setSelectedQuestion}
          onDispatch={dispatch}
          onPageChange={setPage}
          onRetrySave={retrySave}
          onStartFresh={requestRestart}
          page={page}
          saveError={saveError}
          selectedQuestion={selectedQuestion}
          textScale={preferences.textScale}
          view={view}
        />
      )}

      {restartConfirm ? (
        <div className="dialog-backdrop">
          <section
            aria-labelledby="restart-title"
            aria-modal="true"
            className="confirm-dialog"
            role="dialog"
          >
            <h2 id="restart-title">
              {freshSessionOnly
                ? 'Start a fresh lesson in this session?'
                : 'Start this lesson again?'}
            </h2>
            <p>
              {freshSessionOnly
                ? 'This starts fresh in the current session. It does not clear the unreadable saved record. New progress may fail to save; if it does, Leqad will show an error and let you retry.'
                : 'Reset this lesson’s progress on this device?'}
            </p>
            <div className="dialog-actions">
              <button
                className="secondary-button"
                onClick={() => setRestartConfirm(false)}
                type="button"
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={confirmRestart}
                type="button"
              >
                {freshSessionOnly ? 'Start fresh' : 'Reset lesson'}
              </button>
            </div>
          </section>
        </div>
      ) : null}
    </div>
  );
}
