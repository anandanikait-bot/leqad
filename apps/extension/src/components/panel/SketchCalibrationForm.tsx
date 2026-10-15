import { useEffect, useRef, useState } from 'react';
import {
  calibrationMatchesViewport,
  createSketchHighlightCalibration,
  INITIAL_SKETCH_RECTANGLE,
  readCalibrationViewport,
} from '../../services/calibratedHighlight';
import type {
  CalibrationViewport,
  NormalizedHighlightRectangle,
  SketchHighlightCalibration,
} from '../../services/calibratedHighlight';

interface Props {
  calibration: SketchHighlightCalibration | null;
  onPreview: (calibration: SketchHighlightCalibration) => boolean;
  onClear: () => void;
  onSave: (
    calibration: SketchHighlightCalibration | null,
  ) => void | Promise<void>;
  onCancel: () => void;
}

const fields = [
  ['x', 'Left (%)'],
  ['y', 'Top (%)'],
  ['width', 'Width (%)'],
  ['height', 'Height (%)'],
] as const;
type PercentValues = Record<keyof NormalizedHighlightRectangle, string>;

function percentValues(rectangle: NormalizedHighlightRectangle): PercentValues {
  return Object.fromEntries(
    fields.map(([key]) => [
      key,
      String(Number((rectangle[key] * 100).toFixed(3))),
    ]),
  ) as PercentValues;
}

function fromPercent(values: PercentValues, viewport: CalibrationViewport) {
  if (Object.values(values).some((value) => value.trim() === '')) return null;
  return createSketchHighlightCalibration(
    {
      x: Number(values.x) / 100,
      y: Number(values.y) / 100,
      width: Number(values.width) / 100,
      height: Number(values.height) / 100,
    },
    viewport,
  );
}

export function SketchCalibrationForm({
  calibration,
  onPreview,
  onClear,
  onSave,
  onCancel,
}: Props) {
  const [values, setValues] = useState(() =>
    percentValues(calibration?.rectangle ?? INITIAL_SKETCH_RECTANGLE),
  );
  const initialValues = useRef(values);
  const [previewViewport, setPreviewViewport] =
    useState<CalibrationViewport | null>(null);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const initial = fromPercent(
      initialValues.current,
      readCalibrationViewport(window),
    );
    if (initial && onPreview(initial)) setPreviewViewport(initial.viewport);
    const invalidate = () => {
      onClear();
      setPreviewViewport(null);
      setMessage('Viewport changed. Preview the outline again before saving.');
    };
    window.addEventListener('resize', invalidate);
    window.visualViewport?.addEventListener('resize', invalidate);
    return () => {
      window.removeEventListener('resize', invalidate);
      window.visualViewport?.removeEventListener('resize', invalidate);
      onClear();
    };
  }, [onPreview, onClear]);

  const preview = (nextValues: PercentValues) => {
    const next = fromPercent(nextValues, readCalibrationViewport(window));
    if (!next) {
      onClear();
      setPreviewViewport(null);
      setMessage(
        'Enter a rectangle fully inside the viewport, with positive width and height.',
      );
    } else if (!onPreview(next)) {
      setPreviewViewport(null);
      setMessage(
        'The preview is unavailable. Try again in the supported Onshape workspace.',
      );
    } else {
      setPreviewViewport(next.viewport);
      setMessage('');
    }
  };

  const draft = fromPercent(values, readCalibrationViewport(window));
  const previewIsCurrent = Boolean(
    draft &&
    previewViewport &&
    calibrationMatchesViewport(
      { ...draft, viewport: previewViewport },
      readCalibrationViewport(window),
    ),
  );

  const save = async (reset = false) => {
    let next: SketchHighlightCalibration | null = null;
    if (!reset) {
      const viewport = readCalibrationViewport(window);
      const currentDraft = fromPercent(values, viewport);
      if (
        !currentDraft ||
        !previewViewport ||
        !calibrationMatchesViewport(
          { ...currentDraft, viewport: previewViewport },
          viewport,
        )
      ) {
        onClear();
        setPreviewViewport(null);
        setMessage(
          'Viewport changed. Preview the outline again before saving.',
        );
        return;
      }
      next = { ...currentDraft, viewport: previewViewport };
    }
    setSaving(true);
    setMessage('');
    try {
      await onSave(next);
    } catch {
      setMessage(
        'Leqad could not save your calibration. Try again; the previous saved calibration is unchanged.',
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <section
      role="group"
      aria-label="Sketch highlight calibration"
      className="leqad-calibration"
    >
      <p>
        The outline is an approximate location. Adjust it to surround your
        Sketch toolbar button, then save. The starting coordinates are
        unverified.
      </p>
      <div className="leqad-calibration__fields">
        {fields.map(([key, label]) => (
          <label key={key}>
            {label}
            <input
              type="number"
              min="0"
              max="100"
              step="0.1"
              value={values[key]}
              disabled={saving}
              onChange={(event) => {
                const next = { ...values, [key]: event.target.value };
                setValues(next);
                preview(next);
              }}
            />
          </label>
        ))}
      </div>
      {message && <p role="alert">{message}</p>}
      <div className="leqad-help-row">
        <button
          type="button"
          className="leqad-button leqad-button--secondary"
          onClick={() => preview(values)}
          disabled={saving}
        >
          Preview outline
        </button>
        <button
          type="button"
          className="leqad-button leqad-button--primary"
          onClick={() => void save()}
          disabled={saving || !draft || !previewIsCurrent}
        >
          Save calibration
        </button>
        <button
          type="button"
          className="leqad-button leqad-button--text"
          onClick={onCancel}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          type="button"
          className="leqad-button leqad-button--text"
          onClick={() => void save(true)}
          disabled={saving || !calibration}
        >
          Reset calibration
        </button>
      </div>
    </section>
  );
}
