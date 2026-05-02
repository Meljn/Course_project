import { formatMetric } from '../utils/formatters.js';

function WeightsPanel({ parameters }) {
  if (parameters.length === 0) {
    return <div className="empty-state">После создания модели здесь появятся веса и смещения.</div>;
  }

  return (
    <div className="weights-stack">
      {parameters.map((layer) => (
        <details className="weights-layer" key={layer.id}>
          <summary>
            <span>{layer.name}</span>
            <small>{layer.fromUnits} входов, {layer.toUnits} нейронов</small>
          </summary>

          <div className="weights-content">
            <div className="matrix-wrap">
              <table>
                <caption>Веса</caption>
                <tbody>
                  {layer.weights.map((row, rowIndex) => (
                    <tr key={`row-${rowIndex}`}>
                      {row.map((value, columnIndex) => (
                        <td key={`${rowIndex}-${columnIndex}`}>{formatMetric(value, 3)}</td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="bias-list">
              <strong>Смещения</strong>
              <div>
                {layer.biases.map((value, index) => (
                  <span key={`${layer.id}-bias-${index}`}>b{index + 1}: {formatMetric(value, 3)}</span>
                ))}
              </div>
            </div>
          </div>
        </details>
      ))}
    </div>
  );
}

export default WeightsPanel;
