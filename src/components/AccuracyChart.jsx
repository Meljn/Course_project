import { formatPercent } from '../utils/formatters.js';

const WIDTH = 620;
const HEIGHT = 240;
const PAD_LEFT = 54;
const PAD_RIGHT = 20;
const PAD_TOP = 22;
const PAD_BOTTOM = 38;

function makePath(points) {
  const values = points.filter((point) => Number.isFinite(point.accuracy));

  if (values.length === 0) {
    return '';
  }

  const lastEpoch = Math.max(values[values.length - 1].epoch, 1);

  return values
    .map((point, index) => {
      const x = PAD_LEFT + ((point.epoch - 1) / Math.max(lastEpoch - 1, 1)) * (WIDTH - PAD_LEFT - PAD_RIGHT);
      const y = HEIGHT - PAD_BOTTOM - point.accuracy * (HEIGHT - PAD_TOP - PAD_BOTTOM);
      return `${index === 0 ? 'M' : 'L'} ${x.toFixed(2)} ${y.toFixed(2)}`;
    })
    .join(' ');
}

function AccuracyChart({ history }) {
  const accuracyPath = makePath(history);
  const lastPoint = history[history.length - 1];

  if (history.length === 0) {
    return <div className="empty-state empty-state-compact">График появится после запуска обучения.</div>;
  }

  return (
    <div className="chart-wrap">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="График точности">
        <line x1={PAD_LEFT} y1={PAD_TOP} x2={PAD_LEFT} y2={HEIGHT - PAD_BOTTOM} className="axis" />
        <line x1={PAD_LEFT} y1={HEIGHT - PAD_BOTTOM} x2={WIDTH - PAD_RIGHT} y2={HEIGHT - PAD_BOTTOM} className="axis" />
        {[0, 0.5, 1].map((part) => {
          const y = HEIGHT - PAD_BOTTOM - part * (HEIGHT - PAD_TOP - PAD_BOTTOM);

          return (
            <g key={part}>
              <line x1={PAD_LEFT} y1={y} x2={WIDTH - PAD_RIGHT} y2={y} className="grid-line" />
              <text x={PAD_LEFT - 10} y={y + 4} textAnchor="end" className="chart-label">
                {formatPercent(part)}
              </text>
            </g>
          );
        })}
        <path d={accuracyPath} className="line line-accuracy" />
        <text x={PAD_LEFT} y={HEIGHT - 10} className="chart-label">
          эпоха 1
        </text>
        <text x={WIDTH - PAD_RIGHT} y={HEIGHT - 10} textAnchor="end" className="chart-label">
          эпоха {lastPoint.epoch}
        </text>
      </svg>
      <div className="legend-row">
        <span><i className="legend-dot legend-dot-accuracy" /> accuracy: {formatPercent(lastPoint.accuracy)}</span>
      </div>
    </div>
  );
}

export default AccuracyChart;
