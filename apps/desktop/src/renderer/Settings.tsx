import { useEffect, useRef } from 'react';
import type { DesktopPreferences } from '@leqad/desktop-contracts';

type SettingsProps = {
  preferences: DesktopPreferences;
  returnLabel: 'Back to lesson' | 'Back to Ask';
  statusMessage: string;
  onPreferenceChange(next: DesktopPreferences): void;
  onStopVisualAccess(): void;
  onResetPosition(): void;
  onReturn(): void;
};

export function Settings({
  preferences,
  returnLabel,
  statusMessage,
  onPreferenceChange,
  onStopVisualAccess,
  onResetPosition,
  onReturn,
}: SettingsProps) {
  const headingRef = useRef<HTMLHeadingElement>(null);

  useEffect(() => {
    headingRef.current?.focus();
  }, []);

  return (
    <>
      <section
        className="settings-body"
        aria-label="Settings options"
        role="region"
        tabIndex={0}
      >
        <h2 id="settings-heading" ref={headingRef} tabIndex={-1}>
          Settings
        </h2>

        <section className="settings-group" aria-labelledby="recovery-heading">
          <h3 id="recovery-heading">Screen access and panel position</h3>
          <p className="muted-copy">
            This app can't capture the screen or highlight Onshape tools. No CAD
            window is selected.
          </p>
          <div className="settings-actions">
            <button
              className="secondary-button"
              onClick={onStopVisualAccess}
              type="button"
            >
              Turn off screen access
            </button>
            <button className="secondary-button" disabled type="button">
              Choose a CAD window
            </button>
            <p className="settings-reason">
              You can't choose a CAD window in this app.
            </p>
            <button
              className="secondary-button"
              onClick={onResetPosition}
              type="button"
            >
              Reset panel position
            </button>
            <button className="secondary-button" disabled type="button">
              Report a misplaced highlight
            </button>
            <p className="settings-reason">
              This app can't highlight Onshape tools.
            </p>
          </div>
          <p aria-live="polite" className="settings-status">
            {statusMessage}
          </p>
        </section>

        <section
          className="settings-group"
          aria-labelledby="appearance-heading"
        >
          <h3 id="appearance-heading">Display and text</h3>
          <fieldset className="radio-group">
            <legend>Appearance</legend>
            {(['system', 'light', 'dark'] as const).map((appearance) => (
              <label className="radio-option" key={appearance}>
                <input
                  checked={preferences.appearance === appearance}
                  name="appearance"
                  onChange={() =>
                    onPreferenceChange({ ...preferences, appearance })
                  }
                  type="radio"
                  value={appearance}
                />
                <span>
                  {appearance === 'system'
                    ? 'Use Windows setting'
                    : appearance[0]!.toUpperCase() + appearance.slice(1)}
                </span>
              </label>
            ))}
          </fieldset>

          <fieldset className="radio-group">
            <legend>Text size</legend>
            {([1, 1.25, 1.5, 2] as const).map((textScale) => (
              <label className="radio-option" key={textScale}>
                <input
                  checked={preferences.textScale === textScale}
                  name="textScale"
                  onChange={() =>
                    onPreferenceChange({ ...preferences, textScale })
                  }
                  type="radio"
                  value={textScale}
                />
                <span>{`${textScale * 100}%`}</span>
              </label>
            ))}
          </fieldset>

          <label className="checkbox-option">
            <input
              checked={preferences.keepVisible}
              onChange={(event) =>
                onPreferenceChange({
                  ...preferences,
                  keepVisible: event.currentTarget.checked,
                })
              }
              type="checkbox"
            />
            <span>Keep Leqad on top</span>
          </label>

          <fieldset className="radio-group">
            <legend>Reduce motion</legend>
            {(['system', 'reduce'] as const).map((reduceMotion) => (
              <label className="radio-option" key={reduceMotion}>
                <input
                  checked={preferences.reduceMotion === reduceMotion}
                  name="reduceMotion"
                  onChange={() =>
                    onPreferenceChange({ ...preferences, reduceMotion })
                  }
                  type="radio"
                  value={reduceMotion}
                />
                <span>
                  {reduceMotion === 'system'
                    ? 'Use Windows setting'
                    : 'Reduce motion'}
                </span>
              </label>
            ))}
          </fieldset>
        </section>
      </section>

      <footer className="workspace-footer settings-footer">
        <button className="primary-button" onClick={onReturn} type="button">
          {returnLabel}
        </button>
      </footer>
    </>
  );
}
