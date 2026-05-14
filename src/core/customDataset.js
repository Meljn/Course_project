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

function hashDataset(data, columnNames) {
  const source = JSON.stringify({ columnNames, data });
  let hash = 5381;

  for (let index = 0; index < source.length; index += 1) {
    hash = (hash * 33) ^ source.charCodeAt(index);
  }

  return (hash >>> 0).toString(16);
}

function getColumnStats(data, columnIndex, columnName) {
  const values = data.map((row) => row[columnIndex]);
  const sum = values.reduce((total, value) => total + value, 0);

  return {
    column: columnName,
    min: Math.min(...values),
    max: Math.max(...values),
    mean: sum / values.length,
  };
}

function normalizeValue(value, stat) {
  const range = stat.max - stat.min;

  if (range === 0) {
    return 0;
  }

  return ((value - stat.min) / range) * 2 - 1;
}

function toTensorArrays(items) {
  return {
    inputs: items.map((item) => item.input),
    labels: items.map((item) => [item.label]),
    points: items.map((item) => ({
      x: item.input[0],
      y: item.input[1],
      label: item.label,
    })),
  };
}

export const EMPTY_DATASET = {
  type: 'empty',
  featureCount: 2,
  rowCount: 0,
  train: {
    inputs: [],
    labels: [],
    points: [],
  },
  test: {
    inputs: [],
    labels: [],
    points: [],
  },
  all: [],
  decisionBaseline: [0, 0],
};

export function createCustomDatasetFromCsv(data, columnNames, options = {}) {
  const trainRatio = options.trainRatio ?? DEFAULT_TRAIN_RATIO;
  const seed = Number(options.seed) || 42;

  if (!Array.isArray(data) || data.length < 10) {
    throw new Error('CSV должен содержать минимум 10 строк данных.');
  }

  if (!Array.isArray(columnNames) || columnNames.length < 3) {
    throw new Error('CSV для обучения должен содержать минимум 3 колонки: два признака и метку класса.');
  }

  const columnCount = columnNames.length;
  const featureCount = columnCount - 1;
  const featureColumnNames = columnNames.slice(0, -1);
  const labelColumnName = columnNames[columnCount - 1];
  const featureStats = featureColumnNames.map((columnName, index) => getColumnStats(data, index, columnName));
  const labelValues = new Set(data.map((row) => row[columnCount - 1]));

  if ([...labelValues].some((value) => value !== 0 && value !== 1)) {
    throw new Error(`Колонка "${labelColumnName}" должна содержать только бинарные метки 0 или 1.`);
  }

  if (labelValues.size < 2) {
    throw new Error(`Колонка "${labelColumnName}" должна содержать оба класса: 0 и 1.`);
  }

  const samples = data.map((row) => {
    const input = row.slice(0, featureCount).map((value, index) => normalizeValue(value, featureStats[index]));

    return {
      input,
      label: row[columnCount - 1],
    };
  });

  const random = createRandom(seed);

  for (let index = samples.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(random() * (index + 1));
    [samples[index], samples[swapIndex]] = [samples[swapIndex], samples[index]];
  }

  const splitIndex = Math.min(samples.length - 1, Math.max(1, Math.floor(samples.length * trainRatio)));
  const trainSamples = samples.slice(0, splitIndex);
  const testSamples = samples.slice(splitIndex);
  const decisionBaseline = featureStats.map((stat) => normalizeValue(stat.mean, stat));

  return {
    type: 'custom',
    signature: hashDataset(data, columnNames),
    columnNames: [...columnNames],
    featureColumnNames,
    labelColumnName,
    featureCount,
    rowCount: samples.length,
    trainCount: trainSamples.length,
    testCount: testSamples.length,
    stats: featureStats,
    decisionBaseline,
    train: toTensorArrays(trainSamples),
    test: toTensorArrays(testSamples),
    all: samples.map((item, index) => ({
      x: item.input[0],
      y: item.input[1],
      label: item.label,
      split: index < splitIndex ? 'train' : 'test',
    })),
  };
}
