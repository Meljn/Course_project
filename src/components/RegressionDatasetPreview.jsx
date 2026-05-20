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

function scaleY(value, min, max) {
  return HEIGHT - scale(value, min, max, HEIGHT);
}

function makeTicks(min, max) {
  return [min, min + (max - min) / 2, max];
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
  const xAxisY = HEIGHT - PADDING;
  const yAxisX = PADDING;
  const xTicks = makeTicks(minX, maxX);
  const yTicks = makeTicks(minY, maxY);

  return (
    <div className={`dataset-preview ${isCustomDataset ? 'dataset-preview--custom' : ''}`}>
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
        <line x1={PADDING} y1={xAxisY} x2={WIDTH - PADDING} y2={xAxisY} className="coordinate-axis" />
        <line x1={yAxisX} y1={PADDING} x2={yAxisX} y2={HEIGHT - PADDING} className="coordinate-axis" />
        {xTicks.map((value) => {
          const x = scale(value, minX, maxX, WIDTH);

          return (
            <g key={`regression-x-tick-${value}`}>
              <line x1={x} y1={xAxisY} x2={x} y2={xAxisY + 5} className="axis-tick" />
              <text x={x} y={Math.min(xAxisY + 18, HEIGHT - 8)} textAnchor="middle" className="chart-label">
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}
        {yTicks.map((value) => {
          const y = scaleY(value, minY, maxY);

          return (
            <g key={`regression-y-tick-${value}`}>
              <line x1={yAxisX - 5} y1={y} x2={yAxisX} y2={y} className="axis-tick" />
              <text x={Math.max(yAxisX - 8, 8)} y={y + 4} textAnchor="end" className="chart-label">
                {value.toFixed(1)}
              </text>
            </g>
          );
        })}
        {points.map((point, index) => (
          <circle
            key={`${point.x}-${point.y}-${index}`}
            cx={scale(point.x, minX, maxX, WIDTH)}
            cy={scaleY(point.y, minY, maxY)}
            r={3.2}
            className="regression-point"
          />
        ))}
        <text x={WIDTH - 7} y={xAxisY + 4} textAnchor="end" className="axis-name">
          {dataset?.featureColumnNames?.[0] ?? 'x'}
        </text>
        <text x={yAxisX} y={13} textAnchor="middle" className="axis-name">
          {dataset?.targetColumnName ?? 'y'}
        </text>
      </svg>
    </div>
  );
}

export default RegressionDatasetPreview;
