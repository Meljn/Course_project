export const LIMITS = {
  minHiddenLayers: 1,
  maxHiddenLayers: 5,
  minNeurons: 1,
  maxNeurons: 10,
  minEpochs: 1,
  maxEpochs: 1000,
  minLearningRate: 0.0001,
  maxLearningRate: 1,
  minBatchSize: 4,
  maxBatchSize: 128,
  minSampleCount: 80,
  maxSampleCount: 800,
  minNoise: 0,
  maxNoise: 0.35,
  minTargetAccuracy: 0.5,
  maxTargetAccuracy: 1,
};

export const DEFAULT_CONFIG = {
  hiddenLayers: [5, 4],
  activation: 'tanh',
  loss: 'binaryCrossentropy',
  optimizer: 'adam',
  kernelInitializer: 'glorotUniform',
  biasInitializer: 'zeros',
  learningRate: 0.03,
  epochs: 160,
  batchSize: 16,
  stopByAccuracy: false,
  targetAccuracy: 0.95,
  regularization: 'none',
  regularizationRate: 0.001,
  datasetType: 'xor',
  datasetSeed: 42,
  sampleCount: 260,
  noise: 0.08,
};

export const ACTIVATION_OPTIONS = [
  { value: 'tanh', label: 'tanh' },
  { value: 'relu', label: 'ReLU' },
  { value: 'sigmoid', label: 'sigmoid' },
  { value: 'elu', label: 'ELU' },
];

export const LOSS_OPTIONS = [
  { value: 'binaryCrossentropy', label: 'Binary crossentropy' },
  { value: 'meanSquaredError', label: 'Mean squared error' },
];

export const OPTIMIZER_OPTIONS = [
  { value: 'adam', label: 'Adam' },
  { value: 'sgd', label: 'SGD' },
  { value: 'rmsprop', label: 'RMSprop' },
];

export const WEIGHT_INITIALIZER_OPTIONS = [
  { value: 'glorotUniform', label: 'Glorot uniform' },
  { value: 'glorotNormal', label: 'Glorot normal' },
  { value: 'heUniform', label: 'He uniform' },
  { value: 'heNormal', label: 'He normal' },
  { value: 'leCunUniform', label: 'LeCun uniform' },
  { value: 'leCunNormal', label: 'LeCun normal' },
  { value: 'randomUniform', label: 'Random uniform' },
  { value: 'randomNormal', label: 'Random normal' },
  { value: 'truncatedNormal', label: 'Truncated normal' },
  { value: 'zeros', label: 'Zeros' },
];

export const BIAS_INITIALIZER_OPTIONS = [
  { value: 'zeros', label: 'Zeros' },
  { value: 'ones', label: 'Ones' },
  { value: 'randomUniform', label: 'Random uniform' },
  { value: 'randomNormal', label: 'Random normal' },
  { value: 'truncatedNormal', label: 'Truncated normal' },
];

export const REGULARIZATION_OPTIONS = [
  { value: 'none', label: 'Без регуляризации' },
  { value: 'l1', label: 'L1' },
  { value: 'l2', label: 'L2' },
  { value: 'l1l2', label: 'L1 + L2' },
];

export const DATASET_OPTIONS = [
  { value: 'xor', label: 'XOR' },
  { value: 'circle', label: 'Круг' },
  { value: 'linear', label: 'Линейный' },
  { value: 'custom', label: 'CSV' },
];

export function getModelSignature(config) {
  return JSON.stringify({
    hiddenLayers: config.hiddenLayers,
    activation: config.activation,
    loss: config.loss,
    optimizer: config.optimizer,
    kernelInitializer: config.kernelInitializer,
    biasInitializer: config.biasInitializer,
    learningRate: Number(config.learningRate),
    regularization: config.regularization,
    regularizationRate: Number(config.regularizationRate),
    datasetType: config.datasetType,
    datasetSeed: Number(config.datasetSeed),
    sampleCount: Number(config.sampleCount),
    noise: Number(config.noise),
  });
}
