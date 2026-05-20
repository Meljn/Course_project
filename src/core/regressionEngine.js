import * as tf from '@tensorflow/tfjs';
import { inverseTransformTarget } from './regressionDatasets.js';

function createRegularizer(config) {
  const rate = Number(config.regularizationRate);

  if (config.regularization === 'l1') {
    return tf.regularizers.l1({ l1: rate });
  }

  if (config.regularization === 'l2') {
    return tf.regularizers.l2({ l2: rate });
  }

  if (config.regularization === 'l1l2') {
    return tf.regularizers.l1l2({ l1: rate, l2: rate });
  }

  return undefined;
}

function createOptimizer(name, learningRate) {
  if (name === 'sgd') {
    return tf.train.sgd(learningRate);
  }

  if (name === 'rmsprop') {
    return tf.train.rmsprop(learningRate);
  }

  return tf.train.adam(learningRate);
}

function getInitializerSeed(config, offset = 0) {
  if (!config.useInitializerSeed) {
    return undefined;
  }

  const seed = Math.trunc(Number(config.initializerSeed));

  if (!Number.isFinite(seed)) {
    return undefined;
  }

  return seed + offset;
}

function createInitializer(name, seed) {
  if (seed === undefined) {
    return name;
  }

  if (name === 'zeros') {
    return tf.initializers.zeros();
  }

  if (name === 'ones') {
    return tf.initializers.ones();
  }

  const initializer = tf.initializers[name];

  return typeof initializer === 'function' ? initializer({ seed }) : name;
}

function denseLayerName(index, totalLayers) {
  if (index === totalLayers - 1) {
    return 'Выходной слой';
  }

  return `Скрытый слой ${index + 1}`;
}

export class RegressionEngine {
  constructor() {
    this.model = null;
    this.inputUnits = 1;
    this.stopRequested = false;
  }

  dispose() {
    if (this.model) {
      this.model.optimizer?.dispose?.();
      this.model.dispose();
    }

    this.model = null;
    this.inputUnits = 1;
    this.stopRequested = false;
  }

  createModel(config, inputUnits = 1) {
    this.dispose();

    const safeInputUnits = Math.max(1, Math.trunc(Number(inputUnits)) || 1);
    const hiddenLayers = config.hiddenLayers.map((neurons) => Number(neurons));
    const model = tf.sequential();
    const regularizer = createRegularizer(config);
    const kernelInitializerName = config.kernelInitializer || 'glorotUniform';
    const useBias = config.useBias !== false;
    const biasInitializerName = config.biasInitializer || 'zeros';
    this.inputUnits = safeInputUnits;

    hiddenLayers.forEach((neurons, index) => {
      const seedOffset = index * 2;
      model.add(
        tf.layers.dense({
          units: neurons,
          inputShape: index === 0 ? [safeInputUnits] : undefined,
          activation: config.activation,
          kernelInitializer: createInitializer(kernelInitializerName, getInitializerSeed(config, seedOffset)),
          useBias,
          biasInitializer: createInitializer(biasInitializerName, getInitializerSeed(config, seedOffset + 1)),
          kernelRegularizer: regularizer,
        }),
      );
    });

    const outputSeedOffset = hiddenLayers.length * 2;
    model.add(
      tf.layers.dense({
        units: 1,
        activation: 'linear',
        kernelInitializer: createInitializer(kernelInitializerName, getInitializerSeed(config, outputSeedOffset)),
        useBias,
        biasInitializer: createInitializer(biasInitializerName, getInitializerSeed(config, outputSeedOffset + 1)),
      }),
    );

    model.compile({
      optimizer: createOptimizer(config.optimizer, Number(config.learningRate)),
      loss: config.loss,
    });

    this.model = model;

    return {
      inputUnits: safeInputUnits,
      hiddenLayers,
      outputUnits: 1,
      trainableParams: model.countParams(),
    };
  }

  stopTraining() {
    this.stopRequested = true;

    if (this.model) {
      this.model.stopTraining = true;
    }
  }

