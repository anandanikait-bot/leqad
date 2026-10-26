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
          <h3 id="recovery-heading">Visual access and recovery</h3>
          <p className="muted-copy">
            Visual help isn’t available in this build. No window is selected and
            no capture is running.
          </p>
          <div className="settings-actions">
            <button
              className="secondary-button"
              onClick={onStopVisualAccess}
              type="button"
            >
              Stop / revoke visual access
            </button>
            <button className="secondary-button" disabled type="button">
              Change window
            </button>
            <p className="settings-reason">
              Window selection isn’t available in this build.
            </p>
            <button
              className="secondary-button"
              onClick={onResetPosition}
              type="button"
            >
              Reset panel position
            </button>
            <button className="secondary-button" disabled type="button">
              Report misaligned highlight
            </button>
            <p className="settings-reason">
              No highlights are available to report.
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
          <h3 id="appearance-heading">Appearance and accessibility</h3>
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
                  {appearance[0]!.toUpperCase() + appearance.slice(1)}
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
            <span>Keep panel visible on top</span>
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
                    ? 'Follow Windows'
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
