import {
  BIAS_INITIALIZER_OPTIONS,
  REGRESSION_LIMITS,
  WEIGHT_INITIALIZER_OPTIONS,
} from '../config/regressionConfig.js';

const numberInRange = (value, min, max) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max;
};

const optionValues = (options) => new Set(options.map((option) => option.value));
const weightInitializerValues = optionValues(WEIGHT_INITIALIZER_OPTIONS);
const biasInitializerValues = optionValues(BIAS_INITIALIZER_OPTIONS);

export function validateRegressionConfig(config, dataset) {
  const errors = {};

  if (!Array.isArray(config.hiddenLayers) || config.hiddenLayers.length === 0) {
    errors.hiddenLayers = 'Укажите хотя бы один скрытый слой.';
  } else if (config.hiddenLayers.length > REGRESSION_LIMITS.maxHiddenLayers) {
    errors.hiddenLayers = `Максимум скрытых слоев: ${REGRESSION_LIMITS.maxHiddenLayers}.`;
  }

  config.hiddenLayers.forEach((neurons, index) => {
    if (!Number.isInteger(Number(neurons))) {
      errors[`layer-${index}`] = 'Количество нейронов должно быть целым числом.';
    } else if (!numberInRange(neurons, REGRESSION_LIMITS.minNeurons, REGRESSION_LIMITS.maxNeurons)) {
      errors[`layer-${index}`] = `Допустимо от ${REGRESSION_LIMITS.minNeurons} до ${REGRESSION_LIMITS.maxNeurons} нейронов.`;
    }
  });

  if (!Number.isInteger(Number(config.epochs))) {
    errors.epochs = 'Количество эпох должно быть целым числом.';
  } else if (!numberInRange(config.epochs, REGRESSION_LIMITS.minEpochs, REGRESSION_LIMITS.maxEpochs)) {
    errors.epochs = `Допустимо от ${REGRESSION_LIMITS.minEpochs} до ${REGRESSION_LIMITS.maxEpochs} эпох.`;
  }

  if (!numberInRange(config.learningRate, REGRESSION_LIMITS.minLearningRate, REGRESSION_LIMITS.maxLearningRate)) {
    errors.learningRate = `Скорость обучения должна быть от ${REGRESSION_LIMITS.minLearningRate} до ${REGRESSION_LIMITS.maxLearningRate}.`;
  }

  if (!weightInitializerValues.has(config.kernelInitializer)) {
    errors.kernelInitializer = 'Выберите допустимую инициализацию весов.';
  }

  if (config.useBias !== false && !biasInitializerValues.has(config.biasInitializer)) {
    errors.biasInitializer = 'Выберите допустимую инициализацию смещений.';
  }

  if (config.useInitializerSeed) {
    if (!Number.isInteger(Number(config.initializerSeed))) {
      errors.initializerSeed = 'Seed инициализации должен быть целым числом.';
    } else if (
      !numberInRange(
        config.initializerSeed,
        REGRESSION_LIMITS.minInitializerSeed,
        REGRESSION_LIMITS.maxInitializerSeed,
      )
    ) {
      errors.initializerSeed = `Seed должен быть от ${REGRESSION_LIMITS.minInitializerSeed} до ${REGRESSION_LIMITS.maxInitializerSeed}.`;
    }
  }

  const effectiveSampleCount = config.datasetType === 'custom' ? dataset?.rowCount : Number(config.sampleCount);

  if (!Number.isInteger(Number(config.batchSize))) {
    errors.batchSize = 'Размер батча должен быть целым числом.';
  } else if (!numberInRange(config.batchSize, REGRESSION_LIMITS.minBatchSize, REGRESSION_LIMITS.maxBatchSize)) {
    errors.batchSize = `Размер батча должен быть от ${REGRESSION_LIMITS.minBatchSize} до ${REGRESSION_LIMITS.maxBatchSize}.`;
  } else if (Number.isFinite(effectiveSampleCount) && Number(config.batchSize) > effectiveSampleCount) {
    errors.batchSize = 'Размер батча не может превышать количество примеров.';
  }

  if (config.datasetType === 'custom') {
    if (!dataset) {
      errors.customDataset = 'Загрузите CSV-датасет перед созданием модели.';
    }
  } else if (!Number.isInteger(Number(config.sampleCount))) {
    errors.sampleCount = 'Количество примеров должно быть целым числом.';
  } else if (!numberInRange(config.sampleCount, REGRESSION_LIMITS.minSampleCount, REGRESSION_LIMITS.maxSampleCount)) {
    errors.sampleCount = `Допустимо от ${REGRESSION_LIMITS.minSampleCount} до ${REGRESSION_LIMITS.maxSampleCount} примеров.`;
  }

  if (!numberInRange(config.noise, REGRESSION_LIMITS.minNoise, REGRESSION_LIMITS.maxNoise)) {
    errors.noise = `Шум должен быть от ${REGRESSION_LIMITS.minNoise} до ${REGRESSION_LIMITS.maxNoise}.`;
  }

  if (config.regularization !== 'none' && !numberInRange(config.regularizationRate, 0.00001, 0.1)) {
    errors.regularizationRate = 'Коэффициент регуляризации должен быть от 0.00001 до 0.1.';
  }

  const messages = Object.values(errors);

  return {
    errors,
    messages,
    isValid: messages.length === 0,
  };
}
