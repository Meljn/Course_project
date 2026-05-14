import { RefreshCw, Upload } from 'lucide-react';
import { REGRESSION_DATASET_OPTIONS, REGRESSION_LIMITS } from '../config/regressionConfig.js';

const WIDTH = 520;
const HEIGHT = 300;
const PADDING = 34;
const PLOT_WIDTH = WIDTH - PADDING * 2;
const PLOT_HEIGHT = HEIGHT - PADDING * 2;

function FieldError({ message }) {
  if (!message) {
    return null;
  }

  return <span className="field-error">{message}</span>;
}

function getExtent(values, fallback = [-1, 1]) {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return fallback;
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  const pad = Math.max((max - min) * 0.08, 0.1);

  return [min - pad, max + pad];
}

function scale(value, min, max, size) {
  return PADDING + ((value - min) / Math.max(max - min, 1e-8)) * (size - PADDING * 2);
}

function RegressionDatasetPreview({
  config,
  dataset,
  disabled,
  validation,
  onGenerate,
  onUploadCsv,
  onUpdate,
}) {
  const points = dataset?.all ?? [];
  const isCustomDataset = config.datasetType === 'custom';
  const [minX, maxX] = getExtent(points.map((point) => point.x), [-3, 3]);
  const [minY, maxY] = getExtent(points.map((point) => point.y), [-1, 1]);

  return (
    <div className="dataset-preview">
      <div className={`dataset-toolbar regression-toolbar ${isCustomDataset ? 'dataset-toolbar--custom' : ''}`}>
        <label className="field dataset-field">
          <span>Датасет</span>
          <select
            value={config.datasetType}
            disabled={disabled}
            onChange={(event) => onUpdate({ datasetType: event.target.value })}
          >
            {REGRESSION_DATASET_OPTIONS.map((option) => (
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
                min={REGRESSION_LIMITS.minSampleCount}
                max={REGRESSION_LIMITS.maxSampleCount}
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
                min={REGRESSION_LIMITS.minNoise}
                max={REGRESSION_LIMITS.maxNoise}
                step="0.01"
                value={config.noise}
                disabled={disabled}
                onChange={(event) => onUpdate({ noise: Number(event.target.value) })}
              />
              <FieldError message={validation.errors.noise} />
            </label>

            <button type="button" className="panel-action dataset-generate" onClick={onGenerate} disabled={disabled}>
              <RefreshCw size={16} />
              Новые данные
            </button>
          </>
        )}
      </div>

      {isCustomDataset && (
        <div className="custom-dataset-card">
          {dataset?.type === 'custom' ? (
            <>
              <div className="custom-dataset-metrics">
                <span>{dataset.rowCount} строк</span>
                <span>{dataset.featureCount} признаков</span>
                <span>train/val: {dataset.trainCount}/{dataset.validationCount}</span>
                <span>цель: {dataset.targetColumnName}</span>
              </div>
              <div className="custom-dataset-stats">
                {dataset.featureColumnNames.slice(0, 4).map((name, index) => (
                  <span key={name}>
                    {name}: μ {dataset.xScaler[index].mean.toFixed(2)}, σ {dataset.xScaler[index].std.toFixed(2)}
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

      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Точки регрессионного датасета">
        <rect x={PADDING} y={PADDING} width={PLOT_WIDTH} height={PLOT_HEIGHT} className="plot-area" />
        <line x1={PADDING} y1={HEIGHT - PADDING} x2={WIDTH - PADDING} y2={HEIGHT - PADDING} className="plot-axis" />
        <line x1={PADDING} y1={PADDING} x2={PADDING} y2={HEIGHT - PADDING} className="plot-axis" />
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={scale(point.x, minX, maxX, WIDTH)}
            cy={HEIGHT - scale(point.y, minY, maxY, HEIGHT)}
            r={3.2}
            className="regression-point"
          />
        ))}
        <text x={PADDING} y={HEIGHT - 8} className="chart-label">
          {dataset?.featureColumnNames?.[0] ?? 'x'}
        </text>
        <text x={PADDING} y={20} className="chart-label">
          {dataset?.targetColumnName ?? 'y'}
        </text>
      </svg>
    </div>
  );
}

export default RegressionDatasetPreview;
