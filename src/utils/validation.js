import {
  BIAS_INITIALIZER_OPTIONS,
  LIMITS,
  WEIGHT_INITIALIZER_OPTIONS,
} from '../config/trainingConfig.js';

const numberInRange = (value, min, max) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max;
};

const optionValues = (options) => new Set(options.map((option) => option.value));
const weightInitializerValues = optionValues(WEIGHT_INITIALIZER_OPTIONS);
const biasInitializerValues = optionValues(BIAS_INITIALIZER_OPTIONS);

export function validateTrainingConfig(config) {
  const errors = {};

  if (!Array.isArray(config.hiddenLayers) || config.hiddenLayers.length === 0) {
    errors.hiddenLayers = 'Укажите хотя бы один скрытый слой.';
  } else if (config.hiddenLayers.length > LIMITS.maxHiddenLayers) {
    errors.hiddenLayers = `Максимум скрытых слоев: ${LIMITS.maxHiddenLayers}.`;
  }

  config.hiddenLayers.forEach((neurons, index) => {
    if (!Number.isInteger(Number(neurons))) {
      errors[`layer-${index}`] = 'Количество нейронов должно быть целым числом.';
    } else if (!numberInRange(neurons, LIMITS.minNeurons, LIMITS.maxNeurons)) {
      errors[`layer-${index}`] = `Допустимо от ${LIMITS.minNeurons} до ${LIMITS.maxNeurons} нейронов.`;
    }
  });

  if (!Number.isInteger(Number(config.epochs))) {
    errors.epochs = 'Количество эпох должно быть целым числом.';
  } else if (!numberInRange(config.epochs, LIMITS.minEpochs, LIMITS.maxEpochs)) {
    errors.epochs = `Допустимо от ${LIMITS.minEpochs} до ${LIMITS.maxEpochs} эпох.`;
  }

  if (!numberInRange(config.learningRate, LIMITS.minLearningRate, LIMITS.maxLearningRate)) {
    errors.learningRate = `Скорость обучения должна быть от ${LIMITS.minLearningRate} до ${LIMITS.maxLearningRate}.`;
  }

  if (!weightInitializerValues.has(config.kernelInitializer)) {
    errors.kernelInitializer = 'Выберите допустимую инициализацию весов.';
  }

  if (!biasInitializerValues.has(config.biasInitializer)) {
    errors.biasInitializer = 'Выберите допустимую инициализацию смещений.';
  }

  if (!Number.isInteger(Number(config.batchSize))) {
    errors.batchSize = 'Размер батча должен быть целым числом.';
  } else if (!numberInRange(config.batchSize, LIMITS.minBatchSize, LIMITS.maxBatchSize)) {
    errors.batchSize = `Размер батча должен быть от ${LIMITS.minBatchSize} до ${LIMITS.maxBatchSize}.`;
  } else if (Number(config.batchSize) > Number(config.sampleCount)) {
    errors.batchSize = 'Размер батча не может превышать количество примеров.';
  }

  if (config.stopByAccuracy && !numberInRange(config.targetAccuracy, LIMITS.minTargetAccuracy, LIMITS.maxTargetAccuracy)) {
    errors.targetAccuracy = `Целевая точность должна быть от ${Math.round(
      LIMITS.minTargetAccuracy * 100,
    )}% до ${Math.round(LIMITS.maxTargetAccuracy * 100)}%.`;
  }

  if (!Number.isInteger(Number(config.sampleCount))) {
    errors.sampleCount = 'Количество примеров должно быть целым числом.';
  } else if (!numberInRange(config.sampleCount, LIMITS.minSampleCount, LIMITS.maxSampleCount)) {
    errors.sampleCount = `Допустимо от ${LIMITS.minSampleCount} до ${LIMITS.maxSampleCount} примеров.`;
  }

  if (!numberInRange(config.noise, LIMITS.minNoise, LIMITS.maxNoise)) {
    errors.noise = `Шум должен быть от ${LIMITS.minNoise} до ${LIMITS.maxNoise}.`;
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
