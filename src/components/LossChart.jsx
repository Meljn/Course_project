import { formatMetric } from '../utils/formatters.js';

const WIDTH = 620;
const HEIGHT = 280;
const PAD_LEFT = 54;
const PAD_RIGHT = 20;
const PAD_TOP = 22;
const PAD_BOTTOM = 42;

function makePath(points, key, minY, maxY) {
  if (points.length === 0) {
    return '';
  }

  const lastEpoch = Math.max(points[points.length - 1].epoch, 1);
  const rangeY = Math.max(maxY - minY, 0.0001);

  return points
    .map((point, index) => {
      const x = PAD_LEFT + ((point.epoch - 1) / Math.max(lastEpoch - 1, 1)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
      const y = HEIGHT - PAD_BOTTOM - ((point[key] - minY) / rangeY) * (HEIGHT - PAD_TOP - PAD_BOTTOM);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function LossChart({ history }) {
  const values = history.flatMap((point) => [point.loss, point.valLoss]).filter((value) => Number.isFinite(value));
  const maxY = values.length ? Math.max(...values) * 1.08 : 1;
  const minY = values.length ? Math.max(0, Math.min(...values) * 0.86) : 0;
  const trainPath = makePath(history, 'loss', minY, maxY);
  const testPath = makePath(history, 'valLoss', minY, maxY);
  const lastPoint = history[history.length - 1];

  if (history.length === 0) {
    return <div className="empty-state">График появится после запуска обучения.</div>;
  }

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="График ошибки">
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={HEIGHT - PAD_BOTTOM} className="axis" />
        <line x1={PAD_LEFT} y1={HEIGHT - PAD_BOTTOM} x2={WIDTH - PAD_RIGHT} y2={HEIGHT - PAD_BOTTOM} className="axis" />
        {[0, 0.5, 1].map((part) => {
          const y = HEIGHT - PAD_BOTTOM - part * (HEIGHT - PAD_TOP - PAD_BOTTOM);
          const label = minY + (maxY - minY) * part;

          return (
            <g key={part}>
              <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} className="grid-line" />
              <text x={PAD_LEFT - 10} y={y + 4} textAnchor="end" className="chart-label">
                {formatMetric(label, 2)}
              </text>
            </g>
          );
        })}
        <path d={trainPath} className="line line-train" />
        <path d={testPath} className="line line-test" />
        <text x={PAD_LEFT} y={HEIGHT - 10} className="chart-label">
          эпоха 1
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 10} textAnchor="end" className="chart-label">
          эпоха {lastPoint.epoch}
        </text>
      </svg>
      <div className="legend-row">
        <span><i className="legend-dot legend-dot-train" /> train loss: {formatMetric(lastPoint.loss)}</span>
        <span><i className="legend-dot legend-dot-test" /> test loss: {formatMetric(lastPoint.valLoss)}</span>
      </div>
    </div>
  );
}

export default LossChart;
