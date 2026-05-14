import { formatMetric } from '../utils/formatters.js';

const WIDTH = 520;
const HEIGHT = 300;
const PAD_LEFT = 56;
const PAD_RIGHT = 24;
const PAD_TOP = 24;
const PAD_BOTTOM = 46;

function getExtent(values) {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return [-1, 1];
  }

  const min = Math.min(...finiteValues);
  const max = Math.max(...finiteValues);
  const pad = Math.max((max - min) * 0.08, 0.1);

  return [min - pad, max + pad];
}

function scaleX(value, min, max) {
  return PAD_LEFT + ((value - min) / Math.max(max - min, 1e-8)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
}

function scaleY(value, min, max) {
  return HEIGHT - PAD_BOTTOM - ((value - min) / Math.max(max - min, 1e-8)) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
}

function ActualPredictedChart({ diagnostics }) {
  if (diagnostics.length === 0) {
    return <div className="empty-state">График появится после запуска обучения.</div>;
  }

  const values = diagnostics.flatMap((point) => [point.actual, point.predicted]);
  const [minValue, maxValue] = getExtent(values);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Actual vs Predicted">
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={HEIGHT - PAD_BOTTOM} className="axis" />
        <line x1={PAD_LEFT} y1={HEIGHT - PAD_BOTTOM} x2={WIDTH - PAD_RIGHT} y2={HEIGHT - PAD_BOTTOM} className="axis" />
        <line
          x1={scaleX(minValue, minValue, maxValue)}
          y1={scaleY(minValue, minValue, maxValue)}
          x2={scaleX(maxValue, minValue, maxValue)}
          y2={scaleY(maxValue, minValue, maxValue)}
          className="ideal-line"
        />
        {[0, 0.5, 1].map((part) => {
          const value = minValue + (maxValue - minValue) * part;
          const x = scaleX(value, minValue, maxValue);
          const y = scaleY(value, minValue, maxValue);

          return (
            <g key={part}>
              <line x1={x} y1={PAD_TOP} x2={x} y2={HEIGHT - PAD_BOTTOM} className="grid-line" />
              <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} className="grid-line" />
              <text x={PAD_LEFT - 10} y={y + 4} textAnchor="end" className="chart-label">
                {formatMetric(value, 2)}
              </text>
            </g>
          );
        })}
        {diagnostics.map((point, index) => (
          <circle
            key={`${point.actual}-${point.predicted}-${index}`}
            cx={scaleX(point.actual, minValue, maxValue)}
            cy={scaleY(point.predicted, minValue, maxValue)}
            r={3.2}
            className="regression-point"
          />
        ))}
        <text x={PAD_LEFT} y={HEIGHT - 12} className="chart-label">
          true y
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 12} textAnchor="end" className="chart-label">
          predicted y
        </text>
      </svg>
      <div className="legend-row">
        <span><i className="legend-swatch legend-swatch-ideal" /> идеальное предсказание</span>
        <span><i className="legend-dot legend-dot-regression" /> наблюдения</span>
      </div>
    </div>
  );
}

export default ActualPredictedChart;
