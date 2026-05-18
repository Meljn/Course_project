import { useMemo } from 'react';
import { RefreshCw, Upload } from 'lucide-react';
import { DATASET_OPTIONS, LIMITS } from '../config/trainingConfig.js';

const WIDTH = 360;
const HEIGHT = 280;
const PADDING = 26;
const PLOT_WIDTH = WIDTH - PADDING * 2;
const PLOT_HEIGHT = HEIGHT - PADDING * 2;
const DECISION_IMAGE_WIDTH = 240;
const DECISION_IMAGE_HEIGHT = Math.round((DECISION_IMAGE_WIDTH * PLOT_HEIGHT) / PLOT_WIDTH);
const TRAIN_POINT_RADIUS = 3.5;
const TEST_POINT_RADIUS = 4.7;
const POINT_STROKE_WIDTH = 1.4;
const POINT_EDGE_GAP = 0.8;

const NEGATIVE_COLOR = [245, 158, 11];
const POSITIVE_COLOR = [25, 195, 125];
const CLASS_COLORS = [
  NEGATIVE_COLOR,
  POSITIVE_COLOR,
  [96, 165, 250],
  [236, 72, 153],
  [168, 85, 247],
  [20, 184, 166],
  [244, 114, 182],
  [250, 204, 21],
];

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function getPointRadius(point) {
  return point.split === 'train' ? TRAIN_POINT_RADIUS : TEST_POINT_RADIUS;
}

function scale(value, size, radius = 0) {
  const scaledValue = PADDING + ((value + 1) / 2) * (size - PADDING * 2);
  const inset = radius + POINT_STROKE_WIDTH / 2 + POINT_EDGE_GAP;

  return clamp(scaledValue, PADDING + inset, size - PADDING - inset);
}

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="field-error">{message}</span>;
}

function getColorCss(color) {
  return `rgb(${color[0]}, ${color[1]}, ${color[2]})`;
}

function getClassColor(labelIndex) {
  return getColorCss(CLASS_COLORS[Math.abs(Number(labelIndex) || 0) % CLASS_COLORS.length]);
}

function probabilityVectorAt(decisionGrid, x, y) {
  const { resolution, probabilities, outputUnits = 1 } = decisionGrid;
  const gx = x * (resolution - 1);
  const gy = y * (resolution - 1);
  const x0 = Math.floor(gx);
  const y0 = Math.floor(gy);
  const x1 = Math.min(x0 + 1, resolution - 1);
  const y1 = Math.min(y0 + 1, resolution - 1);
  const tx = gx - x0;
  const ty = gy - y0;
  if (outputUnits <= 1) {
    const p00 = probabilities[y0 * resolution + x0] ?? 0.5;
    const p10 = probabilities[y0 * resolution + x1] ?? p00;
    const p01 = probabilities[y1 * resolution + x0] ?? p00;
    const p11 = probabilities[y1 * resolution + x1] ?? p10;
    const top = p00 * (1 - tx) + p10 * tx;
    const bottom = p01 * (1 - tx) + p11 * tx;
    const positiveProbability = top * (1 - ty) + bottom * ty;

    return [1 - positiveProbability, positiveProbability];
  }

  return Array.from({ length: outputUnits }, (_, classIndex) => {
    const read = (row, column) => probabilities[(row * resolution + column) * outputUnits + classIndex] ?? 0;
    const p00 = read(y0, x0);
    const p10 = read(y0, x1);
    const p01 = read(y1, x0);
    const p11 = read(y1, x1);
    const top = p00 * (1 - tx) + p10 * tx;
    const bottom = p01 * (1 - tx) + p11 * tx;

    return top * (1 - ty) + bottom * ty;
  });
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
      const probabilities = probabilityVectorAt(
        decisionGrid,
        x / Math.max(canvas.width - 1, 1),
        y / Math.max(canvas.height - 1, 1),
      );
      const classIndex = probabilities.indexOf(Math.max(...probabilities));
      const confidence = Math.max(...probabilities);
      const color = CLASS_COLORS[classIndex % CLASS_COLORS.length];
      const offset = (y * canvas.width + x) * 4;

      image.data[offset] = color[0];
      image.data[offset + 1] = color[1];
      image.data[offset + 2] = color[2];
      image.data[offset + 3] = Math.round(88 + confidence * 82);
    }
  }

  context.putImageData(image, 0, 0);
  return canvas.toDataURL('image/png');
}

