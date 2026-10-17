import { useEffect, useRef, useState } from 'react';
import type { SketchDialogIdentityReport } from '../../services/sketchDialogIdentityCapture';
import type {
  SketchControlCaptureTask,
  SketchControlCapturePurpose,
} from '../../services/sketchControlCapture';
import type {
  EditorStateClaim,
  SketchEditorSnapshot,
} from '../../services/sketchEditorComparisonCapture';
import {
  compareSketchEditorSnapshots,
  serializeSketchEditorComparison,
} from '../../services/sketchEditorComparisonCapture';

export function SketchControlDiagnostic({
  onCapture,
  onCaptureIdentity,
  onCaptureEditorState,
}: {
  onCapture: (
    purpose?: SketchControlCapturePurpose,
  ) => SketchControlCaptureTask;
  onCaptureIdentity?: () => SketchDialogIdentityReport;
  onCaptureEditorState?: (state: EditorStateClaim) => SketchEditorSnapshot;
}) {
  const taskRef = useRef<SketchControlCaptureTask | null>(null);
  const reportGeneration = useRef(0);
  const [pending, setPending] = useState(false);
  const [output, setOutput] = useState('');
  const [identityOutput, setIdentityOutput] = useState('');
  const identityOutputRef = useRef<string | null>(null);
  const [message, setMessage] = useState('');
  const [editorStateA, setEditorStateA] = useState<SketchEditorSnapshot | null>(
    null,
  );
  const [editorStateB, setEditorStateB] = useState<SketchEditorSnapshot | null>(
    null,
  );
  const [reportedStateB, setReportedStateB] = useState<
    Exclude<EditorStateClaim, 'SKETCH'> | ''
  >('');
  const [comparisonOutput, setComparisonOutput] = useState('');
  const [purpose, setPurpose] =
    useState<SketchControlCapturePurpose>('SKETCH_COMMAND');
  const exit = purpose === 'ACTIVE_SKETCH_EXIT';
  useEffect(
    () => () => {
      reportGeneration.current++;
      identityOutputRef.current = null;
      const task = taskRef.current;
      taskRef.current = null;
      task?.cancel();
    },
    [],
  );
  const capture = (nextPurpose: SketchControlCapturePurpose) => {
    reportGeneration.current++;
    setPurpose(nextPurpose);
    identityOutputRef.current = null;
    setIdentityOutput('');
    taskRef.current?.cancel();
    setOutput('');
    setMessage(
      nextPurpose === 'ACTIVE_SKETCH_EXIT'
        ? 'While editing Sketch, click the actual Finish/Exit Sketch control within 20 seconds. Your normal click may exit Sketch. The diagnostic does not identify or activate it for you.'
        : 'Click the actual Sketch toolbar control within 20 seconds. Your normal click will continue.',
    );
    const task = onCapture(nextPurpose);
    taskRef.current = task;
    setPending(true);
    void task.promise.then((result) => {
      if (taskRef.current !== task) return;
      taskRef.current = null;
      setPending(false);
      if (result.status === 'CAPTURED') {
        setOutput(JSON.stringify(result.report));
        setMessage(
          'Sanitized local capture ready. This does not verify recognition or lesson completion.',
        );
      } else
        setMessage(
          result.status === 'TIMED_OUT'
            ? 'Capture timed out. You can retry.'
            : 'Capture cancelled. You can retry.',
        );
    });
  };
  const captureIdentity = () => {
    if (!onCaptureIdentity || pending) return;
    reportGeneration.current++;
    setOutput('');
    try {
      const snapshot = JSON.stringify(onCaptureIdentity());
      identityOutputRef.current = snapshot;
      setIdentityOutput(snapshot);
      setMessage(
        'Read-only identity snapshot ready. Active Sketch and control identities remain unverified. Save and review locally.',
      );
    } catch {
      identityOutputRef.current = null;
      setIdentityOutput('');
      setMessage(
        'Dialog identity was not established. No CAD action was performed.',
      );
    }
  };
  const captureEditorState = (state: EditorStateClaim) => {
    if (!onCaptureEditorState || pending) return;
    if (state !== 'SKETCH' && !editorStateA) {
      setMessage('Capture State A — Sketch first.');
      return;
    }
    reportGeneration.current++;
    setOutput('');
    setIdentityOutput('');
    identityOutputRef.current = null;
    setComparisonOutput('');
    if (state === 'SKETCH') {
      setEditorStateA(null);
      setEditorStateB(null);
    } else {
      setEditorStateB(null);
    }
    try {
      const snapshot = onCaptureEditorState(state);
      if (state === 'SKETCH') {
        setEditorStateA(snapshot);
        setEditorStateB(null);
        setMessage(
          'State A captured. This state is owner-reported; manually enter Extrude or another unrelated feature editor before State B.',
        );
      } else {
        setEditorStateB(snapshot);
        setMessage(
          'State B captured. Editor states remain owner-reported; compare the sanitized observations below.',
        );
      }
    } catch {
      setMessage(
        'The editor snapshot was incomplete. No CAD action was performed; you can retry.',
      );
    }
  };
  const copyEditorComparison = async () => {
    if (!editorStateA || !editorStateB) return;
    reportGeneration.current++;
    const generation = reportGeneration.current;
    const output = serializeSketchEditorComparison(
      compareSketchEditorSnapshots(editorStateA, editorStateB),
    );
    setComparisonOutput(output);
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(output);
      if (reportGeneration.current !== generation) return;
      setMessage(
        'Sanitized comparison copied. Both editor labels are owner-reported, not verified recognition.',
      );
    } catch {
      if (reportGeneration.current !== generation) return;
      setMessage(
        'Clipboard unavailable. Select and copy the comparison report below.',
      );
    }
  };
  const copyIdentity = async () => {
    const snapshot = identityOutputRef.current;
    const generation = reportGeneration.current;
    if (!snapshot) return;
    try {
      if (!navigator.clipboard?.writeText)
        throw new Error('Clipboard unavailable');
      await navigator.clipboard.writeText(snapshot);
      if (
        identityOutputRef.current !== snapshot ||
        reportGeneration.current !== generation
      )
        return;
      setMessage(
        'Sketch dialog identity copied. Save and review locally before sharing.',
      );
    } catch {
      if (
        identityOutputRef.current !== snapshot ||
        reportGeneration.current !== generation
      )
        return;
      setMessage(
        'Select the Sketch dialog identity report below and copy it manually.',
      );
    }
  };
  const copy = async () => {
    const generation = reportGeneration.current;
    try {
      await navigator.clipboard.writeText(output);
      if (reportGeneration.current !== generation) return;
      setMessage(
        exit
          ? 'Sketch exit diagnostic copied. Save and review locally before sharing.'
          : 'Sketch diagnostic copied.',
      );
    } catch {
      if (reportGeneration.current !== generation) return;
      setMessage('Select the report below and copy it manually.');
    }
  };
  return (
    <section data-leqad-root aria-label="Sketch control capture">
      <button
        type="button"
        className="leqad-button leqad-button--secondary"
        onClick={() => capture('SKETCH_COMMAND')}
        disabled={pending}
      >
        Capture Sketch control
      </button>
      <button
        type="button"
        className="leqad-button leqad-button--secondary"
        onClick={() => capture('ACTIVE_SKETCH_EXIT')}
        disabled={pending}
      >
        Capture Sketch exit control
      </button>
      {onCaptureIdentity && (
        <button
          type="button"
          className="leqad-button leqad-button--secondary"
          onClick={captureIdentity}
          disabled={pending}
        >
          Capture Sketch dialog identity
        </button>
      )}
      {onCaptureEditorState && (
        <div role="group" aria-label="Sketch and other editor comparison">
          <p>
            Optional read-only pair: first capture while you report editing
            Sketch, then manually enter Extrude or another unrelated feature
            editor. Choose the matching State B label and capture. Leqad does
            not verify either state, click CAD controls, or verify geometry.
          </p>
          <button
            type="button"
            className="leqad-button leqad-button--secondary"
            onClick={() => captureEditorState('SKETCH')}
            disabled={pending}
          >
            Capture State A — Sketch
          </button>
          <label>
            State B reported editor
            <select
              aria-label="State B reported editor"
              value={reportedStateB}
              onChange={(event) =>
                setReportedStateB(
                  event.currentTarget.value as
                    Exclude<EditorStateClaim, 'SKETCH'> | '',
                )
              }
            >
              <option value="">Choose editor type</option>
              <option value="EXTRUDE">Extrude</option>
              <option value="OTHER_FEATURE_EDITOR">
                Another unrelated feature editor
              </option>
            </select>
          </label>
          <button
            type="button"
            className="leqad-button leqad-button--secondary"
            onClick={() => reportedStateB && captureEditorState(reportedStateB)}
            disabled={pending || !editorStateA || !reportedStateB}
          >
            {reportedStateB === 'EXTRUDE'
              ? 'Capture State B — Extrude'
              : 'Capture State B — Other Editor'}
          </button>
          {editorStateA && (
            <p role="status">State A captured · owner-reported</p>
          )}
          {editorStateB && (
            <p role="status">State B captured · owner-reported</p>
          )}
          {editorStateA && editorStateB && (
            <button
              type="button"
              className="leqad-button leqad-button--secondary"
              onClick={() => void copyEditorComparison()}
            >
              Copy Sketch vs other editor report
            </button>
          )}
          {comparisonOutput && (
            <textarea
              aria-label="Sketch vs other editor comparison report"
              readOnly
              value={comparisonOutput}
              rows={8}
            />
          )}
        </div>
      )}
      {pending && (
        <button
          type="button"
          className="leqad-button leqad-button--text"
          onClick={() => taskRef.current?.cancel()}
        >
          Cancel Sketch capture
        </button>
      )}
      {message && <p role="status">{message}</p>}
      {identityOutput && (
        <>
          <button
            type="button"
            className="leqad-button leqad-button--secondary"
            onClick={() => void copyIdentity()}
          >
            Copy Sketch dialog identity
          </button>
          <textarea
            aria-label="Sketch dialog identity report"
            readOnly
            value={identityOutput}
            rows={6}
          />
        </>
      )}
      {output && (
        <>
          <button
            type="button"
            className="leqad-button leqad-button--secondary"
            onClick={() => void copy()}
          >
            {exit ? 'Copy Sketch exit diagnostic' : 'Copy Sketch diagnostic'}
          </button>
          <textarea
            aria-label={
              exit
                ? 'Sketch exit diagnostic report'
                : 'Sketch diagnostic report'
            }
            readOnly
            value={output}
            rows={6}
          />
        </>
      )}
    </section>
  );
}
