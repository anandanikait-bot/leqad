import { useEffect, useRef, useState } from 'react';
import type { SketchControlCaptureTask } from '../../services/sketchControlCapture';

export function SketchControlDiagnostic({
  onCapture,
}: {
  onCapture: () => SketchControlCaptureTask;
}) {
  const taskRef = useRef<SketchControlCaptureTask | null>(null);
  const [pending, setPending] = useState(false);
  const [output, setOutput] = useState('');
  const [message, setMessage] = useState('');
  useEffect(
    () => () => {
      const task = taskRef.current;
      taskRef.current = null;
      task?.cancel();
    },
    [],
  );
  const capture = () => {
    taskRef.current?.cancel();
    setOutput('');
    setMessage(
      'Click the actual Sketch toolbar control within 20 seconds. Your normal click will continue.',
    );
    const task = onCapture();
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
      setMessage('Sketch diagnostic copied.');
    } catch {
      setMessage('Select the report below and copy it manually.');
    }
  };
  return (
    <section data-leqad-root aria-label="Sketch control capture">
      <button
        type="button"
        className="leqad-button leqad-button--secondary"
        onClick={capture}
        disabled={pending}
      >
        Capture Sketch control
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
            Copy Sketch diagnostic
          </button>
          <textarea
            aria-label="Sketch diagnostic report"
            readOnly
            value={output}
            rows={6}
          />
        </>
      )}
    </section>
  );
}