function DatasetPreview({
  config,
  dataset,
  customDatasetInfo,
  decisionGrid,
  disabled,
  validation,
  onGenerate,
  onUploadCsv,
  onUpdate,
}) {
  const points = dataset?.all ?? [];
  const isCustomDataset = config.datasetType === 'custom';
  const classNames = dataset?.classNames ?? ['0', '1'];
  const decisionImage = useMemo(
    () => (isCustomDataset ? '' : createDecisionImage(decisionGrid)),
    [decisionGrid, isCustomDataset],
  );

  return (
    <div className={`dataset-preview ${isCustomDataset ? 'dataset-preview--custom' : ''}`}>
      <div className={`dataset-toolbar ${isCustomDataset ? 'dataset-toolbar--custom' : ''}`}>
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

        {isCustomDataset ? (
          <button type="button" className="panel-action dataset-generate" onClick={onUploadCsv} disabled={disabled}>
            <Upload size={16} />
            Загрузить CSV
          </button>
        ) : (
          <>
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
          </>
        )}
      </div>

      {isCustomDataset && (
        <div className="custom-dataset-card">
          {customDatasetInfo ? (
            <>
              <div className="custom-dataset-metrics">
                <span>{customDatasetInfo.rowCount} строк</span>
                <span>{customDatasetInfo.featureCount} признаков</span>
                <span>train/test: {customDatasetInfo.trainCount}/{customDatasetInfo.testCount}</span>
                <span>метка: {customDatasetInfo.labelColumnName}</span>
              </div>
              <div className="custom-dataset-stats">
                {customDatasetInfo.stats.slice(0, 4).map((stat) => (
                  <span key={stat.column}>
                    {stat.column}: {stat.min.toFixed(2)}..{stat.max.toFixed(2)}
                  </span>
                ))}
              </div>
            </>
          ) : (
            <span className="custom-dataset-empty">CSV не загружен</span>
          )}
          <FieldError message={validation.errors.customDataset} />
        </div>
      )}

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

        {decisionGrid && !isCustomDataset && (
          <path
            className="decision-midline"
            d={`M ${PADDING} ${HEIGHT / 2} H ${WIDTH - PADDING} M ${WIDTH / 2} ${PADDING} V ${HEIGHT - PADDING}`}
          />
        )}

        <line x1={WIDTH / 2} y1={PADDING} x2={WIDTH / 2} y2={HEIGHT - PADDING} className="plot-axis" />
        <line x1={PADDING} y1={HEIGHT / 2} x2={WIDTH - PADDING} y2={HEIGHT / 2} className="plot-axis" />
        {points.map((point, index) => {
          const radius = getPointRadius(point);

          return (
            <circle
              key={`${point.x}-${point.y}-${index}`}
              cx={scale(point.x, WIDTH, radius)}
              cy={HEIGHT - scale(point.y, HEIGHT, radius)}
              r={radius}
              className="point"
              fill={getClassColor(point.label)}
              opacity={point.split === 'train' ? 0.82 : 1}
            />
          );
        })}
      </svg>

      <div className="legend-row">
        {classNames.map((className, index) => (
          <span key={`${className}-${index}`}>
            <i className="legend-dot" style={{ backgroundColor: getClassColor(index) }} /> класс {className}
          </span>
        ))}
      </div>
    </div>
  );
}

export default DatasetPreview;
