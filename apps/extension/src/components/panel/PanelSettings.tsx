import { useEffect, useId, useRef } from 'react';
import type { Appearance, AssistanceMode } from '../../services/progressStore';

interface Props {
  appearance: Appearance;
  assistanceMode: AssistanceMode;
  previousView: string;
  onAppearance: (value: Appearance) => void;
  onAssistanceMode: (value: AssistanceMode) => void;
  onClose: () => void;
}

export function PanelSettings({
  appearance,
  assistanceMode,
  previousView,
  onAppearance,
  onAssistanceMode,
  onClose,
}: Props) {
  const id = useId();
  const back = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    back.current?.focus();
  }, []);
  return (
    <section
      className="leqad-settings"
      aria-label="Settings"
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          event.stopPropagation();
          onClose();
        }
      }}
    >
      <button
        ref={back}
        className="leqad-button leqad-button--text"
        type="button"
        onClick={onClose}
      >
        Back to {previousView}
      </button>
      <h2>Settings</h2>
      <fieldset>
        <legend>Appearance</legend>
        {(
          [
            ['light', 'Light', 'Use the approved warm, light palette.'],
            ['dark', 'Dark', 'Use charcoal surfaces and off-white text.'],
            [
              'system',
              'System',
              'Follow your device’s appearance, including changes.',
            ],
          ] as const
        ).map(([value, label, description]) => (
          <label className="leqad-settings__option" key={value}>
            <input
              type="radio"
              name={id + '-appearance'}
              value={value}
              checked={appearance === value}
              onChange={() => onAppearance(value)}
              aria-label={label}
              aria-describedby={id + '-' + value}
            />
            <span>
              <strong>{label}</strong>
              <span id={id + '-' + value}>{description}</span>
            </span>
          </label>
        ))}
      </fieldset>
      <fieldset>
        <legend>AI Assistance</legend>
        {(
          [
            [
              'on-demand',
              'Only when I ask',
              'Help follows your questions and lesson actions. No unsolicited suggestions.',
            ],
            [
              'proactive',
              'Proactive assistance',
              'Allow dismissible local cues near a recognized lesson control. No CAD actions are performed.',
            ],
          ] as const
        ).map(([value, label, description]) => (
          <label className="leqad-settings__option" key={value}>
            <input
              type="radio"
              name={id + '-assistance'}
              value={value}
              checked={assistanceMode === value}
              onChange={() => onAssistanceMode(value)}
              aria-label={label}
              aria-describedby={id + '-' + value}
            />
            <span>
              <strong>{label}</strong>
              <span id={id + '-' + value}>{description}</span>
            </span>
          </label>
        ))}
        <p className="leqad-settings__note">
          Current assistance is deterministic UI guidance. AI design reviews and
          geometry analysis are not available. Essential status, permission
          limitations and verification results remain visible in either mode.
        </p>
      </fieldset>
    </section>
  );
}
