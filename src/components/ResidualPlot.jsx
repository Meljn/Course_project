import { formatMetric } from '../utils/formatters.js';

const WIDTH = 520;
const HEIGHT = 300;
const PAD_LEFT = 56;
const PAD_RIGHT = 24;
const PAD_TOP = 24;
const PAD_BOTTOM = 46;

function getExtent(values, symmetric = false) {
  const finiteValues = values.filter((value) => Number.isFinite(value));

  if (finiteValues.length === 0) {
    return [-1, 1];
  }

  if (symmetric) {
    const maxAbs = Math.max(0.1, ...finiteValues.map((value) => Math.abs(value)));
    return [-maxAbs * 1.12, maxAbs * 1.12];
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

function ResidualPlot({ diagnostics }) {
  if (diagnostics.length === 0) {
    return <div className="empty-state">График появится после запуска обучения.</div>;
  }

  const [minPredicted, maxPredicted] = getExtent(diagnostics.map((point) => point.predicted));
  const [minResidual, maxResidual] = getExtent(diagnostics.map((point) => point.residual), true);
  const zeroY = scaleY(0, minResidual, maxResidual);

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Residual plot">
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={HEIGHT - PAD_BOTTOM} className="axis" />
        <line x1={PAD_LEFT} y1={HEIGHT - PAD_BOTTOM} x2={WIDTH - PAD_RIGHT} y2={HEIGHT - PAD_BOTTOM} className="axis" />
        <line x1={PAD_LEFT} y1={zeroY} x2={WIDTH - PAD_RIGHT} y2={zeroY} className="zero-line" />
        {[0, 0.5, 1].map((part) => {
          const residualValue = minResidual + (maxResidual - minResidual) * part;
          const y = scaleY(residualValue, minResidual, maxResidual);

          return (
            <g key={part}>
              <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} className="grid-line" />
              <text x={PAD_LEFT - 10} y={y + 4} textAnchor="end" className="chart-label">
                {formatMetric(residualValue, 2)}
              </text>
            </g>
          );
        })}
        {diagnostics.map((point, index) => (
          <circle
            key={`${point.predicted}-${point.residual}-${index}`}
            cx={scaleX(point.predicted, minPredicted, maxPredicted)}
            cy={scaleY(point.residual, minResidual, maxResidual)}
            r={3.2}
            className="regression-point residual-point"
          />
        ))}
        <text x={PAD_LEFT} y={HEIGHT - 12} className="chart-label">
          predicted y
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 12} textAnchor="end" className="chart-label">
          residual
        </text>
      </svg>
      <div className="legend-row">
        <span><i className="legend-swatch legend-swatch-zero" /> нулевая ошибка</span>
        <span><i className="legend-dot legend-dot-residual" /> остатки</span>
      </div>
    </div>
  );
}

export default ResidualPlot;
