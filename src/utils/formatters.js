export function formatMetric(value, digits = 4) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'нет данных';
  }

  return Number(value).toFixed(digits);
}

export function formatPercent(value) {
  if (value === null || value === undefined || Number.isNaN(Number(value))) {
    return 'нет данных';
  }

  return `${Math.round(Number(value) * 100)}%`;
}

export function flattenWeights(parameters) {
  return parameters.flatMap((layer) => layer.weights.flatMap((row) => row));
}

export function getMaxAbsWeight(parameters) {
  const weights = flattenWeights(parameters);

  if (weights.length === 0) {
    return 1;
  }

  return Math.max(0.0001, ...weights.map((value) => Math.abs(value)));
}