  async getParameters() {
    if (!this.model) {
      return [];
    }

    const totalLayers = this.model.layers.length;

    return Promise.all(
      this.model.layers.map(async (layer, index) => {
        const [kernelTensor, biasTensor] = layer.getWeights();
        const weights = kernelTensor ? await kernelTensor.array() : [];
        const biases = biasTensor ? await biasTensor.array() : [];
        const toUnits = weights[0]?.length ?? biases.length;

        return {
          id: `regression-dense-${index}`,
          name: denseLayerName(index, totalLayers),
          fromUnits: weights.length,
          toUnits,
          weights,
          biases,
        };
      }),
    );
  }

  getDiagnostics(inputs, rawTargets, yScaler) {
    if (!this.model || inputs.length === 0) {
      return [];
    }

    const inputTensor = tf.tensor2d(inputs, [inputs.length, this.inputUnits]);
    const predictionTensor = this.model.predict(inputTensor);
    const predictions = Array.from(predictionTensor.dataSync()).map((value) => inverseTransformTarget(value, yScaler));
    inputTensor.dispose();
    predictionTensor.dispose();

    return rawTargets.map((actual, index) => {
      const predicted = predictions[index];

      return {
        actual,
        predicted,
        residual: actual - predicted,
      };
    });
  }

  predictRaw(rawInput, dataset) {
    if (!this.model) {
      throw new Error('Модель еще не создана.');
    }

    const input = Array.from({ length: this.inputUnits }, (_, index) => {
      const value = Number(rawInput[index]);
      const scaler = dataset.xScaler[index];

      if (!Number.isFinite(value)) {
        throw new Error('Введите числовые значения признаков.');
      }

      return (value - scaler.mean) / scaler.std;
    });
    const inputTensor = tf.tensor2d([input], [1, this.inputUnits]);
    const predictionTensor = this.model.predict(inputTensor);
    const scaledPrediction = predictionTensor.dataSync()[0];
    inputTensor.dispose();
    predictionTensor.dispose();

    return inverseTransformTarget(scaledPrediction, dataset.yScaler);
  }

  async train(config, dataset, callbacks = {}) {
    if (!this.model) {
      throw new Error('Модель еще не создана.');
    }

    this.stopRequested = false;
    this.model.stopTraining = false;

    const trainXs = tf.tensor2d(dataset.train.inputs, [dataset.train.inputs.length, this.inputUnits]);
    const trainYs = tf.tensor2d(dataset.train.labels);
    const validationXs = tf.tensor2d(dataset.validation.inputs, [dataset.validation.inputs.length, this.inputUnits]);
    const validationYs = tf.tensor2d(dataset.validation.labels);
    const epochs = Number(config.epochs);
    const batchSize = Number(config.batchSize);
    const parameterInterval = epochs > 500 ? 8 : epochs > 250 ? 4 : 1;

    try {
      for (let epoch = 0; epoch < epochs; epoch += 1) {
        if (this.stopRequested) {
          break;
        }

        const result = await this.model.fit(trainXs, trainYs, {
          epochs: 1,
          batchSize,
          shuffle: true,
          validationData: [validationXs, validationYs],
          verbose: 0,
        });

        const loss = result.history.loss?.[0] ?? null;
        const valLoss = result.history.val_loss?.[0] ?? null;
        const shouldUpdateParameters =
          epoch === 0 || epoch + 1 === epochs || (epoch + 1) % parameterInterval === 0;
        const parameters = shouldUpdateParameters ? await this.getParameters() : null;
        const diagnostics = this.getDiagnostics(dataset.validation.inputs, dataset.validation.rawTargets, dataset.yScaler);

        callbacks.onEpochEnd?.({
          epoch: epoch + 1,
          loss,
          valLoss,
          parameters,
          diagnostics,
        });

        if (this.stopRequested) {
          break;
        }

        await tf.nextFrame();
      }

      return {
        status: this.stopRequested ? 'stopped' : 'completed',
      };
    } finally {
      trainXs.dispose();
      trainYs.dispose();
      validationXs.dispose();
      validationYs.dispose();
      this.model.stopTraining = false;
    }
  }
}
