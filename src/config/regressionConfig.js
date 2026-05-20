import {
  ACTIVATION_OPTIONS,
  BIAS_INITIALIZER_OPTIONS,
  OPTIMIZER_OPTIONS,
  REGULARIZATION_OPTIONS,
  WEIGHT_INITIALIZER_OPTIONS,
} from './trainingConfig.js';

export const REGRESSION_LIMITS = {
  minHiddenLayers: 1,
  maxHiddenLayers: 5,
  minNeurons: 1,
  maxNeurons: 24,
  minEpochs: 1,
  maxEpochs: 1200,
  minLearningRate: 0.0001,
  maxLearningRate: 1,
  minBatchSize: 4,
  maxBatchSize: 128,
  minSampleCount: 80,
  maxSampleCount: 800,
  minNoise: 0,
  maxNoise: 0.3,
  minInitializerSeed: 1,
  maxInitializerSeed: 2147483647,
};

export const DEFAULT_REGRESSION_CONFIG = {
  hiddenLayers: [16, 8],
  activation: 'tanh',
  loss: 'meanSquaredError',
  optimizer: 'adam',
  kernelInitializer: 'glorotUniform',
  useBias: true,
  biasInitializer: 'zeros',
  useInitializerSeed: false,
  initializerSeed: 42,
  learningRate: 0.01,
  epochs: 180,
  batchSize: 16,
  regularization: 'none',
  regularizationRate: 0.001,
  datasetType: 'sine',
  datasetSeed: 42,
  sampleCount: 240,
  noise: 0.06,
  scaleY: true,
};

export const REGRESSION_DATASET_OPTIONS = [
  { value: 'sine', label: 'Sine wave' },
  { value: 'polynomial', label: 'Polynomial' },
  { value: 'multimodal', label: 'Multi-modal' },
  { value: 'custom', label: 'CSV' },
];

export const REGRESSION_LOSS_OPTIONS = [
  { value: 'meanSquaredError', label: 'MSE' },
  { value: 'meanAbsoluteError', label: 'MAE' },
];

export {
  ACTIVATION_OPTIONS,
  BIAS_INITIALIZER_OPTIONS,
  OPTIMIZER_OPTIONS,
  REGULARIZATION_OPTIONS,
  WEIGHT_INITIALIZER_OPTIONS,
};

export function getRegressionModelSignature(config) {
  return JSON.stringify({
    hiddenLayers: config.hiddenLayers,
    activation: config.activation,
    loss: config.loss,
    optimizer: config.optimizer,
    kernelInitializer: config.kernelInitializer,
    useBias: config.useBias !== false,
    biasInitializer: config.biasInitializer,
    useInitializerSeed: Boolean(config.useInitializerSeed),
    initializerSeed: config.useInitializerSeed ? Number(config.initializerSeed) : null,
    learningRate: Number(config.learningRate),
    regularization: config.regularization,
    regularizationRate: Number(config.regularizationRate),
    datasetType: config.datasetType,
    datasetSeed: Number(config.datasetSeed),
    sampleCount: Number(config.sampleCount),
    noise: Number(config.noise),
    scaleY: Boolean(config.scaleY),
  });
}
