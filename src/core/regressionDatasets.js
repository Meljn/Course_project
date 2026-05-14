const DEFAULT_TRAIN_RATIO = 0.75;

function createRandom(seed) {
  let state = seed >>> 0;

  return () => {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

function hashDataset(data, columnNames, scaleY) {
  const source = JSON.stringify({ data, columnNames, scaleY });
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

export function evaluateRegressionFunction(type, x) {
  if (type === 'polynomial') {
    return x ** 3 - 2 * x ** 2 + x;
  }

  if (type === 'multimodal') {
    return Math.exp(-(x ** 2)) * Math.sin(5 * x);
  }

  return Math.sin(x);
}

function getRange(type) {
  if (type === 'polynomial' || type === 'multimodal') {
    return [-2, 2];
  }

  return [-3, 3];
}

function getStats(matrix, columnCount) {
  return Array.from({ length: columnCount }, (_, columnIndex) => {
    const values = matrix.map((row) => row[columnIndex]);
    const mean = values.reduce((total, value) => total + value, 0) / Math.max(values.length, 1);
    const variance =
      values.reduce((total, value) => total + (value - mean) ** 2, 0) / Math.max(values.length, 1);
    const std = Math.max(Math.sqrt(variance), 1e-8);

    return {
      mean,
      std,
      min: Math.min(...values),
      max: Math.max(...values),
    };
  });
}

function transformFeatures(features, stats) {
  return features.map((row) => row.map((value, index) => (value - stats[index].mean) / stats[index].std));
}

function transformTargets(targets, scaler) {
  if (!scaler.enabled) {
    return targets.map((value) => value);
  }

  return targets.map((value) => (value - scaler.mean) / scaler.std);
}

export function inverseTransformTarget(value, scaler) {
  if (!scaler?.enabled) {
    return value;
  }

  return value * scaler.std + scaler.mean;
}

function splitSamples(samples, seed, trainRatio) {
  const random = createRandom(seed);
  const shuffled = samples.map((sample) => ({ ...sample }));

  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }

  const splitIndex = Math.min(shuffled.length - 1, Math.max(1, Math.floor(shuffled.length * trainRatio)));

  return {
    trainSamples: shuffled.slice(0, splitIndex),
    validationSamples: shuffled.slice(splitIndex),
  };
}

function toSplit(samples) {
  return {
    inputs: samples.map((sample) => sample.input),
    labels: samples.map((sample) => [sample.label]),
    rawInputs: samples.map((sample) => sample.rawInput),
    rawTargets: samples.map((sample) => sample.rawTarget),
  };
}

function makeRegressionDataset(rawFeatures, rawTargets, columnNames, options) {
  const scaleY = Boolean(options.scaleY);
  const seed = Number(options.seed) || 42;
  const trainRatio = options.trainRatio ?? DEFAULT_TRAIN_RATIO;
  const featureCount = rawFeatures[0]?.length ?? 0;
  const xStats = getStats(rawFeatures, featureCount);
  const yStats = getStats(rawTargets.map((target) => [target]), 1)[0];
  const yScaler = {
    enabled: scaleY,
    mean: yStats.mean,
    std: yStats.std,
  };
  const scaledFeatures = transformFeatures(rawFeatures, xStats);
  const scaledTargets = transformTargets(rawTargets, yScaler);
  const samples = scaledFeatures.map((input, index) => ({
    input,
    label: scaledTargets[index],
    rawInput: rawFeatures[index],
    rawTarget: rawTargets[index],
  }));
  const { trainSamples, validationSamples } = splitSamples(samples, seed, trainRatio);
  const sortedSamples = samples
    .map((sample, index) => ({ ...sample, originalIndex: index }))
    .sort((left, right) => left.rawInput[0] - right.rawInput[0]);

  return {
    type: options.type,
    signature: hashDataset([...rawFeatures.map((row, index) => [...row, rawTargets[index]])], columnNames, scaleY),
    columnNames,
    featureColumnNames: columnNames.slice(0, -1),
    targetColumnName: columnNames[columnNames.length - 1],
    featureCount,
    rowCount: samples.length,
    trainCount: trainSamples.length,
    validationCount: validationSamples.length,
    xScaler: xStats,
    yScaler,
    yStats,
    train: toSplit(trainSamples),
    validation: toSplit(validationSamples),
    all: sortedSamples.map((sample) => ({
      x: sample.rawInput[0],
      y: sample.rawTarget,
    })),
  };
}

export function createRegressionDataset({
  type = 'sine',
  sampleCount = 240,
  noise = 0.06,
  seed = 42,
  scaleY = true,
} = {}) {
  const random = createRandom(seed);
  const [minX, maxX] = getRange(type);
  const count = Number(sampleCount);
  const rawFeatures = [];
  const rawTargets = [];

  for (let index = 0; index < count; index += 1) {
    const progress = count <= 1 ? 0 : index / (count - 1);
    const x = minX + progress * (maxX - minX);
    const y = evaluateRegressionFunction(type, x) + (random() * 2 - 1) * Number(noise);
    rawFeatures.push([x]);
    rawTargets.push(y);
  }

  return makeRegressionDataset(rawFeatures, rawTargets, ['x', 'y'], {
    type,
    seed,
    scaleY,
  });
}

export function createRegressionDatasetFromCsv(data, columnNames, options = {}) {
  if (!Array.isArray(data) || data.length < 10) {
    throw new Error('CSV должен содержать минимум 10 строк данных.');
  }

  if (!Array.isArray(columnNames) || columnNames.length < 2) {
    throw new Error('CSV для регрессии должен содержать минимум 2 колонки: признаки и целевое значение.');
  }

  const targetIndex = columnNames.length - 1;
  const rawFeatures = data.map((row) => row.slice(0, targetIndex));
  const rawTargets = data.map((row) => row[targetIndex]);

  return makeRegressionDataset(rawFeatures, rawTargets, columnNames, {
    type: 'custom',
    seed: Number(options.seed) || 42,
    scaleY: Boolean(options.scaleY),
  });
}
