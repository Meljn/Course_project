import { formatMetric, getMaxAbsWeight } from '../utils/formatters.js';

const WIDTH = 940;
const HEIGHT = 360;
const PADDING_X = 72;
const PADDING_Y = 48;

function getLayerPositions(layers) {
  const layerGap = (WIDTH - PADDING_X * 2) / Math.max(layers.length - 1, 1);

  return layers.map((layer, layerIndex) => {
    const x = PADDING_X + layerIndex * layerGap;
    const neuronGap = (HEIGHT - PADDING_Y * 2) / Math.max(layer.count - 1, 1);
    const yOffset = layer.count === 1 ? HEIGHT / 2 : PADDING_Y;

    return {
      ...layer,
      x,
      neurons: Array.from({ length: layer.count }, (_, neuronIndex) => ({
        x,
        y: layer.count === 1 ? yOffset : PADDING_Y + neuronIndex * neuronGap,
      })),
    };
  });
}

function connectionColor(weight) {
  if (weight === null || weight === undefined) {
    return '#b8c0cc';
  }

  return weight >= 0 ? '#2f9e44' : '#d9480f';
}

function connectionWidth(weight, maxAbs) {
  if (weight === null || weight === undefined) {
    return 1;
  }

  return 0.7 + (Math.abs(weight) / maxAbs) * 4.2;
}

function NetworkGraph({ config, inputUnits = 2, parameters }) {
  const layers = [
    { label: 'Вход', count: Math.max(1, Math.trunc(Number(inputUnits)) || 1) },
    ...config.hiddenLayers.map((count, index) => ({ label: `Скрытый ${index + 1}`, count: Number(count) || 0 })),
    { label: 'Выход', count: 1 },
  ];
  const positionedLayers = getLayerPositions(layers);
  const maxAbs = getMaxAbsWeight(parameters);
  const connections = positionedLayers.slice(0, -1).flatMap((layer, layerIndex) => {
    const nextLayer = positionedLayers[layerIndex + 1];
    const weights = parameters[layerIndex]?.weights ?? [];

    return layer.neurons.flatMap((fromNeuron, fromIndex) =>
      nextLayer.neurons.map((toNeuron, toIndex) => ({
        id: `${layerIndex}-${fromIndex}-${toIndex}`,
        fromNeuron,
        toNeuron,
        fromIndex,
        toIndex,
        weight: weights[fromIndex]?.[toIndex],
      })),
    );
  });

  return (
    <div className="network-viewport">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Структура нейронной сети">
        <g className="connections">
          {connections.map(({ id, fromNeuron, toNeuron, fromIndex, toIndex, weight }) => (
            <g key={id}>
              <line
                x1={fromNeuron.x + 18}
                y1={fromNeuron.y}
                x2={toNeuron.x - 18}
                y2={toNeuron.y}
                stroke={connectionColor(weight)}
                strokeWidth={connectionWidth(weight, maxAbs)}
                strokeOpacity={weight === undefined ? 0.24 : 0.64}
              />
              {weight !== undefined && (
                <title>
                  w{fromIndex + 1}.{toIndex + 1}: {formatMetric(weight, 3)}
                </title>
              )}
            </g>
          ))}
        </g>

        <g className="weight-labels">
          {connections.map(({ id, fromNeuron, toNeuron, weight }) => {
            const normalizedWeight = Math.abs(weight ?? 0) / maxAbs;
            const shouldShowLabel = weight !== undefined && (connections.length <= 80 || normalizedWeight >= 0.55);

            if (!shouldShowLabel) {
              return null;
            }

            const x = (fromNeuron.x + toNeuron.x) / 2;
            const y = (fromNeuron.y + toNeuron.y) / 2;
            const label = formatMetric(weight, 2);

            return (
              <g key={`label-${id}`} className="weight-label-group">
                <rect x={x - 18} y={y - 9} width={36} height={16} rx={4} className="weight-label-bg" />
                <text x={x} y={y + 3.5} textAnchor="middle" className="weight-label">
                  {label}
                </text>
              </g>
            );
          })}
        </g>

        <g className="neurons">
          {positionedLayers.map((layer, layerIndex) => (
            <g key={layer.label}>
              <text x={layer.x} y={24} textAnchor="middle" className="layer-label">
                {layer.label}
              </text>
              {layer.neurons.map((neuron, neuronIndex) => {
                const bias = layerIndex > 0 ? parameters[layerIndex - 1]?.biases?.[neuronIndex] : undefined;
                const biasAbs = Math.min(1, Math.abs(bias ?? 0));

                return (
                  <g key={`${layer.label}-${neuronIndex}`}>
                    <circle
                      cx={neuron.x}
                      cy={neuron.y}
                      r={18}
                      className={layerIndex === 0 ? 'neuron neuron-input' : 'neuron'}
                    />
                    <circle
                      cx={neuron.x}
                      cy={neuron.y}
                      r={22 + biasAbs * 5}
                      className={bias === undefined ? 'bias-ring bias-ring-empty' : 'bias-ring'}
                    />
                    <text x={neuron.x} y={neuron.y + 5} textAnchor="middle" className="neuron-label">
                      {neuronIndex + 1}
                    </text>
                  </g>
                );
              })}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default NetworkGraph;
