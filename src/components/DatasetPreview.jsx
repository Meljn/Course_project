import { useMemo } from 'react';
import { RefreshCw } from 'lucide-react';
import { DATASET_OPTIONS, LIMITS } from '../config/trainingConfig.js';

const WIDTH = 360;
const HEIGHT = 280;
const PADDING = 26;
const PLOT_WIDTH = WIDTH - PADDING * 2;
const PLOT_HEIGHT = HEIGHT - PADDING * 2;
const DECISION_IMAGE_WIDTH = 240;
const DECISION_IMAGE_HEIGHT = Math.round((DECISION_IMAGE_WIDTH * PLOT_HEIGHT) / PLOT_WIDTH);

const NEGATIVE_COLOR = [245, 158, 11];
const POSITIVE_COLOR = [25, 195, 125];

function scale(value, size) {
  return PADDING + ((value + 1) / 2) * (size - PADDING * 2);
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="field-error">{message}</span>;
}

function probabilityAt(decisionGrid, x, y) {
  const { resolution, probabilities } = decisionGrid;
  const gx = x * (resolution - 1);
  const gy = y * (resolution - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, resolution - 1);
  const y1 = Math.min(y0 + 1, resolution - 1);
  const tx = gx - x0;
  const ty = gy - y0;
  const p00 = probabilities[y0 * resolution + x0] ?? 0.5;
  const p10 = probabilities[y0 * resolution + x1] ?? p00;
  const p01 = probabilities[y1 * resolution + x0] ?? p00;
  const p11 = probabilities[y1 * resolution + x1] ?? p10;
  const top = p00 * (1 - tx) + p10 * tx;
  const bottom = p01 * (1 - tx) + p11 * tx;

  return top * (1 - ty) + bottom * ty;
}

function createDecisionImage(decisionGrid) {
  if (!decisionGrid?.probabilities?.length || typeof document === 'undefined') {
    return '';
  }

  const canvas = document.createElement('canvas');
  canvas.width = DECISION_IMAGE_WIDTH;
  canvas.height = DECISION_IMAGE_HEIGHT;
  const context = canvas.getContext('2d');
  const image = context.createImageData(canvas.width, canvas.height);

  for (let y = 0; y < canvas.height; y += 1) {
    for (let x = 0; x < canvas.width; x += 1) {
      const probability = probabilityAt(
        decisionGrid,
        x / Math.max(canvas.width - 1, 1),
        y / Math.max(canvas.height - 1, 1),
      );
      const confidence = Math.abs(probability - 0.5) * 2;
      const offset = (y * canvas.width + x) * 4;

      image.data[offset] = Math.round(NEGATIVE_COLOR[0] * (1 - probability) + POSITIVE_COLOR[0] * probability);
      image.data[offset + 1] = Math.round(NEGATIVE_COLOR[1] * (1 - probability) + POSITIVE_COLOR[1] * probability);
      image.data[offset + 2] = Math.round(NEGATIVE_COLOR[2] * (1 - probability) + POSITIVE_COLOR[2] * probability);
      image.data[offset + 3] = Math.round(88 + confidence * 82);
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

function DatasetPreview({
  config,
  dataset,
  decisionGrid,
  disabled,
  validation,
  onGenerate,
  onUpdate,
}) {
  const points = dataset?.all ?? [];
  const decisionImage = useMemo(() => createDecisionImage(decisionGrid), [decisionGrid]);

  return (
    <div className="dataset-preview">
      <div className="dataset-toolbar">
        <label className="field dataset-field">
          <span>Датасет</span>
          <select
            value={config.datasetType}
            disabled={disabled}
            onChange={(event) => onUpdate({ datasetType: event.target.value })}
          >
            {DATASET_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <label className="field dataset-field">
          <span>Точки</span>
          <input
            type="number"
            min={LIMITS.minSampleCount}
            max={LIMITS.maxSampleCount}
            value={config.sampleCount}
            disabled={disabled}
            onChange={(event) => onUpdate({ sampleCount: event.target.value })}
          />
          <FieldError message={validation.errors.sampleCount} />
        </label>

        <label className="field dataset-field dataset-field-wide">
          <span>Шум: {Number(config.noise).toFixed(2)}</span>
          <input
            type="range"
            min={LIMITS.minNoise}
            max={LIMITS.maxNoise}
            step="0.01"
            value={config.noise}
            disabled={disabled}
            onChange={(event) => onUpdate({ noise: Number(event.target.value) })}
          />
          <FieldError message={validation.errors.noise} />
        </label>

        <button type="button" className="panel-action dataset-generate" onClick={onGenerate} disabled={disabled}>
          <RefreshCw size={16} />
          Новые точки
        </button>
      </div>

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Карта классификации учебных точек">
        <rect x={PADDING} y={PADDING} width={PLOT_WIDTH} height={PLOT_HEIGHT} className="plot-area" />

        {decisionImage && (
          <image
            href={decisionImage}
            x={PADDING}
            y={PADDING}
            width={PLOT_WIDTH}
            height={PLOT_HEIGHT}
            preserveAspectRatio="none"
            className="decision-image"
          />
        )}

        {decisionGrid && (
          <path
            className="decision-midline"
            d={`M ${PADDING} ${HEIGHT / 2} H ${WIDTH - PADDING} M ${WIDTH / 2} ${PADDING} V ${HEIGHT - PADDING}`}
          />
        )}

        <line x1={WIDTH / 2} y1={PADDING} x2={WIDTH / 2} y2={HEIGHT - PADDING} className="plot-axis" />
        <line x1={PADDING} y1={HEIGHT / 2} x2={WIDTH - PADDING} y2={HEIGHT / 2} className="plot-axis" />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={scale(point.x, WIDTH)}
            cy={HEIGHT - scale(point.y, HEIGHT)}
            r={point.split === 'train' ? 3.5 : 4.7}
            className={point.label === 1 ? 'point point-positive' : 'point point-negative'}
            opacity={point.split === 'train' ? 0.82 : 1}
          />
        ))}
      </svg>

      <div className="legend-row">
        <span><i className="legend-dot legend-dot-positive" /> класс 1</span>
        <span><i className="legend-dot legend-dot-negative" /> класс 0</span>
        <span><i className="legend-swatch legend-swatch-positive" /> область класса 1</span>
        <span><i className="legend-swatch legend-swatch-negative" /> область класса 0</span>
      </div>
    </div>
  );
}

export default DatasetPreview;
