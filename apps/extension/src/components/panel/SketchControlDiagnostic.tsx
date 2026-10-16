import { useEffect, useRef, useState } from 'react';
import type { SketchDialogIdentityReport } from '../../services/sketchDialogIdentityCapture';
import type {
  SketchControlCaptureTask,
  SketchControlCapturePurpose,
} from '../../services/sketchControlCapture';

export function SketchControlDiagnostic({
  onCapture,
  onCaptureIdentity,
}: {
  onCapture: (
    purpose?: SketchControlCapturePurpose,
  ) => SketchControlCaptureTask;
  onCaptureIdentity?: () => SketchDialogIdentityReport;
}) {
  const taskRef = useRef<SketchControlCaptureTask | null>(null);
  const reportGeneration = useRef(0);
  const [pending, setPending] = useState(false);
  const [output, setOutput] = useState('');
  const [identityOutput, setIdentityOutput] = useState('');
  const identityOutputRef = useRef<string | null>(null);
  const [message, setMessage] = useState('');
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
