const WIDTH = 940;
const HEIGHT = 360;
const PADDING_X = 112;
const PADDING_Y = 48;
const MAX_VARIABLE_LABEL_LENGTH = 18;

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

function formatVariableLabel(label) {
  const value = String(label ?? '').trim();

  if (value.length <= MAX_VARIABLE_LABEL_LENGTH) {
    return value;
  }

  return `${value.slice(0, MAX_VARIABLE_LABEL_LENGTH - 3)}...`;
}

function makeVariableNames(names, count, prefix) {
  return Array.from({ length: count }, (_, index) => {
    const name = String(names?.[index] ?? '').trim();
    return name || `${prefix}${index + 1}`;
  });
}

function NetworkGraph({ config, inputUnits = 2, outputUnits = 1, inputNames = [], outputNames = [] }) {
  const safeInputUnits = Math.max(1, Math.trunc(Number(inputUnits)) || 1);
  const safeOutputUnits = Math.max(1, Math.trunc(Number(outputUnits)) || 1);
  const layers = [
    { label: 'Вход', count: safeInputUnits, variableNames: makeVariableNames(inputNames, safeInputUnits, 'x') },
    ...config.hiddenLayers.map((count, index) => ({ label: `Скрытый ${index + 1}`, count: Number(count) || 0 })),
    { label: 'Выход', count: safeOutputUnits, variableNames: makeVariableNames(outputNames, safeOutputUnits, 'y') },
  ];
  const positionedLayers = getLayerPositions(layers);
  const lastLayerIndex = positionedLayers.length - 1;
  const connections = positionedLayers.slice(0, -1).flatMap((layer, layerIndex) => {
    const nextLayer = positionedLayers[layerIndex + 1];

    return layer.neurons.flatMap((fromNeuron, fromIndex) =>
      nextLayer.neurons.map((toNeuron, toIndex) => ({
        id: `${layerIndex}-${fromIndex}-${toIndex}`,
        fromNeuron,
        toNeuron,
        fromIndex,
        toIndex,
      })),
    );
  });

  return (
    <div className="network-viewport">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} role="img" aria-label="Структура нейронной сети">
        <g className="connections">
          {connections.map(({ id, fromNeuron, toNeuron }) => (
            <g key={id}>
              <line
                x1={fromNeuron.x + 18}
                y1={fromNeuron.y}
                x2={toNeuron.x - 18}
                y2={toNeuron.y}
                className="network-connection"
              />
            </g>
          ))}
        </g>

        <g className="neurons">
          {positionedLayers.map((layer, layerIndex) => (
            <g key={layer.label}>
              <text x={layer.x} y={24} textAnchor="middle" className="layer-label">
                {layer.label}
              </text>
              {layer.neurons.map((neuron, neuronIndex) => (
                <g key={`${layer.label}-${neuronIndex}`}>
                  <circle
                    cx={neuron.x}
                    cy={neuron.y}
                    r={18}
                    className={layerIndex === 0 ? 'neuron neuron-input' : 'neuron'}
                  />
                  <circle cx={neuron.x} cy={neuron.y} r={22} className="bias-ring bias-ring-empty" />
                  <text x={neuron.x} y={neuron.y + 5} textAnchor="middle" className="neuron-label">
                    {neuronIndex + 1}
                  </text>
                  {layerIndex === 0 && (
                    <text x={neuron.x - 28} y={neuron.y + 4} textAnchor="end" className="variable-label">
                      <title>{layer.variableNames[neuronIndex]}</title>
                      {formatVariableLabel(layer.variableNames[neuronIndex])}
                    </text>
                  )}
                  {layerIndex === lastLayerIndex && (
                    <text x={neuron.x + 28} y={neuron.y + 4} textAnchor="start" className="variable-label">
                      <title>{layer.variableNames[neuronIndex]}</title>
                      {formatVariableLabel(layer.variableNames[neuronIndex])}
                    </text>
                  )}
                </g>
              ))}
            </g>
          ))}
        </g>
      </svg>
    </div>
  );
}

export default NetworkGraph;
