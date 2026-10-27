import { useEffect, useRef } from 'react';
import type {
  WindowCatalog,
  WindowChoice,
  WindowSummary,
} from '@leqad/desktop-contracts';

type WindowSelectionProps = {
  mode: 'select';
  catalog: WindowCatalog;
  loading: boolean;
  selectedToken: string | null;
  selectionError: 'window-lost' | 'provider-failed' | null;
  onSelectionChange(token: string): void;
  onUseSelectedWindow(token: string): void;
  onRefresh(): void;
  onUseWrittenLessons(): void;
};

type VisualUnavailableProps = {
  mode: 'visual-unavailable';
  selectedWindow: WindowSummary;
  onContinueWithoutScreenAccess(): void;
  onChooseAnotherWindow(): void;
};

type SessionSetupProps = WindowSelectionProps | VisualUnavailableProps;

export function windowChoiceLabel(
  window: Pick<WindowChoice, 'application' | 'ordinal'>,
) {
  return `${window.application} · Window ${window.ordinal}`;
}

export function SessionSetup(props: SessionSetupProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, [props.mode]);

  if (props.mode === 'visual-unavailable') {
    return (
      <main className="session-setup" aria-labelledby="session-setup-heading">
        <div className="session-setup-body">
          <h1 id="session-setup-heading" ref={headingRef} tabIndex={-1}>
            Visual help isn’t available in this build
          </h1>
          <p>
            Leqad can’t capture or inspect the selected window yet. Choosing a
            window does not confirm which browser tab is open.
          </p>
          <p className="session-selection-summary">
            Selected: {windowChoiceLabel(props.selectedWindow)}
          </p>
          <p className="session-unavailable" role="status">
            Screen access is off. No images or control details are being read.
          </p>
        </div>
        <footer className="session-setup-footer">
          <button
            className="primary-button"
            onClick={props.onContinueWithoutScreenAccess}
            type="button"
          >
            Continue with written lessons
          </button>
          <button
            className="secondary-button"
            onClick={props.onChooseAnotherWindow}
            type="button"
          >
            Choose another window
          </button>
        </footer>
      </main>
    );
  }

  const selectedWindow = props.catalog.incomplete
    ? undefined
    : props.catalog.windows.find(
        (window) => window.token === props.selectedToken,
      );
  const unavailable = props.catalog.availability === 'unavailable';

  return (
    <main className="session-setup" aria-labelledby="session-setup-heading">
      <div className="session-setup-body">
        <h1 id="session-setup-heading" ref={headingRef} tabIndex={-1}>
          Learn alongside your CAD workspace
        </h1>
        <p>
          Choose a window for this session. Written lessons work without screen
          access.
        </p>

        {props.selectionError === 'window-lost' ? (
          <p className="session-unavailable" role="status">
            That window closed. Refresh the list and choose an open window.
          </p>
        ) : null}
        {props.selectionError === 'provider-failed' ? (
          <p className="session-unavailable" role="status">
            The window list could not be refreshed. Try again or use written
            lessons.
          </p>
        ) : null}

        {props.loading ? (
          <p role="status">Looking for open windows...</p>
        ) : unavailable ? (
          <p className="session-unavailable" role="status">
            Window selection isn’t available in this build. You can still use
            written lessons.
          </p>
        ) : props.catalog.incomplete ? (
          <p className="session-unavailable" role="status">
            The window list is incomplete. Refresh before choosing a window.
          </p>
        ) : props.catalog.windows.length === 0 ? (
          <p role="status">No open application windows were found.</p>
        ) : (
          <fieldset className="window-choice-list">
            <legend>Open windows</legend>
            {props.catalog.windows.map((window) => (
              <label className="window-choice" key={window.token}>
                <input
                  checked={props.selectedToken === window.token}
                  name="window-choice"
                  onChange={() => props.onSelectionChange(window.token)}
                  type="radio"
                  value={window.token}
                />
                <span>{windowChoiceLabel(window)}</span>
              </label>
            ))}
          </fieldset>
        )}

        {selectedWindow ? (
          <p className="session-selection-summary" role="status">
            Selected: {windowChoiceLabel(selectedWindow)}
          </p>
        ) : null}
        {!unavailable &&
        !props.catalog.incomplete &&
        props.catalog.windows.length > 0 ? (
          <p className="muted-copy">
            Leqad doesn’t read window titles or check the active CAD tab.
          </p>
        ) : null}
      </div>

      <footer className="session-setup-footer">
        {!unavailable &&
        !props.catalog.incomplete &&
        props.catalog.windows.length > 0 ? (
          <button
            className="primary-button"
            disabled={!selectedWindow}
            onClick={() => {
              if (selectedWindow)
                props.onUseSelectedWindow(selectedWindow.token);
            }}
            type="button"
          >
            Use selected window
          </button>
        ) : null}
        <button
          className="secondary-button"
          disabled={props.loading}
          onClick={props.onRefresh}
          type="button"
        >
          Refresh window list
        </button>
        <button
          className={
            unavailable || props.catalog.windows.length === 0
              ? 'primary-button'
              : 'secondary-button'
          }
          onClick={props.onUseWrittenLessons}
          type="button"
        >
          Use written lessons
        </button>
      </footer>
    </main>
  );
}
