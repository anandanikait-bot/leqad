import { useState } from 'react';
import {
  createRectangleCommandMetadataReport,
  serializeRectangleCommandMetadataReport,
} from '../../services/rectangleCommandMetadataCapture';
import type {
  RectangleCommandCaptureState,
  RectangleCommandMetadataSnapshot,
} from '../../services/rectangleCommandMetadataCapture';

interface RectangleCommandMetadataDiagnosticProps {
  onCapture: (
    state: RectangleCommandCaptureState,
    generation: number,
  ) => RectangleCommandMetadataSnapshot;
}

const STATES = [
  {
    state: 'SKETCH_EDITING',
    label: 'State A — Sketch editing',
    instruction:
      'Enter Sketch on Top, leave the Rectangle menu closed, then capture State A.',
  },
  {
    state: 'RECTANGLE_MENU_OPEN',
    label: 'State B — Rectangle dropdown open',
    instruction:
      'Manually open the Rectangle dropdown, leave it open, then capture State B.',
  },
  {
    state: 'OTHER_RECTANGLE_VARIANT',
    label: 'State C — Another Rectangle variant',
    instruction:
      'Manually choose another Rectangle variant, return to the Sketch toolbar, then capture State C.',
  },
  {
    state: 'EXTRUDE_EDITING',
    label: 'State D — Extrude editing',
    instruction: 'Exit Sketch, manually open Extrude, then capture State D.',
  },
] as const satisfies readonly {
  state: RectangleCommandCaptureState;
  label: string;
  instruction: string;
}[];

export function RectangleCommandMetadataDiagnostic({
  onCapture,
}: RectangleCommandMetadataDiagnosticProps) {
  const [snapshots, setSnapshots] = useState<
    RectangleCommandMetadataSnapshot[]
  >([]);
  const [output, setOutput] = useState('');
  const [message, setMessage] = useState('');

  const capture = (state: RectangleCommandCaptureState, index: number) => {
    const snapshot = onCapture(state, index + 1);
    setSnapshots((current) => [...current.slice(0, index), snapshot]);
    setOutput('');
    setMessage(
      `State ${String.fromCharCode(65 + index)} saved as owner-reported with bounded DOM observations.`,
    );
  };

  const copy = async () => {
    const serialized = serializeRectangleCommandMetadataReport(
      createRectangleCommandMetadataReport(snapshots),
    );
    setOutput(serialized);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(serialized);
      setMessage(
        'Sanitized command metadata report copied. Review it locally before sharing.',
      );
    } catch {
      setMessage(
        'Clipboard unavailable. Select and copy the sanitized report below.',
      );
    }
  };

  const restart = () => {
    setSnapshots([]);
    setOutput('');
    setMessage('Experiment restarted. No prior snapshot is retained.');
  };

  return (
    <section aria-label="Rectangle command metadata experiment">
      <h4>Rectangle command metadata experiment</h4>
      <p>
        Read-only and local. You perform every Onshape action. State names are
        owner-reported; the report separately records bounded command, toolbar,
        arrow, menu, visibility, and ownership observations. It does not run
        production recognition or verify CAD geometry.
      </p>
      {STATES.map((entry, index) => (
        <div key={entry.state}>
          <p>{entry.instruction}</p>
          <button
            type="button"
            className="leqad-button leqad-button--secondary"
            disabled={snapshots.length !== index}
            onClick={() => capture(entry.state, index)}
          >
            Record metadata {entry.label}
          </button>
        </div>
      ))}
      {snapshots.length > 0 && (
        <button
          type="button"
          className="leqad-button leqad-button--text"
          onClick={restart}
        >
          Restart experiment
        </button>
      )}
      {snapshots.length === STATES.length && (
        <button
          type="button"
          className="leqad-button leqad-button--secondary"
          onClick={() => void copy()}
        >
          Copy command metadata report
        </button>
      )}
      {message && <p role="status">{message}</p>}
      {output && (
        <textarea
          readOnly
          aria-label="Rectangle command metadata diagnostic output"
          value={output}
        />
      )}
    </section>
  );
}
