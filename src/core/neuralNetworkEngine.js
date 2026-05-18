import * as tf from '@tensorflow/tfjs';

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

function denseLayerName(index, totalLayers) {
  if (index === totalLayers - 1) {
    return 'Выходной слой';
  }

  return `Скрытый слой ${index + 1}`;
}

function normalizeValue(value, stat) {
  const range = stat.max - stat.min;

  if (range === 0) {
    return 0;
  }

  return ((value - stat.min) / range) * 2 - 1;
}

export class NeuralNetworkEngine {
  constructor() {
    this.model = null;
    this.inputUnits = 2;
    this.outputUnits = 1;
    this.isTraining = false;
    this.stopRequested = false;
  }

  dispose() {
    if (this.model) {
      this.model.optimizer?.dispose?.();
      this.model.dispose();
    }

    this.model = null;
    this.inputUnits = 2;
    this.outputUnits = 1;
    this.isTraining = false;
    this.stopRequested = false;
  }

  createModel(config, inputUnits = 2, outputUnits = 1) {
    this.dispose();

    const safeInputUnits = Math.max(1, Math.trunc(Number(inputUnits)) || 2);
    const safeOutputUnits = Math.max(1, Math.trunc(Number(outputUnits)) || 1);
    const hiddenLayers = config.hiddenLayers.map((neurons) => Number(neurons));
    const model = tf.sequential();
    const regularizer = createRegularizer(config);
    const kernelInitializer = config.kernelInitializer || 'glorotUniform';
    const useBias = config.useBias !== false;
    const biasInitializer = config.biasInitializer || 'zeros';
    this.inputUnits = safeInputUnits;
    this.outputUnits = safeOutputUnits;

    hiddenLayers.forEach((neurons, index) => {
      model.add(
        tf.layers.dense({
          units: neurons,
          inputShape: index === 0 ? [safeInputUnits] : undefined,
          activation: config.activation,
          kernelInitializer,
          useBias,
          biasInitializer,
          kernelRegularizer: regularizer,
        }),
      );
    });

    model.add(
      tf.layers.dense({
        units: safeOutputUnits,
        activation: safeOutputUnits > 1 ? 'softmax' : 'sigmoid',
        kernelInitializer,
        useBias,
        biasInitializer,
      }),
    );

    model.compile({
      optimizer: createOptimizer(config.optimizer, Number(config.learningRate)),
      loss: safeOutputUnits > 1 ? 'categoricalCrossentropy' : config.loss,
    });

    this.model = model;

    return {
      inputUnits: safeInputUnits,
      hiddenLayers,
      outputUnits: safeOutputUnits,
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
          id: `dense-${index}`,
          name: denseLayerName(index, totalLayers),
          fromUnits: weights.length,
          toUnits,
          weights,
          biases,
        };
      }),
    );
  }

  evaluateAccuracy(xs, ys) {
    if (!this.model) {
      return 0;
    }

    const predictionTensor = this.model.predict(xs);
    const predictions = Array.from(predictionTensor.dataSync());
    const labels = Array.from(ys.dataSync());
    predictionTensor.dispose();

    if (this.outputUnits > 1) {
      let correct = 0;
      const sampleCount = Math.floor(labels.length / this.outputUnits);

      for (let index = 0; index < sampleCount; index += 1) {
        const offset = index * this.outputUnits;
        const predictionSlice = predictions.slice(offset, offset + this.outputUnits);
        const labelSlice = labels.slice(offset, offset + this.outputUnits);
        const predictedLabel = predictionSlice.indexOf(Math.max(...predictionSlice));
        const actualLabel = labelSlice.indexOf(Math.max(...labelSlice));

        if (predictedLabel === actualLabel) {
          correct += 1;
        }
      }

      return correct / Math.max(sampleCount, 1);
    }

    const correct = predictions.reduce((total, value, index) => {
      const predictedLabel = value >= 0.5 ? 1 : 0;
      return total + (predictedLabel === labels[index] ? 1 : 0);
    }, 0);

    return correct / Math.max(labels.length, 1);
  }

  getDecisionGrid(resolution = 96, baselineFeatures = []) {
    if (!this.model) {
      return null;
    }

    const size = Math.max(24, Math.min(Number(resolution) || 96, 128));
    const baseline = Array.from({ length: this.inputUnits }, (_, index) => {
      const value = Number(baselineFeatures[index]);
      return Number.isFinite(value) ? value : 0;
    });
    const points = [];

    for (let row = 0; row < size; row += 1) {
      const y = 1 - (row / Math.max(size - 1, 1)) * 2;

      for (let column = 0; column < size; column += 1) {
        const x = -1 + (column / Math.max(size - 1, 1)) * 2;
        const input = [...baseline];
        input[0] = x;
        if (this.inputUnits > 1) {
          input[1] = y;
        }
        points.push(input);
      }
    }

    const inputTensor = tf.tensor2d(points, [points.length, this.inputUnits]);
    const predictionTensor = this.model.predict(inputTensor);
    const probabilities = Array.from(predictionTensor.dataSync());
    inputTensor.dispose();
    predictionTensor.dispose();

    return {
      resolution: size,
      outputUnits: this.outputUnits,
      probabilities,
    };
  }

  predictRaw(rawInput, dataset) {
    if (!this.model) {
      throw new Error('Модель еще не создана.');
    }

    const input = Array.from({ length: this.inputUnits }, (_, index) => {
      const value = Number(rawInput[index]);

      if (!Number.isFinite(value)) {
        throw new Error('Введите значения для всех признаков.');
      }

      if (dataset?.type === 'custom' && dataset.stats?.[index]) {
        return normalizeValue(value, dataset.stats[index]);
      }

      return value;
    });
    const inputTensor = tf.tensor2d([input], [1, this.inputUnits]);
    const predictionTensor = this.model.predict(inputTensor);
    const predictionValues = Array.from(predictionTensor.dataSync());
    inputTensor.dispose();
    predictionTensor.dispose();

    const probabilities =
      this.outputUnits > 1
        ? predictionValues
        : [1 - (predictionValues[0] ?? 0), predictionValues[0] ?? 0];
    const predictedIndex = probabilities.indexOf(Math.max(...probabilities));
    const classNames = dataset?.classNames ?? ['0', '1'];

    return {
      predictedIndex,
      predictedClass: classNames[predictedIndex] ?? String(predictedIndex),
      probabilities: probabilities.map((probability, index) => ({
        classIndex: index,
        className: classNames[index] ?? String(index),
        probability,
      })),
    };
  }

  async train(config, dataset, callbacks = {}) {
    if (!this.model) {
      throw new Error('Модель еще не создана.');
    }

    this.isTraining = true;
    this.stopRequested = false;
    this.model.stopTraining = false;

    const trainXs = tf.tensor2d(dataset.train.inputs);
    const trainYs = tf.tensor2d(dataset.train.labels);
    const testXs = tf.tensor2d(dataset.test.inputs);
    const testYs = tf.tensor2d(dataset.test.labels);
    const epochs = Number(config.epochs);
    const batchSize = Number(config.batchSize);
    const shouldStopByAccuracy = Boolean(config.stopByAccuracy);
    const targetAccuracy = Number(config.targetAccuracy);
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
          validationData: [testXs, testYs],
          verbose: 0,
        });

        const loss = result.history.loss?.[0] ?? null;
        const valLoss = result.history.val_loss?.[0] ?? null;
        const accuracy = this.evaluateAccuracy(testXs, testYs);
        const shouldUpdateParameters =
          epoch === 0 || epoch + 1 === epochs || (epoch + 1) % parameterInterval === 0;
        const parameters = shouldUpdateParameters ? await this.getParameters() : null;
        const decisionGrid = dataset.type === 'custom' ? null : this.getDecisionGrid(96, dataset.decisionBaseline);

        callbacks.onEpochEnd?.({
          epoch: epoch + 1,
          loss,
          valLoss,
          accuracy,
          parameters,
          decisionGrid,
        });

        if (this.stopRequested) {
          break;
        }

        if (shouldStopByAccuracy && Number.isFinite(targetAccuracy) && accuracy >= targetAccuracy) {
          await tf.nextFrame();
          return {
            status: 'accuracy-reached',
            epoch: epoch + 1,
            accuracy,
            targetAccuracy,
          };
        }

        await tf.nextFrame();
      }

      return {
        status: this.stopRequested ? 'stopped' : 'completed',
      };
    } finally {
      trainXs.dispose();
      trainYs.dispose();
      testXs.dispose();
      testYs.dispose();
      this.isTraining = false;
      this.model.stopTraining = false;
    }
  }
}
