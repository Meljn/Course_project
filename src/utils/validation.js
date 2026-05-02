import { LIMITS } from '../config/trainingConfig.js';

const numberInRange = (value, min, max) => {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric >= min && numeric <= max;
};

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

  if (!Number.isInteger(Number(config.batchSize))) {
    errors.batchSize = 'Размер батча должен быть целым числом.';
  } else if (!numberInRange(config.batchSize, LIMITS.minBatchSize, LIMITS.maxBatchSize)) {
    errors.batchSize = `Размер батча должен быть от ${LIMITS.minBatchSize} до ${LIMITS.maxBatchSize}.`;
  } else if (Number(config.batchSize) > Number(config.sampleCount)) {
    errors.batchSize = 'Размер батча не может превышать количество примеров.';
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
