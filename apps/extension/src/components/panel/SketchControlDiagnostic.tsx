import { useEffect, useRef, useState } from 'react';
import type {
  SketchControlCaptureTask,
  SketchControlCapturePurpose,
} from '../../services/sketchControlCapture';

export function SketchControlDiagnostic({
  onCapture,
}: {
  onCapture: (
    purpose?: SketchControlCapturePurpose,
  ) => SketchControlCaptureTask;
}) {
  const taskRef = useRef<SketchControlCaptureTask | null>(null);
  const [pending, setPending] = useState(false);
  const [output, setOutput] = useState('');
  const [message, setMessage] = useState('');
  const [purpose, setPurpose] =
    useState<SketchControlCapturePurpose>('SKETCH_COMMAND');
  const exit = purpose === 'ACTIVE_SKETCH_EXIT';
  useEffect(
    () => () => {
      const task = taskRef.current;
      taskRef.current = null;
      task?.cancel();
    },
    [],
  );
  const capture = (nextPurpose: SketchControlCapturePurpose) => {
    setPurpose(nextPurpose);
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
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(output);
      setMessage(
        exit
          ? 'Sketch exit diagnostic copied. Save and review locally before sharing.'
          : 'Sketch diagnostic copied.',
      );
    } catch {
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
